"""
Django signals for the api app.

GlobalSettings post_save → keeps the Celery Beat PeriodicTask for auto-orders
in sync with whatever deadline the admin configures.
"""

import json
import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)

PERIODIC_TASK_NAME = "auto-order-daily"


def _sync_auto_order_schedule(settings_instance) -> None:
    """
    Create or update the Celery Beat PeriodicTask so that auto-orders fire
    at max(deadline_breakfast, deadline_lunch, deadline_olovrant) Monday–Friday.

    Using the *latest* deadline ensures all manual-order windows have closed
    before we fill in the gaps automatically.
    """
    try:
        from django_celery_beat.models import CrontabSchedule, PeriodicTask
    except ImportError:
        logger.warning(
            "django_celery_beat not installed – skipping auto-order schedule sync."
        )
        return

    trigger_time = max(
        settings_instance.deadline_breakfast,
        settings_instance.deadline_lunch,
        settings_instance.deadline_olovrant,
    )

    schedule, _ = CrontabSchedule.objects.get_or_create(
        minute=trigger_time.minute,
        hour=trigger_time.hour,
        day_of_week="1-5",  # Mon–Fri
        day_of_month="*",
        month_of_year="*",
        timezone="Europe/Bratislava",
    )

    PeriodicTask.objects.update_or_create(
        name=PERIODIC_TASK_NAME,
        defaults={
            "task": "api.tasks.apply_auto_orders_task",
            "crontab": schedule,
            "args": json.dumps([]),
            "kwargs": json.dumps({}),
            "enabled": True,
            "description": (
                "Auto-order: copy the last non-empty order for every client "
                "who has not placed an order before today's deadline."
            ),
        },
    )

    logger.info(
        "Auto-order periodic task synced → %02d:%02d Mon–Fri",
        trigger_time.hour,
        trigger_time.minute,
    )


@receiver(post_save, sender="api.GlobalSettings")
def on_global_settings_saved(sender, instance, **kwargs):
    """Sync the Celery Beat schedule whenever GlobalSettings are saved."""
    _sync_auto_order_schedule(instance)

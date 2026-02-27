"""
Django signals for the api app.

GlobalSettings post_save → keeps the Celery Beat PeriodicTasks for:
- auto-orders: fires at max(deadline_breakfast, deadline_lunch, deadline_olovrant)
- daily reports: fires at breakfast deadline (breakfast only) and olovrant deadline (all meals)
"""

import json
import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)

PERIODIC_TASK_NAME_AUTO_ORDER = "auto-order-daily"
PERIODIC_TASK_NAME_REPORT_BREAKFAST = "daily-report-breakfast"
PERIODIC_TASK_NAME_REPORT_ALL = "daily-report-all-meals"


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
        name=PERIODIC_TASK_NAME_AUTO_ORDER,
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


def _sync_daily_report_schedule(settings_instance) -> None:
    """
    Create or update two Celery Beat PeriodicTasks for daily reports:
    1. Breakfast-only report at breakfast deadline (Monday–Friday)
    2. Full report (all meals) at olovrant deadline (Monday–Friday)
    """
    try:
        from django_celery_beat.models import CrontabSchedule, PeriodicTask
    except ImportError:
        logger.warning(
            "django_celery_beat not installed – skipping daily report schedule sync."
        )
        return

    # ── Task 1: Breakfast-only report at breakfast deadline ──────────────────
    breakfast_time = settings_instance.deadline_breakfast
    breakfast_schedule, _ = CrontabSchedule.objects.get_or_create(
        minute=breakfast_time.minute,
        hour=breakfast_time.hour,
        day_of_week="1-5",  # Mon–Fri
        day_of_month="*",
        month_of_year="*",
        timezone="Europe/Bratislava",
    )

    PeriodicTask.objects.update_or_create(
        name=PERIODIC_TASK_NAME_REPORT_BREAKFAST,
        defaults={
            "task": "api.tasks.send_daily_report_task",
            "crontab": breakfast_schedule,
            "args": json.dumps([]),
            "kwargs": json.dumps({"meals": ["breakfast"]}),
            "enabled": True,
            "description": "Daily report: breakfast only, sent at breakfast deadline.",
        },
    )

    logger.info(
        "Breakfast report periodic task synced → %02d:%02d Mon–Fri",
        breakfast_time.hour,
        breakfast_time.minute,
    )

    # ── Task 2: Full report (all meals) at olovrant deadline ─────────────────
    olovrant_time = settings_instance.deadline_olovrant
    olovrant_schedule, _ = CrontabSchedule.objects.get_or_create(
        minute=olovrant_time.minute,
        hour=olovrant_time.hour,
        day_of_week="1-5",  # Mon–Fri
        day_of_month="*",
        month_of_year="*",
        timezone="Europe/Bratislava",
    )

    PeriodicTask.objects.update_or_create(
        name=PERIODIC_TASK_NAME_REPORT_ALL,
        defaults={
            "task": "api.tasks.send_daily_report_task",
            "crontab": olovrant_schedule,
            "args": json.dumps([]),
            "kwargs": json.dumps({"meals": ["breakfast", "lunch", "olovrant"]}),
            "enabled": True,
            "description": "Daily report: all meals (breakfast, lunch, olovrant), sent at olovrant deadline.",
        },
    )

    logger.info(
        "Full report periodic task synced → %02d:%02d Mon–Fri",
        olovrant_time.hour,
        olovrant_time.minute,
    )


@receiver(post_save, sender="api.GlobalSettings")
def on_global_settings_saved(sender, instance, **kwargs):
    """Sync the Celery Beat schedules whenever GlobalSettings are saved."""
    _sync_auto_order_schedule(instance)
    _sync_daily_report_schedule(instance)

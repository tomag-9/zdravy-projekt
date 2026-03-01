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
        from django.conf import settings
        from django_celery_beat.models import CrontabSchedule, PeriodicTask
    except ImportError:
        logger.warning(
            "django_celery_beat not installed – skipping auto-order schedule sync."
        )
        return

    try:
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
            timezone=settings.TIME_ZONE,
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
            "Auto-order periodic task synced → %02d:%02d Mon–Fri (tz: %s)",
            trigger_time.hour,
            trigger_time.minute,
            settings.TIME_ZONE,
        )
    except Exception as exc:
        logger.exception("Failed to sync auto-order periodic task: %s", exc)


def _sync_daily_report_schedule(settings_instance) -> None:
    """
    Create or update two Celery Beat PeriodicTasks for daily reports:
    1. Breakfast-only report at breakfast deadline (Monday–Friday)
    2. Full report (all meals) at olovrant deadline (Monday–Friday)

    Tasks are only created if report_email_recipients is configured (non-empty).
    """
    try:
        from django.conf import settings
        from django_celery_beat.models import CrontabSchedule, PeriodicTask
    except ImportError:
        logger.warning(
            "django_celery_beat not installed – skipping daily report schedule sync."
        )
        return

    # Safety check: only create tasks if recipients are configured
    if not settings_instance.report_email_recipients:
        logger.debug(
            "Skipping daily report task creation: no recipients configured. "
            "Add recipients to GlobalSettings.report_email_recipients to enable automatic email sending."
        )
        return

    try:
        # ── Task 1: Breakfast-only report at breakfast deadline ──────────────────
        breakfast_time = settings_instance.deadline_breakfast
        breakfast_schedule, _ = CrontabSchedule.objects.get_or_create(
            minute=breakfast_time.minute,
            hour=breakfast_time.hour,
            day_of_week="1-5",  # Mon–Fri
            day_of_month="*",
            month_of_year="*",
            timezone=settings.TIME_ZONE,
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
            "Breakfast report periodic task synced → %02d:%02d Mon–Fri (tz: %s)",
            breakfast_time.hour,
            breakfast_time.minute,
            settings.TIME_ZONE,
        )

        # ── Task 2: Full report (all meals) at olovrant deadline ─────────────────
        olovrant_time = settings_instance.deadline_olovrant
        olovrant_schedule, _ = CrontabSchedule.objects.get_or_create(
            minute=olovrant_time.minute,
            hour=olovrant_time.hour,
            day_of_week="1-5",  # Mon–Fri
            day_of_month="*",
            month_of_year="*",
            timezone=settings.TIME_ZONE,
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
            "Full report periodic task synced → %02d:%02d Mon–Fri (tz: %s)",
            olovrant_time.hour,
            olovrant_time.minute,
            settings.TIME_ZONE,
        )
    except Exception as exc:
        logger.exception("Failed to sync daily report periodic tasks: %s", exc)


@receiver(post_save, sender="api.GlobalSettings")
def on_global_settings_saved(sender, instance, created=False, **kwargs):
    """Sync the Celery Beat schedules whenever GlobalSettings are saved.

    This signal handler ensures PeriodicTasks are created or updated whenever
    the GlobalSettings (deadlines, recipients, etc.) change.
    """
    try:
        _sync_auto_order_schedule(instance)
        _sync_daily_report_schedule(instance)
        action = "created" if created else "updated"
        logger.debug(f"GlobalSettings {action} – periodic tasks synced")
    except Exception as exc:
        logger.exception("Error syncing periodic tasks for GlobalSettings: %s", exc)

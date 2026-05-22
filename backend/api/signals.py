"""
Django signals for the api app.

GlobalSettings post_save → keeps the Celery Beat PeriodicTasks for:
- auto-orders: fires at max(deadline_breakfast, deadline_lunch,
  deadline_olovrant)
- daily reports: fires at breakfast deadline (breakfast only) and
  olovrant deadline (all meals)
- push reminders: fires 15 min before each meal deadline (one task per
  meal type)
"""

import json
import logging

from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)

PERIODIC_TASK_NAME_AUTO_ORDER = "auto-order-daily"
PERIODIC_TASK_NAME_REPORT_BREAKFAST = "daily-report-breakfast"
PERIODIC_TASK_NAME_REPORT_ALL = "daily-report-all-meals"

PUSH_REMINDER_TASK_PREFIX = "push-reminder-"
PUSH_REMINDER_OFFSET_MINUTES = 15


def _push_reminder_task_name(meal_types: list[str]) -> str:
    """Return the deterministic PeriodicTask name for a group of meal types."""
    return PUSH_REMINDER_TASK_PREFIX + "-".join(sorted(meal_types))


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
            "django_celery_beat not installed – " "skipping auto-order schedule sync."
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

    Tasks are only created if report_email_recipients is configured
    (non-empty).
    """
    try:
        from django.conf import settings
        from django_celery_beat.models import CrontabSchedule, PeriodicTask
    except ImportError:
        logger.warning(
            "django_celery_beat not installed – " "skipping daily report schedule sync."
        )
        return

    # Safety check: only create tasks if recipients are configured
    if not settings_instance.report_email_recipients:
        logger.debug(
            "Skipping daily report task creation: no recipients configured. "
            "Add recipients to GlobalSettings.report_email_recipients to "
            "enable automatic email sending."
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
                "description": (
                    "Daily report: breakfast only, sent at breakfast deadline."
                ),
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
                "description": (
                    "Daily report: all meals (breakfast, lunch, olovrant), "
                    "sent at olovrant deadline."
                ),
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


def _sync_push_reminder_schedule(settings_instance) -> None:
    """
    Create or update Celery Beat PeriodicTasks that fire PUSH_REMINDER_OFFSET_MINUTES
    before each unique meal deadline combination, Monday–Friday.

    Meals that share the same (deadline_time, is_day_before) are grouped into
    a single task so clients receive one combined notification instead of
    separate ones. Orphaned push-reminder tasks from previous configurations
    are deleted automatically.

    If the computed reminder time goes before midnight the task is clamped
    to 00:00 and a warning is logged.
    """
    import datetime

    try:
        from django.conf import settings
        from django_celery_beat.models import CrontabSchedule, PeriodicTask
    except ImportError:
        logger.warning(
            "django_celery_beat not installed – skipping push reminder schedule sync."
        )
        return

    try:
        all_meal_types = ["breakfast", "lunch", "olovrant"]

        # Group meal types by (deadline_time, is_day_before).
        # Meals in the same group fire at the same crontab time and are sent
        # as a single combined push notification.
        groups: dict[tuple, list[str]] = {}
        for meal_type in all_meal_types:
            deadline: datetime.time = getattr(
                settings_instance, f"deadline_{meal_type}"
            )
            is_day_before: bool = getattr(
                settings_instance, f"deadline_{meal_type}_is_day_before", False
            )
            key = (deadline, is_day_before)
            groups.setdefault(key, []).append(meal_type)

        new_task_names: set[str] = set()

        for (deadline, _is_day_before), meal_types_group in groups.items():
            dt = datetime.datetime.combine(datetime.date.today(), deadline)
            reminder_dt = dt - datetime.timedelta(minutes=PUSH_REMINDER_OFFSET_MINUTES)

            if reminder_dt.date() < dt.date():
                logger.warning(
                    "push-reminder for %s: deadline %s is less than %d min "
                    "from midnight, clamping reminder to 00:00.",
                    meal_types_group,
                    deadline,
                    PUSH_REMINDER_OFFSET_MINUTES,
                )
                reminder_time = datetime.time(0, 0)
            else:
                reminder_time = reminder_dt.time()

            schedule, _ = CrontabSchedule.objects.get_or_create(
                minute=reminder_time.minute,
                hour=reminder_time.hour,
                day_of_week="1-5",  # Mon–Fri
                day_of_month="*",
                month_of_year="*",
                timezone=settings.TIME_ZONE,
            )

            meal_types_sorted = sorted(meal_types_group)
            task_name = _push_reminder_task_name(meal_types_sorted)
            new_task_names.add(task_name)

            PeriodicTask.objects.update_or_create(
                name=task_name,
                defaults={
                    "task": "api.tasks.send_push_deadline_reminder_task",
                    "crontab": schedule,
                    "args": json.dumps([meal_types_sorted]),
                    "kwargs": json.dumps({}),
                    "enabled": True,
                    "description": (
                        f"Push reminder: {PUSH_REMINDER_OFFSET_MINUTES} min before "
                        f"{'/'.join(meal_types_sorted)} deadline "
                        f"(deadline: {deadline.strftime('%H:%M')}, "
                        f"fires at {reminder_time.strftime('%H:%M')})."
                    ),
                },
            )

            logger.info(
                "Push reminder task synced: %s → %02d:%02d Mon–Fri (tz: %s)",
                task_name,
                reminder_time.hour,
                reminder_time.minute,
                settings.TIME_ZONE,
            )

        # Remove push-reminder tasks that are no longer needed (e.g. after
        # deadlines were changed so that previously separate meals are now grouped).
        deleted_count, _ = (
            PeriodicTask.objects.filter(name__startswith=PUSH_REMINDER_TASK_PREFIX)
            .exclude(name__in=new_task_names)
            .delete()
        )
        if deleted_count:
            logger.info(
                "Deleted %d orphaned push-reminder periodic task(s)", deleted_count
            )

    except Exception as exc:
        logger.exception("Failed to sync push reminder periodic tasks: %s", exc)


@receiver(post_save, sender="api.GlobalSettings")
def on_global_settings_saved(sender, instance, created=False, **kwargs):
    """Sync the Celery Beat schedules whenever GlobalSettings are saved.

    This signal handler ensures PeriodicTasks are created or updated whenever
    the GlobalSettings (deadlines, recipients, etc.) change.

    Also invalidates the GlobalSettings cache to ensure fresh data.
    """
    try:
        _sync_auto_order_schedule(instance)
        _sync_daily_report_schedule(instance)
        _sync_push_reminder_schedule(instance)

        # Invalidate GlobalSettings cache
        from api.cache_service import clear_global_settings_cache

        clear_global_settings_cache()

        action = "created" if created else "updated"
        logger.debug(
            "GlobalSettings %s – periodic tasks synced and cache cleared", action
        )
    except Exception as exc:
        logger.exception("Error syncing periodic tasks for GlobalSettings: %s", exc)


@receiver(post_save, sender="api.ClientSettings")
def on_client_settings_saved(sender, instance, created=False, **kwargs):
    """Invalidate ClientSettings cache when saved."""
    try:
        from api.cache_service import clear_client_settings_cache

        clear_client_settings_cache(instance.user_id)
        logger.debug("ClientSettings cache cleared for user_id=%s", instance.user_id)
    except Exception as exc:
        logger.exception("Error clearing ClientSettings cache: %s", exc)


@receiver(post_save, sender="api.Diet")
@receiver(post_delete, sender="api.Diet")
def on_diet_changed(sender, instance, **kwargs):
    """Invalidate Diet list cache when Diet is saved or deleted."""
    try:
        from api.cache_service import clear_diet_list_cache

        clear_diet_list_cache()
        logger.debug("Diet list cache cleared")
    except Exception as exc:
        logger.exception("Error clearing Diet list cache: %s", exc)

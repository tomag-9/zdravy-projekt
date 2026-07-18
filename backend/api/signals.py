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

WEEKLY_REMINDER_TASK_NAME = "weekly-order-reminder-sunday"

EDUPAGE_SCRAPE_TASK_PREFIX = "edupage-scrape-"
EDUPAGE_SCRAPE_OFFSET_MINUTES = 30


def _capture_signal_failure(exc: Exception, area: str) -> None:
    """Report non-fatal signal sync failures when Sentry is configured."""
    try:
        import sentry_sdk

        sentry_sdk.capture_exception(exc, scope={"tags": {"signal_area": area}})
    except Exception:
        logger.debug("Sentry capture skipped for signal_area=%s", area, exc_info=True)


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
        _capture_signal_failure(exc, "auto_order_schedule")


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
            "django_celery_beat not installed – skipping daily report schedule sync."
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
        _capture_signal_failure(exc, "daily_report_schedule")


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
        _capture_signal_failure(exc, "push_reminder_schedule")


def _sync_edupage_scrape_schedule(settings_instance) -> None:
    """
    Create or update Celery Beat PeriodicTasks that fire EDUPAGE_SCRAPE_OFFSET_MINUTES
    before each distinct meal deadline, Monday–Friday.

    Meals sharing the same deadline and target-day rule are grouped.
    Orphaned tasks from previous configurations are deleted automatically.
    """
    import datetime

    try:
        from django.conf import settings
        from django_celery_beat.models import CrontabSchedule, PeriodicTask
    except ImportError:
        logger.warning(
            "django_celery_beat not installed – skipping edupage scrape schedule sync."
        )
        return

    try:
        if not getattr(settings_instance, "edupage_auto_scrape_enabled", True):
            deleted_count, _ = PeriodicTask.objects.filter(
                name__startswith=EDUPAGE_SCRAPE_TASK_PREFIX
            ).delete()
            logger.info(
                "Edupage auto scrape disabled; deleted %d periodic task(s)",
                deleted_count,
            )
            return

        all_meal_types = ["breakfast", "lunch", "olovrant"]

        # Group meal types by deadline time and target-day rule.
        groups: dict[tuple[datetime.time, bool], list[str]] = {}
        for meal_type in all_meal_types:
            deadline: datetime.time = getattr(
                settings_instance, f"deadline_{meal_type}"
            )
            is_day_before: bool = getattr(
                settings_instance, f"deadline_{meal_type}_is_day_before", False
            )
            groups.setdefault((deadline, is_day_before), []).append(meal_type)

        new_task_names: set[str] = set()

        for (deadline, is_day_before), meal_types_group in groups.items():
            dt = datetime.datetime.combine(datetime.date.today(), deadline)
            scrape_dt = dt - datetime.timedelta(minutes=EDUPAGE_SCRAPE_OFFSET_MINUTES)

            if scrape_dt.date() < dt.date():
                logger.warning(
                    "edupage-scrape for %s: deadline %s is less than %d min from midnight, clamping to 00:00.",
                    meal_types_group,
                    deadline,
                    EDUPAGE_SCRAPE_OFFSET_MINUTES,
                )
                scrape_time = datetime.time(0, 0)
            else:
                scrape_time = scrape_dt.time()

            meal_label = "-".join(sorted(meal_types_group))
            task_name = f"{EDUPAGE_SCRAPE_TASK_PREFIX}{meal_label}"
            new_task_names.add(task_name)

            schedule, _ = CrontabSchedule.objects.get_or_create(
                minute=scrape_time.minute,
                hour=scrape_time.hour,
                day_of_week="1-5",
                day_of_month="*",
                month_of_year="*",
                timezone=settings.TIME_ZONE,
            )

            PeriodicTask.objects.update_or_create(
                name=task_name,
                defaults={
                    "task": "api.tasks.scrape_edupage_orders_task",
                    "crontab": schedule,
                    "args": json.dumps([]),
                    "kwargs": json.dumps({"meal_types": sorted(meal_types_group)}),
                    "enabled": True,
                    "description": (
                        f"Edupage scrape: import order counts {EDUPAGE_SCRAPE_OFFSET_MINUTES} min "
                        f"before {'/'.join(sorted(meal_types_group))} deadline "
                        f"(deadline: {deadline.strftime('%H:%M')}, "
                        f"target: {'next workday' if is_day_before else 'today'}, "
                        f"fires at {scrape_time.strftime('%H:%M')})."
                    ),
                },
            )

            logger.info(
                "Edupage scrape task synced: %s → %02d:%02d Mon–Fri (tz: %s)",
                task_name,
                scrape_time.hour,
                scrape_time.minute,
                settings.TIME_ZONE,
            )

        # Remove orphaned tasks from previous deadline configurations
        deleted_count, _ = (
            PeriodicTask.objects.filter(name__startswith=EDUPAGE_SCRAPE_TASK_PREFIX)
            .exclude(name__in=new_task_names)
            .delete()
        )
        if deleted_count:
            logger.info(
                "Deleted %d orphaned edupage-scrape periodic task(s)", deleted_count
            )

    except Exception as exc:
        logger.exception("Failed to sync edupage scrape periodic tasks: %s", exc)
        _capture_signal_failure(exc, "edupage_scrape_schedule")


def _sync_weekly_reminder_schedule() -> None:
    """
    Create or update the Celery Beat PeriodicTask for the Sunday weekly reminder.
    Fires every Sunday at 17:00 Europe/Bratislava.
    The task itself checks per-user whether orders for next week already exist.
    """
    try:
        import json as _json

        from django.conf import settings
        from django_celery_beat.models import CrontabSchedule, PeriodicTask

        schedule, _ = CrontabSchedule.objects.get_or_create(
            minute="0",
            hour="17",
            day_of_week="0",  # Sunday
            day_of_month="*",
            month_of_year="*",
            timezone=settings.TIME_ZONE,
        )

        PeriodicTask.objects.update_or_create(
            name=WEEKLY_REMINDER_TASK_NAME,
            defaults={
                "task": "api.tasks.send_weekly_order_reminder_task",
                "crontab": schedule,
                "args": _json.dumps([]),
                "enabled": True,
                "description": "Sunday 17:00 – remind clients who have no orders for next week",
            },
        )
        logger.debug(
            "Weekly reminder periodic task synced: %s", WEEKLY_REMINDER_TASK_NAME
        )
    except Exception as exc:
        logger.exception("Failed to sync weekly reminder periodic task: %s", exc)
        _capture_signal_failure(exc, "weekly_reminder_schedule")


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
        _sync_weekly_reminder_schedule()
        _sync_edupage_scrape_schedule(instance)

        # Invalidate GlobalSettings cache
        from api.cache_service import clear_global_settings_cache

        clear_global_settings_cache()

        action = "created" if created else "updated"
        logger.debug(
            "GlobalSettings %s – periodic tasks synced and cache cleared", action
        )
    except Exception as exc:
        logger.exception("Error syncing periodic tasks for GlobalSettings: %s", exc)
        _capture_signal_failure(exc, "global_settings_saved")


@receiver(post_save, sender="api.ClientSettings")
def on_client_settings_saved(sender, instance, created=False, **kwargs):
    """Apply default diets for new settings and invalidate ClientSettings cache."""
    try:
        if created and instance.visible_diets.count() == 0:
            from api.default_visibility import (
                DEFAULT_VISIBLE_MEALS,
                DEFAULT_VISIBLE_MENUS,
                ensure_default_visible_diets,
            )

            instance.visible_menus = DEFAULT_VISIBLE_MENUS
            instance.visible_meals = DEFAULT_VISIBLE_MEALS
            instance.save(update_fields=["visible_menus", "visible_meals"])
            ensure_default_visible_diets(instance.visible_diets)

        from api.cache_service import clear_client_settings_cache

        clear_client_settings_cache(instance.user_id)
        logger.debug("ClientSettings cache cleared for user_id=%s", instance.user_id)
    except Exception as exc:
        logger.exception("Error clearing ClientSettings cache: %s", exc)
        _capture_signal_failure(exc, "client_settings_saved")


@receiver(post_save, sender="api.Prevadzka")
def on_prevadzka_saved(sender, instance, created=False, **kwargs):
    """Apply default diets for newly created prevadzky."""
    if not created:
        return
    try:
        from api.default_visibility import (
            DEFAULT_VISIBLE_MEALS,
            DEFAULT_VISIBLE_MENUS,
            ensure_default_visible_diets,
        )

        instance.visible_menus = DEFAULT_VISIBLE_MENUS
        instance.visible_meals = DEFAULT_VISIBLE_MEALS
        instance.save(update_fields=["visible_menus", "visible_meals"])
        ensure_default_visible_diets(instance.visible_diets)
    except Exception as exc:
        logger.exception("Error applying default diets for Prevadzka: %s", exc)
        _capture_signal_failure(exc, "prevadzka_saved")


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
        _capture_signal_failure(exc, "diet_changed")


@receiver(post_save, sender="api.UserProfile")
def on_user_profile_saved(sender, instance, created, **kwargs):
    """Každý profil musí mať celok a aspoň jednu prevádzku.

    Objednávky sa vedú per prevádzka, takže profil bez prevádzky by nemal kam
    objednávať. Default: celok aj prevádzka sa volajú ako profil. Viac-prevádzkové
    celky sa dokonfigurujú zvlášť.
    """
    from api.models import Celok, Prevadzka, UserProfile

    zdroj = (
        Celok.ZdrojObjednavok.EDUPAGE
        if instance.is_edupage
        else Celok.ZdrojObjednavok.APP
    )

    # Existujúci profil: udrž zdroj celku v súlade s is_edupage (napr. keď admin
    # prepne prevádzku na EduPage). Meníme len keď treba, nech nespúšťame zápis
    # zbytočne.
    if not created or instance.celok_id is not None:
        if instance.celok_id is not None and Celok.objects.filter(
            pk=instance.celok_id
        ).exclude(zdroj_objednavok=zdroj).update(zdroj_objednavok=zdroj):
            logger.info(
                "Celok %s zdroj_objednavok → %s (profil %s)",
                instance.celok_id,
                zdroj,
                instance.pk,
            )
        return
    try:

        nazov = (instance.company_name or "").strip() or instance.user.email

        # Každý auto-vytvorený profil dostane VLASTNÝ celok. Zdieľať jeden celok
        # medzi viacerými loginmi je legitímne, ale to sa konfiguruje ručne — tu
        # nesmieme dva rovnako pomenované (ale nesúvisiace) profily ticho zlúčiť,
        # inak by ich prevádzky a objednávky kolidovali. `Celok.nazov` je unique,
        # tak pri zhode odlíšime názov emailom, resp. pk.
        celok_nazov = nazov
        if Celok.objects.filter(nazov=celok_nazov).exists():
            celok_nazov = f"{nazov} ({instance.user.email})"
        if Celok.objects.filter(nazov=celok_nazov).exists():
            celok_nazov = f"{nazov} (#{instance.pk})"

        celok = Celok.objects.create(
            nazov=celok_nazov,
            billing_name=instance.billing_name,
            ico=instance.ico,
            dic=instance.dic,
            zdroj_objednavok=zdroj,
        )
        Prevadzka.objects.create(celok=celok, nazov=nazov)
        # update() namiesto save(), aby sa signál nezavolal rekurzívne.
        UserProfile.objects.filter(pk=instance.pk).update(celok=celok)
        instance.celok = celok
    except Exception as exc:
        logger.exception("Error creating default Celok/Prevadzka: %s", exc)
        _capture_signal_failure(exc, "user_profile_saved")

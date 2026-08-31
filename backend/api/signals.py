"""
Django signals for the api app.

GlobalSettings post_save → keeps the Celery Beat PeriodicTasks for:
- auto-orders: fires at max(deadline_breakfast, deadline_lunch,
  deadline_olovrant)
- daily reports: chained after the Edupage scrape that feeds them (issue #474).
  Only when the auto-scrape is switched off do they get their own crontabs,
  10 min after the breakfast deadline (breakfast only) and 10 min after the
  olovrant deadline (all meals).
- edupage scrape: fires exactly at each meal deadline (one task per group of
  meals sharing a deadline)
- push reminders: fires 30 min before each meal deadline (one task per
  meal type)
"""

import datetime
import json
import logging

from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)

PERIODIC_TASK_NAME_AUTO_ORDER = "auto-order-daily"
PERIODIC_TASK_NAME_EVENT_LOG_PURGE = "event-log-purge-daily"
PERIODIC_TASK_NAME_REPORT_BREAKFAST = "daily-report-breakfast"
PERIODIC_TASK_NAME_REPORT_ALL = "daily-report-all-meals"
# Reports must land *after* the Edupage scrape, which now runs exactly at the
# deadline — otherwise the kitchen gets a report built from counts the import
# has not written yet. Cron gives no ordering guarantee, so the gap is what
# separates the two.
DAILY_REPORT_OFFSET_MINUTES = 10

PUSH_REMINDER_TASK_PREFIX = "push-reminder-"
# Widened from 15 to 30 min: with the login being CPU-bound (see
# load-tests/README.md "Measured Capacity"), a longer lead time before the
# deadline gives users more room to arrive spread out rather than all at
# once, on top of the send-side batching in api/tasks.py.
PUSH_REMINDER_OFFSET_MINUTES = 30

WEEKLY_REMINDER_TASK_NAME = "weekly-order-reminder-sunday"

EDUPAGE_SCRAPE_TASK_PREFIX = "edupage-scrape-"

# British School (#535): its own EduPage connection is scraped on a dedicated
# crontab, entirely separate from the shared GlobalSettings meal deadlines
# every other celok uses — 12:15 the day before, so its dashboard row is ready
# well ahead of the (much later) generic deadlines. Name matches
# `seed_british_school_2026_08.BRITISH_SCHOOL_NAME`; kept as a local literal
# rather than importing a management command module here.
BRITISH_SCHOOL_CONNECTION_NAME = "British School"
BRITISH_SCHOOL_SCRAPE_TASK_NAME = f"{EDUPAGE_SCRAPE_TASK_PREFIX}british-school"
BRITISH_SCHOOL_SCRAPE_HOUR = 12
BRITISH_SCHOOL_SCRAPE_MINUTE = 15

# Cron musí bežať v ten deň, na ktorý je úloha nastavená — nie v ten, ktorého sa
# týka jedlo. Úloha so `is_day_before` deadlinom obsluhuje NASLEDUJÚCI pracovný
# deň (`_next_workday`), takže musí bežať v jeho predvečer: pre pondelok je to
# nedeľa. S maskou Po–Pi ju v nedeľu nikto nespustí a pondelok obslúži už piatok
# večer — teda 48 h pred deadlinom, o ktorom si klienti myslia, že je v nedeľu
# o 21:00. Všetko, čo cez víkend doobjednajú alebo odhlásia, sa stratí.
DAY_OF_WEEK_WORKDAYS = "1-5"  # Po–Pi — úloha obsluhuje deň, v ktorý beží
DAY_OF_WEEK_DAY_BEFORE = "0-4"  # Ne–Št — úloha obsluhuje nasledujúci pracovný deň
# Pozn.: obe masky predpokladajú, že jediné voľné dni sú víkendy — rovnaký
# predpoklad má `_next_workday`. Keby pribudol kalendár sviatkov, musia sa
# posunúť obe naraz (predvečer sviatku sa nespúšťa, predvečer dňa PO sviatku áno).

# Slovenské názvy jedál pre `PeriodicTask.description` — tú appka priamo
# zobrazuje adminom v „Nadchádzajúce" (#527/#528 follow-up), takže musí byť
# čitateľná bez prekladu, nie interný `meal_type` slug.
MEAL_LABEL_SK = {"breakfast": "raňajky", "lunch": "obed", "olovrant": "olovrant"}
_MEAL_DISPLAY_ORDER = ["breakfast", "lunch", "olovrant"]


def _meal_types_label_sk(meal_types) -> str:
    """`['lunch', 'breakfast']` → `'raňajky/obed'` — vždy v ustálenom poradí,
    nie abecedne (ani anglicky, ani slovensky by to nedávalo zmysel)."""
    ordered = [m for m in _MEAL_DISPLAY_ORDER if m in meal_types]
    return "/".join(MEAL_LABEL_SK[m] for m in ordered)


def _day_of_week(is_day_before: bool) -> str:
    """Maska dní pre cron podľa toho, ktorý deň úloha obsluhuje."""
    return DAY_OF_WEEK_DAY_BEFORE if is_day_before else DAY_OF_WEEK_WORKDAYS


def _shift_time(value: datetime.time, minutes: int) -> datetime.time:
    """Move a wall-clock time by `minutes`, wrapping around midnight."""
    base = datetime.datetime.combine(datetime.date(2000, 1, 1), value)
    return (base + datetime.timedelta(minutes=minutes)).time()


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
    at max(deadline_breakfast, deadline_lunch, deadline_olovrant), on the eve
    of every workday (Sun–Thu).

    Using the *latest* deadline ensures all manual-order windows have closed
    before we fill in the gaps automatically.

    `apply_auto_orders` dopĺňa vždy `_next_workday(dnes)`, takže je to „deň
    vopred" úloha bez ohľadu na nastavenie deadlinov — a musí bežať v predvečer
    obsluhovaného dňa. S maskou Po–Pi sa pondelok dopĺňal už v piatok večer a
    klient, ktorý si cez víkend objednal sám, dostal auto-objednávku spred dvoch
    dní; v nedeľu naopak nebežalo nič.
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
            day_of_week=_day_of_week(is_day_before=True),
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
                    "Auto-objednávka: skopíruje poslednú neprázdnu objednávku "
                    "každému klientovi, ktorý si do dnešnej uzávierky "
                    "neobjednal sám."
                ),
            },
        )

        logger.info(
            "Auto-order periodic task synced → %02d:%02d Sun–Thu (tz: %s)",
            trigger_time.hour,
            trigger_time.minute,
            settings.TIME_ZONE,
        )
    except Exception as exc:
        logger.exception("Failed to sync auto-order periodic task: %s", exc)
        _capture_signal_failure(exc, "auto_order_schedule")


def _delete_daily_report_tasks(periodic_task_model, reason: str) -> None:
    """Drop both daily-report periodic tasks, logging why."""
    deleted_count, _ = periodic_task_model.objects.filter(
        name__in=[PERIODIC_TASK_NAME_REPORT_BREAKFAST, PERIODIC_TASK_NAME_REPORT_ALL]
    ).delete()
    logger.info(
        "Daily report periodic tasks removed (%s); deleted %d task(s)",
        reason,
        deleted_count,
    )


def _reports_are_wanted(settings_instance) -> bool:
    """True when a daily report should be produced at all."""
    return bool(
        getattr(settings_instance, "daily_report_enabled", True)
        and settings_instance.report_email_recipients
    )


def _chained_report_specs(settings_instance, meal_types_group) -> list[list[str]]:
    """Reports the scrape of ``meal_types_group`` must trigger once it lands.

    Mirrors the standalone schedule this replaces (issue #474): the breakfast
    deadline produces the breakfast-only report, the olovrant deadline the full
    one. When both meals share a deadline the single scrape triggers both — the
    same two emails cron used to send at that minute.
    """
    if not _reports_are_wanted(settings_instance):
        return []

    specs: list[list[str]] = []
    if "breakfast" in meal_types_group:
        specs.append(["breakfast"])
    if "olovrant" in meal_types_group:
        specs.append(["breakfast", "lunch", "olovrant"])
    return specs


def _sync_daily_report_schedule(settings_instance) -> None:
    """
    Create or update two Celery Beat PeriodicTasks for daily reports:

    1. Breakfast-only report DAILY_REPORT_OFFSET_MINUTES after the breakfast
       deadline (Monday–Friday)
    2. Full report (all meals) DAILY_REPORT_OFFSET_MINUTES after the olovrant
       deadline (Monday–Friday)

    These standalone crontabs are the **fallback path only**, used when the
    EduPage auto-scrape is switched off. With the scrape running, cron ordering
    is no guarantee that the import has landed — a slow or retrying scrape would
    let the report leave with stale counts. So in that case the report is not
    scheduled here at all; `scrape_edupage_orders_task` chains it after itself
    (issue #474, see `_chained_report_specs`).

    Tasks are only created when ``daily_report_enabled`` is on *and*
    report_email_recipients is configured (non-empty). Otherwise any existing
    tasks are removed — the recipient list itself is never touched, so the
    reports can be switched back on without re-entering it.
    """
    try:
        from django.conf import settings
        from django_celery_beat.models import CrontabSchedule, PeriodicTask
    except ImportError:
        logger.warning(
            "django_celery_beat not installed – skipping daily report schedule sync."
        )
        return

    if not getattr(settings_instance, "daily_report_enabled", True):
        _delete_daily_report_tasks(PeriodicTask, "daily reports disabled")
        return

    # Safety check: only create tasks if recipients are configured
    if not settings_instance.report_email_recipients:
        _delete_daily_report_tasks(PeriodicTask, "no recipients configured")
        return

    if getattr(settings_instance, "edupage_auto_scrape_enabled", True):
        _delete_daily_report_tasks(
            PeriodicTask, "reports are chained after the EduPage scrape"
        )
        return

    try:
        # ── Task 1: Breakfast-only report after the breakfast deadline ───────────
        breakfast_time = _shift_time(
            settings_instance.deadline_breakfast, DAILY_REPORT_OFFSET_MINUTES
        )
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
                    f"Denný report: len raňajky, odosiela sa "
                    f"{DAILY_REPORT_OFFSET_MINUTES} min po uzávierke raňajok "
                    f"(spúšťa sa o {breakfast_time.strftime('%H:%M')})."
                ),
            },
        )

        logger.info(
            "Breakfast report periodic task synced → %02d:%02d Mon–Fri (tz: %s)",
            breakfast_time.hour,
            breakfast_time.minute,
            settings.TIME_ZONE,
        )

        # ── Task 2: Full report (all meals) after the olovrant deadline ──────────
        olovrant_time = _shift_time(
            settings_instance.deadline_olovrant, DAILY_REPORT_OFFSET_MINUTES
        )
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
                    f"Denný report: všetky jedlá (raňajky, obed, olovrant), "
                    f"odosiela sa {DAILY_REPORT_OFFSET_MINUTES} min po "
                    f"uzávierke olovrantu (spúšťa sa o "
                    f"{olovrant_time.strftime('%H:%M')})."
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

        for (deadline, is_day_before), meal_types_group in groups.items():
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
                day_of_week=_day_of_week(is_day_before),
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
                        f"Push pripomienka: {PUSH_REMINDER_OFFSET_MINUTES} min "
                        f"pred uzávierkou "
                        f"({_meal_types_label_sk(meal_types_sorted)}) "
                        f"(uzávierka: {deadline.strftime('%H:%M')}, "
                        f"spúšťa sa o {reminder_time.strftime('%H:%M')})."
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


def _british_school_connection_id() -> int | None:
    from api.models import EdupageConnection

    return (
        EdupageConnection.objects.filter(
            name=BRITISH_SCHOOL_CONNECTION_NAME, is_active=True
        )
        .values_list("pk", flat=True)
        .first()
    )


def _sync_edupage_scrape_schedule(settings_instance) -> None:
    """
    Create or update Celery Beat PeriodicTasks that fire exactly at each
    meal's *effective* scrape time, Monday–Friday.

    By default that's the order deadline itself: the scrape runs *at* the
    deadline, not before it, so anything imported earlier wouldn't miss the
    orders placed in the remaining minutes and the counts would go out to the
    kitchen short. Setting `edupage_scrape_time_{meal}` (#527/#528 follow-up)
    decouples the two — e.g. a deadline the evening before with the scrape
    only run after midnight, once orders are unambiguously closed but the
    import happens later than the deadline itself. See
    `GlobalSettings.edupage_scrape_schedule_for`.

    Meals sharing the same effective scrape time and target-day rule are
    grouped. Orphaned tasks from previous configurations are deleted
    automatically.
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

        # British School has its own dedicated scrape (12:15 the day before,
        # see `_sync_british_school_scrape_schedule`) — exclude it here so it
        # isn't scraped a second time at the shared deadlines below.
        british_school_connection_id = _british_school_connection_id()

        # Group meal types by their *effective* scrape time/target-day rule —
        # the order deadline by default, or the decoupled
        # `edupage_scrape_time_{meal}` override when one is set (#527/#528
        # follow-up: closing orders and importing them no longer have to
        # happen at the same clock time).
        deadlines: dict[str, datetime.time] = {}
        groups: dict[tuple[datetime.time, bool], list[str]] = {}
        for meal_type in all_meal_types:
            deadlines[meal_type] = getattr(settings_instance, f"deadline_{meal_type}")
            scrape_time, scrape_is_day_before = (
                settings_instance.edupage_scrape_schedule_for(meal_type)
            )
            groups.setdefault((scrape_time, scrape_is_day_before), []).append(meal_type)

        new_task_names: set[str] = set()

        for (scrape_time, is_day_before), meal_types_group in groups.items():
            meal_label = "-".join(sorted(meal_types_group))
            task_name = f"{EDUPAGE_SCRAPE_TASK_PREFIX}{meal_label}"
            new_task_names.add(task_name)

            schedule, _ = CrontabSchedule.objects.get_or_create(
                minute=scrape_time.minute,
                hour=scrape_time.hour,
                day_of_week=_day_of_week(is_day_before),
                day_of_month="*",
                month_of_year="*",
                timezone=settings.TIME_ZONE,
            )

            chained_reports = _chained_report_specs(settings_instance, meal_types_group)
            report_note = (
                f" Po tomto importe automaticky odošle "
                f"{len(chained_reports)} nadväzujúci denný report."
                if chained_reports
                else ""
            )

            deadline_labels = ", ".join(
                f"{MEAL_LABEL_SK[meal]}: {deadlines[meal].strftime('%H:%M')}"
                for meal in sorted(meal_types_group, key=_MEAL_DISPLAY_ORDER.index)
            )

            PeriodicTask.objects.update_or_create(
                name=task_name,
                defaults={
                    "task": "api.tasks.scrape_edupage_orders_task",
                    "crontab": schedule,
                    "args": json.dumps([]),
                    "kwargs": json.dumps(
                        {
                            "meal_types": sorted(meal_types_group),
                            "chained_reports": chained_reports,
                            "exclude_connection_ids": (
                                [british_school_connection_id]
                                if british_school_connection_id
                                else None
                            ),
                        }
                    ),
                    "enabled": True,
                    "description": (
                        f"EduPage scrape: načíta objednávky pre "
                        f"{_meal_types_label_sk(meal_types_group)} "
                        f"(uzávierka: {deadline_labels}, "
                        f"cieli na "
                        f"{'nasledujúci pracovný deň' if is_day_before else 'dnešok'}, "
                        f"spúšťa sa o "
                        f"{scrape_time.strftime('%H:%M')}).{report_note}"
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


def _sync_british_school_scrape_schedule(settings_instance) -> None:
    """British School (#535): scraped daily at 12:15 the day before, Sun–Thu,
    on its own crontab — independent of the shared GlobalSettings meal
    deadlines every other celok uses (`_sync_edupage_scrape_schedule`).

    A no-op (task deleted, if present) while the British School EduPage
    connection doesn't exist yet or automatic scraping is switched off.
    """
    try:
        from django.conf import settings
        from django_celery_beat.models import CrontabSchedule, PeriodicTask
    except ImportError:
        logger.warning(
            "django_celery_beat not installed – skipping British School scrape schedule sync."
        )
        return

    try:
        connection_id = _british_school_connection_id()
        auto_scrape_enabled = getattr(
            settings_instance, "edupage_auto_scrape_enabled", True
        )
        if connection_id is None or not auto_scrape_enabled:
            deleted_count, _ = PeriodicTask.objects.filter(
                name=BRITISH_SCHOOL_SCRAPE_TASK_NAME
            ).delete()
            if deleted_count:
                logger.info(
                    "British School scrape task removed (connection missing or "
                    "auto-scrape disabled)"
                )
            return

        schedule, _ = CrontabSchedule.objects.get_or_create(
            minute=BRITISH_SCHOOL_SCRAPE_MINUTE,
            hour=BRITISH_SCHOOL_SCRAPE_HOUR,
            day_of_week=DAY_OF_WEEK_DAY_BEFORE,
            day_of_month="*",
            month_of_year="*",
            timezone=settings.TIME_ZONE,
        )
        PeriodicTask.objects.update_or_create(
            name=BRITISH_SCHOOL_SCRAPE_TASK_NAME,
            defaults={
                "task": "api.tasks.scrape_edupage_orders_task",
                "crontab": schedule,
                "args": json.dumps([]),
                "kwargs": json.dumps(
                    {
                        "connection_id": connection_id,
                        "target_next_workday": True,
                    }
                ),
                "enabled": True,
                "description": (
                    "EduPage scrape (British School): spúšťa sa denne o 12:15 "
                    "deň vopred (Ne–Št), načíta objednávky pre nasledujúci "
                    "pracovný deň."
                ),
            },
        )
        logger.info(
            "British School scrape task synced: %02d:%02d Sun-Thu (tz: %s)",
            BRITISH_SCHOOL_SCRAPE_HOUR,
            BRITISH_SCHOOL_SCRAPE_MINUTE,
            settings.TIME_ZONE,
        )

    except Exception as exc:
        logger.exception("Failed to sync British School scrape periodic task: %s", exc)
        _capture_signal_failure(exc, "british_school_scrape_schedule")


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
                "description": (
                    "Nedeľa 17:00 – pripomienka klientom, ktorí ešte nemajú "
                    "objednávky na budúci týždeň."
                ),
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
        _sync_british_school_scrape_schedule(instance)

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


@receiver(post_save, sender="api.Prevadzka")
def on_prevadzka_saved(sender, instance, created=False, **kwargs):
    """Apply canonical visibility defaults to newly created Prevádzka."""
    try:
        if created:
            from api.default_visibility import (
                DEFAULT_VISIBLE_MEALS,
                DEFAULT_VISIBLE_MENUS,
                ensure_default_visible_diets,
                ensure_default_visible_portion_types,
            )

            instance.visible_menus = DEFAULT_VISIBLE_MENUS
            instance.visible_meals = DEFAULT_VISIBLE_MEALS
            instance.save(update_fields=["visible_menus", "visible_meals"])
            ensure_default_visible_diets(instance.visible_diets)
            ensure_default_visible_portion_types(instance.visible_portion_types)

    except Exception as exc:
        logger.exception("Error initializing Prevadzka: %s", exc)
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
    """Nový login bez explicitného scope dostane vlastný Celok a Prevádzku."""
    from api.models import Celok, Prevadzka, ProfileCelokAccess

    def unique_celok_name(base_name: str, celok_id: int | None) -> str:
        """Return a unique Celok name without merging unrelated profiles."""
        candidate = base_name
        if Celok.objects.filter(nazov=candidate).exclude(pk=celok_id).exists():
            candidate = f"{base_name} ({instance.user.email})"
        if Celok.objects.filter(nazov=candidate).exclude(pk=celok_id).exists():
            candidate = f"{base_name} (#{instance.pk})"
        return candidate

    if not created or getattr(instance, "_skip_default_facility", False):
        return
    try:
        nazov = (instance.company_name or "").strip() or instance.user.email
        celok_nazov = unique_celok_name(nazov, None)
        celok = Celok.objects.create(
            nazov=celok_nazov,
        )
        Prevadzka.objects.create(celok=celok, nazov=nazov)
        ProfileCelokAccess.objects.create(profile=instance, celok=celok)
    except Exception as exc:
        logger.exception("Error creating default Celok/Prevadzka: %s", exc)
        _capture_signal_failure(exc, "user_profile_saved")


@receiver(post_save, sender="api.Celok")
@receiver(post_delete, sender="api.Celok")
@receiver(post_save, sender="api.Prevadzka")
@receiver(post_delete, sender="api.Prevadzka")
@receiver(post_save, sender="api.ProfileCelokAccess")
@receiver(post_delete, sender="api.ProfileCelokAccess")
@receiver(post_save, sender="api.ProfilePrevadzkaAccess")
@receiver(post_delete, sender="api.ProfilePrevadzkaAccess")
@receiver(post_save, sender="api.UserProfile")
@receiver(post_delete, sender="api.UserProfile")
@receiver(post_save, sender="api.PasswordResetToken")
@receiver(post_delete, sender="api.PasswordResetToken")
@receiver(post_save, sender="auth.User")
@receiver(post_delete, sender="auth.User")
def on_admin_celok_list_input_changed(sender, instance, **kwargs):
    """Invalidate the cached `/admin/celky/` list (#504 perf follow-up).

    Every one of these models feeds `AdminCelokViewSet.get_queryset()`
    (celok/prevádzka tree, prístupy, loginy, aktívne reset tokeny) — any write
    to them can change what that endpoint returns, so the cache is cleared
    unconditionally rather than tracked per-field.
    """
    try:
        from api.cache_service import clear_admin_celok_list_cache

        clear_admin_celok_list_cache()
    except Exception as exc:
        logger.exception("Error clearing admin celok list cache: %s", exc)
        _capture_signal_failure(exc, "admin_celok_list_input_changed")

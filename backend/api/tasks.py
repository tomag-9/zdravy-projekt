"""
Celery tasks for the api app.
"""

import logging
import time

from celery import shared_task
from django.conf import settings
from django.db import DatabaseError
from django.utils import timezone

from api.roles import klient_q
from api.services.push_notification_service import PushNotificationService

logger = logging.getLogger(__name__)

# Spreads push-reminder delivery across batches instead of sending to every
# subscriber in one instant. A single "uzávierka o chvíľu" push to everyone
# tends to make everyone open the app and log in within the same few
# seconds — measured load testing showed the backend collapses at roughly
# 4x its comfortable sustained rate (load-tests/README.md "Measured
# Capacity"), so a genuine simultaneous-open burst can realistically hit
# that. 0 by default (dev/test): only set via env in staging/prod settings.
#
# Batch size scales with recipient count (capped at PUSH_REMINDER_MAX_BATCHES
# batches) rather than using a fixed size, so total stagger time stays
# bounded regardless of how many users are subscribed —
# send_weekly_order_reminder_task has a 290s soft time limit.
PUSH_REMINDER_MIN_BATCH_SIZE = 25
PUSH_REMINDER_MAX_BATCHES = 10


def _log_cron_skip_event(task_name: str, reason: str, day) -> None:
    """Record a CRON_SKIPPED EventLog entry for an automatic run that was
    skipped for `reason` ("weekend" or "configured_day_off", per #442)."""
    from api.models import EventLog
    from api.services.event_log_service import log_event

    log_event(
        EventLog.EventType.CRON_SKIPPED,
        actor_label="cron",
        summary=f"{task_name}: preskočené ({reason}) na {day.isoformat()}.",
        payload={"reason": reason, "date": day.isoformat(), "task": task_name},
    )
    logger.info("%s skipped: reason=%s date=%s", task_name, reason, day)


def _log_cron_run(task_name: str, summary: str, payload: dict) -> None:
    """Zapíš, že cron úloha dobehla — aj keď nič neurobila.

    Preskočené behy sa zapisovali (`_log_cron_skip_event`), tie úspešné nie, takže
    v Udalostiach sa nedalo overiť, či scrape či report vôbec bežal — muselo sa
    liezť do logov `celery` kontajnera, kde ich prvý reštart prepíše. Ticho v
    audite navyše vyzerá rovnako ako výpadok.
    """
    from api.models import EventLog
    from api.services.event_log_service import log_event

    log_event(
        EventLog.EventType.CRON_RUN,
        actor_label="cron",
        summary=summary,
        payload={"task": task_name, **payload},
    )


def _log_cron_failure(task_name: str, exc: BaseException, payload: dict) -> None:
    """Zapíš pád cron úlohy. Bez toho po sebe zlyhanie nenechá stopu v audite."""
    from api.models import EventLog
    from api.services.event_log_service import log_event

    log_event(
        EventLog.EventType.CRON_FAILED,
        actor_label="cron",
        summary=f"{task_name}: zlyhalo — {type(exc).__name__}: {exc}".strip(),
        payload={"task": task_name, "error": f"{type(exc).__name__}: {exc}", **payload},
    )


def _cron_skip_check(task_name: str, check_date=None) -> str | None:
    """If `check_date` is a weekend or a configured Holiday, log the skip
    (see `_log_cron_skip_event`) and return the reason so the caller can
    bail out before any side effects. Returns None when the run should
    proceed normally.

    `check_date` must be the date the run actually prepares data FOR, not
    necessarily the date the cron fires on — a Sun-Thu evening schedule
    preparing tomorrow's (Mon-Fri) deadline must not skip just because
    today, the day it fires, happens to be a weekend (caught in prod on
    2026-08-31: the Sunday-evening leg of `apply_auto_orders_task` /
    `scrape_edupage_orders_task` silently skipped every week because this
    checked `timezone.localdate()` unconditionally instead of the resolved
    target date). Defaults to today for callers with no day-before target.

    Only call this for the Celery-Beat-scheduled path of a task (i.e. when
    no explicit target date was passed in) — a manually-triggered run for
    an explicit date is a deliberate admin action, not an automatic cron
    run, and must not be silently skipped.
    """
    from api.scheduling import cron_skip_reason

    day = check_date or timezone.localdate()
    reason = cron_skip_reason(day)
    if reason is None:
        return None
    _log_cron_skip_event(task_name, reason, day)
    return reason


def _push_batch_stagger_seconds() -> float:
    return getattr(settings, "PUSH_REMINDER_BATCH_STAGGER_SECONDS", 0)


def _push_batch_size(total_recipients: int) -> int:
    if total_recipients <= 0:
        return PUSH_REMINDER_MIN_BATCH_SIZE
    return max(
        PUSH_REMINDER_MIN_BATCH_SIZE,
        -(-total_recipients // PUSH_REMINDER_MAX_BATCHES),  # ceil division
    )


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    name="api.tasks.send_push_deadline_reminder_task",
)
def send_push_deadline_reminder_task(self, meal_types: list[str]):
    """
    Send push notifications to all subscribed clients 30 minutes before
    a meal deadline. When multiple meals share the same deadline they are
    passed together so that users receive a single combined notification.

    Args:
        meal_types: list of meal types, each one of 'breakfast', 'lunch',
                    'olovrant'. Meals that share a deadline are grouped
                    and sent as one notification.

    Target date logic:
    - If the is_day_before flag is set for a meal → target_date = next workday
    - Otherwise → target_date = today
    """
    from api.models import GlobalSettings, PushSubscription
    from api.services import _next_workday

    # Backward-compat: older Beat tasks stored args=["lunch"] (a bare string).
    # Iterating over a string would treat each character as a meal type and
    # return invalid_meal_type. Normalise to a list so old schedules keep
    # working until they are resynced by _sync_push_reminder_schedule.
    if isinstance(meal_types, str):
        meal_types = [meal_types]

    if not meal_types:
        logger.error("send_push_deadline_reminder_task: empty meal_types, no retry")
        return {"error": "empty_meal_types", "meal_types": meal_types}

    valid_meal_types = {"breakfast", "lunch", "olovrant"}
    invalid = [m for m in meal_types if m not in valid_meal_types]
    if invalid:
        logger.error(
            "send_push_deadline_reminder_task: invalid meal_types=%s, no retry",
            invalid,
        )
        return {"error": "invalid_meal_type", "meal_types": meal_types}

    try:
        gs = GlobalSettings.objects.get(pk=1)
    except GlobalSettings.DoesNotExist:
        logger.error(
            "send_push_deadline_reminder_task: GlobalSettings(pk=1) missing, no retry"
        )
        return {"error": "missing_global_settings", "meal_types": meal_types}

    from api.scheduling import day_off_reason, is_day_off

    today = timezone.localdate()

    # Determine target_date per meal and group by date.
    # All meals in one invocation typically share the same is_day_before, but
    # we handle them individually so settings changes mid-flight are safe.
    date_to_meals: dict = {}
    for meal_type in meal_types:
        is_day_before = getattr(gs, f"deadline_{meal_type}_is_day_before", False)
        target_date = _next_workday(today) if is_day_before else today
        # Skip weekends and admin-configured days off (Holiday) — #442.
        if not is_day_off(target_date):
            date_to_meals.setdefault(target_date, []).append(meal_type)

    if not date_to_meals:
        reason = day_off_reason(today) or "configured_day_off"
        logger.info(
            "send_push_deadline_reminder_task: %s skip for meal_types=%s",
            reason,
            meal_types,
        )
        _log_cron_skip_event("send_push_deadline_reminder_task", reason, today)
        return {"skipped": reason, "meal_types": meal_types}

    meal_labels = {
        "breakfast": "raňajky",
        "lunch": "obed",
        "olovrant": "olovrant",
    }

    def _build_meal_str(types: list[str]) -> str:
        labels = [meal_labels[m] for m in types]
        if len(labels) == 1:
            return labels[0]
        return ", ".join(labels[:-1]) + f" a {labels[-1]}"

    total_sent = 0
    sent_per_date: dict[str, int] = {}
    try:
        subscribed_user_ids = list(
            # Klientske notifikácie na objednávanie — kuchyňa ich dostávať nesmie,
            # hoci má tiež `is_staff=False` (#482).
            PushSubscription.objects.filter(
                klient_q("user"),
                user__is_active=True,
            )
            .values_list("user_id", flat=True)
            .distinct()
        )

        for target_date, date_meals in date_to_meals.items():
            date_fmt = target_date.strftime("%d.%m.%Y")
            meal_str = _build_meal_str(date_meals)
            body = (
                f"Nezabudnite objednať {meal_str} na {date_fmt}. Uzávierka je o chvíľu!"
            )
            date_sent = 0
            stagger = _push_batch_stagger_seconds()
            batch_size = _push_batch_size(len(subscribed_user_ids))
            for idx, user_id in enumerate(subscribed_user_ids):
                if stagger and idx and idx % batch_size == 0:
                    time.sleep(stagger)
                result = PushNotificationService.send_to_user(
                    user_id=user_id,
                    title="Pripomienka objednávky",
                    body=body,
                    url="/order",
                )
                date_sent += result.get("sent", 0)
            total_sent += date_sent
            sent_per_date[str(target_date)] = date_sent
            logger.info(
                "send_push_deadline_reminder_task: meals=%s date=%s sent=%d",
                sorted(date_meals),
                target_date,
                date_sent,
            )

    except DatabaseError as exc:
        logger.exception(
            "send_push_deadline_reminder_task: database error, retrying..."
        )
        _log_cron_failure(
            "send_push_deadline_reminder_task", exc, {"meal_types": meal_types}
        )
        raise self.retry(exc=exc)
    except Exception as exc:
        logger.exception(
            "send_push_deadline_reminder_task failed with non-transient error, no retry"
        )
        _log_cron_failure(
            "send_push_deadline_reminder_task", exc, {"meal_types": meal_types}
        )
        raise

    # "date" keeps the first date for backward compatibility with callers that
    # only expect a single date (the common case where all meals share one deadline).
    first_date = next(iter(date_to_meals))
    _log_cron_run(
        "send_push_deadline_reminder_task",
        f"Cron poslal {total_sent} push pripomienok "
        f"({', '.join(meal_types)}) na {first_date}.",
        {
            "sent": total_sent,
            "meal_types": meal_types,
            "date": str(first_date),
            "sent_per_date": {str(k): v for k, v in sent_per_date.items()},
        },
    )
    return {
        "sent": total_sent,
        "meal_types": meal_types,
        "date": str(first_date),
        "sent_per_date": sent_per_date,
    }


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    time_limit=300,
    soft_time_limit=290,
    name="api.tasks.send_weekly_order_reminder_task",
)
def send_weekly_order_reminder_task(self):
    """
    Send a Sunday push reminder to clients who have no submitted orders for next week.
    Fires every Sunday (scheduled via Celery Beat).
    Users who already have at least one submitted order for Mon–Fri of next week are skipped.
    """
    import datetime

    from django.db.models import Q

    from api.models import DailyOrder, PushSubscription

    today = timezone.localdate()
    # Compute next Monday and next Friday
    days_until_monday = (7 - today.weekday()) % 7 or 7
    next_monday = today + datetime.timedelta(days=days_until_monday)
    next_friday = next_monday + datetime.timedelta(days=4)

    try:
        subscribed_user_ids = set(
            # Klientske notifikácie na objednávanie — kuchyňa ich dostávať nesmie,
            # hoci má tiež `is_staff=False` (#482).
            PushSubscription.objects.filter(
                klient_q("user"),
                user__is_active=True,
            )
            .values_list("user_id", flat=True)
            .distinct()
        )

        # Stored orders are submitted orders; draft requests delete the row.
        already_ordered = set(
            DailyOrder.objects.filter(
                user_id__in=subscribed_user_ids,
                date__range=(next_monday, next_friday),
            )
            .exclude(Q(data={}) | Q(data__isnull=True))
            .values_list("user_id", flat=True)
            .distinct()
        )

        recipients = subscribed_user_ids - already_ordered
        if not recipients:
            logger.info(
                "send_weekly_order_reminder_task: all users already ordered, skip"
            )
            _log_cron_run(
                "send_weekly_order_reminder_task",
                f"Cron: týždenná pripomienka na {next_monday} neposlaná — "
                "všetci už objednali.",
                {
                    "sent": 0,
                    "skipped_ordered": len(already_ordered),
                    "next_week": str(next_monday),
                },
            )
            return {"skipped": "all_ordered", "next_week": str(next_monday)}

        week_label = (
            next_monday.strftime("%d.%m.") + "–" + next_friday.strftime("%d.%m.%Y")
        )
        body = f"Nezabudnite vyplniť objednávku na budúci týždeň ({week_label})."

        sent = 0
        stagger = _push_batch_stagger_seconds()
        batch_size = _push_batch_size(len(recipients))
        for idx, user_id in enumerate(recipients):
            if stagger and idx and idx % batch_size == 0:
                time.sleep(stagger)
            result = PushNotificationService.send_to_user(
                user_id=user_id,
                title="Pripomienka objednávky",
                body=body,
                url="/order",
            )
            sent += result.get("sent", 0)

        logger.info(
            "send_weekly_order_reminder_task: next_week=%s sent=%d skipped=%d",
            next_monday,
            sent,
            len(already_ordered),
        )
        _log_cron_run(
            "send_weekly_order_reminder_task",
            f"Cron poslal {sent} týždenných pripomienok na {next_monday}.",
            {
                "sent": sent,
                "skipped_ordered": len(already_ordered),
                "next_week": str(next_monday),
            },
        )
        return {
            "sent": sent,
            "skipped_ordered": len(already_ordered),
            "next_week": str(next_monday),
        }

    except DatabaseError as exc:
        logger.exception("send_weekly_order_reminder_task: database error, retrying...")
        _log_cron_failure(
            "send_weekly_order_reminder_task", exc, {"next_week": str(next_monday)}
        )
        raise self.retry(exc=exc)
    except Exception as exc:
        logger.exception(
            "send_weekly_order_reminder_task: non-transient error, no retry"
        )
        _log_cron_failure(
            "send_weekly_order_reminder_task", exc, {"next_week": str(next_monday)}
        )
        raise


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def apply_auto_orders_task(self, date_str: str | None = None):
    """
    Celery task: apply auto-orders for all eligible clients.
    Called by Celery Beat after the daily deadline.
    Can also be triggered manually via the admin API endpoint.
    """
    try:
        import datetime

        from api.models import EventLog
        from api.services import apply_auto_orders
        from api.services.event_log_service import log_event

        target_date = None
        if date_str:
            target_date = datetime.date.fromisoformat(date_str)
        else:
            from api.services import _next_workday

            # Check the day this run actually prepares (the next workday),
            # not "today" — the Sun-Thu schedule fires on Sunday precisely
            # to prepare Monday, and Sunday itself is always a weekend.
            next_workday = _next_workday(timezone.localdate())
            if (
                reason := _cron_skip_check("apply_auto_orders_task", next_workday)
            ) is not None:
                return {"skipped": True, "reason": reason}

        result = apply_auto_orders(target_date)
        log_event(
            EventLog.EventType.AUTO_ORDER_RUN,
            actor_label="cron",
            summary=f"Cron spustil auto-objednávky na {result['date']}.",
            payload={
                "created_count": len(result["created"]),
                "skipped_count": result["skipped"],
                "date": result["date"],
            },
        )
        logger.info("apply_auto_orders_task result: %s", result)
        return result
    except Exception as exc:
        logger.exception("apply_auto_orders_task failed, retrying...")
        raise self.retry(exc=exc)


def _filter_order_data_by_meals(order_data, meal_types):
    if meal_types is None:
        return order_data
    return {
        meal_type: order_data[meal_type]
        for meal_type in meal_types
        if order_data.get(meal_type)
    }


_ALL_MEALS = ("breakfast", "lunch", "olovrant")


def _apply_scrape(existing_data, imported_data, requested_meals):
    """Vlož výsledok scrapu s UPDATE sémantikou (nie ADD).

    Scrape je autoritatívny pre vyžiadané jedlá: každé z nich sa prepíše tým, čo
    EduPage vrátil, a ak dnes kleslo na nulu, VYMAŽE sa. Bez toho by po zrušení
    objednávky ostala v prehľade stará hodnota. Nevyžiadané jedlá ostávajú netknuté.
    """
    result = dict(existing_data or {})
    meals = _ALL_MEALS if requested_meals is None else requested_meals
    for meal_type in meals:
        scraped = imported_data.get(meal_type)
        if scraped:
            result[meal_type] = scraped
        else:
            result.pop(meal_type, None)
    return result


def _dispatch_chained_reports(
    chained_reports: list[list[str]] | None,
    date_strs: list[str],
    scrape_failed: bool,
) -> list[dict]:
    """Queue the daily reports that were waiting on this scrape (issue #474).

    One report per (meal set × imported date), addressed to the exact date the
    scrape just wrote — not to a date guessed from the clock. Returns what was
    dispatched so the scrape summary can carry it.
    """
    if not chained_reports or not date_strs:
        return []

    dispatched = []
    for meals in chained_reports:
        for date_str in date_strs:
            send_daily_report_task.apply_async(
                kwargs={
                    "meals": list(meals),
                    "date_str": date_str,
                    "scrape_failed": scrape_failed,
                }
            )
            dispatched.append({"meals": list(meals), "date": date_str})

    logger.info(
        "Chained %d daily report(s) after the scrape (scrape_failed=%s): %s",
        len(dispatched),
        scrape_failed,
        dispatched,
    )
    return dispatched


def _scrape_target_dates(
    date_str: str | None,
    meal_types: list[str] | None,
    target_next_workday: bool = False,
):
    """Best-effort resolution of the dates a scrape run targets.

    Used on the give-up path, where the run blew up before (or while) computing
    them. Returns an empty list when even this cannot be determined.
    """
    import datetime

    from django.utils import timezone

    from api.services import _next_workday

    if date_str:
        return [date_str]

    today = timezone.localdate()
    if not meal_types:
        target: datetime.date = _next_workday(today) if target_next_workday else today
        return [target.isoformat()]

    from api.models import GlobalSettings

    try:
        gs = GlobalSettings.objects.get(pk=1)
    except Exception:
        logger.exception("Cannot resolve scrape target dates without GlobalSettings")
        return []

    dates = set()
    for meal_type in meal_types:
        is_day_before = getattr(gs, f"deadline_{meal_type}_is_day_before", False)
        target = _next_workday(today) if is_day_before else today
        dates.add(target.isoformat())
    return sorted(dates)


def _handle_scrape_give_up(
    exc: Exception,
    date_str: str | None,
    meal_types: list[str] | None,
    chained_reports: list[list[str]] | None,
    target_next_workday: bool = False,
) -> None:
    """Record an exhausted scrape and still send its chained reports, flagged."""
    from api.models import EventLog
    from api.services.event_log_service import log_event

    date_strs = _scrape_target_dates(date_str, meal_types, target_next_workday)

    try:
        # CRON_FAILED, nie CRON_SKIPPED: preskočenie znamená „víkend alebo voľný
        # deň, nemalo sa čo diať". Vyčerpaný scrape je zlyhanie a v tabuľke
        # udalostí musí vyzerať inak, inak sa stratí medzi bežnými víkendmi.
        log_event(
            EventLog.EventType.CRON_FAILED,
            actor_label="cron",
            summary=(
                "EduPage scrape zlyhal aj po opakovaniach — denný report ide "
                "von s upozornením, že počty nemusia byť finálne."
            ),
            payload={
                "task": "scrape_edupage_orders_task",
                "error": str(exc),
                "meal_types": meal_types,
                "dates": date_strs,
                "chained_reports": chained_reports or [],
            },
        )
    except Exception:
        logger.exception("Failed to log the exhausted EduPage scrape")

    _dispatch_chained_reports(chained_reports, date_strs, scrape_failed=True)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def scrape_edupage_orders_task(
    self,
    date_str: str | None = None,
    meal_types: list[str] | None = None,
    chained_reports: list[list[str]] | None = None,
    connection_id: int | None = None,
    exclude_connection_ids: list[int] | None = None,
    target_next_workday: bool = False,
):
    """
    Scrape mealsGuest HTML for all Edupage operations and upsert DailyOrder records.

    Called by Celery Beat before each meal deadline so order counts are ready when
    the kitchen needs them. Can also be triggered manually via the admin API.

    ``chained_reports`` holds the meal sets whose daily report must go out once
    this import has landed (issue #474). Chaining replaces the old arrangement of
    two independent crontabs separated by a 10-minute gap, which was an
    assumption rather than a guarantee: a slow or retrying scrape let the report
    leave with counts the import had not written yet. Each report is dispatched
    for the exact date(s) this run imported, so the report can no longer describe
    a different day than the one that was just scraped.

    ``connection_id`` / ``exclude_connection_ids`` scope the run to (or away
    from) one `EdupageConnection` — used by the British School dedicated
    schedule (#535), which scrapes on its own crontab (12:15 the day before)
    separate from the shared GlobalSettings meal deadlines, so it must be
    excluded from the deadline-derived runs to avoid a redundant second scrape.
    ``target_next_workday`` mirrors a `deadline_*_is_day_before` meal (target =
    the next workday, not today) for a run that has no `meal_types` of its own
    to read that flag from.
    """
    try:
        import datetime

        from django.db import transaction
        from django.utils import timezone

        from api.edupage_scraper import (
            EdupageScraper,
            allowed_diet_names,
            build_prevadzka_matches,
            nest_order_data_by_category,
            prevadzky_without_match,
        )
        from api.models import DailyOrder, GlobalSettings
        from api.scheduling import closed_dates_for_prevadzky
        from api.services import _next_workday
        from api.services.edupage_connection_service import edupage_operations
        from api.utils import filter_order_data_for_prevadzka

        valid_meal_types = {"breakfast", "lunch", "olovrant"}
        if isinstance(meal_types, str):
            meal_types = [meal_types]
        if meal_types is not None:
            invalid = [meal for meal in meal_types if meal not in valid_meal_types]
            if invalid:
                logger.error(
                    "scrape_edupage_orders_task: invalid meal_types=%s, no retry",
                    invalid,
                )
                return {"error": "invalid_meal_type", "meal_types": meal_types}

        date_to_meals: dict[datetime.date, list[str] | None]
        if date_str:
            target_date = datetime.date.fromisoformat(date_str)
            date_to_meals = {target_date: meal_types}
        else:
            try:
                gs = GlobalSettings.objects.get(pk=1)
            except GlobalSettings.DoesNotExist:
                logger.error(
                    "scrape_edupage_orders_task: GlobalSettings(pk=1) missing, no retry"
                )
                return {
                    "error": "missing_global_settings",
                    "meal_types": meal_types,
                }
            if not getattr(gs, "edupage_auto_scrape_enabled", True):
                logger.info(
                    "scrape_edupage_orders_task: automatic EduPage scrape is disabled"
                )
                return {
                    "scraped": 0,
                    "errors": 0,
                    "skipped": 0,
                    "dates": [],
                    "meal_types": meal_types,
                    "disabled": True,
                }

            today = timezone.localdate()
            if meal_types is None:
                target_date = _next_workday(today) if target_next_workday else today
                date_to_meals = {target_date: None}
            else:
                date_to_meals = {}
                for meal_type in meal_types:
                    is_day_before = getattr(
                        gs, f"deadline_{meal_type}_is_day_before", False
                    )
                    target_date = _next_workday(today) if is_day_before else today
                    target_meals = date_to_meals.setdefault(target_date, [])
                    assert target_meals is not None
                    target_meals.append(meal_type)

            # Skip only the dates this run actually resolved to that are
            # themselves a day off — not "today" (the day the cron fires).
            # A Sun-Thu schedule with `target_next_workday`/`*_is_day_before`
            # fires on Sunday precisely to prepare Monday, and Sunday itself
            # is always a weekend, so checking "today" would always bail.
            skip_reason = None
            for skip_date in list(date_to_meals):
                skip_reason = _cron_skip_check("scrape_edupage_orders_task", skip_date)
                if skip_reason is not None:
                    del date_to_meals[skip_date]

            if not date_to_meals:
                return {
                    "scraped": 0,
                    "errors": 0,
                    "skipped": 0,
                    "dates": [],
                    "meal_types": meal_types,
                    "skipped_run": True,
                    "reason": skip_reason,
                }

        scraper = EdupageScraper()
        # Whitelist diét sa číta raz za beh — je rovnaký pre všetky prevádzky.
        allowed_diets = allowed_diet_names()
        scraped = errors = skipped = 0

        operations = edupage_operations(connection_id=connection_id)
        if exclude_connection_ids:
            operations = [
                operation
                for operation in operations
                if operation["connection_id"] not in exclude_connection_ids
            ]

        for operation in operations:
            prevadzky = list(operation["prevadzky"])
            if not prevadzky:
                logger.warning(
                    "scrape_edupage_orders_task: %s nemá žiadnu prevádzku — preskakujem",
                    operation["name"],
                )
                skipped += 1
                continue

            # Viac prevádzok → EduPage riadky rozdelíme podľa `edupage_match`.
            # Jedna prevádzka → split nerobíme a všetko ide do nej.
            by_nazov = {p.nazov: p for p in prevadzky}
            # Voľno prevádzky (#490): na taký deň sa jej plán nezakladá vôbec.
            # Jeden dotaz na celok, nie na každý (prevádzka × deň).
            scrape_dates = list(date_to_meals)
            closed_by_prevadzka = closed_dates_for_prevadzky(
                [p.id for p in prevadzky], min(scrape_dates), max(scrape_dates)
            )
            matches = build_prevadzka_matches(prevadzky)
            bez_matchu = prevadzky_without_match(prevadzky)
            if len(prevadzky) > 1 and bez_matchu:
                logger.error(
                    "scrape_edupage_orders_task: %s má %d prevádzok, ale %s nemá "
                    "edupage_match — preskakujem, aby sa objem nezapísal nesprávne",
                    operation["name"],
                    len(prevadzky),
                    ", ".join(bez_matchu),
                )
                skipped += 1
                continue

            for target_date, requested_meals in date_to_meals.items():
                try:
                    result = scraper.scrape(
                        operation["url"],
                        target_date,
                        prevadzka_matches=matches if len(prevadzky) > 1 else None,
                        allowed_diets=allowed_diets,
                    )
                except Exception:
                    logger.exception(
                        "scrape_edupage_orders_task: failed for %s",
                        operation["url"],
                    )
                    errors += 1
                    continue

                if result.config_notes:
                    logger.warning(
                        "scrape_edupage_orders_task: config drift for %s on %s: %s",
                        operation["name"],
                        target_date,
                        result.config_notes,
                    )
                if result.attention:
                    logger.info(
                        "scrape_edupage_orders_task: manual check for %s on %s: %s",
                        operation["name"],
                        target_date,
                        result.attention,
                    )
                if result.unmapped_letters:
                    logger.warning(
                        "scrape_edupage_orders_task: neznáme diéty pre %s na %s: %s "
                        "— porcie sú započítané, ale diétu treba založiť v appke",
                        operation["name"],
                        target_date,
                        result.unmapped_letters,
                    )

                # Jedna prevádzka → celý objem jej; viac → podľa edupage_match.
                if len(prevadzky) > 1:
                    data_by_nazov = result.order_data_by_prevadzka
                else:
                    data_by_nazov = {prevadzky[0].nazov: result.order_data}

                for nazov, prevadzka in by_nazov.items():
                    if target_date in closed_by_prevadzka.get(prevadzka.id, set()):
                        logger.info(
                            "scrape_edupage_orders_task: %s má na %s voľno — "
                            "plán nezakladám",
                            nazov,
                            target_date,
                        )
                        skipped += 1
                        continue

                    # Pri rozdelenom celku priraď každej prevádzke len tie flagy,
                    # ktorých porcie do nej reálne padli; config_notes sú celok-wide.
                    if len(prevadzky) > 1:
                        attention_for_prevadzka = result.attention_by_prevadzka.get(
                            nazov, []
                        )
                        unmapped_for_prevadzka = result.unmapped_by_prevadzka.get(
                            nazov, []
                        )
                        uncertain_for_prevadzka = result.uncertain_by_prevadzka.get(
                            nazov, []
                        )
                    else:
                        attention_for_prevadzka = result.attention
                        unmapped_for_prevadzka = result.unmapped_letters
                        uncertain_for_prevadzka = result.uncertain_letters

                    nested_order_data = nest_order_data_by_category(
                        data_by_nazov.get(nazov, {}), nazov
                    )
                    nested_order_data = filter_order_data_for_prevadzka(
                        nested_order_data, nazov
                    )
                    imported_data = _filter_order_data_by_meals(
                        nested_order_data, requested_meals
                    )

                    # Skutočné zlyhanie scrapu (chýbajúci/pokazený prehlad blok,
                    # nezmapované písmeno, riadok bez prevádzky) - neprepisujeme
                    # existujúce dáta prázdnom, mohli by sme zmazať platné počty.
                    # `uncertain_letters` sem zámerne nepatrí — je to len "over ma"
                    # signál (ako `config_notes`), nie signál zlyhania scrapu.
                    if not imported_data and (
                        result.warnings or result.unmapped_letters
                    ):
                        logger.info(
                            "scrape_edupage_orders_task: empty result for %s/%s on %s "
                            "meals=%s (warnings=%s, unmapped=%s)",
                            operation["name"],
                            nazov,
                            target_date,
                            result.warnings,
                            result.unmapped_letters,
                        )
                        skipped += 1
                        continue

                    # Úspešný scrape (aj s nulovými počtami) je autoritatívny:
                    # prepíše vyžiadané jedlá a vyčistí tie, čo dnes klesli na nulu.
                    # Explicitný záznam (aj prázdny) odlíši "0 objednávok" od
                    # "nikdy nescrapované".
                    with transaction.atomic():
                        order, _ = DailyOrder.objects.select_for_update().get_or_create(
                            prevadzka=prevadzka,
                            date=target_date,
                            defaults={"user": operation["user"], "data": {}},
                        )
                        order.data = _apply_scrape(
                            order.data, imported_data, requested_meals
                        )
                        # Upozornenia posledného scrapu — prepíšeme (aj prázdnym),
                        # nech admin prehľad nezobrazuje výkričník z minulého behu,
                        # ktorý sa už medzitým vyriešil.
                        order.scrape_flags = {
                            "attention": list(attention_for_prevadzka),
                            "config_notes": list(result.config_notes),
                            "unmapped_diets": list(unmapped_for_prevadzka),
                            "uncertain_diets": list(uncertain_for_prevadzka),
                        }
                        order.save(update_fields=["data", "scrape_flags", "updated_at"])
                    scraped += 1

        summary = {
            "scraped": scraped,
            "errors": errors,
            "skipped": skipped,
            "dates": [str(target_date) for target_date in date_to_meals],
            "meal_types": meal_types,
        }
        dispatched = _dispatch_chained_reports(
            chained_reports,
            [str(target_date) for target_date in date_to_meals],
            scrape_failed=False,
        )
        if dispatched:
            summary["chained_reports_dispatched"] = dispatched
        logger.info("scrape_edupage_orders_task result: %s", summary)
        scraped_dates = ", ".join(str(target_date) for target_date in date_to_meals)
        _log_cron_run(
            "scrape_edupage_orders_task",
            f"Cron stiahol EduPage objednávky ({scraped_dates}): "
            f"{scraped} prevádzok, {errors} chýb, {skipped} preskočených.",
            summary,
        )
        return summary

    except Exception as exc:
        logger.exception("scrape_edupage_orders_task failed, retrying...")
        try:
            raise self.retry(exc=exc)
        except self.MaxRetriesExceededError:
            # Retries are spent. The kitchen still needs numbers, so the chained
            # report goes out — but explicitly marked as possibly not final,
            # instead of quietly looking like a normal day (issue #474).
            _handle_scrape_give_up(
                exc, date_str, meal_types, chained_reports, target_next_workday
            )
            raise


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_daily_report_task(
    self,
    meals: list[str] | None = None,
    date_str: str | None = None,
    scrape_failed: bool = False,
):
    """
    Celery task: send daily order report.

    Normally chained after `scrape_edupage_orders_task` (issue #474), which
    passes the exact date it imported. The standalone Celery Beat schedule is
    only used when the EduPage auto-scrape is off; there the date defaults to
    yesterday.

    Args:
        meals: List of meals to include (breakfast, lunch, olovrant).
               If None, includes all meals.
        date_str: Target date in YYYY-MM-DD format. Defaults to yesterday.
        scrape_failed: Set by the chaining scrape when its retries were
               exhausted — the report still goes out, but says so.
    """
    try:
        import datetime

        from django.core import management
        from django.utils import timezone

        from api.models import GlobalSettings

        # Determine target date
        if date_str:
            target_date = datetime.date.fromisoformat(date_str)
        else:
            gs = GlobalSettings.objects.filter(pk=1).first()
            if gs is not None and not getattr(gs, "daily_report_enabled", True):
                logger.info("send_daily_report_task: daily reports are disabled")
                # Vypnutý report je tichý stav, ktorý sa zvonku nedá odlíšiť od
                # rozbitého cronu — preto sa zapisuje.
                _log_cron_run(
                    "send_daily_report_task",
                    "Cron: denný report neodoslaný — je vypnutý v nastaveniach.",
                    {"sent": False, "reason": "daily_report_disabled", "meals": meals},
                )
                return {"skipped": True, "reason": "daily_report_disabled"}

            target_date = timezone.localdate() - datetime.timedelta(days=1)
            # Check the day the report is actually ABOUT (yesterday), not
            # today — the two only ever differ by weekday name, but "today"
            # is the wrong date on principle (see `_cron_skip_check`).
            if (
                reason := _cron_skip_check("send_daily_report_task", target_date)
            ) is not None:
                return {"skipped": True, "reason": reason}

        # Build meal argument
        meals_arg = ",".join(meals) if meals else "breakfast,lunch,olovrant"

        command_args = [
            f"--date={target_date.isoformat()}",
            f"--meals={meals_arg}",
        ]
        if scrape_failed:
            command_args.append("--data-may-be-stale")

        # Call the management command
        management.call_command("send_order_report", *command_args)

        logger.info(
            "Daily report sent for %s (meals: %s, scrape_failed=%s)",
            target_date.isoformat(),
            meals_arg,
            scrape_failed,
        )
        _log_cron_run(
            "send_daily_report_task",
            f"Cron odoslal denný report na {target_date} ({meals_arg})."
            + (" Počty nemusia byť finálne." if scrape_failed else ""),
            {
                "sent": True,
                "date": target_date.isoformat(),
                "meals": meals_arg.split(","),
                "scrape_failed": scrape_failed,
            },
        )
        return f"Report sent for {target_date} with meals: {meals_arg}"
    except Exception as exc:
        logger.exception("send_daily_report_task failed, retrying...")
        _log_cron_failure(
            "send_daily_report_task", exc, {"meals": meals, "date": date_str}
        )
        raise self.retry(exc=exc)


#: Ako dlho sa držia záznamy o udalostiach. Audit slúži na dohľadanie „kto čo
#: zmenil" v čerstvej prevádzke, nie na dlhodobú archiváciu — bez stropu
#: tabuľka rastie donekonečna.
EVENT_LOG_RETENTION_DAYS = 7


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def purge_old_event_logs_task(self, days: int | None = None):
    """Zmaže záznamy udalostí staršie než `days` (default 7).

    Beží denne. Maže po dávkach, aby jedna transakcia nedržala zámok nad celou
    tabuľkou, keď sa raz nakopí väčší objem.
    """
    import datetime

    from api.models import EventLog

    retention = EVENT_LOG_RETENTION_DAYS if days is None else int(days)
    cutoff = timezone.now() - datetime.timedelta(days=retention)

    try:
        deleted_total = 0
        while True:
            batch_ids = list(
                EventLog.objects.filter(created_at__lt=cutoff).values_list(
                    "pk", flat=True
                )[:1000]
            )
            if not batch_ids:
                break
            deleted, _ = EventLog.objects.filter(pk__in=batch_ids).delete()
            deleted_total += deleted

        logger.info(
            "purge_old_event_logs_task: zmazaných %s udalostí starších než %s dní",
            deleted_total,
            retention,
        )
        return {"deleted": deleted_total, "retention_days": retention}
    except DatabaseError as exc:
        logger.warning("purge_old_event_logs_task: DB chyba, skúšam znova: %s", exc)
        raise self.retry(exc=exc)

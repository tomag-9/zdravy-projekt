"""
Celery tasks for the api app.
"""

import logging

from celery import shared_task
from django.db import DatabaseError
from django.utils import timezone

from api.services.push_notification_service import PushNotificationService

logger = logging.getLogger(__name__)

REPORT_CACHE_TIMEOUT = 3600  # 1 hour


@shared_task(
    bind=True,
    max_retries=0,
    time_limit=600,
    soft_time_limit=590,
    name="api.tasks.generate_report_pdf",
)
def generate_report_pdf_task(self, date_str: str):
    """Generate a PDF report in the background and store it in cache.

    Args:
        date_str: Target date in YYYY-MM-DD format.

    Returns:
        dict with status, format, and date on success.
    """
    import datetime

    from django.core.cache import cache

    from api.exporters import PDFReportExporter
    from api.models import DailyOrder

    target_date = datetime.date.fromisoformat(date_str)
    orders = (
        DailyOrder.objects.filter(date=target_date)
        .select_related("user", "user__profile", "user__settings")
        .order_by("user__email")
    )
    pdf_bytes = PDFReportExporter(orders, date_str).generate()
    # Use task id in cache key to ensure concurrent requests for the same
    # date/format don't overwrite each other. The download endpoint uses
    # this key from the task result.
    cache_key = f"report_task:{self.request.id}"
    cache.set(cache_key, pdf_bytes, timeout=REPORT_CACHE_TIMEOUT)
    logger.info("generate_report_pdf_task complete for %s", date_str)
    return {
        "status": "complete",
        "format": "pdf",
        "date": date_str,
        "cache_key": cache_key,
    }


@shared_task(
    bind=True,
    max_retries=0,
    time_limit=600,
    soft_time_limit=590,
    name="api.tasks.generate_report_xlsx",
)
def generate_report_xlsx_task(self, date_str: str):
    """Generate an XLSX report in the background and store it in cache.

    Args:
        date_str: Target date in YYYY-MM-DD format.

    Returns:
        dict with status, format, and date on success.
    """
    import datetime

    from django.core.cache import cache

    from api.exporters import XLSXReportExporter
    from api.services import ReportService

    target_date = datetime.date.fromisoformat(date_str)
    rows_data = ReportService.get_orders_for_export(target_date)
    xlsx_bytes = XLSXReportExporter(rows_data, date_str).generate()
    # Use task id in cache key to ensure concurrent requests for the same
    # date/format don't overwrite each other. The download endpoint uses
    # this key from the task result.
    cache_key = f"report_task:{self.request.id}"
    cache.set(cache_key, xlsx_bytes, timeout=REPORT_CACHE_TIMEOUT)
    logger.info("generate_report_xlsx_task complete for %s", date_str)
    return {
        "status": "complete",
        "format": "xlsx",
        "date": date_str,
        "cache_key": cache_key,
    }


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    name="api.tasks.send_push_deadline_reminder_task",
)
def send_push_deadline_reminder_task(self, meal_types: list[str]):
    """
    Send push notifications to all subscribed clients 15 minutes before
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

    today = timezone.localdate()

    # Determine target_date per meal and group by date.
    # All meals in one invocation typically share the same is_day_before, but
    # we handle them individually so settings changes mid-flight are safe.
    date_to_meals: dict = {}
    for meal_type in meal_types:
        is_day_before = getattr(gs, f"deadline_{meal_type}_is_day_before", False)
        target_date = _next_workday(today) if is_day_before else today
        if target_date.weekday() < 5:  # skip weekends
            date_to_meals.setdefault(target_date, []).append(meal_type)

    if not date_to_meals:
        logger.info(
            "send_push_deadline_reminder_task: weekend skip for meal_types=%s",
            meal_types,
        )
        return {"skipped": "weekend", "meal_types": meal_types}

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
            PushSubscription.objects.filter(
                user__is_staff=False,
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
            for user_id in subscribed_user_ids:
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
        raise self.retry(exc=exc)
    except Exception:
        logger.exception(
            "send_push_deadline_reminder_task failed with non-transient error, "
            "no retry"
        )
        raise

    # "date" keeps the first date for backward compatibility with callers that
    # only expect a single date (the common case where all meals share one deadline).
    first_date = next(iter(date_to_meals))
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
            PushSubscription.objects.filter(
                user__is_staff=False,
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
            return {"skipped": "all_ordered", "next_week": str(next_monday)}

        week_label = (
            next_monday.strftime("%d.%m.") + "–" + next_friday.strftime("%d.%m.%Y")
        )
        body = f"Nezabudnite vyplniť objednávku na budúci týždeň ({week_label})."

        sent = 0
        for user_id in recipients:
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
        return {
            "sent": sent,
            "skipped_ordered": len(already_ordered),
            "next_week": str(next_monday),
        }

    except DatabaseError as exc:
        logger.exception("send_weekly_order_reminder_task: database error, retrying...")
        raise self.retry(exc=exc)
    except Exception:
        logger.exception(
            "send_weekly_order_reminder_task: non-transient error, no retry"
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

        from api.services import apply_auto_orders

        target_date = None
        if date_str:
            target_date = datetime.date.fromisoformat(date_str)

        result = apply_auto_orders(target_date)
        logger.info("apply_auto_orders_task result: %s", result)
        return result
    except Exception as exc:
        logger.exception("apply_auto_orders_task failed, retrying...")
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def scrape_edupage_orders_task(self, date_str: str | None = None):
    """
    Scrape mealsGuest HTML for all Edupage operations and upsert DailyOrder records.

    Called by Celery Beat before each meal deadline so order counts are ready when
    the kitchen needs them. Can also be triggered manually via the admin API.
    """
    try:
        import datetime

        from django.db import transaction
        from django.utils import timezone

        from api.edupage_scraper import EdupageScraper
        from api.models import DailyOrder, UserProfile

        target_date: datetime.date
        if date_str:
            target_date = datetime.date.fromisoformat(date_str)
        else:
            target_date = timezone.localdate()

        profiles = (
            UserProfile.objects.filter(is_edupage=True)
            .exclude(mealsguest_url="")
            .select_related("user")
        )

        scraper = EdupageScraper()
        scraped = errors = skipped = 0

        for profile in profiles:
            try:
                result = scraper.scrape(profile.mealsguest_url, target_date)
            except Exception:
                logger.exception(
                    "scrape_edupage_orders_task: failed for %s", profile.mealsguest_url
                )
                errors += 1
                continue

            if not result.order_data:
                logger.info(
                    "scrape_edupage_orders_task: empty result for %s on %s (warnings=%s)",
                    profile.company_name,
                    target_date,
                    result.warnings,
                )
                skipped += 1
                continue

            with transaction.atomic():
                DailyOrder.objects.update_or_create(
                    user=profile.user,
                    date=target_date,
                    defaults={"data": result.order_data},
                )
            scraped += 1

        summary = {
            "scraped": scraped,
            "errors": errors,
            "skipped": skipped,
            "date": str(target_date),
        }
        logger.info("scrape_edupage_orders_task result: %s", summary)
        return summary

    except Exception as exc:
        logger.exception("scrape_edupage_orders_task failed, retrying...")
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_daily_report_task(
    self, meals: list[str] | None = None, date_str: str | None = None
):
    """
    Celery task: send daily order report.
    Called by Celery Beat at scheduled times (breakfast deadline and olovrant deadline).

    Args:
        meals: List of meals to include (breakfast, lunch, olovrant).
               If None, includes all meals.
        date_str: Target date in YYYY-MM-DD format. Defaults to yesterday.
    """
    try:
        import datetime

        from django.core import management
        from django.utils import timezone

        # Determine target date
        if date_str:
            target_date = datetime.date.fromisoformat(date_str)
        else:
            target_date = timezone.localdate() - datetime.timedelta(days=1)

        # Build meal argument
        meals_arg = ",".join(meals) if meals else "breakfast,lunch,olovrant"

        # Call the management command
        management.call_command(
            "send_order_report",
            f"--date={target_date.isoformat()}",
            f"--meals={meals_arg}",
        )

        logger.info(
            "Daily report sent for %s (meals: %s)",
            target_date.isoformat(),
            meals_arg,
        )
        return f"Report sent for {target_date} with meals: {meals_arg}"
    except Exception as exc:
        logger.exception("send_daily_report_task failed, retrying...")
        raise self.retry(exc=exc)

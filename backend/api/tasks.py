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
        .select_related("user", "user__settings")
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
def send_push_deadline_reminder_task(self, meal_type: str):
    """
    Send push notifications to users who haven't submitted an order yet,
    fired 15 minutes before the meal deadline.

    Args:
        meal_type: one of 'breakfast', 'lunch', 'olovrant'

    Target date logic mirrors apply_auto_orders:
    - If the is_day_before flag is set → target_date = next workday
    - Otherwise → target_date = today
    """
    from api.models import DailyOrder, GlobalSettings, PushSubscription
    from api.serializers import DailyOrderSerializer
    from api.services import _next_workday

    valid_meal_types = {"breakfast", "lunch", "olovrant"}
    if meal_type not in valid_meal_types:
        logger.error(
            "send_push_deadline_reminder_task: invalid meal_type=%s, no retry",
            meal_type,
        )
        return {"error": "invalid_meal_type", "meal_type": meal_type}

    try:
        gs = GlobalSettings.objects.get(pk=1)
    except GlobalSettings.DoesNotExist:
        logger.error(
            "send_push_deadline_reminder_task: GlobalSettings(pk=1) missing, no retry"
        )
        return {"error": "missing_global_settings", "meal_type": meal_type}

    is_day_before = getattr(gs, f"deadline_{meal_type}_is_day_before", False)
    today = timezone.localdate()
    if is_day_before:
        target_date = _next_workday(today)
    else:
        target_date = today

    # Skip weekends
    if target_date.weekday() >= 5:
        logger.info(
            "send_push_deadline_reminder_task: weekend skip for meal=%s date=%s",
            meal_type,
            target_date,
        )
        return {"skipped": "weekend", "meal_type": meal_type}

    meal_labels = {
        "breakfast": "raňajky",
        "lunch": "obed",
        "olovrant": "olovrant",
    }
    label = meal_labels[meal_type]
    date_fmt = target_date.strftime("%d.%m.%Y")

    total_sent = 0
    try:
        # Users who have active subscriptions and are actual client accounts.
        subscribed_user_ids = set(
            PushSubscription.objects.filter(
                user__is_staff=False,
                user__is_active=True,
            )
            .values_list("user_id", flat=True)
            .distinct()
        )
        # Users who already submitted content for this specific meal on target_date.
        ordered_user_ids = set()
        for order in DailyOrder.objects.filter(date=target_date):
            meal_payload = (order.data or {}).get(meal_type)
            if DailyOrderSerializer._meal_has_content(meal_payload):
                ordered_user_ids.add(order.user_id)

        missing_user_ids = subscribed_user_ids - ordered_user_ids

        for user_id in missing_user_ids:
            result = PushNotificationService.send_to_user(
                user_id=user_id,
                title="Pripomienka objednávky",
                body=(
                    f"Nezabudnite objednať {label} na {date_fmt}. "
                    "Uzávierka je o chvíľu!"
                ),
                url="/order",
            )
            total_sent += result.get("sent", 0)
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

    logger.info(
        "send_push_deadline_reminder_task: meal=%s date=%s sent=%d",
        meal_type,
        target_date,
        total_sent,
    )
    return {
        "sent": total_sent,
        "meal_type": meal_type,
        "date": str(target_date),
    }


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

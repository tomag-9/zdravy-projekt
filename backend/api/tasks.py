"""
Celery tasks for the api app.
"""

import logging

from celery import shared_task

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
    cache_key = f"report_task:pdf:{date_str}"
    cache.set(cache_key, pdf_bytes, timeout=REPORT_CACHE_TIMEOUT)
    logger.info("generate_report_pdf_task complete for %s", date_str)
    return {"status": "complete", "format": "pdf", "date": date_str}


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
    cache_key = f"report_task:xlsx:{date_str}"
    cache.set(cache_key, xlsx_bytes, timeout=REPORT_CACHE_TIMEOUT)
    logger.info("generate_report_xlsx_task complete for %s", date_str)
    return {"status": "complete", "format": "xlsx", "date": date_str}


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

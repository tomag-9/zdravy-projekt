"""
Celery tasks for the api app.
"""

import logging

from celery import shared_task

logger = logging.getLogger(__name__)


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

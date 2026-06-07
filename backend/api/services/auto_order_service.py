"""Auto-order service: pure business logic with no side-effects beyond DB writes."""

import datetime
import logging
from typing import Any, Dict, List

from django.contrib.auth.models import User
from django.db import IntegrityError, transaction
from django.utils import timezone

from ..models import DailyOrder

logger = logging.getLogger(__name__)


def _is_order_empty(data: Dict[str, Any]) -> bool:
    """
    Return True if the order data contains zero portions across all meals.

    Supports two storage shapes:
    - Category-nested: {"breakfast": {"Dospelý": {"menuCounts": {"A": 5}}}}
    - Flat:            {"breakfast": {"menuCounts": {"A": 5}}}
    """
    for meal_key in ("breakfast", "lunch", "olovrant"):
        meal = data.get(meal_key, {}) or {}
        if "menuCounts" in meal:
            # Flat shape: meal dict itself contains menuCounts
            for count in (meal.get("menuCounts") or {}).values():
                if int(count or 0) > 0:
                    return False
        else:
            # Category-nested shape
            for _cat, details in meal.items():
                for count in (details.get("menuCounts") or {}).values():
                    if int(count or 0) > 0:
                        return False
    return True


def _next_workday(from_date: datetime.date) -> datetime.date:
    """Return the next Monday-Friday date strictly after from_date."""
    d = from_date + datetime.timedelta(days=1)
    while d.weekday() >= 5:  # 5=Sat, 6=Sun
        d += datetime.timedelta(days=1)
    return d


def _last_non_empty_order(user: User, before_date: datetime.date) -> DailyOrder | None:
    """
    Return the most recent non-empty order before the given date.

    No status filter applied: the spec requires the last non-empty order,
    regardless of status. Drafts are never persisted via the normal API
    (submission deletes them), but omitting the filter keeps the function
    correct for direct DB writes (e.g. tests, admin).
    """
    orders = DailyOrder.objects.filter(
        user=user,
        date__lt=before_date,
    ).order_by("-date")

    for order in orders:
        if not _is_order_empty(order.data or {}):
            return order
    return None


def _build_auto_data(template: DailyOrder, visible_meals: List[str]) -> Dict[str, Any]:
    """
    Copy only the allowed meals from the template.
    If visible_meals is empty, all three meals are copied.
    """
    allowed = (
        set(visible_meals) if visible_meals else {"breakfast", "lunch", "olovrant"}
    )
    data = {}
    for meal_key in ("breakfast", "lunch", "olovrant"):
        if meal_key in allowed:
            data[meal_key] = (template.data or {}).get(meal_key, {})
        else:
            data[meal_key] = {}
    return data


def apply_auto_orders(target_date: datetime.date | None = None) -> Dict[str, Any]:
    """
    For every active non-staff client that has no order on target_date,
    find their last non-empty order and create an auto order.

    Returns a summary dict: {"created": [...], "skipped": int}
    """
    if target_date is None:
        # Use local date (Europe/Bratislava) — same timezone the rest of the app uses
        # for deadlines, monthly_summary, etc.  UTC diverges near local midnight and
        # across DST transitions, causing off-by-one target dates.
        today = timezone.localdate()
        target_date = _next_workday(today)

    # Safety: never auto-order on weekends
    if target_date.weekday() >= 5:
        logger.info(
            "apply_auto_orders: target_date %s is a weekend, skipping.", target_date
        )
        return {"created": [], "skipped": 0}

    clients = list(
        User.objects.filter(is_staff=False, is_active=True).select_related("settings")
    )
    client_ids = [c.id for c in clients]

    # Preload: which clients already have an order for target_date? (1 query)
    existing_order_user_ids = set(
        DailyOrder.objects.filter(user_id__in=client_ids, date=target_date).values_list(
            "user_id", flat=True
        )
    )

    # Preload: best (latest non-empty) template per client (1 query, no N+1)
    templates_by_user: Dict[int, DailyOrder] = {}
    for order in DailyOrder.objects.filter(
        user_id__in=client_ids,
        date__lt=target_date,
    ).order_by("user_id", "-date"):
        if order.user_id in templates_by_user:
            continue
        if not _is_order_empty(order.data or {}):
            templates_by_user[order.user_id] = order

    created = []
    skipped = 0

    for client in clients:
        # Already has an order for this date (manual or previous auto)?
        if client.id in existing_order_user_ids:
            skipped += 1
            continue

        template = templates_by_user.get(client.id)
        if template is None:
            skipped += 1
            continue

        # Respect visible_meals from ClientSettings
        visible_meals: List[str] = []
        if hasattr(client, "settings") and client.settings is not None:
            visible_meals = client.settings.visible_meals or []

        auto_data = _build_auto_data(template, visible_meals)

        # Skip if filtered data is empty
        if _is_order_empty(auto_data):
            skipped += 1
            continue

        # Use get_or_create inside an atomic block to be idempotent when the
        # auto-order task is triggered concurrently (e.g. duplicate Celery tasks).
        # Rely on a unique constraint for (user, date) plus IntegrityError handling
        # to ensure that at most one auto-order row is ultimately created.
        try:
            with transaction.atomic():
                _, auto_created = DailyOrder.objects.get_or_create(
                    user=client,
                    date=target_date,
                    defaults={
                        "status": "submitted",
                        "is_auto": True,
                        "data": auto_data,
                    },
                )
        except IntegrityError:
            # Concurrent task already created the row; treat as skipped.
            skipped += 1
            continue

        if not auto_created:
            # A manual order appeared between the preload query and now.
            skipped += 1
            continue

        created.append(client.email)
        logger.info(
            "Auto-order created for user=%s date=%s (template from %s)",
            client.email,
            target_date,
            template.date,
        )

    logger.info(
        "apply_auto_orders finished: date=%s created=%d skipped=%d",
        target_date,
        len(created),
        skipped,
    )
    return {"created": created, "skipped": skipped, "date": str(target_date)}

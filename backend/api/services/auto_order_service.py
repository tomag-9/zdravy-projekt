"""Auto-order service: pure business logic with no side-effects beyond DB writes."""

import datetime
import logging
from typing import Any, Dict, List

from django.contrib.auth.models import User
from django.db import IntegrityError, transaction
from django.utils import timezone

from ..models import DailyOrder
from ..order_data import MEAL_KEYS, OrderData

logger = logging.getLogger(__name__)


def _is_order_empty(data: Dict[str, Any]) -> bool:
    """Return True if order data contains zero menu portions across all meals."""
    return OrderData(data).is_empty()


def _next_workday(from_date: datetime.date) -> datetime.date:
    """Return the next Monday-Friday date strictly after from_date."""
    d = from_date + datetime.timedelta(days=1)
    while d.weekday() >= 5:  # 5=Sat, 6=Sun
        d += datetime.timedelta(days=1)
    return d


def _last_non_empty_order(user: User, before_date: datetime.date) -> DailyOrder | None:
    """
    Return the most recent non-empty order before the given date.

    Drafts are never persisted via the normal API path, so every stored order
    is treated as submitted.
    """
    orders = DailyOrder.objects.filter(
        user=user,
        date__lt=before_date,
    ).order_by("-date")

    for order in orders:
        if not _is_order_empty(order.data or {}):
            return order
    return None


def _normalise_meal(meal: Any) -> Dict[str, Any]:
    """
    Return a guaranteed category-nested meal dict.

    Legacy records may have flat shape: {meal: {"menuCounts": {...}}}.
    Auto-orders must write category-nested shape so the serializer accepts
    any subsequent client resubmit.  Flat meals are promoted to a single
    synthetic category named after the meal key they came from.
    """
    return OrderData.normalise_meal(meal)


def _build_auto_data(template: DailyOrder, visible_meals: List[str]) -> Dict[str, Any]:
    """
    Copy only the allowed meals from the template, always in category-nested shape.
    If visible_meals is empty, all three meals are copied.
    """
    allowed = set(visible_meals) if visible_meals else set(MEAL_KEYS)
    data = {}
    for meal_key in MEAL_KEYS:
        if meal_key in allowed:
            raw = (template.data or {}).get(meal_key, {})
            data[meal_key] = _normalise_meal(raw)
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

    clients = list(User.objects.filter(is_staff=False, is_active=True))
    client_ids = [c.id for c in clients]

    # Auto-objednávky sa vedú per prevádzka, nie per login: celok s tromi
    # prevádzkami musí dostať tri objednávky, nie jednu.
    existing_order_prevadzka_ids = set(
        DailyOrder.objects.filter(
            user_id__in=client_ids, date=target_date, prevadzka__isnull=False
        ).values_list("prevadzka_id", flat=True)
    )

    # Preload: best (latest non-empty) template per prevádzka (1 query, no N+1)
    templates_by_prevadzka: Dict[int, DailyOrder] = {}
    for order in (
        DailyOrder.objects.filter(
            user_id__in=client_ids,
            date__lt=target_date,
            prevadzka__isnull=False,
        )
        .select_related("prevadzka")
        .order_by("prevadzka_id", "-date")
    ):
        if order.prevadzka_id in templates_by_prevadzka:
            continue
        if not _is_order_empty(order.data or {}):
            templates_by_prevadzka[order.prevadzka_id] = order

    clients_by_id = {c.id: c for c in clients}
    created = []
    skipped = 0

    for prevadzka_id, template in templates_by_prevadzka.items():
        # Already has an order for this date (manual or previous auto)?
        if prevadzka_id in existing_order_prevadzka_ids:
            skipped += 1
            continue

        client = clients_by_id.get(template.user_id)
        if client is None:
            skipped += 1
            continue

        visible_meals: List[str] = list(
            getattr(template.prevadzka, "visible_meals", []) or []
        )

        auto_data = _build_auto_data(template, visible_meals)

        # Skip if filtered data is empty
        if _is_order_empty(auto_data):
            skipped += 1
            continue

        # Use get_or_create inside an atomic block to be idempotent when the
        # auto-order task is triggered concurrently (e.g. duplicate Celery tasks).
        # Rely on the unique constraint for (prevadzka, date) plus IntegrityError
        # handling to ensure that at most one auto-order row is ultimately created.
        try:
            with transaction.atomic():
                _, auto_created = DailyOrder.objects.get_or_create(
                    prevadzka_id=prevadzka_id,
                    date=target_date,
                    defaults={
                        "user": client,
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

"""Order service – pure business logic for order domain."""

import datetime
from typing import Any, Dict, List, Optional, Tuple

from django.contrib.auth.models import User
from django.utils import timezone

from ..models import DailyOrder, Holiday
from .auto_order_service import _build_auto_data, _is_order_empty, _last_non_empty_order


class OrderService:
    """Business logic for orders: planned-week calculation, portion counting."""

    # ------------------------------------------------------------------ #
    # Pure helpers (no DB access)
    # ------------------------------------------------------------------ #

    @staticmethod
    def next_workdays(
        start: datetime.date,
        count: int = 5,
        holidays: Optional[set[datetime.date]] = None,
    ) -> List[datetime.date]:
        """Return the next *count* Mon–Fri non-holiday dates starting from *and including* start."""
        days: List[datetime.date] = []
        d = start
        while len(days) < count:
            if d.weekday() < 5 and (holidays is None or d not in holidays):
                days.append(d)
            d += datetime.timedelta(days=1)
        return days

    @staticmethod
    def order_total(data: Dict[str, Any]) -> Tuple[int, Dict[str, int]]:
        """
        Return (total_portions, {meal: count}) for an order data dict.

        Supports both storage shapes:
        - Flat:            {"lunch": {"menuCounts": {"A": 5}}}
        - Category-nested: {"lunch": {"Dospelý": {"menuCounts": {"A": 5}}}}
        """
        meal_count: Dict[str, int] = {"breakfast": 0, "lunch": 0, "olovrant": 0}
        total: int = 0
        for meal_key in ("breakfast", "lunch", "olovrant"):
            meal = data.get(meal_key, {}) or {}
            if "menuCounts" in meal:
                # Flat shape
                for count in (meal.get("menuCounts") or {}).values():
                    c = int(count or 0)
                    meal_count[meal_key] += c
                    total += c
            else:
                # Category-nested shape
                for _cat, details in meal.items():
                    if not isinstance(details, dict):
                        continue
                    for count in (details.get("menuCounts") or {}).values():
                        c = int(count or 0)
                        meal_count[meal_key] += c
                        total += c
        return total, meal_count

    # ------------------------------------------------------------------ #
    # Planned-orders business logic
    # ------------------------------------------------------------------ #

    @staticmethod
    def get_planned_orders(
        user: User, visible_meals: List[str]
    ) -> List[Dict[str, Any]]:
        """
        Return data for the 5 upcoming workdays for *user*.

        For days that already have an order the actual totals are included.
        For days without an order the predicted totals from the last
        non-empty template are provided.

        This method executes a small, constant number of DB queries regardless
        of the number of planned days (no N+1 queries).
        """
        today = timezone.now().astimezone(datetime.timezone.utc).date()
        # Fetch all upcoming holidays once (small table) to avoid repeated queries.
        holiday_set: set[datetime.date] = set(
            Holiday.objects.filter(date__gte=today).values_list("date", flat=True)
        )
        workdays = OrderService.next_workdays(today, 5, holiday_set)

        existing: Dict[datetime.date, DailyOrder] = {
            o.date: o for o in DailyOrder.objects.filter(user=user, date__in=workdays)
        }

        # Pre-fetch a single historical template to avoid per-day DB queries.
        historical_template: Optional[DailyOrder] = _last_non_empty_order(
            user, workdays[0]
        )

        def _template_for_day(day: datetime.date) -> Optional[DailyOrder]:
            """
            Return the best template for a missing day.

            Checks in-memory cascade (already-placed orders earlier in the
            planned window) before falling back to the historical template.
            No additional DB queries are made.
            """
            for prev_day in reversed([d for d in workdays if d < day]):
                prev = existing.get(prev_day)
                if prev and not _is_order_empty(prev.data or {}):
                    return prev
            return historical_template

        result: List[Dict[str, Any]] = []
        for day in workdays:
            order = existing.get(day)
            if order:
                total, meal_count = OrderService.order_total(order.data or {})
                result.append(
                    {
                        "date": str(day),
                        "exists": True,
                        "is_auto": order.is_auto,
                        "is_empty": total == 0,
                        "totalPortions": total,
                        "mealCount": meal_count,
                        "predictedTotal": 0,
                        "predictedMealCount": {
                            "breakfast": 0,
                            "lunch": 0,
                            "olovrant": 0,
                        },
                    }
                )
            else:
                tmpl = _template_for_day(day)
                if tmpl:
                    predicted_data = _build_auto_data(tmpl, visible_meals)
                    predicted_total, predicted_meal_count = OrderService.order_total(
                        predicted_data
                    )
                else:
                    predicted_data = {"breakfast": {}, "lunch": {}, "olovrant": {}}
                    predicted_total = 0
                    predicted_meal_count = {"breakfast": 0, "lunch": 0, "olovrant": 0}
                result.append(
                    {
                        "date": str(day),
                        "exists": False,
                        "is_auto": None,
                        "is_empty": None,
                        "totalPortions": 0,
                        "mealCount": {"breakfast": 0, "lunch": 0, "olovrant": 0},
                        "predictedTotal": predicted_total,
                        "predictedMealCount": predicted_meal_count,
                        "predictedData": predicted_data,
                    }
                )

        return result

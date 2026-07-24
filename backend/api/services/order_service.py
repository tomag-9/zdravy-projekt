"""Order service – pure business logic for order domain."""

import datetime
from typing import Any, Dict, List, Optional, Tuple

from django.contrib.auth.models import User
from django.utils import timezone

from ..models import DailyOrder, Holiday
from ..order_data import MEAL_KEYS, OrderData
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
        """Return (total_portions, {meal: count}) for an order data dict."""
        return OrderData(data).totals()

    @staticmethod
    def monthly_summary(
        user: User,
        year: int,
        month: int,
        through_date: Optional[datetime.date] = None,
    ) -> Dict[str, Any]:
        """Aggregate submitted order counts for a user's month."""
        start = datetime.date(year, month, 1)
        end = (
            datetime.date(year + 1, 1, 1)
            if month == 12
            else datetime.date(year, month + 1, 1)
        )

        today = through_date or timezone.localdate()
        if year == today.year and month == today.month:
            end = min(end, today + datetime.timedelta(days=1))

        menu_counts: Dict[str, int] = {}
        meal_counts: Dict[str, int] = {"breakfast": 0, "lunch": 0, "olovrant": 0}
        total = 0

        orders = DailyOrder.objects.filter(
            user=user,
            date__gte=start,
            date__lt=end,
        ).only("data")

        for order in orders:
            data = order.data or {}
            order_total, order_meals = OrderService.order_total(data)
            total += order_total
            for meal_key, count in order_meals.items():
                meal_counts[meal_key] = meal_counts.get(meal_key, 0) + count

            for menu, count in OrderData(data).menu_totals().items():
                menu_counts[menu] = menu_counts.get(menu, 0) + count

        items = [
            {"label": f"Menu {menu}", "count": count}
            for menu, count in sorted(menu_counts.items())
        ]
        meal_labels = {
            "breakfast": "Raňajky",
            "lunch": "Obed",
            "olovrant": "Olovrant",
        }
        items.extend(
            {"label": meal_labels[meal], "count": count}
            for meal, count in meal_counts.items()
            if count > 0
        )

        return {
            "year": year,
            "month": month,
            "total": total,
            "menu_counts": menu_counts,
            "meal_counts": meal_counts,
            "items": items,
        }

    # ------------------------------------------------------------------ #
    # Planned-orders business logic
    # ------------------------------------------------------------------ #

    @staticmethod
    def get_planned_orders(
        user: User, visible_meals: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Return data for the 5 upcoming workdays for *user*.

        For days that already have an order the actual totals are included.
        For days without an order the predicted totals from the last
        non-empty template are provided.

        This method executes a small, constant number of DB queries regardless
        of the number of planned days (no N+1 queries).
        """
        today = timezone.localdate()
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
                    allowed_meals = visible_meals
                    if allowed_meals is None:
                        allowed_meals = list(
                            getattr(tmpl.prevadzka, "visible_meals", []) or []
                        )
                    predicted_data = _build_auto_data(tmpl, allowed_meals)
                    predicted_total, predicted_meal_count = OrderService.order_total(
                        predicted_data
                    )
                else:
                    predicted_data = {meal: {} for meal in MEAL_KEYS}
                    predicted_total = 0
                    predicted_meal_count = {meal: 0 for meal in MEAL_KEYS}
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

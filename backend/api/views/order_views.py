import datetime
from typing import Any, Dict, List, Optional, Tuple

from django.db.models import QuerySet
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.request import Request
from rest_framework.response import Response

from ..models import DailyOrder
from ..serializers import DailyOrderSerializer
from ..services import _build_auto_data, _is_order_empty, _last_non_empty_order

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _next_workdays(start: datetime.date, count: int = 5) -> List[datetime.date]:
    """Return the next `count` Mon-Fri dates starting from (and including) start."""
    days: List[datetime.date] = []
    d = start
    while len(days) < count:
        if d.weekday() < 5:  # Mon-Fri
            days.append(d)
        d += datetime.timedelta(days=1)
    return days


def _order_total(data: Dict[str, Any]) -> Tuple[int, Dict[str, int]]:
    """
    Return (total_portions, {meal: count}) for the order data dict.

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


# ---------------------------------------------------------------------------
# ViewSets
# ---------------------------------------------------------------------------


class DailyOrderViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing daily orders.
    """

    serializer_class = DailyOrderSerializer
    # Authenticated users only
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self) -> QuerySet[DailyOrder]:
        """
        Get filtered DailyOrder queryset for the current request user.

        Staff users may optionally filter by another user's ID via the
        "user_id" query parameter; otherwise, only the requesting user's
        orders are returned.
        """
        queryset = DailyOrder.objects.all()
        user = self.request.user

        if user.is_staff:
            user_id = self.request.query_params.get("user_id")
            if user_id:
                queryset = queryset.filter(user_id=user_id)
            else:
                # If no user_id is provided, return only the staff user's own orders
                # to prevent returning ALL orders by default (which breaks by_date logic).
                queryset = queryset.filter(user=user)
        else:
            queryset = queryset.filter(user=user)

        return queryset

    def perform_create(self, serializer: DailyOrderSerializer) -> None:
        if self.request.user.is_staff:
            raise PermissionDenied("Administrators cannot place orders.")
        # The serializer.save() will call create() which enables update_or_create logic
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["get"], url_path="by-date/(?P<date>[^/.]+)")
    def by_date(self, request: Request, date: Optional[str] = None) -> Response:
        try:
            order = self.get_queryset().get(date=date)
            serializer = self.get_serializer(order)
            return Response(serializer.data)
        except DailyOrder.DoesNotExist:
            return Response(
                {"data": {}}, status=status.HTTP_200_OK
            )  # Return empty struct if not found


class PlannedOrdersViewSet(viewsets.ViewSet):
    """
    Returns the 5 upcoming workdays with order status for the logged-in client.
    GET /api/orders/planned/
    """

    permission_classes = [permissions.IsAuthenticated]

    def list(self, request: Request) -> Response:
        """
        Get planned orders for the next 5 workdays.

        Returns orders for the requesting user across the next 5 workdays,
        with template data from the most recent non-empty order. Uses a single
        query to fetch existing orders; no additional eager loading needed
        since only order.date, order.data, and order.is_auto are accessed.
        """
        # Use UTC date so all clients see the same calendar regardless of timezone
        today = timezone.now().astimezone(datetime.timezone.utc).date()
        workdays = _next_workdays(today, 5)

        visible_meals = list(
            getattr(getattr(request.user, "settings", None), "visible_meals", []) or []
        )

        existing: Dict[datetime.date, DailyOrder] = {
            o.date: o
            for o in DailyOrder.objects.filter(user=request.user, date__in=workdays)
        }

        # Single historical query — avoids N+1 when multiple days have no order.
        # The planned-week cascade (existing dict) is checked first in-memory;
        # this serves as the fallback for every unset day.
        historical_template = _last_non_empty_order(request.user, workdays[0])

        def _template_for_day(day: datetime.date) -> Optional[DailyOrder]:
            """
            Find the most recent non-empty order before `day`.
            Checks orders already placed in the planned week first (cascade
            forward), then falls back to the pre-fetched historical template.
            No additional DB queries are made here.
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
                total, meal_count = _order_total(order.data or {})
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
                    predicted_total, predicted_meal_count = _order_total(predicted_data)
                else:
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
                    }
                )

        return Response(result)


class AdminAutoOrderViewSet(viewsets.ViewSet):
    """
    Admin endpoint to manually trigger auto-order for a given date.
    POST /api/admin/trigger-auto-orders/  { "date": "YYYY-MM-DD" }  (date optional)
    """

    permission_classes = [permissions.IsAdminUser]

    def create(self, request: Request) -> Response:
        date_str = request.data.get("date")
        target_date: Optional[datetime.date] = None
        if date_str:
            try:
                target_date = datetime.date.fromisoformat(date_str)
            except ValueError:
                return Response(
                    {"error": "Invalid date format. Use YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        from ..services import apply_auto_orders

        result = apply_auto_orders(target_date)
        return Response(result, status=status.HTTP_200_OK)

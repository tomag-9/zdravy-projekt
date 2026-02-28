import datetime
import logging

from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from ..models import DailyOrder
from .report_helpers import build_user_meal_row, merge_meal_totals

logger = logging.getLogger(__name__)


class AdminSummaryViewSet(viewsets.ViewSet):
    """
    Admin ViewSet for Dashboard Summaries.
    Aggregates order data for reporting and analytics.
    """

    permission_classes = [permissions.IsAdminUser]

    @action(detail=False, methods=["get"], url_path="daily-stats")
    def daily_stats(self, request):
        """Get daily order statistics for a given date."""
        date_str = request.query_params.get("date")
        if not date_str:
            return Response(
                {"error": "Date parameter is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        orders = DailyOrder.objects.filter(date=date_str)

        stats = {
            "total_orders": 0,
            "status_breakdown": {"submitted": 0},
            "meals": {"breakfast": {}, "lunch": {}, "olovrant": {}},
        }

        for order in orders:
            stats["total_orders"] += 1
            stats["status_breakdown"]["submitted"] += 1
            data = order.data if isinstance(order.data, dict) else {}
            self._aggregate_meal(stats, data, "breakfast")
            self._aggregate_meal(stats, data, "lunch")
            self._aggregate_meal(stats, data, "olovrant")

        return Response(stats)

    def _aggregate_meal(self, stats, data, meal_key):
        """Aggregate meal counts for a specific meal type."""
        if meal_key not in data or not data[meal_key]:
            return

        meal_data = data[meal_key]
        if not isinstance(meal_data, dict):
            return
        for category, details in meal_data.items():
            if not details:
                continue

            if category not in stats["meals"][meal_key]:
                stats["meals"][meal_key][category] = {
                    "menus": {},
                    "diets": {},
                    "total": 0,
                }

            cat_stats = stats["meals"][meal_key][category]

            # Aggregate Menus
            menu_counts = details.get("menuCounts", {})
            for menu_type, count in menu_counts.items():
                count = int(count or 0)
                if count > 0:
                    cat_stats["menus"][menu_type] = (
                        cat_stats["menus"].get(menu_type, 0) + count
                    )
                    cat_stats["total"] += count

            # Aggregate Diets
            diets = details.get("diets", {})
            for diet_name, count in diets.items():
                count = int(count or 0)
                if count > 0:
                    cat_stats["diets"][diet_name] = (
                        cat_stats["diets"].get(diet_name, 0) + count
                    )

    @action(detail=False, methods=["get"], url_path="daily-report")
    def daily_report(self, request):
        """Get per-user order summary for a given date."""
        date_str = request.query_params.get("date")
        if not date_str:
            return Response(
                {"error": "date parameter required"}, status=status.HTTP_400_BAD_REQUEST
            )
        try:
            target_date = datetime.date.fromisoformat(date_str)
        except (TypeError, ValueError):
            return Response(
                {"error": "invalid date format, expected YYYY-MM-DD"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        orders = (
            DailyOrder.objects.filter(date=target_date)
            .select_related("user", "user__settings")
            .order_by("user__email")
        )

        totals = {
            "breakfast": {"menus": {}, "diets": {}, "total": 0},
            "lunch": {"menus": {}, "diets": {}, "total": 0},
            "olovrant": {"menus": {}, "diets": {}, "total": 0},
            "grand": 0,
        }
        rows = []
        for order in orders:
            user = order.user
            data = order.data if isinstance(order.data, dict) else {}
            bf = build_user_meal_row(data, "breakfast")
            lu = build_user_meal_row(data, "lunch")
            ol = build_user_meal_row(data, "olovrant")
            row_total = bf["total"] + lu["total"] + ol["total"]
            _settings = getattr(user, "settings", None)
            visible_meals = getattr(_settings, "visible_meals", None) or [
                "breakfast",
                "lunch",
                "olovrant",
            ]
            rows.append(
                {
                    "user_id": user.id,
                    "name": f"{user.first_name} {user.last_name}".strip() or user.email,
                    "email": user.email,
                    "breakfast": bf,
                    "lunch": lu,
                    "olovrant": ol,
                    "visible_meals": visible_meals,
                    "total": row_total,
                }
            )
            merge_meal_totals(totals["breakfast"], bf)
            merge_meal_totals(totals["lunch"], lu)
            merge_meal_totals(totals["olovrant"], ol)
            totals["grand"] += row_total

        return Response(
            {"date": target_date.isoformat(), "rows": rows, "totals": totals}
        )

    @action(detail=False, methods=["get"], url_path="daily-report-xlsx")
    def daily_report_xlsx(self, request):
        """Download per-user order report as XLSX."""
        from .report_xlsx_views import generate_xlsx_report

        return generate_xlsx_report(request)

    @action(detail=False, methods=["get"], url_path="daily-report-pdf")
    def daily_report_pdf(self, request):
        """Download per-user order report as portrait PDF."""
        from .report_pdf_views import generate_pdf_report

        return generate_pdf_report(request)

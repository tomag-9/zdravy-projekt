import datetime
import logging

from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from ..exporters import PDFReportExporter, XLSXReportExporter
from ..models import DailyOrder
from ..services import ReportService
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
        """Get daily order statistics for a given date.

        Fetches all orders for the target date and aggregates meal statistics
        from their data payloads. No additional eager loading is performed
        since this endpoint only accesses order.data and order.id.
        """
        date_str = request.query_params.get("date")
        if not date_str:
            return Response(
                {"error": "Date parameter is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            target_date = datetime.datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return Response(
                {"error": "Invalid date format. Use YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        orders = DailyOrder.objects.filter(date=target_date)

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

        # Support both nested-by-category and flat meal shapes.
        # If the meal data itself contains menuCounts/diets, treat it as a
        # single synthetic category keyed by the meal_key (e.g. "lunch").
        if "menuCounts" in meal_data or "diets" in meal_data:
            meal_data = {meal_key: meal_data}

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
        from django.http import HttpResponse

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

        rows_data = ReportService.get_orders_for_export(target_date)
        exporter = XLSXReportExporter(rows_data, date_str)
        xlsx_bytes = exporter.generate()

        filename = f"prehlad_{date_str}.xlsx"
        response = HttpResponse(
            xlsx_bytes,
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response

    @action(detail=False, methods=["get"], url_path="daily-report-pdf")
    def daily_report_pdf(self, request):
        """Download per-user order report as portrait PDF."""
        import io

        from django.http import FileResponse

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

        exporter = PDFReportExporter(orders, date_str)
        pdf_bytes = exporter.generate()

        filename = f"prehlad_{date_str}.pdf"
        response = FileResponse(io.BytesIO(pdf_bytes), content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response

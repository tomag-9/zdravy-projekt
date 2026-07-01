"""Views for the Jedálniček (Meal Plan) module."""

from __future__ import annotations

from urllib.parse import quote

from django.db.models import Prefetch
from django.http import HttpResponse
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from ..models import DailyMealPlan, MealPlanItem, MealTemplate, PortionType
from ..order_data import OrderData, safe_count
from ..serializers_menu import (
    DailyMealPlanSerializer,
    MealTemplateSerializer,
    PortionTypeSerializer,
)
from ..services.meal_plan_service import MealPlanService
from ..utils import parse_date_param

_XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


class PortionTypeViewSet(viewsets.ReadOnlyModelViewSet):
    """List portion types; non-staff see only active entries."""

    serializer_class = PortionTypeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = PortionType.objects.all()
        if not self.request.user.is_staff:
            qs = qs.filter(is_active=True)
        return qs


class MealTemplateViewSet(viewsets.ReadOnlyModelViewSet):
    """List meal templates (the weight catalog); filterable by category."""

    serializer_class = MealTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = MealTemplate.objects.all()
        if not self.request.user.is_staff:
            qs = qs.filter(is_active=True)
        category = self.request.query_params.get("category")
        if category:
            qs = qs.filter(category=category)
        return qs


@extend_schema_view(
    list=extend_schema(tags=["meal-plan"]),
    retrieve=extend_schema(tags=["meal-plan"]),
    create=extend_schema(tags=["meal-plan"]),
    update=extend_schema(tags=["meal-plan"]),
    partial_update=extend_schema(tags=["meal-plan"]),
    destroy=extend_schema(tags=["meal-plan"]),
)
class DailyMealPlanViewSet(viewsets.ModelViewSet):
    """Admin ViewSet for daily meal plans with gramage reporting and export."""

    serializer_class = DailyMealPlanSerializer

    def _is_admin_route(self) -> bool:
        return self.request.path.startswith("/api/admin/")

    def get_permissions(self):
        if (
            self.action in ["list", "retrieve", "by_date"]
            and not self._is_admin_route()
        ):
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]

    def get_queryset(self):
        item_queryset = MealPlanItem.objects.select_related("template__diet")
        if not self.request.user.is_staff:
            item_queryset = item_queryset.filter(template__is_active=True)
        qs = DailyMealPlan.objects.prefetch_related(
            Prefetch("items", queryset=item_queryset),
            "enrolled_counts__portion_type",
        ).order_by("-date")
        if not self.request.user.is_staff:
            qs = qs.filter(items__template__is_active=True).distinct()
        from_date = self.request.query_params.get("from")
        to_date = self.request.query_params.get("to")
        if from_date:
            qs = qs.filter(date__gte=parse_date_param(from_date, "from"))
        if to_date:
            qs = qs.filter(date__lte=parse_date_param(to_date, "to"))
        return qs

    def perform_create(self, serializer):
        serializer.save()

    def list(self, request, *args, **kwargs):
        if not self._is_admin_route():
            return super().list(request, *args, **kwargs)

        queryset = self.filter_queryset(self.get_queryset())
        payload = list(
            DailyMealPlanSerializer(
                queryset, many=True, context={"request": request}
            ).data
        )
        return Response(payload)

    @action(detail=False, methods=["get"], url_path="by-date")
    def by_date(self, request):
        """GET /api/admin/meal-plans/by-date/?date=YYYY-MM-DD"""
        date_str = request.query_params.get("date")
        if not date_str:
            return Response(
                {"error": "date query param required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        date = parse_date_param(date_str)

        try:
            plan = self.get_queryset().get(date=date)
        except DailyMealPlan.DoesNotExist:
            return Response(
                {
                    "exists": False,
                    "date": str(date),
                    "notes": "",
                    "items": [],
                }
            )

        return Response(
            {
                "exists": True,
                **DailyMealPlanSerializer(plan, context={"request": request}).data,
            }
        )

    @action(detail=True, methods=["get"], url_path="gramage-report")
    def gramage_report(self, request, pk=None):
        """GET /api/admin/meal-plans/{id}/gramage-report/"""
        plan = self.get_object()
        data = MealPlanService.calculate_gramage(plan)
        return Response(data)

    @action(detail=True, methods=["get"], url_path="export-xlsx")
    def export_xlsx(self, request, pk=None):
        """GET /api/admin/meal-plans/{id}/export-xlsx/"""
        plan = self.get_object()
        gramage = MealPlanService.calculate_gramage(plan)
        from ..exporters.meal_plan_xlsx_exporter import MealPlanXLSXExporter

        xlsx_bytes = MealPlanXLSXExporter([gramage]).generate()
        response = HttpResponse(
            xlsx_bytes,
            content_type=_XLSX_CONTENT_TYPE,
        )
        fname = f"jedalnícek_{plan.date}.xlsx"
        response["Content-Disposition"] = f"attachment; filename*=UTF-8''{quote(fname)}"
        return response

    @action(detail=True, methods=["get"], url_path="export-pdf")
    def export_pdf(self, request, pk=None):
        """GET /api/admin/meal-plans/{id}/export-pdf/"""
        plan = self.get_object()
        gramage = MealPlanService.calculate_gramage(plan)
        from ..exporters.meal_plan_pdf_exporter import MealPlanPDFExporter

        pdf_bytes = MealPlanPDFExporter(gramage).generate()
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        fname = f"jedalnícek_{plan.date}.pdf"
        response["Content-Disposition"] = f"attachment; filename*=UTF-8''{quote(fname)}"
        return response

    @action(detail=False, methods=["get"], url_path="range-report")
    def range_report(self, request):
        """GET /api/admin/meal-plans/range-report/?from=YYYY-MM-DD&to=YYYY-MM-DD"""
        from_str = request.query_params.get("from")
        to_str = request.query_params.get("to")
        if not from_str or not to_str:
            return Response(
                {"error": "from and to query params required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        from_date = parse_date_param(from_str, "from")
        to_date = parse_date_param(to_str, "to")
        data = MealPlanService.calculate_range_gramage(from_date, to_date)
        return Response(data)

    @action(detail=False, methods=["get"], url_path="diet-summary")
    def diet_summary(self, request):
        """
        GET /api/admin/meal-plans/diet-summary/?date=YYYY-MM-DD

        Aggregates DailyOrder records for the given date and returns:
          - diet counts per meal  (how many portions of each special diet per meal)
          - menu variant totals per meal (how many total portions per menu variant)

        Used by the admin report view to show special-diet requirements
        alongside the gramage preview.
        """
        date_str = request.query_params.get("date")
        if not date_str:
            return Response(
                {"error": "date query param required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        date = parse_date_param(date_str)

        from ..models import DailyOrder

        orders = DailyOrder.objects.filter(date=date)

        # {meal: {diet_name: count}}
        diet_by_meal: dict[str, dict[str, int]] = {}
        # {meal: {variant: total_count}}
        menu_totals: dict[str, dict[str, int]] = {}

        for order in orders:
            data = getattr(order, "data", None)
            if not isinstance(data, dict):
                continue

            for category in OrderData(data).iter_categories():
                diet_by_meal.setdefault(category.meal, {})
                menu_totals.setdefault(category.meal, {})

                for variant, count in category.menu_counts.items():
                    if not isinstance(variant, str):
                        continue
                    count_int = safe_count(count)
                    if count_int <= 0:
                        continue
                    menu_totals[category.meal][variant] = (
                        menu_totals[category.meal].get(variant, 0) + count_int
                    )

                for diet_name, count in category.diets.items():
                    if not isinstance(diet_name, str):
                        continue
                    count_int = safe_count(count)
                    if count_int <= 0:
                        continue
                    diet_by_meal[category.meal][diet_name] = (
                        diet_by_meal[category.meal].get(diet_name, 0) + count_int
                    )

        return Response(
            {
                "date": date.isoformat(),
                "diet_by_meal": diet_by_meal,
                "menu_totals": menu_totals,
            }
        )

    @action(detail=False, methods=["get"], url_path="gramage-dashboard")
    def gramage_dashboard(self, request):
        """GET /api/admin/meal-plans/gramage-dashboard/?date=YYYY-MM-DD"""
        date_str = request.query_params.get("date")
        if not date_str:
            return Response(
                {"error": "date required"}, status=status.HTTP_400_BAD_REQUEST
            )
        date = parse_date_param(date_str)
        data = MealPlanService.gramage_dashboard(date.isoformat())
        return Response(data)

    @action(detail=False, methods=["get"], url_path="gramage-dashboard-xlsx")
    def gramage_dashboard_xlsx(self, request):
        """GET /api/admin/meal-plans/gramage-dashboard-xlsx/?date=YYYY-MM-DD"""
        date_str = request.query_params.get("date")
        if not date_str:
            return Response(
                {"error": "date required"}, status=status.HTTP_400_BAD_REQUEST
            )
        date = parse_date_param(date_str)
        data = MealPlanService.gramage_dashboard(date.isoformat())
        from ..exporters.gramage_dashboard_xlsx_exporter import (
            GramageDashboardXLSXExporter,
        )

        xlsx_bytes = GramageDashboardXLSXExporter(data).generate()
        response = HttpResponse(
            xlsx_bytes,
            content_type=_XLSX_CONTENT_TYPE,
        )
        fname = f"gramaz_{date}.xlsx"
        response["Content-Disposition"] = f"attachment; filename*=UTF-8''{quote(fname)}"
        return response

    @action(detail=False, methods=["get"], url_path="gramage-dashboard-pdf")
    def gramage_dashboard_pdf(self, request):
        """GET /api/admin/meal-plans/gramage-dashboard-pdf/?date=YYYY-MM-DD"""
        date_str = request.query_params.get("date")
        if not date_str:
            return Response(
                {"error": "date required"}, status=status.HTTP_400_BAD_REQUEST
            )
        date = parse_date_param(date_str)
        data = MealPlanService.gramage_dashboard(date.isoformat())
        from ..exporters.gramage_dashboard_pdf_exporter import (
            GramageDashboardPDFExporter,
        )

        pdf_bytes = GramageDashboardPDFExporter(data).generate()
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        fname = f"gramaz_{date}.pdf"
        response["Content-Disposition"] = f"attachment; filename*=UTF-8''{quote(fname)}"
        return response

    @action(detail=False, methods=["get"], url_path="range-export-xlsx")
    def range_export_xlsx(self, request):
        """GET /api/admin/meal-plans/range-export-xlsx/?from=YYYY-MM-DD&to=YYYY-MM-DD"""
        from_str = request.query_params.get("from")
        to_str = request.query_params.get("to")
        if not from_str or not to_str:
            return Response(
                {"error": "from and to query params required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        from_date = parse_date_param(from_str, "from")
        to_date = parse_date_param(to_str, "to")
        gramage_list = MealPlanService.calculate_range_gramage(from_date, to_date)
        from ..exporters.meal_plan_xlsx_exporter import MealPlanXLSXExporter

        xlsx_bytes = MealPlanXLSXExporter(gramage_list).generate()
        response = HttpResponse(
            xlsx_bytes,
            content_type=_XLSX_CONTENT_TYPE,
        )
        fname = f"jedalnícek_{from_date}_{to_date}.xlsx"
        response["Content-Disposition"] = f"attachment; filename*=UTF-8''{quote(fname)}"
        return response

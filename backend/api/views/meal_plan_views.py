"""Views for the Jedálniček (Meal Plan) module."""

from __future__ import annotations

import datetime
from typing import Any
from urllib.parse import quote

from django.db.models import Prefetch
from django.http import HttpResponse
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from ..models import DailyMealPlan, MealPlanItem, MealTemplate, PortionType
from ..serializers_menu import (
    DailyMealPlanSerializer,
    MealTemplateSerializer,
    PortionTypeSerializer,
)
from ..services.meal_plan_service import MealPlanService

_XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


@extend_schema_view(
    list=extend_schema(tags=["meal-plan"]),
    retrieve=extend_schema(tags=["meal-plan"]),
    create=extend_schema(tags=["meal-plan"]),
    update=extend_schema(tags=["meal-plan"]),
    partial_update=extend_schema(tags=["meal-plan"]),
    destroy=extend_schema(tags=["meal-plan"]),
)
class MealTemplateViewSet(viewsets.ModelViewSet):
    """Admin CRUD for meal templates."""

    serializer_class = MealTemplateSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        qs = MealTemplate.objects.all()
        category = self.request.query_params.get("category")
        menu_variant = self.request.query_params.get("menu_variant")
        active_only = self.request.query_params.get("active_only", "true").lower()
        if active_only == "true":
            qs = qs.filter(is_active=True)
        if category:
            qs = qs.filter(category=category)
        if menu_variant is not None:
            qs = qs.filter(menu_variant=menu_variant)
        return qs


@extend_schema_view(
    list=extend_schema(tags=["meal-plan"]),
    retrieve=extend_schema(tags=["meal-plan"]),
    create=extend_schema(tags=["meal-plan"]),
    update=extend_schema(tags=["meal-plan"]),
    partial_update=extend_schema(tags=["meal-plan"]),
    destroy=extend_schema(tags=["meal-plan"]),
)
class PortionTypeViewSet(viewsets.ModelViewSet):
    """Admin CRUD for portion types."""

    serializer_class = PortionTypeSerializer

    def get_permissions(self):
        if self.action == "list":
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]

    def get_queryset(self):
        queryset = PortionType.objects.all()
        if not self.request.user.is_staff:
            queryset = queryset.filter(is_active=True)
        return queryset


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
        item_queryset = MealPlanItem.objects.select_related("template")
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
            qs = qs.filter(date__gte=from_date)
        if to_date:
            qs = qs.filter(date__lte=to_date)
        return qs

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=False, methods=["get"], url_path="by-date")
    def by_date(self, request):
        """GET /api/admin/meal-plans/by-date/?date=YYYY-MM-DD"""
        date_str = request.query_params.get("date")
        if not date_str:
            return Response(
                {"error": "date query param required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            date = datetime.date.fromisoformat(date_str)
        except ValueError:
            return Response(
                {"error": "Invalid date format, use YYYY-MM-DD"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            plan = self.get_queryset().get(date=date)
        except DailyMealPlan.DoesNotExist:
            return Response(
                {
                    "exists": False,
                    "date": date_str,
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
        try:
            from_date = datetime.date.fromisoformat(from_str)
            to_date = datetime.date.fromisoformat(to_str)
        except ValueError:
            return Response(
                {"error": "Invalid date format, use YYYY-MM-DD"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        data = MealPlanService.calculate_range_gramage(from_date, to_date)
        return Response(data)

    @action(detail=False, methods=["get"], url_path="diet-summary")
    def diet_summary(self, request):
        """
        GET /api/admin/meal-plans/diet-summary/?date=YYYY-MM-DD

        Aggregates DailyOrder records for the given date and returns:
          - diet counts per meal  (how many portions of each special diet per meal)
          - menu variant totals per meal (how many total portions per menu variant)

        Used by the Report tab in MealPlanEditor to show special-diet requirements
        alongside the gramage preview.
        """
        date_str = request.query_params.get("date")
        if not date_str:
            return Response(
                {"error": "date query param required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from ..models import DailyOrder

        def _safe_int(value: Any) -> int:
            try:
                return int(value)
            except (TypeError, ValueError):
                return 0

        orders = DailyOrder.objects.filter(date=date_str)

        # {meal: {diet_name: count}}
        diet_by_meal: dict[str, dict[str, int]] = {}
        # {meal: {variant: total_count}}
        menu_totals: dict[str, dict[str, int]] = {}

        for order in orders:
            data = getattr(order, "data", None)
            if not isinstance(data, dict):
                continue

            for meal, meal_data in data.items():
                if not isinstance(meal, str) or not isinstance(meal_data, dict):
                    continue
                if meal not in diet_by_meal:
                    diet_by_meal[meal] = {}
                    menu_totals[meal] = {}

                for cat_data in meal_data.values():
                    if not isinstance(cat_data, dict):
                        continue

                    menu_counts = cat_data.get("menuCounts")
                    if isinstance(menu_counts, dict):
                        for variant, count in menu_counts.items():
                            if not isinstance(variant, str):
                                continue
                            count_int = _safe_int(count)
                            if count_int <= 0:
                                continue
                            menu_totals[meal][variant] = (
                                menu_totals[meal].get(variant, 0) + count_int
                            )

                    diets = cat_data.get("diets")
                    if isinstance(diets, dict):
                        for diet_name, count in diets.items():
                            if not isinstance(diet_name, str):
                                continue
                            count_int = _safe_int(count)
                            if count_int <= 0:
                                continue
                            diet_by_meal[meal][diet_name] = (
                                diet_by_meal[meal].get(diet_name, 0) + count_int
                            )

        return Response(
            {
                "date": date_str,
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
        data = MealPlanService.gramage_dashboard(date_str)
        return Response(data)

    @action(detail=False, methods=["get"], url_path="gramage-dashboard-xlsx")
    def gramage_dashboard_xlsx(self, request):
        """GET /api/admin/meal-plans/gramage-dashboard-xlsx/?date=YYYY-MM-DD"""
        date_str = request.query_params.get("date")
        if not date_str:
            return Response(
                {"error": "date required"}, status=status.HTTP_400_BAD_REQUEST
            )
        data = MealPlanService.gramage_dashboard(date_str)
        from ..exporters.gramage_dashboard_xlsx_exporter import (
            GramageDashboardXLSXExporter,
        )

        xlsx_bytes = GramageDashboardXLSXExporter(data).generate()
        response = HttpResponse(
            xlsx_bytes,
            content_type=_XLSX_CONTENT_TYPE,
        )
        fname = f"gramaz_{date_str}.xlsx"
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
        data = MealPlanService.gramage_dashboard(date_str)
        from ..exporters.gramage_dashboard_pdf_exporter import (
            GramageDashboardPDFExporter,
        )

        pdf_bytes = GramageDashboardPDFExporter(data).generate()
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        fname = f"gramaz_{date_str}.pdf"
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
        try:
            from_date = datetime.date.fromisoformat(from_str)
            to_date = datetime.date.fromisoformat(to_str)
        except ValueError:
            return Response(
                {"error": "Invalid date format, use YYYY-MM-DD"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        gramage_list = MealPlanService.calculate_range_gramage(from_date, to_date)
        from ..exporters.meal_plan_xlsx_exporter import MealPlanXLSXExporter

        xlsx_bytes = MealPlanXLSXExporter(gramage_list).generate()
        response = HttpResponse(
            xlsx_bytes,
            content_type=_XLSX_CONTENT_TYPE,
        )
        fname = f"jedalnícek_{from_str}_{to_str}.xlsx"
        response["Content-Disposition"] = f"attachment; filename*=UTF-8''{quote(fname)}"
        return response

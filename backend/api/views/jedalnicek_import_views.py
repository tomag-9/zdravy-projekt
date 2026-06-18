import datetime
import logging
from urllib.parse import quote

from django.db import transaction
from django.http import HttpResponse
from rest_framework import permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.request import Request
from rest_framework.response import Response

from ..jedalnicek_parser import parse_docx, resolve_diet
from ..models import JedalnicekEntry, JedalnicekUpload
from ..utils import parse_date_param

logger = logging.getLogger(__name__)


class JedalnicekUploadSerializer(serializers.ModelSerializer):
    week_end = serializers.DateField(read_only=True)
    entry_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = JedalnicekUpload
        fields = [
            "id",
            "week_start",
            "week_end",
            "filename",
            "status",
            "error_message",
            "uploaded_at",
            "entry_count",
        ]
        read_only_fields = [
            "id",
            "filename",
            "status",
            "error_message",
            "uploaded_at",
            "week_end",
        ]


class JedalnicekEntrySerializer(serializers.ModelSerializer):
    diet_name = serializers.CharField(
        source="diet.name", read_only=True, allow_null=True
    )
    category_display = serializers.CharField(
        source="get_category_display", read_only=True
    )

    class Meta:
        model = JedalnicekEntry
        fields = [
            "id",
            "upload",
            "date",
            "category",
            "category_display",
            "menu_variant",
            "diet",
            "diet_name",
            "name",
            "weight_grams",
        ]
        read_only_fields = ["id", "upload", "category_display", "diet_name"]


class AdminJedalnicekUploadViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        from django.db.models import Count

        qs = JedalnicekUpload.objects.annotate(entry_count=Count("entries")).order_by(
            "-uploaded_at"
        )
        week_start = self.request.query_params.get("week_start")
        if week_start:
            qs = qs.filter(week_start=week_start)
        return qs

    def get_serializer_class(self):
        return JedalnicekUploadSerializer

    @action(detail=False, methods=["post"], parser_classes=[MultiPartParser])
    def upload(self, request: Request) -> Response:
        week_start = request.data.get("week_start")
        file = request.FILES.get("file")

        if not week_start or not file:
            return Response(
                {"error": "week_start and file are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not file.name.lower().endswith(".docx"):
            return Response(
                {"error": "Only .docx files are supported"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            d = datetime.date.fromisoformat(week_start)
        except ValueError:
            return Response(
                {"error": "week_start must be YYYY-MM-DD"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if d.weekday() != 0:
            return Response(
                {"error": "week_start must be a Monday"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        upload = JedalnicekUpload.objects.create(
            week_start=d,
            filename=file.name,
            status=JedalnicekUpload.STATUS_PENDING,
            uploaded_by=request.user,
        )

        try:
            diet, _tag = resolve_diet(file.name)
            file.seek(0)
            entries = parse_docx(file, d)

            with transaction.atomic():
                JedalnicekEntry.objects.bulk_create(
                    [
                        JedalnicekEntry(
                            upload=upload,
                            date=e.date,
                            category=e.category,
                            menu_variant=e.menu_variant,
                            diet=diet,
                            name=e.name,
                            weight_grams=e.weight_grams,
                        )
                        for e in entries
                    ]
                )
                upload.status = JedalnicekUpload.STATUS_PROCESSED
                upload.error_message = ""
                upload.save(update_fields=["status", "error_message"])

        except Exception as exc:
            logger.exception("Failed to parse DOCX upload %d", upload.pk)
            upload.status = JedalnicekUpload.STATUS_ERROR
            upload.error_message = str(exc)[:500]
            upload.save(update_fields=["status", "error_message"])

            from django.db.models import Count

            upload_with_count = JedalnicekUpload.objects.annotate(
                entry_count=Count("entries")
            ).get(pk=upload.pk)
            return Response(
                JedalnicekUploadSerializer(upload_with_count).data,
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        from django.db.models import Count

        upload_with_count = JedalnicekUpload.objects.annotate(
            entry_count=Count("entries")
        ).get(pk=upload.pk)
        return Response(
            JedalnicekUploadSerializer(upload_with_count).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["delete"])
    def remove(self, request: Request, pk: int | None = None) -> Response:
        self.get_object().delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["get"])
    def by_date(self, request: Request) -> Response:
        """Returns JedalnicekEntry records for a specific date."""
        date_str = request.query_params.get("date")
        if not date_str:
            return Response(
                {"error": "date is required"}, status=status.HTTP_400_BAD_REQUEST
            )
        parse_date_param(date_str)

        entry_list = list(
            JedalnicekEntry.objects.filter(date=date_str)
            .select_related("diet")
            .order_by("category", "menu_variant", "diet__name")
        )

        return Response(
            {
                "date": date_str,
                "has_import": bool(entry_list),
                "entries": JedalnicekEntrySerializer(entry_list, many=True).data,
            }
        )

    @action(detail=False, methods=["get"])
    def week_status(self, request: Request) -> Response:
        """Returns upload status for weeks, showing which weeks have uploads."""
        from django.db.models import Count

        uploads = JedalnicekUpload.objects.annotate(
            entry_count=Count("entries")
        ).order_by("-week_start")[:20]
        return Response(JedalnicekUploadSerializer(uploads, many=True).data)

    @action(detail=False, methods=["get"], url_path="gramage-dashboard")
    def gramage_dashboard(self, request: Request) -> Response:
        date_str = request.query_params.get("date")
        if not date_str:
            return Response(
                {"error": "date query param required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        parse_date_param(date_str)  # validates format
        from ..services.gramage_service import gramage_dashboard

        data = gramage_dashboard(date_str)
        return Response(data)

    @action(detail=False, methods=["get"], url_path="gramage-dashboard-xlsx")
    def gramage_dashboard_xlsx(self, request: Request) -> HttpResponse:
        date_str = request.query_params.get("date")
        if not date_str:
            return Response(
                {"error": "date query param required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        parse_date_param(date_str)
        from ..exporters.gramage_dashboard_xlsx_exporter import (
            GramageDashboardXLSXExporter,
        )
        from ..services.gramage_service import gramage_dashboard

        data = gramage_dashboard(date_str)
        xlsx_bytes = GramageDashboardXLSXExporter(data).generate()
        fname = quote(f"gramaze_{date_str}.xlsx")
        response = HttpResponse(
            xlsx_bytes,
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = f"attachment; filename*=UTF-8''{fname}"
        return response

    @action(detail=False, methods=["get"], url_path="gramage-dashboard-pdf")
    def gramage_dashboard_pdf(self, request: Request) -> HttpResponse:
        date_str = request.query_params.get("date")
        if not date_str:
            return Response(
                {"error": "date query param required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        parse_date_param(date_str)
        from ..exporters.gramage_dashboard_pdf_exporter import (
            GramageDashboardPDFExporter,
        )
        from ..services.gramage_service import gramage_dashboard

        data = gramage_dashboard(date_str)
        pdf_bytes = GramageDashboardPDFExporter(data).generate()
        fname = quote(f"gramaze_{date_str}.pdf")
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f"attachment; filename*=UTF-8''{fname}"
        return response


class AdminJedalnicekEntryViewSet(viewsets.ModelViewSet):
    """CRUD for individual JedalnicekEntry records (manual edit after parse)."""

    permission_classes = [permissions.IsAdminUser]
    serializer_class = JedalnicekEntrySerializer

    def get_queryset(self):
        upload_id = self.request.query_params.get("upload")
        date = self.request.query_params.get("date")
        if not upload_id and not date:
            return JedalnicekEntry.objects.none()
        qs = JedalnicekEntry.objects.select_related("diet", "upload").order_by(
            "date", "category", "menu_variant", "diet__name"
        )
        if upload_id:
            qs = qs.filter(upload_id=upload_id)
        if date:
            qs = qs.filter(date=date)
        return qs


class JedalnicekMenuViewSet(viewsets.GenericViewSet):
    """Client-facing read-only menu entries, replacing the old meal-plans/by-date endpoint."""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = JedalnicekEntrySerializer

    def get_queryset(self):
        return JedalnicekEntry.objects.select_related("diet").order_by(
            "category", "menu_variant", "diet__name"
        )

    @action(detail=False, methods=["get"], url_path="by-date")
    def by_date(self, request: Request) -> Response:
        date_str = request.query_params.get("date")
        if not date_str:
            return Response(
                {"error": "date is required"}, status=status.HTTP_400_BAD_REQUEST
            )
        parse_date_param(date_str)
        entry_list = list(self.get_queryset().filter(date=date_str))
        return Response(
            {
                "date": date_str,
                "has_import": bool(entry_list),
                "entries": JedalnicekEntrySerializer(entry_list, many=True).data,
            }
        )

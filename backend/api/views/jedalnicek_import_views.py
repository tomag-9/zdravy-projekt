import datetime
import logging

from rest_framework import permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.request import Request
from rest_framework.response import Response

from ..models import JedalnicekEntry, JedalnicekUpload

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
        read_only_fields = ["id", "upload"]


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

        # Validate week_start is a Monday
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
            file=file,
            status=JedalnicekUpload.STATUS_PENDING,
            uploaded_by=request.user,
        )

        return Response(
            JedalnicekUploadSerializer(upload).data, status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=["delete"])
    def remove(self, request: Request, pk: int | None = None) -> Response:
        upload = self.get_object()
        upload.file.delete(save=False)
        upload.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["get"])
    def by_date(self, request: Request) -> Response:
        """Returns JedalnicekEntry records for a specific date."""
        date_str = request.query_params.get("date")
        if not date_str:
            return Response(
                {"error": "date is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        entries = (
            JedalnicekEntry.objects.filter(date=date_str)
            .select_related("diet")
            .order_by("category", "menu_variant", "diet__name")
        )

        return Response(
            {
                "date": date_str,
                "has_import": entries.exists(),
                "entries": JedalnicekEntrySerializer(entries, many=True).data,
            }
        )

    @action(detail=False, methods=["get"])
    def week_status(self, request: Request) -> Response:
        """Returns upload status for weeks, showing which weeks have uploads."""
        uploads = JedalnicekUpload.objects.order_by("-week_start")[:20]
        return Response(JedalnicekUploadSerializer(uploads, many=True).data)

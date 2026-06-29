"""Admin endpoints for weekly Jedalnicek XLSX imports."""

from __future__ import annotations

from rest_framework import permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.request import Request
from rest_framework.response import Response

from ..models import JedalnicekUpload
from ..services.jedalnicek_import_service import (
    JedalnicekImportError,
    import_jedalnicek_xlsx,
)


class JedalnicekUploadSerializer(serializers.ModelSerializer):
    week_end = serializers.DateField(read_only=True)
    entries_count = serializers.SerializerMethodField()

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
            "entries_count",
        ]
        read_only_fields = fields

    def get_entries_count(self, obj: JedalnicekUpload) -> int:
        if hasattr(obj, "entries_count"):
            return obj.entries_count
        return obj.entries.count()


class AdminJedalnicekUploadViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = JedalnicekUpload.objects.prefetch_related("entries").all()
    serializer_class = JedalnicekUploadSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        qs = super().get_queryset()
        week_start = self.request.query_params.get("week_start")
        if week_start:
            qs = qs.filter(week_start=week_start)
        return qs

    @action(detail=False, methods=["post"], parser_classes=[MultiPartParser])
    def upload(self, request: Request) -> Response:
        file = request.FILES.get("file")
        if not file:
            return Response(
                {"error": "file is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not file.name.lower().endswith(".xlsx"):
            return Response(
                {"error": "Súbor musí byť vo formáte .xlsx"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            summary = import_jedalnicek_xlsx(
                file,
                filename=file.name,
                uploaded_by=request.user,
            )
        except JedalnicekImportError as exc:
            return Response(
                {
                    "error": "XLSX súbor sa nepodarilo spracovať.",
                    "errors": exc.errors,
                    "warnings": exc.warnings,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        payload = JedalnicekUploadSerializer(summary.upload).data
        payload.update(
            {
                "warnings": summary.result.warnings,
                "entries_count": summary.entries_count,
                "replaced_uploads": summary.replaced_uploads,
            }
        )
        return Response(payload, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"])
    def remove(self, request: Request, pk=None) -> Response:
        upload = self.get_object()
        file_to_delete = upload.file
        upload.delete()
        if file_to_delete:
            file_to_delete.delete(save=False)
        return Response(status=status.HTTP_204_NO_CONTENT)

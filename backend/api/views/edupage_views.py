import datetime
import logging

from django.db.models import Count, Q
from rest_framework import permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.request import Request
from rest_framework.response import Response

from ..models import EdupageUpload, UserProfile

logger = logging.getLogger(__name__)


class EdupageUploadSerializer(serializers.ModelSerializer):
    operation_name = serializers.CharField(
        source="operation.company_name", read_only=True, allow_null=True
    )

    class Meta:
        model = EdupageUpload
        fields = [
            "id",
            "operation",
            "operation_name",
            "date",
            "filename",
            "status",
            "error_message",
            "uploaded_at",
        ]
        read_only_fields = ["id", "filename", "status", "error_message", "uploaded_at"]


class AdminEdupageUploadViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = EdupageUpload.objects.select_related("operation", "uploaded_by").all()
    serializer_class = EdupageUploadSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        qs = super().get_queryset()
        date = self.request.query_params.get("date")
        if date:
            qs = qs.filter(date=date)
        return qs

    @action(detail=False, methods=["post"], parser_classes=[MultiPartParser])
    def upload(self, request: Request) -> Response:
        date = request.data.get("date")
        operation_id = request.data.get("operation_id")
        file = request.FILES.get("file")

        if not date or not file:
            return Response(
                {"error": "date and file are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            parsed_date = datetime.date.fromisoformat(date)
        except ValueError:
            return Response(
                {"error": "date must be YYYY-MM-DD"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        operation = None
        if operation_id:
            try:
                operation = UserProfile.objects.get(pk=operation_id, is_edupage=True)
            except UserProfile.DoesNotExist:
                return Response(
                    {"error": f"Edupage operation {operation_id} not found"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        upload = EdupageUpload.objects.create(
            operation=operation,
            date=parsed_date,
            filename=file.name,
            file=file,
            status=EdupageUpload.STATUS_PENDING,
            uploaded_by=request.user,
        )

        return Response(
            EdupageUploadSerializer(upload).data, status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=["get"])
    def status_by_date(self, request: Request) -> Response:
        """Returns per-operation upload status for a given date."""
        date = request.query_params.get("date")
        if not date:
            return Response(
                {"error": "date is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        operations = UserProfile.objects.filter(is_edupage=True).annotate(
            upload_count=Count("edupage_uploads", filter=Q(edupage_uploads__date=date))
        )

        result = [
            {
                "id": op.id,
                "name": op.company_name or op.user.email,
                "uploaded": op.upload_count > 0,
                "upload_count": op.upload_count,
            }
            for op in operations
        ]

        total = len(result)
        uploaded = sum(1 for op in result if op["uploaded"])

        return Response(
            {
                "date": date,
                "total_schools": total,
                "uploaded_schools": uploaded,
                "schools": result,
            }
        )

    @action(detail=True, methods=["delete"])
    def remove(self, request: Request, pk: int | None = None) -> Response:
        upload = self.get_object()
        file_to_delete = upload.file
        upload.delete()
        try:
            file_to_delete.delete(save=False)
        except Exception:
            logger.exception(
                "Failed to delete file %s after DB record removed", file_to_delete.name
            )
        return Response(status=status.HTTP_204_NO_CONTENT)

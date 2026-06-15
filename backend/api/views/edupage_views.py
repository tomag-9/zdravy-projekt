import datetime
import logging

from django.db.models import Count, Q
from rest_framework import permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.request import Request
from rest_framework.response import Response

from ..models import EdupageUpload, School

logger = logging.getLogger(__name__)


class SchoolSerializer(serializers.ModelSerializer):
    class Meta:
        model = School
        fields = ["id", "name", "is_active", "created_at"]
        read_only_fields = ["id", "created_at"]


class EdupageUploadSerializer(serializers.ModelSerializer):
    school_name = serializers.CharField(
        source="school.name", read_only=True, allow_null=True
    )

    class Meta:
        model = EdupageUpload
        fields = [
            "id",
            "school",
            "school_name",
            "date",
            "filename",
            "status",
            "error_message",
            "uploaded_at",
        ]
        read_only_fields = ["id", "filename", "status", "error_message", "uploaded_at"]


class AdminSchoolViewSet(viewsets.ModelViewSet):
    queryset = School.objects.all()
    serializer_class = SchoolSerializer
    permission_classes = [permissions.IsAdminUser]


class AdminEdupageUploadViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = EdupageUpload.objects.select_related("school", "uploaded_by").all()
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
        school_id = request.data.get("school_id")
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

        school = None
        if school_id:
            try:
                school = School.objects.get(pk=school_id)
            except School.DoesNotExist:
                return Response(
                    {"error": f"School {school_id} not found"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        upload = EdupageUpload.objects.create(
            school=school,
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
        """Returns per-school upload status for a given date."""
        date = request.query_params.get("date")
        if not date:
            return Response(
                {"error": "date is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        schools = School.objects.filter(is_active=True).annotate(
            upload_count=Count("uploads", filter=Q(uploads__date=date))
        )

        result = [
            {
                "id": s.id,
                "name": s.name,
                "uploaded": s.upload_count > 0,
                "upload_count": s.upload_count,
            }
            for s in schools
        ]

        total = len(result)
        uploaded = sum(1 for s in result if s["uploaded"])

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

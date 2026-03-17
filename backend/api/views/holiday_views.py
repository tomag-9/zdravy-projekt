import datetime

from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.request import Request
from rest_framework.response import Response

from ..models import Holiday
from ..serializers import HolidaySerializer


class AdminHolidayViewSet(viewsets.ModelViewSet):
    """
    Admin CRUD for holidays.
    GET/POST/DELETE /api/admin/holidays/
    POST /api/admin/holidays/bulk/  { start_date, end_date, reason? }
    """

    serializer_class = HolidaySerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        return Holiday.objects.all()

    @action(detail=False, methods=["post"], url_path="bulk")
    def bulk_create(self, request: Request) -> Response:
        """Create holidays for a continuous date range (weekends included)."""
        start_str = request.data.get("start_date")
        end_str = request.data.get("end_date")
        reason = request.data.get("reason", "")

        try:
            start = datetime.date.fromisoformat(start_str)
            end = datetime.date.fromisoformat(end_str)
        except (ValueError, TypeError):
            raise ValidationError({"detail": "Invalid date format. Use YYYY-MM-DD."})

        if end < start:
            raise ValidationError({"detail": "end_date must be >= start_date."})

        created = []
        skipped = []
        d = start
        while d <= end:
            holiday, was_created = Holiday.objects.get_or_create(
                date=d, defaults={"reason": reason}
            )
            if was_created:
                created.append(str(d))
            else:
                skipped.append(str(d))
            d += datetime.timedelta(days=1)

        return Response({"created": created, "skipped": skipped})


class HolidayListViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only holiday list for authenticated clients.
    GET /api/holidays/  – returns holidays from 30 days ago up to 60 days ahead.
    """

    serializer_class = HolidaySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        today = datetime.date.today()
        return Holiday.objects.filter(
            date__gte=today - datetime.timedelta(days=30),
            date__lte=today + datetime.timedelta(days=60),
        )

import datetime

from django.utils import timezone
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
    pagination_class = None

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
            raise ValidationError(
                {
                    "start_date": ["Invalid date format. Use YYYY-MM-DD."],
                    "end_date": ["Invalid date format. Use YYYY-MM-DD."],
                }
            )

        if end < start:
            raise ValidationError({"end_date": ["end_date must be >= start_date."]})

        max_days = 365
        total_days = (end - start).days + 1
        if total_days > max_days:
            raise ValidationError(
                {
                    "non_field_errors": [
                        f"Date range too large; maximum is {max_days} days, got {total_days} days."
                    ]
                }
            )

        all_dates = [
            start + datetime.timedelta(days=offset)
            for offset in range((end - start).days + 1)
        ]
        existing_dates = set(
            Holiday.objects.filter(date__range=(start, end)).values_list(
                "date", flat=True
            )
        )
        missing_dates = [d for d in all_dates if d not in existing_dates]
        Holiday.objects.bulk_create(
            [Holiday(date=d, reason=reason) for d in missing_dates],
            ignore_conflicts=True,
        )
        missing_set = set(missing_dates)
        created = [str(d) for d in all_dates if d in missing_set]
        skipped = [str(d) for d in all_dates if d not in missing_set]

        return Response({"created": created, "skipped": skipped})


class HolidayListViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only holiday list for authenticated clients.
    GET /api/holidays/  – returns holidays from 30 days ago onward (all future holidays included).
    """

    serializer_class = HolidaySerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        today = timezone.localdate()
        return Holiday.objects.filter(date__gte=today - datetime.timedelta(days=30))

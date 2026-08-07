"""Admin API for globally closing an order date."""

import datetime

from django.db import IntegrityError, transaction
from rest_framework import permissions, status, viewsets
from rest_framework.response import Response

from api.exceptions import (
    DayAlreadyClosedError,
    InvalidDateFormatError,
    MissingRequiredFieldError,
)
from api.models import ClosedDay


def _parse_date(value) -> datetime.date:
    if value in (None, ""):
        raise MissingRequiredFieldError("date", detail="Parameter date je povinný.")
    if not isinstance(value, str):
        raise InvalidDateFormatError()
    try:
        return datetime.date.fromisoformat(value)
    except ValueError as exc:
        raise InvalidDateFormatError() from exc


def _payload(target_date: datetime.date, closed_day: ClosedDay | None) -> dict:
    if closed_day is None:
        return {"date": target_date.isoformat(), "is_closed": False}
    return {
        "date": target_date.isoformat(),
        "is_closed": True,
        "closed_at": closed_day.closed_at,
        "closed_by": closed_day.closed_by_id,
    }


class ClosedDayViewSet(viewsets.ViewSet):
    """Read and create global date locks; unlocking is intentionally unsupported."""

    permission_classes = [permissions.IsAdminUser]

    def list(self, request):
        target_date = _parse_date(request.query_params.get("date"))
        closed_day = ClosedDay.objects.filter(date=target_date).first()
        return Response(_payload(target_date, closed_day))

    def create(self, request):
        target_date = _parse_date(request.data.get("date"))
        if ClosedDay.objects.filter(date=target_date).exists():
            raise DayAlreadyClosedError()

        try:
            with transaction.atomic():
                closed_day = ClosedDay.objects.create(
                    date=target_date,
                    closed_by=request.user,
                )
        except IntegrityError as exc:
            raise DayAlreadyClosedError() from exc

        return Response(
            _payload(target_date, closed_day),
            status=status.HTTP_201_CREATED,
        )

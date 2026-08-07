"""Admin API for globally closing an order date."""

import datetime

from django.db import IntegrityError, transaction
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from api.exceptions import (
    DayAlreadyClosedError,
    DayNotClosedError,
    InvalidDateFormatError,
    MissingRequiredFieldError,
)
from api.models import ClosedDay, EventLog
from api.services.event_log_service import log_event


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
    """Read, create, and remove global date locks."""

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
                log_event(
                    EventLog.EventType.SETTINGS_CHANGE,
                    actor=request.user,
                    summary=f"Admin uzavrel objednávky na deň {target_date}.",
                    payload={
                        "model": ClosedDay._meta.label_lower,
                        "date": target_date,
                        "changes": {"is_closed": {"from": False, "to": True}},
                    },
                )
        except IntegrityError as exc:
            raise DayAlreadyClosedError() from exc

        return Response(
            _payload(target_date, closed_day),
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["delete"], url_path="unlock")
    def unlock(self, request):
        target_date = _parse_date(request.data.get("date"))
        with transaction.atomic():
            closed_day = (
                ClosedDay.objects.select_for_update().filter(date=target_date).first()
            )
            if closed_day is None:
                raise DayNotClosedError()

            closed_day.delete()
            log_event(
                EventLog.EventType.SETTINGS_CHANGE,
                actor=request.user,
                summary=f"Admin odomkol objednávky na deň {target_date}.",
                payload={
                    "model": ClosedDay._meta.label_lower,
                    "date": target_date,
                    "changes": {"is_closed": {"from": True, "to": False}},
                },
            )
        return Response(_payload(target_date, None), status=status.HTTP_200_OK)

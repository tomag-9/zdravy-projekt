"""Admin API for globally closing an order date."""

import datetime
import logging

from django.db import IntegrityError, transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from api.cache_service import (
    CLOSED_DAY_PDF_TIMEOUT,
    clear_closed_day_pdf_cache,
    get_closed_day_pdf_cache_key,
    set_cached,
)
from api.exceptions import (
    DayAlreadyClosedError,
    DayNotClosedError,
    InvalidDateFormatError,
    MissingRequiredFieldError,
)
from api.models import ClosedDay, EventLog
from api.permissions import IsAdminOrAbove, SectionAccess
from api.services.event_log_service import log_event
from api.services.gramage_pdf_service import render_gramage_dashboard_pdf

from .. import sections

logger = logging.getLogger(__name__)


def _cache_closed_day_pdf(target_date: datetime.date) -> None:
    """Predgeneruje a nacachuje PDF gramáže hneď pri uzavretí dňa (#528).

    Objednávky uzavretého dňa sa už nedajú meniť (ClosedDayOrderModification-
    Error), takže PDF zostáva platným snapshotom počas celej platnosti cache
    (48h, alebo dokým sa deň neodomkne — viď `unlock()`). Zlyhanie
    generovania nesmie zablokovať uzavretie dňa samotné — PDF sa v tom
    prípade len domodeluje na požiadanie (`gramage-dashboard-pdf`).
    """
    try:
        pdf_bytes = render_gramage_dashboard_pdf(target_date.isoformat())
        set_cached(
            get_closed_day_pdf_cache_key(target_date.isoformat()),
            pdf_bytes,
            timeout=CLOSED_DAY_PDF_TIMEOUT,
        )
    except Exception:
        logger.exception(
            "Nepodarilo sa predgenerovať PDF gramáže pre uzavretý deň %s",
            target_date,
        )


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

    permission_classes = [IsAdminOrAbove, SectionAccess]
    section = sections.PODKLADY

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

        # Mimo transakcie — WeasyPrint je pomalé a nemá dôvod držať db riadok.
        _cache_closed_day_pdf(target_date)

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
        # Objednávky sú opäť editovateľné — cachnuté PDF by bolo zastarané (#528).
        clear_closed_day_pdf_cache(target_date.isoformat())
        return Response(_payload(target_date, None), status=status.HTTP_200_OK)

import datetime

from django.utils import timezone
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from ..dev_clock import (
    get_dev_clock_override,
    is_dev_clock_enabled,
    real_now,
    set_dev_clock_override,
)
from ..permissions import IsSuperadmin


class DevClockView(APIView):
    """Dev-only: čítanie/nastavenie/zmazanie zmrazeného `timezone.now()`
    override-u — na manuálne testovanie termínovej logiky (Menu B/C
    2-dňový termín, meal deadliny...) bez čakania na skutočný čas.

    Mimo `DEV_CLOCK_ENABLED` (prod/staging) vracia 404 na všetky metódy,
    aj superadminovi — endpoint sa má správať, akoby neexistoval.
    """

    permission_classes = [IsSuperadmin]

    def _state(self) -> dict:
        override = get_dev_clock_override()
        return {
            "enabled": True,
            "override": override.isoformat() if override else None,
            "effective_now": timezone.now().isoformat(),
            "real_now": real_now().isoformat(),
        }

    def get(self, request: Request) -> Response:
        if not is_dev_clock_enabled():
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(self._state())

    def post(self, request: Request) -> Response:
        if not is_dev_clock_enabled():
            return Response(status=status.HTTP_404_NOT_FOUND)
        raw = request.data.get("datetime")
        if not raw:
            return Response(
                {"detail": "Pole 'datetime' je povinné."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            dt = datetime.datetime.fromisoformat(raw)
        except ValueError:
            return Response(
                {"detail": "Neplatný formát dátumu/času."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        set_dev_clock_override(dt)
        return Response(self._state())

    def delete(self, request: Request) -> Response:
        if not is_dev_clock_enabled():
            return Response(status=status.HTTP_404_NOT_FOUND)
        set_dev_clock_override(None)
        return Response(self._state())

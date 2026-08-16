"""Endpointy pre naberací workflow kuchyne (#487)."""

from __future__ import annotations

from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from ..models import Prevadzka
from ..permissions import IsKuchynaOrAbove
from ..services import loading_service
from ..utils import parse_date_param


def _prevadzka_or_400(request):
    """Vráti prevádzku z tela requestu, alebo chybovú odpoveď."""
    raw = request.data.get("prevadzka")
    if raw in (None, ""):
        return None, Response(
            {"error": "prevadzka required"}, status=status.HTTP_400_BAD_REQUEST
        )
    try:
        prevadzka = Prevadzka.objects.get(pk=int(raw))
    except (TypeError, ValueError):
        return None, Response(
            {"error": "prevadzka must be an integer"},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Prevadzka.DoesNotExist:
        return None, Response(
            {"error": "prevadzka not found"}, status=status.HTTP_404_NOT_FOUND
        )
    return prevadzka, None


def _date_or_400(request, source):
    raw = source.get("date")
    if not raw:
        return None, Response(
            {"error": "date required"}, status=status.HTTP_400_BAD_REQUEST
        )
    return parse_date_param(raw), None


@extend_schema_view(
    list=extend_schema(tags=["kuchyna"]),
)
class LoadingViewSet(viewsets.ViewSet):
    """
    Stav nakladania per prevádzka a položka.

    Celé to beží pod `IsKuchynaOrAbove` — kuchyňa je jediná rola, ktorá tento
    workflow reálne používa, admin ho vidí, lebo je v rebríku nad ňou.
    """

    permission_classes = [IsKuchynaOrAbove]

    def list(self, request):
        """GET /api/kuchyna/loading/?date=YYYY-MM-DD"""
        date, error = _date_or_400(request, request.query_params)
        if error:
            return error
        return Response(loading_service.overview(date))

    @action(detail=False, methods=["post"], url_path="item")
    def set_item(self, request):
        """POST /api/kuchyna/loading/item/ — odklikne jednu položku."""
        date, error = _date_or_400(request, request.data)
        if error:
            return error
        prevadzka, error = _prevadzka_or_400(request)
        if error:
            return error

        item_key = request.data.get("item_key") or ""
        # Chýbajúce `is_loaded` znamená „naložené" — bežný smer používania je
        # odškrtávanie zoznamu, nie jeho rušenie.
        is_loaded = bool(request.data.get("is_loaded", True))
        try:
            loading_service.set_item_loaded(
                date=date,
                prevadzka=prevadzka,
                item_key=item_key,
                is_loaded=is_loaded,
                actor=request.user,
            )
        except loading_service.UnknownLoadingItem:
            return Response(
                {"error": f"Položka '{item_key}' nie je v jedálničku tohto dňa."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(loading_service.checklist(date=date, prevadzka=prevadzka))

    @action(detail=False, methods=["get"], url_path="checklist")
    def get_checklist(self, request):
        """GET /api/kuchyna/loading/checklist/?date=&prevadzka= — kontrolný krok."""
        date, error = _date_or_400(request, request.query_params)
        if error:
            return error
        raw = request.query_params.get("prevadzka")
        try:
            prevadzka = Prevadzka.objects.get(pk=int(raw or 0))
        except (TypeError, ValueError, Prevadzka.DoesNotExist):
            return Response(
                {"error": "prevadzka required"}, status=status.HTTP_400_BAD_REQUEST
            )
        return Response(loading_service.checklist(date=date, prevadzka=prevadzka))

    @action(detail=False, methods=["post"], url_path="confirm")
    def confirm(self, request):
        """POST /api/kuchyna/loading/confirm/ — finálne „naložené"."""
        date, error = _date_or_400(request, request.data)
        if error:
            return error
        prevadzka, error = _prevadzka_or_400(request)
        if error:
            return error

        try:
            loading_service.confirm_prevadzka(
                date=date, prevadzka=prevadzka, actor=request.user
            )
        except loading_service.LoadingNotComplete as exc:
            return Response(
                {
                    "error": "Prevádzka má ešte nenaložené položky.",
                    "missing": exc.missing,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(loading_service.checklist(date=date, prevadzka=prevadzka))

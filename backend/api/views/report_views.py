import datetime
import logging

from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .. import sections
from ..models import Celok, DailyOrder, ExternalOrderSnapshot, Prevadzka
from ..order_data import effective_order_data
from ..permissions import IsAdminOrAbove, SectionAccess
from ..services import ReportService
from ..utils import meal_counts, order_row_label
from .report_helpers import build_user_meal_row, merge_meal_totals

logger = logging.getLogger(__name__)


MEAL_LABELS = {
    "breakfast": "Raňajky",
    "lunch": "Obed",
    "olovrant": "Olovrant",
}
WEEKDAY_REFERENCE_LABELS = (
    "pondelky",
    "utorky",
    "stredy",
    "štvrtky",
    "piatky",
    "soboty",
    "nedele",
)


def _historical_meal_attention(target_date, prevadzka_ids):
    """Return counts from the latest three matching weekdays.

    This is deliberately based on ``DailyOrder`` rather than EduPage scrape
    metadata: manual/app facilities need the same anomaly detection.  The
    three reference days are selected before inspecting their meal counts.
    This means an intervening zero is evidence against a stable meal and must
    not be skipped in favour of an older positive order.
    """
    histories = {}
    matching_orders_seen = {}
    historical_orders = (
        DailyOrder.objects.filter(
            prevadzka_id__in=prevadzka_ids,
            date__lt=target_date,
        )
        .only("prevadzka_id", "date", "data")
        .order_by("prevadzka_id", "-date")
    )

    for historical_order in historical_orders:
        if historical_order.date.weekday() != target_date.weekday():
            continue

        seen = matching_orders_seen.get(historical_order.prevadzka_id, 0)
        if seen >= 3:
            continue
        matching_orders_seen[historical_order.prevadzka_id] = seen + 1

        by_meal = histories.setdefault(historical_order.prevadzka_id, {})
        historical_counts = meal_counts(
            historical_order.data if isinstance(historical_order.data, dict) else {}
        )
        for meal in MEAL_LABELS:
            values = by_meal.setdefault(meal, [])
            values.append(historical_counts[meal])

    return histories


def build_prevadzka_overview(target_date):
    """Payload pre prehľad dodania podkladov za deň.

    Zdieľané JSON endpointom aj XLSX/PDF exportmi, nech sa logika (klasifikácia
    edupage/app, počty, flagy) nerozchádza medzi výstupmi.
    """
    prevadzky = (
        Prevadzka.objects.filter(is_active=True)
        .select_related("celok")
        .order_by("celok__nazov", "sort_order", "nazov")
    )

    orders_by_prevadzka = {
        order.prevadzka_id: order
        for order in DailyOrder.objects.filter(
            date=target_date, prevadzka__isnull=False
        )
    }
    external_by_prevadzka = {}
    for snapshot in ExternalOrderSnapshot.objects.filter(date=target_date):
        external_by_prevadzka.setdefault(snapshot.prevadzka_id, []).append(snapshot)
    historical_attention = _historical_meal_attention(
        target_date, [prevadzka.id for prevadzka in prevadzky]
    )

    edupage_rows = []
    app_rows = []
    for prevadzka in prevadzky:
        is_edupage = prevadzka.celok.zdroj_objednavok == Celok.ZdrojObjednavok.EDUPAGE
        order = orders_by_prevadzka.get(prevadzka.id)
        data = {}
        flags = {
            "attention": [],
            "config_notes": [],
            "unmapped_diets": [],
            "uncertain_diets": [],
        }
        counts = meal_counts(data)
        delivery_status = "missing"
        attention_dismissed = False
        if order is not None:
            data = effective_order_data(
                order, external_by_prevadzka.get(order.prevadzka_id, [])
            )
            counts = meal_counts(data)
            attention_dismissed = order.attention_dismissed
            if order.is_auto:
                delivery_status = "auto"
            elif counts["total"] == 0:
                delivery_status = "manual_zero"
            else:
                delivery_status = "manual"
            if isinstance(order.scrape_flags, dict):
                flags = {
                    "attention": order.scrape_flags.get("attention", []) or [],
                    "config_notes": order.scrape_flags.get("config_notes", []) or [],
                    "unmapped_diets": order.scrape_flags.get("unmapped_diets", [])
                    or [],
                    "uncertain_diets": order.scrape_flags.get("uncertain_diets", [])
                    or [],
                }

            # Behavioural attention is computed for every source type.  Keep
            # scrape-produced flags intact; this UI-only signal must neither
            # overwrite them nor be written back into ``scrape_flags``.
            # Values are collected newest-first and reversed for a natural
            # oldest-to-newest explanation in the admin popup.
            for meal, label in MEAL_LABELS.items():
                historical_values = historical_attention.get(
                    order.prevadzka_id, {}
                ).get(meal, [])
                if (
                    counts[meal] != 0
                    or len(historical_values) != 3
                    or not all(value > 0 for value in historical_values)
                ):
                    continue
                values_text = " / ".join(
                    str(value) for value in reversed(historical_values)
                )
                attention = (
                    f"{label}: dnes 0, predchádzajúce "
                    f"{WEEKDAY_REFERENCE_LABELS[target_date.weekday()]} {values_text} "
                    "— over objednávku"
                )
                if attention not in flags["attention"]:
                    flags["attention"].append(attention)

        # `attention_dismissed` skrýva CELÝ warning popup pre tento deň (admin
        # ho odklikol ako "OK, vybavené") — pôvodne len `attention`, rozšírené
        # na `config_notes`/`unmapped_diets`/`uncertain_diets` tiež (user
        # 9.9.2026: opakované false-positive olovrant/diet flagy na viacerých
        # prevádzkach, dovtedy nedalo sa ich odkliknúť vôbec). `flags.*`
        # samotné necháme netknuté (frontend popup ich aj po dismisse vie
        # zobraziť), len `has_warning` (dot farba) dismiss zohľadní.
        row = {
            "prevadzka_id": prevadzka.id,
            "nazov": prevadzka.nazov,
            "celok": prevadzka.celok.nazov,
            "delivered": order is not None,
            "delivery_status": delivery_status,
            # Nastavenia zobrazované ako rýchle odznaky v prehľade prevádzok.
            # Frontend podľa zdroja objednávok vyberie relevantný prepínač ZV:
            # app = ručné balenie zvlášť, EduPage = automaticky dospelí zvlášť.
            "pack_separately_enabled": prevadzka.pack_separately_enabled,
            "adults_pack_separately_enabled": prevadzka.adults_pack_separately_enabled,
            "olovrant_s_obedom": prevadzka.olovrant_s_obedom,
            "counts": counts,
            "flags": flags,
            "attention_dismissed": attention_dismissed,
            "has_warning": bool(
                not attention_dismissed
                and (
                    flags["attention"]
                    or flags["config_notes"]
                    or flags["unmapped_diets"]
                    or flags["uncertain_diets"]
                )
            ),
        }
        (edupage_rows if is_edupage else app_rows).append(row)

    return {
        "date": target_date.isoformat(),
        "edupage": edupage_rows,
        "app": app_rows,
    }


@extend_schema_view(
    daily_stats=extend_schema(tags=["admin"]),
    daily_report=extend_schema(tags=["admin"]),
    prevadzka_overview=extend_schema(tags=["admin"]),
    dismiss_attention=extend_schema(tags=["admin"]),
)
class AdminSummaryViewSet(viewsets.ViewSet):
    """
    Admin ViewSet for Dashboard Summaries.
    Aggregates order data for reporting and analytics.
    """

    permission_classes = [IsAdminOrAbove, SectionAccess]
    section = sections.PODKLADY

    def _parse_date(self, request):
        """Parse ?date=YYYY-MM-DD; vráti date alebo DRF Response(400)."""
        date_str = request.query_params.get("date")
        if not date_str:
            return Response(
                {"error": "date parameter required"}, status=status.HTTP_400_BAD_REQUEST
            )
        try:
            return datetime.date.fromisoformat(date_str)
        except (TypeError, ValueError):
            return Response(
                {"error": "invalid date format, expected YYYY-MM-DD"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=False, methods=["get"], url_path="daily-stats")
    def daily_stats(self, request):
        """Get daily order statistics for a given date.

        Delegates aggregation to ReportService. Results are cached for 5 minutes.
        """
        from ..cache_service import (
            DAILY_STATS_TIMEOUT,
            get_cached,
            get_daily_stats_cache_key,
            set_cached,
        )

        date_str = request.query_params.get("date")
        if not date_str:
            return Response(
                {"error": "Date parameter is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            target_date = datetime.datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return Response(
                {"error": "Invalid date format. Use YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cache_key = get_daily_stats_cache_key(date_str)
        cached_stats = get_cached(cache_key)
        if cached_stats is not None:
            return Response(cached_stats, status=status.HTTP_200_OK)

        stats = ReportService.aggregate_daily_stats(target_date)
        set_cached(cache_key, stats, timeout=DAILY_STATS_TIMEOUT)

        return Response(stats)

    @action(detail=False, methods=["get"], url_path="daily-report")
    def daily_report(self, request):
        """Get per-user order summary for a given date."""
        date_str = request.query_params.get("date")
        if not date_str:
            return Response(
                {"error": "date parameter required"}, status=status.HTTP_400_BAD_REQUEST
            )
        try:
            target_date = datetime.date.fromisoformat(date_str)
        except (TypeError, ValueError):
            return Response(
                {"error": "invalid date format, expected YYYY-MM-DD"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        orders = (
            DailyOrder.objects.filter(date=target_date)
            .select_related("user", "user__profile", "prevadzka__celok")
            .prefetch_related(
                "prevadzka__celok__prevadzky", "prevadzka__external_order_snapshots"
            )
            .order_by("user__email", "prevadzka__sort_order", "prevadzka__nazov")
        )

        totals = {
            "breakfast": {"menus": {}, "diets": {}, "total": 0},
            "lunch": {"menus": {}, "diets": {}, "total": 0},
            "olovrant": {"menus": {}, "diets": {}, "total": 0},
            "grand": 0,
        }
        rows = []
        for order in orders:
            user = order.user
            data = effective_order_data(order)
            bf = build_user_meal_row(data, "breakfast")
            lu = build_user_meal_row(data, "lunch")
            ol = build_user_meal_row(data, "olovrant")
            row_total = bf["total"] + lu["total"] + ol["total"]
            visible_meals = getattr(order.prevadzka, "visible_meals", None) or [
                "breakfast",
                "lunch",
                "olovrant",
            ]
            rows.append(
                {
                    # Riadok je na objednávku (teda na prevádzku), nie na
                    # používateľa — EduPage prevádzky zdieľajú jeden systémový
                    # login, takže `user_id` riadky nerozlíši.
                    "order_id": order.id,
                    "user_id": user.id,
                    "name": order_row_label(order),
                    "email": user.email,
                    "breakfast": bf,
                    "lunch": lu,
                    "olovrant": ol,
                    "visible_meals": visible_meals,
                    "total": row_total,
                }
            )
            merge_meal_totals(totals["breakfast"], bf)
            merge_meal_totals(totals["lunch"], lu)
            merge_meal_totals(totals["olovrant"], ol)
            totals["grand"] += row_total

        return Response(
            {"date": target_date.isoformat(), "rows": rows, "totals": totals}
        )

    @action(detail=False, methods=["get"], url_path="prevadzka-overview")
    def prevadzka_overview(self, request):
        """Prehľad dodania podkladov za deň, rozdelený na EduPage a in-app prevádzky.

        Pre každú aktívnu prevádzku vráti, či za daný deň existuje objednávka
        (`delivered`), počty raňajok/obedov/olovrantov a prípadné upozornenia
        zo scrapu (`flags`), z ktorých frontend vyrobí ✅ / ❌ / ⚠️.
        """
        parsed = self._parse_date(request)
        if isinstance(parsed, Response):
            return parsed
        return Response(build_prevadzka_overview(parsed))

    @action(detail=False, methods=["post"], url_path="dismiss-attention")
    def dismiss_attention(self, request):
        """Odklikni VŠETKY flagy (`attention`/`config_notes`/`unmapped_diets`/
        `uncertain_diets`) ako vybavené pre (prevádzka, deň).

        Len pre tento konkrétny deň — `DailyOrder` je per (prevádzka, date),
        takže ďalší deň má vlastný riadok a flag sa prirodzene znova ukáže,
        ak pretrváva (viď `DailyOrder.attention_dismissed`). Trvalé
        structural facty (napr. "táto škola nikdy nemá olovrant") radšej
        oprav v `PrevadzkaConfig`/`letter_hook` priamo — dismiss je pre
        jednorazové/dennodenné overenie, nie náhrada za config fix, ktorý by
        inak bolo treba klikať znova každý deň naveky.
        """
        prevadzka_id = request.data.get("prevadzka_id")
        date_str = request.data.get("date")
        if not prevadzka_id or not date_str:
            return Response(
                {"error": "prevadzka_id a date sú povinné"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            target_date = datetime.date.fromisoformat(date_str)
        except (TypeError, ValueError):
            return Response(
                {"error": "invalid date format, expected YYYY-MM-DD"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        updated = DailyOrder.objects.filter(
            prevadzka_id=prevadzka_id, date=target_date
        ).update(attention_dismissed=True)
        if not updated:
            return Response(
                {"error": "objednávka pre danú prevádzku/deň neexistuje"},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({"ok": True})

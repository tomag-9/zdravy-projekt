"""Admin správa celkov a prevádzok — celok sa rozbalí na svoje prevádzky.

`AdminCelokViewSet` je read-only zdroj pre rozbaliteľný zoznam; písanie ide cez
`AdminFacilityPrevadzkaViewSet` (plný CRUD nad `Prevadzka`). Presun prevádzky medzi
celkami sa nepodporuje — celok je pri vytvorení fixný (viď serializer).
"""

from __future__ import annotations

from django.db.models import Count, Q, QuerySet
from rest_framework import permissions, viewsets

from ..models import Celok, Prevadzka
from ..serializers_facilities import AdminCelokSerializer, AdminPrevadzkaSerializer


class AdminCelokViewSet(viewsets.ModelViewSet):
    """Celky s vnorenými prevádzkami (rozbaliteľný zoznam) + edit/create celku.

    Zápisom sa menia len skalárne polia celku (názov, fakturačné údaje, adresa);
    `prevadzky` a `logins` sú read-only (spravujú sa vlastnými endpointmi).
    """

    serializer_class = AdminCelokSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = None

    def get_queryset(self) -> QuerySet:
        qs = Celok.objects.prefetch_related(
            "prevadzky",
            "prevadzky__edupage_connection",
            "prevadzky__visible_diets",
            "prevadzky__profile_accesses__profile__user",
            "profile_accesses__profile__user",
        ).order_by("nazov")
        search = self.request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(
                Q(nazov__icontains=search)
                | Q(billing_name__icontains=search)
                | Q(prevadzky__nazov__icontains=search)
            ).distinct()
        return qs


class AdminFacilityPrevadzkaViewSet(viewsets.ModelViewSet):
    """Plný CRUD nad prevádzkami pre správu celkov."""

    serializer_class = AdminPrevadzkaSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = None

    def get_queryset(self) -> QuerySet:
        return (
            Prevadzka.objects.select_related("celok", "edupage_connection")
            .prefetch_related(
                "visible_diets",
                "profile_accesses__profile__user",
                "celok__profile_accesses__profile__user",
            )
            .annotate(orders_count=Count("orders", distinct=True))
            .order_by("celok__nazov", "sort_order", "nazov")
        )

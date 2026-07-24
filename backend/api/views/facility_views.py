"""Admin správa celkov a prevádzok — celok sa rozbalí na svoje prevádzky.

`AdminCelokViewSet` je read-only zdroj pre rozbaliteľný zoznam; písanie ide cez
`AdminFacilityPrevadzkaViewSet` (plný CRUD nad `Prevadzka`). Presun prevádzky medzi
celkami sa nepodporuje — celok je pri vytvorení fixný (viď serializer).
"""

from __future__ import annotations

from django.db.models import Count, Prefetch, Q, QuerySet
from rest_framework import permissions, viewsets

from ..models import Celok, Prevadzka, ProfileCelokAccess, ProfilePrevadzkaAccess
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
        prevadzka_accesses = ProfilePrevadzkaAccess.objects.select_related(
            "profile__user"
        ).order_by("pk")
        celok_accesses = ProfileCelokAccess.objects.select_related(
            "profile__user"
        ).order_by("pk")
        prevadzky = (
            Prevadzka.objects.select_related("celok", "edupage_connection")
            .prefetch_related(
                "visible_diets",
                Prefetch(
                    "profile_accesses",
                    queryset=prevadzka_accesses,
                    to_attr="_admin_profile_accesses",
                ),
            )
            .order_by("sort_order", "nazov")
        )
        qs = Celok.objects.prefetch_related(
            Prefetch(
                "prevadzky",
                queryset=prevadzky,
                to_attr="_admin_prevadzky",
            ),
            Prefetch(
                "profile_accesses",
                queryset=celok_accesses,
                to_attr="_admin_profile_accesses",
            ),
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

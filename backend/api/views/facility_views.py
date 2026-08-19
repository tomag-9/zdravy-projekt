"""Admin správa celkov a prevádzok — celok sa rozbalí na svoje prevádzky.

`AdminCelokViewSet` nesie plný CRUD nad `Celok` (vrátane vytvorenia nového celku
z admin UI, issue #463); prevádzkové polia sa menia cez
`AdminFacilityPrevadzkaViewSet` (plný CRUD nad `Prevadzka`). Presun prevádzky medzi
celkami sa nepodporuje — celok je pri vytvorení fixný (viď serializer).

Zmazanie celku je **kaskádové** (issue #462): zmažú sa aj jeho prevádzky a ich
objednávky (`Prevadzka.celok`/`DailyOrder.prevadzka` sú `PROTECT`, takže bez
explicitného manuálneho zmazania v správnom poradí by DELETE skončil na
`ProtectedError`). Prístupy (`ProfileCelokAccess`/`ProfilePrevadzkaAccess`) sa
zmažú automaticky (`CASCADE`) — samotné loginy (`User`/`UserProfile`) ostávajú,
len prídu o prístup. Frontend pred zavolaním DELETE zobrazí potvrdzovací dialóg
s rozsahom dopadu (počet prevádzok/objednávok/loginov).
"""

from __future__ import annotations

from django.db import transaction
from django.db.models import Count, Prefetch, Q, QuerySet
from rest_framework import viewsets
from rest_framework.response import Response

from .. import sections
from ..cache_service import (
    ADMIN_CELOK_LIST_TIMEOUT,
    get_admin_celok_list_cache_key,
    get_cached,
    set_cached,
)
from ..models import (
    Celok,
    DailyOrder,
    EventLog,
    PasswordResetToken,
    Prevadzka,
    ProfileCelokAccess,
    ProfilePrevadzkaAccess,
)
from ..permissions import IsAdminOrAbove, SectionAccess
from ..serializers_facilities import AdminCelokSerializer, AdminPrevadzkaSerializer
from ..services.event_log_service import build_model_diff, log_event


def _log_settings_change(request, instance, changes, action: str) -> None:
    if not changes:
        return
    label = str(instance)
    log_event(
        EventLog.EventType.SETTINGS_CHANGE,
        actor=request.user,
        summary=f"Admin {action} {instance._meta.verbose_name}: {label}.",
        payload={
            "model": instance._meta.label_lower,
            "object_id": instance.pk,
            "changes": changes,
        },
    )


class AdminCelokViewSet(viewsets.ModelViewSet):
    """Celky s vnorenými prevádzkami (rozbaliteľný zoznam) + edit/create celku.

    Zápisom sa menia len skalárne polia celku (názov, fakturačné údaje, adresa);
    `prevadzky` a `logins` sú read-only (spravujú sa vlastnými endpointmi).
    """

    serializer_class = AdminCelokSerializer
    permission_classes = [IsAdminOrAbove, SectionAccess]
    section = sections.PREVADZKY
    pagination_class = None

    def perform_create(self, serializer):
        changes = build_model_diff(None, serializer.validated_data)
        instance = serializer.save()
        _log_settings_change(self.request, instance, changes, "vytvoril")

    def perform_update(self, serializer):
        changes = build_model_diff(serializer.instance, serializer.validated_data)
        instance = serializer.save()
        _log_settings_change(self.request, instance, changes, "upravil")

    def perform_destroy(self, instance):
        """Kaskádovo zmaže celok aj jeho prevádzky a ich objednávky.

        `Prevadzka.celok` a `DailyOrder.prevadzka` sú `on_delete=PROTECT`, takže
        `instance.delete()` by inak zlyhal na `ProtectedError`, ak má celok čo len
        jednu prevádzku. Poradie mazania: objednávky → prevádzky (uvoľní PROTECT
        z Celok) → celok. Prístupy (`ProfileCelokAccess`/`ProfilePrevadzkaAccess`)
        sú `CASCADE`, zmažú sa samy; loginy (`User`) ostávajú, len prídu o prístup.
        """
        with transaction.atomic():
            prevadzka_ids = list(instance.prevadzky.values_list("id", flat=True))
            orders_count = DailyOrder.objects.filter(
                prevadzka_id__in=prevadzka_ids
            ).count()
            logins_count = (
                ProfileCelokAccess.objects.filter(celok=instance).count()
                + ProfilePrevadzkaAccess.objects.filter(
                    prevadzka_id__in=prevadzka_ids
                ).count()
            )
            prevadzky_count = len(prevadzka_ids)
            label = str(instance)
            instance_pk = instance.pk

            DailyOrder.objects.filter(prevadzka_id__in=prevadzka_ids).delete()
            Prevadzka.objects.filter(id__in=prevadzka_ids).delete()
            instance.delete()

            log_event(
                EventLog.EventType.SETTINGS_CHANGE,
                actor=self.request.user,
                summary=(
                    f"Admin vymazal celok „{label}“ vrátane {prevadzky_count} "
                    f"prevádzok, {orders_count} objednávok a {logins_count} "
                    "prístupov (loginy ostávajú, len prišli o prístup)."
                ),
                payload={
                    "model": "api.celok",
                    "object_id": instance_pk,
                    "cascade": {
                        "prevadzky_count": prevadzky_count,
                        "orders_count": orders_count,
                        "logins_count": logins_count,
                    },
                },
            )

    def list(self, request, *args, **kwargs):
        """Return the celok/prevádzka tree, cached when unfiltered (1h TTL).

        `get_queryset()` builds a deeply nested tree (celky → prevádzky →
        prístupy → reset tokeny) on every call — expensive to serialize even
        though the queries themselves are already prefetched. Only the
        unfiltered response is cached because that's what `FacilityManager.tsx`
        fetches on load (it filters client-side); a `?search=` request is
        served uncached. Cache is invalidated via signal handlers whenever a
        model feeding this queryset changes (see api/signals.py).
        """
        if request.query_params.get("search", "").strip():
            return super().list(request, *args, **kwargs)

        cache_key = get_admin_celok_list_cache_key()
        cached_data = get_cached(cache_key)
        if cached_data is not None:
            return Response(cached_data)

        response = super().list(request, *args, **kwargs)
        if response.status_code == 200:
            set_cached(cache_key, response.data, timeout=ADMIN_CELOK_LIST_TIMEOUT)
        return response

    def get_queryset(self) -> QuerySet:
        active_reset_tokens_prefetch = Prefetch(
            "profile__user__password_reset_tokens",
            queryset=PasswordResetToken.objects.filter(used=False).order_by(
                "-created_at"
            ),
            to_attr="_active_reset_tokens",
        )
        prevadzka_accesses = (
            ProfilePrevadzkaAccess.objects.select_related("profile__user")
            .prefetch_related(active_reset_tokens_prefetch)
            .order_by("pk")
        )
        celok_accesses = (
            ProfileCelokAccess.objects.select_related("profile__user")
            .prefetch_related(active_reset_tokens_prefetch)
            .order_by("pk")
        )
        prevadzky = (
            Prevadzka.objects.select_related("celok", "edupage_connection")
            .annotate(orders_count=Count("orders", distinct=True))
            .prefetch_related(
                "visible_diets",
                "visible_portion_types",
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
    permission_classes = [IsAdminOrAbove, SectionAccess]
    section = sections.PREVADZKY
    pagination_class = None

    def perform_create(self, serializer):
        changes = build_model_diff(None, serializer.validated_data)
        instance = serializer.save()
        _log_settings_change(self.request, instance, changes, "vytvoril")

    def perform_update(self, serializer):
        audited_data = dict(serializer.validated_data)
        audited_data.pop("celok", None)
        changes = build_model_diff(serializer.instance, audited_data)
        instance = serializer.save()
        _log_settings_change(self.request, instance, changes, "upravil")

    def get_queryset(self) -> QuerySet:
        return (
            Prevadzka.objects.select_related("celok", "edupage_connection")
            .prefetch_related(
                "visible_diets",
                "visible_portion_types",
                "profile_accesses__profile__user",
                "celok__profile_accesses__profile__user",
            )
            .annotate(orders_count=Count("orders", distinct=True))
            .order_by("celok__nazov", "sort_order", "nazov")
        )

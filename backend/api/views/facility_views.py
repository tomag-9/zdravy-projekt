"""Admin správa celkov a prevádzok — celok sa rozbalí na svoje prevádzky.

`AdminCelokViewSet` nesie plný CRUD nad `Celok` (vrátane vytvorenia nového celku
z admin UI, issue #463); prevádzkové polia sa menia cez
`AdminFacilityPrevadzkaViewSet` (plný CRUD nad `Prevadzka`). Presun prevádzky medzi
celkami sa nepodporuje — celok je pri vytvorení fixný (viď serializer).

Zmazanie celku je **kaskádové** (issue #462): zmažú sa aj jeho prevádzky a ich
objednávky (`Prevadzka.celok`/`DailyOrder.prevadzka` sú `PROTECT`, takže bez
explicitného manuálneho zmazania v správnom poradí by DELETE skončil na
`ProtectedError`). Prístupy (`ProfileCelokAccess`/`ProfilePrevadzkaAccess`) sa
zmažú automaticky (`CASCADE`). Klientský login (`User`/`UserProfile`), ktorému
zmazanie zobralo posledný zvyšný prístup, sa zmaže tiež (issue #520) — inak
ostáva v DB ako login bez akejkoľvek prevádzky/celku, neviditeľný pre obe admin
obrazovky (FacilityManager vypisuje len loginy so zachovaným accessom,
AdminUserList len interné role), teda nezmazateľný cez UI. Interné role
(admin/superadmin/kuchyňa) sa takto nikdy nemažú — nie sú viazané 1:1 na
facility access. Frontend pred zavolaním DELETE zobrazí potvrdzovací dialóg
s rozsahom dopadu (počet prevádzok/objednávok/loginov).
"""

from __future__ import annotations

from django.contrib.auth.models import User
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
    PrevadzkaDiet,
    ProfileCelokAccess,
    ProfilePrevadzkaAccess,
    UserProfile,
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


def _delete_orphaned_client_logins(profile_ids: list[int]) -> list[str]:
    """Zmaže klientské loginy z *profile_ids*, ktorým už neostal žiadny prístup.

    Volá sa po zmazaní Celku/Prevádzky, keď FK `CASCADE` už odstránil ich
    `ProfileCelokAccess`/`ProfilePrevadzkaAccess` záznamy. Login sa zmaže len
    ak je `role=klient` a nemá *žiadny* zvyšný prístup (mohol mať prístup aj
    k inému celku/prevádzke, ten sa nesmie stratiť). Interné role sa nikdy
    nemažú automaticky.

    Vracia zoznam e-mailov zmazaných loginov (pre audit log).
    """
    if not profile_ids:
        return []
    orphaned = list(
        UserProfile.objects.filter(id__in=profile_ids, role=UserProfile.Role.KLIENT)
        .filter(celok_accesses__isnull=True, prevadzka_accesses__isnull=True)
        .select_related("user")
        .distinct()
    )
    if not orphaned:
        return []
    emails = [profile.user.email for profile in orphaned]
    User.objects.filter(id__in=[profile.user_id for profile in orphaned]).delete()
    return emails


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
        """Kaskádovo zmaže celok aj jeho prevádzky, objednávky a osirelé loginy.

        `Prevadzka.celok` a `DailyOrder.prevadzka` sú `on_delete=PROTECT`, takže
        `instance.delete()` by inak zlyhal na `ProtectedError`, ak má celok čo len
        jednu prevádzku. Poradie mazania: objednávky → prevádzky (uvoľní PROTECT
        z Celok) → celok. Prístupy (`ProfileCelokAccess`/`ProfilePrevadzkaAccess`)
        sú `CASCADE`, zmažú sa samy; profile_id-čka postihnutých loginov si preto
        vytiahneme *pred* cascade delete, aby sme po ňom vedeli zmazať tie, ktorým
        neostal žiadny iný prístup (issue #520) — inak by ostali v DB ako login
        bez prevádzky, neviditeľný a nezmazateľný cez žiadnu admin obrazovku.
        """
        with transaction.atomic():
            prevadzka_ids = list(instance.prevadzky.values_list("id", flat=True))
            orders_count = DailyOrder.objects.filter(
                prevadzka_id__in=prevadzka_ids
            ).count()
            affected_profile_ids = list(
                ProfileCelokAccess.objects.filter(celok=instance).values_list(
                    "profile_id", flat=True
                )
            ) + list(
                ProfilePrevadzkaAccess.objects.filter(
                    prevadzka_id__in=prevadzka_ids
                ).values_list("profile_id", flat=True)
            )
            logins_count = len(affected_profile_ids)
            prevadzky_count = len(prevadzka_ids)
            label = str(instance)
            instance_pk = instance.pk

            DailyOrder.objects.filter(prevadzka_id__in=prevadzka_ids).delete()
            Prevadzka.objects.filter(id__in=prevadzka_ids).delete()
            instance.delete()

            deleted_logins = _delete_orphaned_client_logins(affected_profile_ids)

            log_event(
                EventLog.EventType.SETTINGS_CHANGE,
                actor=self.request.user,
                summary=(
                    f"Admin vymazal celok „{label}“ vrátane {prevadzky_count} "
                    f"prevádzok, {orders_count} objednávok a {logins_count} "
                    "prístupov"
                    + (
                        f"; {len(deleted_logins)} osirelý(ch) login(ov) bez "
                        f"zvyšného prístupu bolo zmazaných: "
                        + ", ".join(deleted_logins)
                        + "."
                        if deleted_logins
                        else " (ostatné loginy prišli len o prístup)."
                    )
                ),
                payload={
                    "model": "api.celok",
                    "object_id": instance_pk,
                    "cascade": {
                        "prevadzky_count": prevadzky_count,
                        "orders_count": orders_count,
                        "logins_count": logins_count,
                        "deleted_orphaned_logins": deleted_logins,
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
        diet_assignments = PrevadzkaDiet.objects.select_related("diet").order_by(
            "diet__sort_order", "diet__name"
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
                Prefetch(
                    "prevadzka_diets",
                    queryset=diet_assignments,
                    to_attr="_prefetched_diet_assignments",
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

    def perform_destroy(self, instance):
        """Zmaže prevádzku a klientské loginy, ktorým to zobralo posledný prístup.

        Len `ProfilePrevadzkaAccess` viazaný priamo na túto prevádzku sa berie
        do úvahy — prístup na úrovni celku ostáva nedotknutý (patrí ostatným
        prevádzkam toho istého celku). Rovnaký princíp ako pri mazaní celku
        (issue #520), viď `_delete_orphaned_client_logins`.
        """
        with transaction.atomic():
            affected_profile_ids = list(
                ProfilePrevadzkaAccess.objects.filter(prevadzka=instance).values_list(
                    "profile_id", flat=True
                )
            )
            label = str(instance)
            instance_pk = instance.pk

            instance.delete()

            deleted_logins = _delete_orphaned_client_logins(affected_profile_ids)

            log_event(
                EventLog.EventType.SETTINGS_CHANGE,
                actor=self.request.user,
                summary=(
                    f"Admin vymazal prevádzku „{label}“"
                    + (
                        f"; {len(deleted_logins)} osirelý(ch) login(ov) bez "
                        f"zvyšného prístupu bolo zmazaných: "
                        + ", ".join(deleted_logins)
                        + "."
                        if deleted_logins
                        else "."
                    )
                ),
                payload={
                    "model": "api.prevadzka",
                    "object_id": instance_pk,
                    "deleted_orphaned_logins": deleted_logins,
                },
            )

    def get_queryset(self) -> QuerySet:
        diet_assignments = PrevadzkaDiet.objects.select_related("diet").order_by(
            "diet__sort_order", "diet__name"
        )
        return (
            Prevadzka.objects.select_related("celok", "edupage_connection")
            .prefetch_related(
                "visible_diets",
                "visible_portion_types",
                "profile_accesses__profile__user",
                "celok__profile_accesses__profile__user",
                Prefetch(
                    "prevadzka_diets",
                    queryset=diet_assignments,
                    to_attr="_prefetched_diet_assignments",
                ),
            )
            .annotate(orders_count=Count("orders", distinct=True))
            .order_by("celok__nazov", "sort_order", "nazov")
        )

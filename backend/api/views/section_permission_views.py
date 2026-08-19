"""Správa granulárnych oprávnení per login (#484)."""

from __future__ import annotations

from django.contrib.auth.models import User
from django.db import transaction
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.response import Response

from .. import access, sections
from ..permissions import IsSuperadmin, SectionAccess
from ..roles import role_of


@extend_schema_view(
    list=extend_schema(tags=["admin"]),
    retrieve=extend_schema(tags=["admin"]),
)
class SectionPermissionViewSet(viewsets.ViewSet):
    """
    Matica používateľ × sekcia × úroveň.

    Patrí do Správy prístupov, takže beží pod tou istou sekciou — kto nemá
    `edit` na `pristupy`, nemôže meniť práva nikomu vrátane seba.
    """

    permission_classes = [IsSuperadmin, SectionAccess]
    section = sections.PRISTUPY

    def list(self, request):
        """GET /api/admin/section-permissions/ — katalóg sekcií a úrovní."""
        return Response(
            {
                "sections": [
                    {"key": s.key, "label": s.label, "min_role": s.min_role}
                    for s in sections.SECTIONS
                ],
                "levels": [
                    {"value": value, "label": label}
                    for value, label in sections.LEVEL_CHOICES
                ],
            }
        )

    def retrieve(self, request, pk=None):
        """GET /api/admin/section-permissions/{user_id}/ — matica jedného loginu."""
        user = self._user_or_404(pk)
        if user is None:
            return Response(status=status.HTTP_404_NOT_FOUND)

        profile = getattr(user, "profile", None)
        overrides = getattr(profile, "section_overrides", None) or {}
        effective = access.effective_map(user)
        return Response(
            {
                "user_id": user.pk,
                "email": user.email,
                "role": role_of(user),
                "rows": [
                    {
                        "section": s.key,
                        "label": s.label,
                        # Čo dáva rola sama — v UI je to hodnota „podľa role".
                        "default": sections.default_level(user, s.key),
                        "override": overrides.get(s.key),
                        "effective": effective.get(s.key, sections.NONE),
                        # Sekcie mimo dosahu role sa nedajú prideliť overridom.
                        "available": sections.default_level(user, s.key)
                        != sections.NONE,
                    }
                    for s in sections.SECTIONS
                ],
            }
        )

    @transaction.atomic
    def partial_update(self, request, pk=None):
        """PATCH /api/admin/section-permissions/{user_id}/ — nastaví overridy.

        Telo: ``{"overrides": {"jedalnicek": "read", "logy": null}}``.
        `null` override zmaže, čím sa sekcia vráti k tomu, čo určuje rola.
        """
        user = self._user_or_404(pk)
        if user is None:
            return Response(status=status.HTTP_404_NOT_FOUND)

        profile = getattr(user, "profile", None)
        if profile is None:
            return Response(
                {"error": "Login nemá profil, oprávnenia sa nedajú nastaviť."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        overrides = request.data.get("overrides")
        if not isinstance(overrides, dict):
            return Response(
                {"error": "overrides musí byť objekt sekcia → úroveň."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        valid_levels = {value for value, _ in sections.LEVEL_CHOICES}
        for key, level in overrides.items():
            if sections.get(key) is None:
                return Response(
                    {"error": f"Neznáma sekcia '{key}'."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if level is not None and level not in valid_levels:
                return Response(
                    {"error": f"Neznáma úroveň '{level}'."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        current = dict(profile.section_overrides or {})
        for key, level in overrides.items():
            if level is None:
                current.pop(key, None)
            else:
                current[key] = level
        profile.section_overrides = current
        profile.save(update_fields=["section_overrides"])
        return self.retrieve(request, pk=pk)

    @staticmethod
    def _user_or_404(pk) -> User | None:
        try:
            return User.objects.select_related("profile").get(pk=int(pk or 0))
        except (TypeError, ValueError, User.DoesNotExist):
            return None

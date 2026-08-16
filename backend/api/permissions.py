"""
DRF permission triedy postavené na rolách (#482).

Pozor na poradie nasadzovania: tieto triedy sa v #482 iba pridávajú, žiadny
`permission_classes` sa v tej istej PR nemení. Prepínanie `IsAdminUser` →
`IsSuperadmin` patrí do #483, aby sa dala zmena práv nasadiť (a prípadne
vrátiť) samostatne.
"""

from __future__ import annotations

from rest_framework import permissions

from . import roles


class IsAdminOrAbove(permissions.BasePermission):
    """Admin aj superadmin. Rolový ekvivalent dnešného ``IsAdminUser``."""

    message = "Vyžaduje sa rola admin alebo superadmin."

    def has_permission(self, request, view) -> bool:
        return roles.is_admin_or_above(request.user)


class IsSuperadmin(permissions.BasePermission):
    """Len superadmin — správa loginov, logy a systémové nastavenia (#483)."""

    message = "Vyžaduje sa rola superadmin."

    def has_permission(self, request, view) -> bool:
        return roles.is_superadmin(request.user)


class IsKuchyna(permissions.BasePermission):
    """Len kuchyňa — naberací workflow (#486, #487)."""

    message = "Vyžaduje sa rola kuchyňa."

    def has_permission(self, request, view) -> bool:
        return roles.is_kuchyna(request.user)


class IsKuchynaOrAdmin(permissions.BasePermission):
    """Kuchyňa plus admin/superadmin — spoločné prehľady nakladania."""

    message = "Vyžaduje sa rola kuchyňa, admin alebo superadmin."

    def has_permission(self, request, view) -> bool:
        return roles.is_kuchyna(request.user) or roles.is_admin_or_above(request.user)


class IsKlient(permissions.BasePermission):
    """Len klientske loginy — objednávanie."""

    message = "Vyžaduje sa klientske konto."

    def has_permission(self, request, view) -> bool:
        return roles.is_klient(request.user)

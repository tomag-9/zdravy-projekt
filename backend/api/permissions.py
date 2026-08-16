"""
DRF permission triedy postavené na rolách (#482).

Všetky prahové triedy vznikajú z jedného generátora nad rebríkom
``kuchyna < admin < superadmin`` — nie ako ručne vymenované množiny rolí.
Vďaka tomu nemôže vzniknúť dvojica typu „IsKuchyna" (presná zhoda) a
„IsKuchynaOrAdmin" (ad-hoc zlúčenie), ktoré sa časom rozídu.

Klient v rebríku nie je, preto má vlastnú triedu.
"""

from __future__ import annotations

from rest_framework import permissions

from . import roles


def _min_role(minimum: str, message: str) -> type[permissions.BasePermission]:
    """Vyrobí permission triedu pre prah `minimum` v internom rebríku."""

    class _MinRolePermission(permissions.BasePermission):
        def has_permission(self, request, view) -> bool:
            return roles.at_least(request.user, minimum)

    _MinRolePermission.message = message  # type: ignore[attr-defined]
    return _MinRolePermission


#: Kuchyňa a vyššie — prehľady nakladania (#486, #487). Admin ich vidí tiež,
#: lebo je v rebríku nad kuchyňou.
IsKuchynaOrAbove = _min_role(
    roles.KUCHYNA, "Vyžaduje sa rola kuchyňa, admin alebo superadmin."
)

#: Admin a vyššie — hranica celého admin rozhrania.
IsAdminOrAbove = _min_role(roles.ADMIN, "Vyžaduje sa rola admin alebo superadmin.")

#: Len superadmin — správa loginov, logy a systémové nastavenia (#483).
IsSuperadmin = _min_role(roles.SUPERADMIN, "Vyžaduje sa rola superadmin.")


class IsKlient(permissions.BasePermission):
    """Len zákaznícke loginy — objednávanie. Interné role sem nepatria."""

    message = "Vyžaduje sa klientske konto."

    def has_permission(self, request, view) -> bool:
        return roles.is_klient(request.user)

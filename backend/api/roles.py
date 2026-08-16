"""
Rolový model prístupu (#482).

Jediné miesto, cez ktoré sa v aplikačnom kóde zisťuje rola. Nikdy nečítaj
`user.profile.role` priamo — časť loginov (historicky tie založené cez
`createsuperuser` / `init_roles`) profil nemá a `role_of` na to pamätá.

`is_staff` / `is_superuser` zostávajú pre Django admin a pre životnosť JWT.

Zámerne tu NIE JE signál, ktorý by z `role` prepisoval `is_staff`: profil sa
zakladá s defaultom `klient`, takže ktorýkoľvek save profilu staff loginu by
mu ticho zobral práva. Namiesto toho drží dvojicu v súlade
`AdminUserSerializer` — jediné miesto, kde sa `is_staff` a `role` menia.
Skutočné zrkadlo pribudne v #483, keď sa rola stane editovateľnou v UI.
"""

from __future__ import annotations

from typing import Any

KLIENT = "klient"
ADMIN = "admin"
SUPERADMIN = "superadmin"
KUCHYNA = "kuchyna"

#: Role, ktoré vidia admin rozhranie (nie nutne celé — viď #483).
STAFF_ROLES = frozenset({ADMIN, SUPERADMIN})


def role_of(user: Any) -> str:
    """
    Vráti rolu používateľa.

    Fallback na `is_staff`/`is_superuser` je zámerný a musí ostať: bez neho by
    login bez profilu (alebo request s ``AnonymousUser``) spadol do „bez
    prístupu" a odstrihol by admina, ktorý sa dnes vie prihlásiť.
    """
    if not getattr(user, "is_authenticated", False):
        return KLIENT

    profile = getattr(user, "profile", None)
    role = getattr(profile, "role", None)
    if role and role != KLIENT:
        return str(role)

    # Sem sa dostane login bez profilu ALEBO s rolou `klient`. `klient` je
    # hodnota defaultu stĺpca, takže sa nedá odlíšiť od „rola nikdy nenastavená" —
    # a ktorýkoľvek `UserProfile.objects.create(user=admin)` by inak adminovi
    # ticho zobral práva. Príznaky preto rozhodujú smerom HORE; demotovať sa dá
    # len zhodením `is_staff` (drží ich v súlade `AdminUserSerializer`).
    if getattr(user, "is_staff", False):
        return SUPERADMIN if getattr(user, "is_superuser", False) else ADMIN
    return KLIENT


def is_superadmin(user: Any) -> bool:
    return role_of(user) == SUPERADMIN


def is_admin_or_above(user: Any) -> bool:
    """Admin aj superadmin — použi tam, kde dnes stojí ``IsAdminUser``."""
    return role_of(user) in STAFF_ROLES


def is_kuchyna(user: Any) -> bool:
    return role_of(user) == KUCHYNA


def is_klient(user: Any) -> bool:
    return role_of(user) == KLIENT


def role_for_flags(*, is_staff: bool, is_superuser: bool) -> str:
    """Rola odpovedajúca starým príznakom — používa to backfill migrácia."""
    if is_staff:
        return SUPERADMIN if is_superuser else ADMIN
    return KLIENT

"""
Rolový model prístupu (#482).

Jediné miesto, cez ktoré sa v aplikačnom kóde zisťuje rola. Nikdy nečítaj
`user.profile.role` priamo — časť loginov (historicky tie založené cez
`createsuperuser` / `init_roles`) profil nemá a `role_of` na to pamätá.

Model má **dve nezávislé vetvy**:

* **interné role** tvoria rebrík ``kuchyna < admin < superadmin`` — vyššia
  vidí všetko, čo nižšia;
* **klient** stojí bokom a v rebríku zámerne nie je. Nie je to „najnižší
  zamestnanec", ale zákazník: admin nie je „lepší klient" a klient sa do
  interných vecí nedostane žiadnym stupňom.

`is_staff` / `is_superuser` už NIE SÚ sémantickým vstupom. Ostávajú len ako
odvodený príznak pre Django admin a pre životnosť JWT; „je to klient?" sa
pýtaj cez `is_klient` / `klient_q`, nie cez `is_staff=False` — kuchyňa má
tiež `is_staff=False` a takýto dotaz by ju omylom zaradil medzi zákazníkov.

Zámerne tu NIE JE signál, ktorý by z `role` prepisoval `is_staff`: profil sa
zakladá s defaultom `klient`, takže ktorýkoľvek save profilu staff loginu by
mu ticho zobral práva. Dvojicu drží v súlade `AdminUserSerializer` — jediné
miesto, kde sa `is_staff` a `role` menia.
"""

from __future__ import annotations

from typing import Any

from django.db.models import Q

KLIENT = "klient"
KUCHYNA = "kuchyna"
ADMIN = "admin"
SUPERADMIN = "superadmin"

#: Rebrík interných rolí. Klient v ňom nie je — viď docstring modulu.
_LEVEL = {KUCHYNA: 1, ADMIN: 2, SUPERADMIN: 3}

#: Role, ktoré majú prístup do vnútra systému (čokoľvek okrem klienta).
INTERNAL_ROLES = frozenset(_LEVEL)

#: Role, ktoré nesú `is_staff` (a teda vidia admin rozhranie). Kuchyňa nie.
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


def at_least(user: Any, minimum: str) -> bool:
    """True, ak je rola používateľa `minimum` alebo vyššia v internom rebríku.

    Klient nemá úroveň, takže neprejde žiadnym prahom.
    """
    return _LEVEL.get(role_of(user), 0) >= _LEVEL[minimum]


def is_superadmin(user: Any) -> bool:
    return at_least(user, SUPERADMIN)


def is_admin_or_above(user: Any) -> bool:
    """Admin aj superadmin — hranica pre celé admin rozhranie."""
    return at_least(user, ADMIN)


def is_kuchyna_or_above(user: Any) -> bool:
    """Kuchyňa, admin aj superadmin — prehľady nakladania (#486, #487)."""
    return at_least(user, KUCHYNA)


def is_internal(user: Any) -> bool:
    """Ktorákoľvek interná rola — teda „nie je to zákazník"."""
    return role_of(user) in INTERNAL_ROLES


def is_klient(user: Any) -> bool:
    """Zákaznícky login. Toto je správna otázka namiesto `not is_staff`."""
    return role_of(user) == KLIENT


def klient_q(prefix: str = "") -> Q:
    """
    Q-filter vyberajúci klientske loginy — DB ekvivalent `is_klient`.

    Kopíruje aj fallback z `role_of`, aby login bez profilu ostal klientom.
    `prefix` je cesta k User modelu (napr. ``"user"`` pre PushSubscription).
    """
    p = f"{prefix}__" if prefix else ""
    return Q(**{f"{p}is_staff": False}) & (
        Q(**{f"{p}profile__isnull": True}) | Q(**{f"{p}profile__role": KLIENT})
    )


def role_for_flags(*, is_staff: bool, is_superuser: bool) -> str:
    """Rola odpovedajúca starým príznakom — používa to backfill migrácia."""
    if is_staff:
        return SUPERADMIN if is_superuser else ADMIN
    return KLIENT

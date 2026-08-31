"""
Sekcie aplikácie a úrovne prístupu k nim (#484).

Granularita je **per sekcia**, nie per akcia: sekcia zodpovedá jednej položke
admin menu, takže sa matica v UI dá prečítať bez vysvetľovania a nová akcia
vo viewsete nevyžaduje nový záznam oprávnenia.

Default sa **dedí z role**; override existuje len tam, kde preň je kľúč
v `UserProfile.section_overrides`. Chýbajúci kľúč preto nikdy neznamená „bez prístupu" —
znamená „ako určuje rola".
"""

from __future__ import annotations

from typing import NamedTuple

from . import roles

# ── Úrovne ────────────────────────────────────────────────────────────────────

NONE = "none"
READ = "read"
EDIT = "edit"

LEVEL_CHOICES = [
    (NONE, "Bez prístupu"),
    (READ, "Len na čítanie"),
    (EDIT, "Plný prístup"),
]

_LEVEL_ORDER = {NONE: 0, READ: 1, EDIT: 2}


def at_least(level: str, minimum: str) -> bool:
    """True, ak `level` dosahuje aspoň `minimum` (none < read < edit)."""
    return _LEVEL_ORDER.get(level, 0) >= _LEVEL_ORDER[minimum]


# ── Sekcie ────────────────────────────────────────────────────────────────────


class Section(NamedTuple):
    key: str
    label: str
    #: Najnižšia rola, ktorá sekciu vôbec môže vidieť. Override ju nezvýši —
    #: granulárne práva vedia prístup len obmedziť, nie povýšiť nad rolu.
    min_role: str
    #: Strop úrovne, ktorý rola dosiahne bez override (predtým vždy EDIT).
    #: "Nadchádzajúce" je čisto informačný prehľad bez zápisovej akcie, takže
    #: má strop READ aj pre superadmina — override ho nemôže prekročiť, len
    #: znížiť (pozri `access.level_for`), takže sekcia zostáva read-only, kým
    #: v nej nepribudne zápisová akcia a strop sa zámerne nezvýši na EDIT.
    default_level: str = EDIT


DASHBOARD = "dashboard"
PODKLADY = "podklady"
TRASY = "trasy"
JEDALNICEK = "jedalnicek"
KATALOG = "katalog"
PREVADZKY = "prevadzky"
DIETY = "diety"
VOLNE_DNI = "volne_dni"
NOTIFIKACIE = "notifikacie"
UDALOSTI = "udalosti"
NADCHADZAJUCE = "nadchadzajuce"
OBJEDNAVKY = "objednavky"
NAKLADANIE = "nakladanie"
NASTAVENIA = "nastavenia"
LOGY = "logy"
PRISTUPY = "pristupy"

SECTIONS: tuple[Section, ...] = (
    Section(DASHBOARD, "Prehľad", roles.ADMIN),
    Section(PODKLADY, "Dodanie podkladov", roles.ADMIN),
    Section(TRASY, "Poradie a trasy", roles.ADMIN),
    Section(JEDALNICEK, "Jedálniček", roles.ADMIN),
    Section(KATALOG, "Katalóg jedál", roles.ADMIN),
    Section(PREVADZKY, "Správa prevádzok", roles.ADMIN),
    Section(DIETY, "Diéty", roles.ADMIN),
    Section(VOLNE_DNI, "Voľné dni", roles.ADMIN),
    Section(NOTIFIKACIE, "Notifikácie", roles.ADMIN),
    # Audit vlastných úkonov patrí adminovi — vidí, kto čo zmenil.
    Section(UDALOSTI, "Udalosti (audit)", roles.ADMIN),
    # Prehľad naplánovaných cronov — čisto na čítanie, admin aj superadmin
    # dostávajú default READ (pozri `Section.default_level`).
    Section(NADCHADZAJUCE, "Nadchádzajúce", roles.ADMIN, default_level=READ),
    Section(OBJEDNAVKY, "Objednávky", roles.ADMIN),
    # Nakladanie je jediná sekcia, ktorú vidí aj kuchyňa.
    Section(NAKLADANIE, "Nakladanie", roles.KUCHYNA),
    Section(NASTAVENIA, "Systémové nastavenia", roles.SUPERADMIN),
    # Systémové logy sú prevádzková diagnostika, nie audit — tie ostávajú
    # superadminovi.
    Section(LOGY, "Systémové logy", roles.SUPERADMIN),
    Section(PRISTUPY, "Správa prístupov", roles.SUPERADMIN),
)

SECTION_KEYS = tuple(section.key for section in SECTIONS)
SECTION_CHOICES = [(section.key, section.label) for section in SECTIONS]
_BY_KEY = {section.key: section for section in SECTIONS}


def get(key: str) -> Section | None:
    return _BY_KEY.get(key)


def default_level(user, section_key: str) -> str:
    """Úroveň vyplývajúca zo samotnej role, bez akéhokoľvek override."""
    section = _BY_KEY.get(section_key)
    if section is None:
        return NONE
    return section.default_level if roles.at_least(user, section.min_role) else NONE


def sections_for_role(user) -> tuple[Section, ...]:
    """Sekcie, ktoré rola používateľa vôbec dosahuje."""
    return tuple(
        section for section in SECTIONS if roles.at_least(user, section.min_role)
    )

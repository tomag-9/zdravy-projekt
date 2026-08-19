"""
Efektívne oprávnenia k sekciám (#484).

Jediné miesto, ktoré spája dve vrstvy:

1. **rola** určuje, čo je vôbec dosiahnuteľné (`sections.default_level`),
2. **override** (`UserProfile.section_overrides`) to môže už len obmedziť.

Override nikdy neprekročí rolu — inak by sa dal adminovi cez maticu pridať
prístup do superadmin sekcie a rolový systém by prestal niečo znamenať.
"""

from __future__ import annotations

from typing import Any

from . import sections


def _overrides(user: Any) -> dict[str, str]:
    """Overridy loginu — mapa priamo na profile, teda bez dotazu navyše.

    Profil prináša `ProfileAwareJWTAuthentication` tým istým dotazom, ktorým sa
    načítava používateľ, takže granulárne práva nestoja žiadne ďalšie kolo do DB.
    """
    profile = getattr(user, "profile", None)
    overrides = getattr(profile, "section_overrides", None)
    return overrides if isinstance(overrides, dict) else {}


def level_for(user: Any, section_key: str) -> str:
    """Efektívna úroveň prístupu používateľa k sekcii."""
    ceiling = sections.default_level(user, section_key)
    if ceiling == sections.NONE:
        return sections.NONE

    override = _overrides(user).get(section_key)
    if override is None:
        return ceiling
    # `min` cez poradie úrovní — override obmedzuje, nepovyšuje.
    return override if sections.at_least(ceiling, override) else ceiling


def can_read(user: Any, section_key: str) -> bool:
    return sections.at_least(level_for(user, section_key), sections.READ)


def can_edit(user: Any, section_key: str) -> bool:
    return sections.at_least(level_for(user, section_key), sections.EDIT)


def effective_map(user: Any) -> dict[str, str]:
    """Úrovne pre všetky sekcie, ktoré rola dosahuje — podklad pre frontend."""
    overrides = _overrides(user)
    result: dict[str, str] = {}
    for section in sections.sections_for_role(user):
        ceiling = sections.default_level(user, section.key)
        override = overrides.get(section.key)
        result[section.key] = (
            ceiling
            if override is None or not sections.at_least(ceiling, override)
            else override
        )
    return result

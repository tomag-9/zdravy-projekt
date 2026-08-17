"""
Efektívne oprávnenia k sekciám (#484).

Jediné miesto, ktoré spája dve vrstvy:

1. **rola** určuje, čo je vôbec dosiahnuteľné (`sections.default_level`),
2. **override** (`SectionPermission`) to môže už len obmedziť.

Override nikdy neprekročí rolu — inak by sa dal adminovi cez maticu pridať
prístup do superadmin sekcie a rolový systém by prestal niečo znamenať.
"""

from __future__ import annotations

from typing import Any

from . import sections

#: Kde si držíme načítané overridy na inštancii používateľa.
_CACHE_ATTR = "_section_overrides_cache"


def _overrides(user: Any) -> dict[str, str]:
    """Overridy loginu, načítané raz za request.

    `SectionAccess` sa pýta pri každom volaní a viewsety majú dve permission
    triedy — bez cache by z toho bol dotaz navyše na každý admin request
    (chytil to `test_list_celky_uses_bounded_prefetches`). `request.user`
    vzniká per request, takže cache na inštancii nemôže pretiecť medzi nimi.
    """
    cached = getattr(user, _CACHE_ATTR, None)
    if cached is not None:
        return cached

    profile = getattr(user, "profile", None)
    overrides = (
        {}
        if profile is None
        else {
            permission.section: permission.level
            for permission in profile.section_permissions.all()
        }
    )
    try:
        setattr(user, _CACHE_ATTR, overrides)
    except AttributeError:
        # AnonymousUser a podobné môžu byť nemenné — cache je len optimalizácia.
        pass
    return overrides


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

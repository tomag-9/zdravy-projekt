"""Helpers for applying default order visibility consistently."""

from __future__ import annotations

from django.db.models import QuerySet

from .models import ClientSettings, Diet, Prevadzka
from .order_data import MEAL_KEYS
from .reference_data import DEFAULT_DIET_NAMES

DEFAULT_VISIBLE_MEALS = list(MEAL_KEYS)


def default_visible_diets() -> list[Diet]:
    return list(Diet.objects.filter(name__in=DEFAULT_DIET_NAMES, is_active=True))


def ensure_default_visible_diets(relation) -> bool:
    """Set default diets on an empty M2M relation.

    Empty diet visibility has historically meant "not configured yet" in this app,
    so deploy/startup bootstrap fills it with the standard set.
    """
    if relation.exists():
        return False
    diets = default_visible_diets()
    if not diets:
        return False
    relation.set(diets)
    return True


def ensure_default_visible_diets_for_empty_prevadzky(
    prevadzky: QuerySet[Prevadzka] | None = None,
) -> int:
    qs = Prevadzka.objects.all() if prevadzky is None else prevadzky
    updated_count = 0
    for prevadzka in qs.filter(visible_diets__isnull=True).distinct():
        if ensure_default_visible_diets(prevadzka.visible_diets):
            updated_count += 1
    return updated_count


def ensure_all_visible_meals_for_client_settings() -> int:
    updated_count = 0
    for settings in ClientSettings.objects.all():
        if settings.visible_meals != DEFAULT_VISIBLE_MEALS:
            settings.visible_meals = DEFAULT_VISIBLE_MEALS
            settings.save(update_fields=["visible_meals"])
            updated_count += 1
    return updated_count


def ensure_all_visible_meals_for_prevadzky(
    prevadzky: QuerySet[Prevadzka] | None = None,
) -> int:
    qs = Prevadzka.objects.all() if prevadzky is None else prevadzky
    updated_count = 0
    for prevadzka in qs:
        if prevadzka.visible_meals != DEFAULT_VISIBLE_MEALS:
            prevadzka.visible_meals = DEFAULT_VISIBLE_MEALS
            prevadzka.save(update_fields=["visible_meals"])
            updated_count += 1
    return updated_count

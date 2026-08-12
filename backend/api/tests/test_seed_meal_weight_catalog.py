"""Seed katalógu gramáží musí prežiť duplicitné názvy šablón.

`MealTemplate.name` nie je unique a admini si môžu pridať vlastnú položku cez
/api/admin/meal-templates. Keď taká položka trafí názov z katalógu, seed nesmie
spadnúť — inak zhorí `deploy_bootstrap` a nenaštartuje backend (prod 2026-08-12).
"""

from decimal import Decimal

import pytest
from django.core.management import call_command

from api.management.commands.seed_meal_weight_catalog import CATALOG
from api.models import MealTemplate


@pytest.mark.django_db
def test_seed_is_idempotent():
    call_command("seed_meal_weight_catalog", verbosity=0)
    first_ids = set(MealTemplate.objects.values_list("id", flat=True))

    call_command("seed_meal_weight_catalog", verbosity=0)

    assert MealTemplate.objects.count() == len(CATALOG)
    assert set(MealTemplate.objects.values_list("id", flat=True)) == first_ids


@pytest.mark.django_db
def test_seed_survives_admin_created_duplicate_name():
    call_command("seed_meal_weight_catalog", verbosity=0)
    category, name, _components, _unit_exception = CATALOG[0]
    seeded = MealTemplate.objects.get(name=name)

    duplicate = MealTemplate.objects.create(
        category=category,
        name=name,
        weight_label="ručne zadané",
        base_weight_grams=Decimal("42.00"),
        components=[{"label": "Vlastná zložka", "grams": "42", "unit": "g"}],
        is_active=False,
    )

    call_command("seed_meal_weight_catalog", verbosity=0)

    # Seed aktualizuje najstarší (najnižšie id) riadok…
    seeded.refresh_from_db()
    assert seeded.is_active is True
    assert seeded.base_weight_grams != Decimal("42.00")

    # …a ručne vytvoreného menovca nechá tak.
    duplicate.refresh_from_db()
    assert duplicate.is_active is False
    assert duplicate.weight_label == "ručne zadané"
    assert duplicate.base_weight_grams == Decimal("42.00")
    assert duplicate.components == [
        {"label": "Vlastná zložka", "grams": "42", "unit": "g"}
    ]
    assert MealTemplate.objects.filter(name=name).count() == 2

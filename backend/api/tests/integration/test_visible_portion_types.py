from importlib import import_module

import pytest
from django.apps import apps
from django.core.management import call_command
from rest_framework import status

from api.models import Celok, DailyOrder, PortionType, Prevadzka
from api.services.auto_order_service import _build_auto_data

pytestmark = pytest.mark.integration


@pytest.mark.django_db
def test_migration_backfill_and_seed_are_idempotent():
    celok = Celok.objects.create(nazov="Default visibility")
    prevadzka = Prevadzka.objects.create(celok=celok, nazov="Prevádzka")
    first = PortionType.objects.create(
        name="Test malá", coefficient="1.0000", sort_order=1
    )
    PortionType.objects.create(name="Test veľká", coefficient="1.5000", sort_order=2)
    prevadzka.visible_portion_types.clear()
    expected_defaults = set(PortionType.objects.filter(is_active=True))

    migration = import_module("api.migrations.0061_prevadzka_visible_portion_types")
    migration.seed_visible_portion_types(apps, schema_editor=None)
    assert set(prevadzka.visible_portion_types.all()) == expected_defaults

    prevadzka.visible_portion_types.set([first])
    call_command("init_reference_data", verbosity=0)
    call_command("init_reference_data", verbosity=0)

    assert list(prevadzka.visible_portion_types.all()) == [first]


@pytest.mark.django_db
def test_admin_can_patch_visible_portion_types(admin_client):
    small = PortionType.objects.create(
        name="Patch malá", coefficient="1.0000", sort_order=1
    )
    large = PortionType.objects.create(
        name="Patch veľká", coefficient="1.5000", sort_order=2
    )
    celok = Celok.objects.create(nazov="Patch visibility")
    prevadzka = Prevadzka.objects.create(celok=celok, nazov="Prevádzka")

    response = admin_client.patch(
        f"/api/admin/facility-prevadzky/{prevadzka.pk}/",
        {"visible_portion_types": [large.pk]},
        format="json",
    )

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["visible_portion_types"] == [large.pk]
    assert list(prevadzka.visible_portion_types.all()) == [large]

    template = DailyOrder(
        data={
            "breakfast": {
                small.name: {"menuCounts": {"A": 1}, "diets": {}},
                large.name: {"menuCounts": {"A": 2}, "diets": {}},
            },
            "lunch": {},
            "olovrant": {},
        }
    )
    visible_names = list(prevadzka.visible_portion_types.values_list("name", flat=True))
    auto_data = _build_auto_data(template, [], visible_names)

    assert set(auto_data["breakfast"]) == {large.name}


def test_empty_visible_portion_types_does_not_filter_auto_order_data():
    template = DailyOrder(
        data={
            "breakfast": {
                "Malá": {"menuCounts": {"A": 1}, "diets": {}},
                "Veľká": {"menuCounts": {"A": 2}, "diets": {}},
            },
            "lunch": {},
            "olovrant": {},
        }
    )

    auto_data = _build_auto_data(template, [], [])

    assert set(auto_data["breakfast"]) == {"Malá", "Veľká"}

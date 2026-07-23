"""Testy dátovej migrácie 0052.

Suite beží s `--nomigrations` (pozri `pytest.ini`), takže schéma vzniká priamo
z modelov a migračný graf sa nikdy neprehráva. Migračnú funkciu preto voláme
priamo a `apps` jej podstrčíme — testujeme tým jej logiku, nie mechaniku Django
migrácií, ktorú aj tak netreba overovať.
"""

import pytest

from api.migrations import (  # noqa: F401  (zaistí, že balík migrácií je importovateľný)
    __name__ as _migrations_pkg,
)
from api.models import Celok, Prevadzka


def _load_migration():
    import importlib

    return importlib.import_module(
        "api.migrations.0052_diet_sort_order_prevadzka_visible_menus_per_meal"
    )


class _StubApps:
    """Minimálna náhrada za historický registry — vracia reálne modely."""

    def get_model(self, app_label, model_name):
        assert app_label == "api"
        return {"Prevadzka": Prevadzka, "Celok": Celok}[model_name]


@pytest.mark.django_db
def test_0052_seeds_breakfast_and_olovrant_visible_menus_per_meal():
    migration = _load_migration()
    celok = Celok.objects.create(nazov="Migracia")
    prevadzka = Prevadzka.objects.create(
        celok=celok,
        nazov="Prevadzka",
        visible_menus=["A", "B", "C", "V"],
    )

    migration.seed_visible_menus_per_meal(_StubApps(), None)

    prevadzka.refresh_from_db()
    assert prevadzka.visible_menus_per_meal == {
        "breakfast": ["A"],
        "olovrant": ["A"],
    }
    # Obed zámerne bez kľúča → padá späť na globálne visible_menus.
    assert prevadzka.resolved_visible_menus_for_meal("lunch") == ["A", "B", "C", "V"]
    assert prevadzka.resolved_visible_menus_for_meal("breakfast") == ["A"]


@pytest.mark.django_db
def test_0052_preserves_already_configured_meals():
    """Migrácia nesmie prepísať to, čo už niekto nastavil pre iné chody."""
    migration = _load_migration()
    celok = Celok.objects.create(nazov="Migracia 2")
    prevadzka = Prevadzka.objects.create(
        celok=celok,
        nazov="Prevadzka 2",
        visible_menus=["A", "B"],
        visible_menus_per_meal={"lunch": ["B"]},
    )

    migration.seed_visible_menus_per_meal(_StubApps(), None)

    prevadzka.refresh_from_db()
    assert prevadzka.visible_menus_per_meal == {
        "lunch": ["B"],
        "breakfast": ["A"],
        "olovrant": ["A"],
    }

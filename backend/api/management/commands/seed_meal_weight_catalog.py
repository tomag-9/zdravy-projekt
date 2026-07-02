"""
Idempotent seeding of the fixed meal-weight catalog ("Váhy jedál - apka ZP").

Seeds the 21 MealTemplate rows that make up the closed catalog of meal
types (Raňajky-desiata 1-7, Polievka 1-4, Hlavný chod 1-7, Olovrant 1-3).
Admins pick one of these per day/slot instead of uploading a weekly xlsx.

Data is hardcoded here (not read from any xlsx file at runtime) — it mirrors
`test/jedalnicky/Váhy jedál - apka ZP.xlsx`.

Uses update_or_create keyed by `name`, so it is safe to run repeatedly.

Usage:
    python manage.py seed_meal_weight_catalog
"""

from decimal import Decimal

from django.core.management.base import BaseCommand

from api.models import MealCategory, MealTemplate

# Piece-count exceptions: fixed count per portion type instead of
# grams × coefficient, keyed by the exact PortionType.name values seeded in
# init_reference_data.py.
_VAJCE_EXCEPTION = {
    "component_label": "Vajce",
    "unit": "ks",
    "counts_by_portion_type": {
        "Jasle": "0.5",
        "Škôlka": "0.5",
        "ZŠ 1.stupeň": "0.5",
        "ZŠ 2.stupeň": "1",
        "Dospelý (SŠ)": "1",
    },
}

_GULICKA_EXCEPTION = {
    "component_label": "Gulička/fašírka",
    "unit": "ks",
    "counts_by_portion_type": {
        "Jasle": "1",
        "Škôlka": "1",
        "ZŠ 1.stupeň": "2",
        "ZŠ 2.stupeň": "2",
        "Dospelý (SŠ)": "3",
    },
}


_NUMERIC_UNITS = ("g", "ml")


def _components(*parts):
    """parts: (label, grams|None, unit) tuples."""
    return [
        {"label": label, "grams": grams, "unit": unit}
        for label, grams, unit in parts
        if grams is not None
    ]


def _weight_label(components) -> str:
    return " + ".join(
        c["grams"] if c["unit"] == "text" else f"{c['grams']}{c['unit']}"
        for c in components
    )


def _base_weight_grams(components) -> str:
    total = sum(
        (
            Decimal(c["grams"])
            for c in components
            if c["unit"] in _NUMERIC_UNITS and c["grams"]
        ),
        Decimal("0"),
    )
    return str(total.quantize(Decimal("0.01")))


CATALOG = [
    # (category, name, components, unit_exception)
    (
        MealCategory.BREAKFAST_SNACK,
        "Raňajky-desiata 1",
        _components(
            ("Hlavná zložka", "120", "g"), ("Ovocie/Zelenina", "50/70", "text")
        ),
        None,
    ),
    (
        MealCategory.BREAKFAST_SNACK,
        "Raňajky-desiata 2",
        _components(
            ("Hlavná zložka", "115", "g"),
            ("Extra zložka 1", "5", "g"),
            ("Ovocie/Zelenina", "50/70", "text"),
        ),
        None,
    ),
    (
        MealCategory.BREAKFAST_SNACK,
        "Raňajky-desiata 3",
        _components(
            ("Hlavná zložka", "110", "g"),
            ("Extra zložka 1", "10", "g"),
            ("Ovocie/Zelenina", "50/70", "text"),
        ),
        None,
    ),
    (
        MealCategory.BREAKFAST_SNACK,
        "Raňajky-desiata 4",
        _components(
            ("Hlavná zložka", "50", "g"),
            ("Extra zložka 1", "50", "g"),
            ("Ovocie/Zelenina", "50/70", "text"),
        ),
        None,
    ),
    (
        MealCategory.BREAKFAST_SNACK,
        "Raňajky-desiata 5",
        _components(
            ("Hlavná zložka", "50", "g"),
            ("Extra zložka 1", "25", "g"),
            ("Ovocie/Zelenina", "50/70", "text"),
        ),
        None,
    ),
    (
        MealCategory.BREAKFAST_SNACK,
        "Raňajky-desiata 6",
        _components(("Hlavná zložka", "50", "g"), ("Extra zložka 1", "15", "g")),
        None,
    ),
    (
        MealCategory.BREAKFAST_SNACK,
        "Raňajky-desiata 7",
        _components(("Hlavná zložka", "50", "g"), ("Extra zložka 1", "15", "g")),
        _VAJCE_EXCEPTION,
    ),
    (
        MealCategory.SOUP,
        "Polievka 1",
        _components(("Hlavná zložka", "200", "ml")),
        None,
    ),
    (
        MealCategory.SOUP,
        "Polievka 2",
        _components(("Hlavná zložka", "195", "ml"), ("Extra zložka 1", "5", "g")),
        None,
    ),
    (
        MealCategory.SOUP,
        "Polievka 3",
        _components(("Hlavná zložka", "193", "ml"), ("Extra zložka 1", "7", "g")),
        None,
    ),
    (
        MealCategory.SOUP,
        "Polievka 4",
        _components(("Hlavná zložka", "110", "ml"), ("Extra zložka 1", "10", "g")),
        None,
    ),
    (
        MealCategory.MAIN_COURSE,
        "Hlavný chod 1",
        _components(("Hlavná časť", "185", "g"), ("Syr", "10", "g")),
        None,
    ),
    (
        MealCategory.MAIN_COURSE,
        "Hlavný chod 2",
        _components(("Hlavná časť", "185", "g"), ("Šalát", "25", "g")),
        None,
    ),
    (
        MealCategory.MAIN_COURSE,
        "Hlavný chod 3",
        _components(
            ("Hlavná časť", "185", "g"), ("Šalát", "25", "g"), ("Syr", "10", "g")
        ),
        None,
    ),
    (
        MealCategory.MAIN_COURSE,
        "Hlavný chod 4",
        _components(("Hlavná časť", "100", "g"), ("Príloha", "100", "g")),
        None,
    ),
    (
        MealCategory.MAIN_COURSE,
        "Hlavný chod 5",
        _components(("Hlavná časť", "110", "g"), ("Príloha", "90", "g")),
        None,
    ),
    (
        MealCategory.MAIN_COURSE,
        "Hlavný chod 6",
        _components(
            ("Hlavná časť", "90", "g"), ("Príloha", "110", "g"), ("Šalát", "25", "g")
        ),
        None,
    ),
    (
        MealCategory.MAIN_COURSE,
        "Hlavný chod 7",
        _components(("Príloha", "90", "g"), ("Omáčka", "70", "g")),
        _GULICKA_EXCEPTION,
    ),
    (
        MealCategory.AFTERNOON_SNACK,
        "Olovrant 1",
        _components(("Hlavná zložka", "75", "g")),
        None,
    ),
    (
        MealCategory.AFTERNOON_SNACK,
        "Olovrant 2",
        _components(("Hlavná zložka", "50", "g"), ("Extra zložka 1", "25", "g")),
        None,
    ),
    (
        MealCategory.AFTERNOON_SNACK,
        "Olovrant 3",
        _components(
            ("Hlavná zložka", "50", "g"),
            ("Extra zložka 1", "25", "g"),
            ("Extra zložka 2", "25", "g"),
        ),
        None,
    ),
]


class Command(BaseCommand):
    help = (
        "Seed the fixed meal-weight catalog (MealTemplate rows). "
        "Safe for all environments."
    )

    def handle(self, *args, **options):
        created_count = 0
        for category, name, components, unit_exception in CATALOG:
            _, created = MealTemplate.objects.update_or_create(
                name=name,
                defaults={
                    "category": category,
                    "components": components,
                    "unit_exception": unit_exception,
                    "weight_label": _weight_label(components),
                    "base_weight_grams": _base_weight_grams(components),
                    "menu_variant": "",
                    "is_active": True,
                },
            )
            if created:
                created_count += 1
                self.stdout.write(f"  MealTemplate created: {name}")

        if created_count:
            self.stdout.write(
                self.style.SUCCESS(
                    f"seed_meal_weight_catalog: created {created_count} templates."
                )
            )
        else:
            self.stdout.write(
                "seed_meal_weight_catalog: all catalog templates already present."
            )

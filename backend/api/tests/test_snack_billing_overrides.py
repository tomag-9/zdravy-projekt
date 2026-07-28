"""Report-only olovrant (afternoon_snack) billing overrides for specific prevádzky.

Klientov účtovný Excel neráta olovrant vždy zo skutočných EduPage objednávok —
pozri `api.utils.SNACK_MIRRORS_LUNCH_PREVADZKY` a `SNACK_DOUBLE_BILLING_PORTIONS`.
Tieto pravidlá menia len výstup `gramage_dashboard`, nikdy `DailyOrder.data`.
"""

import datetime

import pytest
from django.contrib.auth.models import User
from django.core.management import call_command

from api.models import (
    Celok,
    DailyMealPlan,
    DailyOrder,
    MealPlanItem,
    MealTemplate,
    Prevadzka,
)
from api.services.meal_plan_service import MealPlanService


def _make_plan(date):
    call_command("init_reference_data")
    plan = DailyMealPlan.objects.create(date=date)
    MealPlanItem.objects.create(
        meal_plan=plan,
        template=MealTemplate.objects.create(
            name="Polievka",
            category="soup",
            components=[{"label": "Polievka", "grams": "200", "unit": "g"}],
            base_weight_grams="200",
        ),
        category="soup",
        menu_variant="",
    )
    MealPlanItem.objects.create(
        meal_plan=plan,
        template=MealTemplate.objects.create(
            name="Obed",
            category="main_course",
            components=[{"label": "Hlavné jedlo", "grams": "300", "unit": "g"}],
            base_weight_grams="300",
        ),
        category="main_course",
        menu_variant="",
    )
    MealPlanItem.objects.create(
        meal_plan=plan,
        template=MealTemplate.objects.create(
            name="Olovrant",
            category="afternoon_snack",
            components=[
                {"label": "Kváskový chlieb", "grams": "40", "unit": "g"},
                {"label": "Nátierka", "grams": "20", "unit": "g"},
            ],
            base_weight_grams="60",
        ),
        category="afternoon_snack",
        menu_variant="",
    )
    return plan


def _sub_rows_for_meal(data, meal):
    return [sr for sr in data["rows"][0]["sub_rows"] if sr["meal"] == meal]


@pytest.mark.django_db
def test_filipa_neriho_snack_mirrors_lunch_ignoring_real_snack_orders():
    """Excel má na olovrante vzorec = obedový počet; skutočné (nižšie) EduPage
    olovrant objednávky sa v reporte ignorujú."""
    plan = _make_plan(datetime.date(2026, 7, 28))
    celok = Celok.objects.create(nazov="MŠ Filipáneriho")
    prevadzka = Prevadzka.objects.create(
        celok=celok, nazov="MŠ Filipáneriho", report_alias="Filipa Nériho"
    )
    user = User.objects.create_user(username="filipa@example.com", password="x")
    DailyOrder.objects.create(
        user=user,
        prevadzka=prevadzka,
        date=plan.date,
        data={
            "lunch": {"Škôlka": {"menuCounts": {"": 19}, "diets": {}}},
            # Real EduPage olovrant orders undercount vs lunch — must be ignored.
            "olovrant": {"Škôlka": {"menuCounts": {"": 16}, "diets": {}}},
        },
    )

    data = MealPlanService.gramage_dashboard(plan.date.isoformat())
    snack_rows = _sub_rows_for_meal(data, "afternoon_snack")

    assert len(snack_rows) == 1
    assert snack_rows[0]["count"] == 19
    assert snack_rows[0]["col_grams"][-1] == ["760.00", "380.00"]


@pytest.mark.django_db
def test_facility_without_mirror_rule_keeps_real_snack_orders():
    """Regresný test: bez pravidla (napr. Rozmanitá) sa olovrant NEPREPÍŠE obedom."""
    plan = _make_plan(datetime.date(2026, 7, 28))
    celok = Celok.objects.create(nazov="MŠ Rozmanitá")
    prevadzka = Prevadzka.objects.create(
        celok=celok, nazov="MŠ Rozmanitá", report_alias="Rozmanita Škôlka"
    )
    user = User.objects.create_user(username="rozmanita@example.com", password="x")
    DailyOrder.objects.create(
        user=user,
        prevadzka=prevadzka,
        date=plan.date,
        data={
            "lunch": {"Škôlka": {"menuCounts": {"": 24}, "diets": {}}},
            "olovrant": {"Škôlka": {"menuCounts": {"": 20}, "diets": {}}},
        },
    )

    data = MealPlanService.gramage_dashboard(plan.date.isoformat())
    snack_rows = _sub_rows_for_meal(data, "afternoon_snack")

    assert len(snack_rows) == 1
    assert snack_rows[0]["count"] == 20


@pytest.mark.django_db
def test_krasnanko_kz_portion_is_doubled_in_snack_only():
    """Krásňanko 'KZ' (Dospelý (SŠ)) sa v olovrante počíta 2x — v obede ostáva 1x."""
    plan = _make_plan(datetime.date(2026, 7, 28))
    celok = Celok.objects.create(nazov="MŠ Krásnanko")
    prevadzka = Prevadzka.objects.create(
        celok=celok, nazov="MŠ Krásnanko", report_alias="Krasňanko"
    )
    user = User.objects.create_user(username="krasnanko@example.com", password="x")
    DailyOrder.objects.create(
        user=user,
        prevadzka=prevadzka,
        date=plan.date,
        data={
            "lunch": {
                "Škôlka": {"menuCounts": {"": 27}, "diets": {}},
                "Dospelý (SŠ)": {"menuCounts": {"": 2}, "diets": {}},
            },
            "olovrant": {
                "Škôlka": {"menuCounts": {"": 21}, "diets": {}},
                "Dospelý (SŠ)": {"menuCounts": {"": 1}, "diets": {}},
            },
        },
    )

    data = MealPlanService.gramage_dashboard(plan.date.isoformat())
    lunch_rows = {
        sr["portion_name"]: sr for sr in _sub_rows_for_meal(data, "main_course")
    }
    snack_rows = {
        sr["portion_name"]: sr for sr in _sub_rows_for_meal(data, "afternoon_snack")
    }

    # Lunch stays untouched — the doubling is scoped to olovrant only.
    assert lunch_rows["Dospelý (SŠ)"]["count"] == 2

    # Snack: the real 1 KZ order is billed/prepared as 2 (Dospelý (SŠ) portion
    # coefficient 2.0 also applies, as it does everywhere else: 40g x 2 x 2.0).
    assert snack_rows["Dospelý (SŠ)"]["count"] == 2
    assert snack_rows["Dospelý (SŠ)"]["col_grams"][-1] == ["160.00", "80.00"]
    # Škôlka portion in snack is untouched by the doubling rule.
    assert snack_rows["Škôlka"]["count"] == 21

"""'Dospelí zvlášť' — EduPage nastavenie na Prevadzka.

Keď je `Prevadzka.adults_pack_separately_enabled` zapnuté, gramážna tabuľka
(`MealPlanService.gramage_dashboard`) automaticky vykáže VŠETKY porcie
"Dospelý (SŠ)" ako zabalené zvlášť — bez toho, aby ich klient musel manuálne
označiť cez "Zabaliť zvlášť" (`DailyOrder.data[...]["packSeparately"]`).
Ostatné porcie (Škôlka, ZŠ...) tým nesmú byť dotknuté a manuálne
"packSeparately"/"packSeparatelyGn" dáta majú prednosť (nesmú sa dvojito
započítať).
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
            name="Obed",
            category="main_course",
            components=[{"label": "Hlavné jedlo", "grams": "300", "unit": "g"}],
            base_weight_grams="300",
        ),
        category="main_course",
        menu_variant="",
    )
    return plan


def _sub_rows_for_meal(data, meal):
    return [sr for sr in data["rows"][0]["sub_rows"] if sr["meal"] == meal]


@pytest.mark.django_db
def test_adults_pack_separately_auto_marks_all_adult_portions_as_zvlast():
    plan = _make_plan(datetime.date(2026, 9, 4))
    celok = Celok.objects.create(nazov="MŠ Testovacia")
    prevadzka = Prevadzka.objects.create(
        celok=celok,
        nazov="MŠ Testovacia",
        adults_pack_separately_enabled=True,
    )
    user = User.objects.create_user(username="testovacia@example.com", password="x")
    DailyOrder.objects.create(
        user=user,
        prevadzka=prevadzka,
        date=plan.date,
        data={
            "lunch": {
                "Škôlka": {"menuCounts": {"": 24}, "diets": {}},
                "Dospelý (SŠ)": {"menuCounts": {"": 3}, "diets": {}},
            },
        },
    )

    data = MealPlanService.gramage_dashboard(plan.date.isoformat())
    lunch_rows = _sub_rows_for_meal(data, "main_course")

    zvlast_rows = [r for r in lunch_rows if r["type"] == "zvlast"]
    standard_rows = {
        r["portion_name"]: r for r in lunch_rows if r["type"] == "standard"
    }

    # Dospelý (SŠ) sa nesmie objaviť v "čistom" štandardnom riadku vôbec —
    # celý je presunutý do "zvlášť".
    assert "Dospelý (SŠ)" not in standard_rows
    assert len(zvlast_rows) == 1
    assert zvlast_rows[0]["portion_name"] == "Dospelý (SŠ)"
    assert zvlast_rows[0]["count"] == 3

    # Škôlka ostáva v štandardnom riadku, nezasiahnuté.
    assert standard_rows["Škôlka"]["count"] == 24


@pytest.mark.django_db
def test_adults_pack_separately_disabled_by_default_keeps_standard_row():
    plan = _make_plan(datetime.date(2026, 9, 4))
    celok = Celok.objects.create(nazov="MŠ Bez Nastavenia")
    prevadzka = Prevadzka.objects.create(celok=celok, nazov="MŠ Bez Nastavenia")
    user = User.objects.create_user(username="bez-nastavenia@example.com", password="x")
    DailyOrder.objects.create(
        user=user,
        prevadzka=prevadzka,
        date=plan.date,
        data={"lunch": {"Dospelý (SŠ)": {"menuCounts": {"": 2}, "diets": {}}}},
    )

    data = MealPlanService.gramage_dashboard(plan.date.isoformat())
    lunch_rows = _sub_rows_for_meal(data, "main_course")

    assert not any(r["type"] == "zvlast" for r in lunch_rows)
    assert next(r for r in lunch_rows if r["type"] == "standard")["count"] == 2


@pytest.mark.django_db
def test_adults_pack_separately_respects_manual_gn_packing():
    """Ak časť dospelých je už manuálne označená "do GN", tá časť ostáva v GN
    a auto-zvlášť pokryje len zvyšok — súčet sa nesmie rozísť s objednávkou."""
    plan = _make_plan(datetime.date(2026, 9, 4))
    celok = Celok.objects.create(nazov="MŠ GN")
    prevadzka = Prevadzka.objects.create(
        celok=celok, nazov="MŠ GN", adults_pack_separately_enabled=True
    )
    user = User.objects.create_user(username="gn@example.com", password="x")
    DailyOrder.objects.create(
        user=user,
        prevadzka=prevadzka,
        date=plan.date,
        data={
            "lunch": {
                "Dospelý (SŠ)": {
                    "menuCounts": {"": 5},
                    "diets": {},
                    "packSeparatelyGn": {"menus": {"": 2}},
                },
            },
        },
    )

    data = MealPlanService.gramage_dashboard(plan.date.isoformat())
    lunch_rows = _sub_rows_for_meal(data, "main_course")

    by_type = {r["type"]: r for r in lunch_rows}
    assert "standard" not in by_type
    assert by_type["zvlast"]["count"] == 3
    assert by_type["zvlast_gn"]["count"] == 2

"""Polievka sa vykazuje v riadku menu, ku ktorému patrí.

Stĺpec polievky zostáva samostatný; mení sa len to, do ktorého riadku je
rozpísaný — viď `_merge_soup_into_main_course`. Stĺpcové súčty preto musia
zostať na gram rovnaké ako pred zlúčením.
"""

import datetime
from decimal import Decimal

import pytest
from django.contrib.auth.models import User
from django.core.management import call_command

from api.exporters.gramage_dashboard_export import portion_summary
from api.models import (
    Celok,
    DailyMealPlan,
    DailyOrder,
    MealPlanItem,
    MealTemplate,
    Prevadzka,
)
from api.services.meal_plan_service import MealPlanService, _merge_soup_into_main_course

# Stĺpce: 0 = polievka, 1 = Menu A, 2 = Menu B.
SOUP, MENU_A, MENU_B = 0, 1, 2


def _soup(portion, heads, grams, diet_name="", row_type="standard"):
    return {
        "type": row_type,
        "meal": "soup",
        "variant": "",
        "portion_name": portion,
        "diet_name": diet_name,
        "label": f"{portion} - Polievka",
        "count": heads,
        "_heads": heads,
        "col_grams": [[grams], [], []],
    }


def _main(portion, variant, heads, grams, diet_name="", row_type="standard"):
    col_index = MENU_A if variant == "A" else MENU_B
    col_grams = [[], [], []]
    col_grams[col_index] = [grams]
    return {
        "type": row_type,
        "meal": "main_course",
        "variant": variant,
        "portion_name": portion,
        "diet_name": diet_name,
        "label": f"{portion} - Obed Menu {variant}",
        "count": heads,
        "_heads": heads,
        "col_grams": col_grams,
    }


def _column_total(rows, col_index):
    total = Decimal("0")
    for row in rows:
        for value in row["col_grams"][col_index]:
            total += Decimal(value)
    return total


def test_soup_row_disappears_into_the_menu_row():
    merged = _merge_soup_into_main_course(
        [_soup("Škôlka", 10, "2000.00"), _main("Škôlka", "A", 10, "3000.00")]
    )

    assert [row["meal"] for row in merged] == ["main_course"]
    assert merged[0]["col_grams"][SOUP] == ["2000.00"]
    assert merged[0]["col_grams"][MENU_A] == ["3000.00"]


def test_soup_splits_across_menu_variants_by_headcount():
    """7 hláv na A, 3 na B → polievka 2000 g sa delí 1400/600."""
    merged = _merge_soup_into_main_course(
        [
            _soup("Škôlka", 10, "2000.00"),
            _main("Škôlka", "A", 7, "2100.00"),
            _main("Škôlka", "B", 3, "900.00"),
        ]
    )

    assert len(merged) == 2
    assert merged[0]["col_grams"][SOUP] == ["1400.00"]
    assert merged[1]["col_grams"][SOUP] == ["600.00"]
    # Stĺpcový súčet polievky sa nesmie hnúť.
    assert _column_total(merged, SOUP) == Decimal("2000.00")


def test_uneven_split_keeps_the_column_total_exact():
    """Delenie na tretiny nevychádza na dve desatinné — zvyšok berie posledný."""
    merged = _merge_soup_into_main_course(
        [
            _soup("Škôlka", 3, "100.00"),
            _main("Škôlka", "A", 1, "300.00"),
            _main("Škôlka", "B", 2, "600.00"),
        ]
    )

    assert _column_total(merged, SOUP) == Decimal("100.00")


def test_diet_soup_merges_into_the_matching_diet_row():
    """Diéta mala doteraz dva riadky (polievka + obed) — teraz jeden."""
    merged = _merge_soup_into_main_course(
        [
            _soup("Škôlka", 2, "400.00", diet_name="No Milk", row_type="diet"),
            _main("Škôlka", "A", 2, "600.00", diet_name="No Milk", row_type="diet"),
        ]
    )

    assert len(merged) == 1
    assert merged[0]["type"] == "diet"
    assert merged[0]["col_grams"][SOUP] == ["400.00"]


def test_diet_soup_does_not_leak_into_a_standard_row():
    merged = _merge_soup_into_main_course(
        [
            _soup("Škôlka", 2, "400.00", diet_name="No Milk", row_type="diet"),
            _main("Škôlka", "A", 8, "2400.00"),
        ]
    )

    # Bez zhodnej diéty niet kam zlúčiť — polievkový riadok ostáva.
    assert [row["meal"] for row in merged] == ["soup", "main_course"]


def test_soup_without_a_main_course_keeps_its_own_row():
    """Prevádzka, ktorá berie len polievku, nesmie prísť o gramáž."""
    merged = _merge_soup_into_main_course([_soup("Škôlka", 5, "1000.00")])

    assert len(merged) == 1
    assert merged[0]["meal"] == "soup"


def test_soup_of_one_portion_does_not_reach_another():
    merged = _merge_soup_into_main_course(
        [
            _soup("Škôlka", 4, "800.00"),
            _main("Škola", "A", 4, "1600.00"),
        ]
    )

    assert [row["meal"] for row in merged] == ["soup", "main_course"]


def test_portion_summary_still_reports_the_soup_column():
    """Súhrn porcií páruje riadky cez meal — zlúčená polievka mu nesmie zmiznúť."""
    col_groups = [
        {"meal": "soup", "variant": "", "label": "Polievka", "components": [{}]},
        {"meal": "main_course", "variant": "A", "label": "Menu A", "components": [{}]},
        {"meal": "main_course", "variant": "B", "label": "Menu B", "components": [{}]},
    ]
    merged = _merge_soup_into_main_course(
        [
            _soup("Škôlka", 10, "2000.00"),
            _main("Škôlka", "A", 7, "2100.00"),
            _main("Škôlka", "B", 3, "900.00"),
        ]
    )
    for row in merged:
        row.pop("_heads", None)

    summary = portion_summary({"col_groups": col_groups}, [{"sub_rows": merged}])

    by_label = {item["label"]: item for item in summary}
    assert by_label["Polievka"]["col_grams"][SOUP] == [Decimal("2000.00")]
    assert by_label["Polievka"]["count"] == 10
    assert by_label["Menu A"]["col_grams"][MENU_A] == [Decimal("2100.00")]
    assert by_label["Menu B"]["col_grams"][MENU_B] == [Decimal("900.00")]


# ── End-to-end cez gramage_dashboard ─────────────────────────────────────────
def _plan_with_soup_and_two_menus(date):
    call_command("init_reference_data")
    plan = DailyMealPlan.objects.create(date=date)
    specs = [
        ("Polievka", "soup", "", "200"),
        ("Obed A", "main_course", "A", "300"),
        ("Obed B", "main_course", "B", "300"),
    ]
    for name, category, variant, grams in specs:
        MealPlanItem.objects.create(
            meal_plan=plan,
            template=MealTemplate.objects.create(
                name=name,
                category=category,
                components=[{"label": name, "grams": grams, "unit": "g"}],
                base_weight_grams=grams,
            ),
            category=category,
            menu_variant=variant,
        )
    return plan


@pytest.mark.django_db
def test_dashboard_reports_soup_inside_the_menu_rows():
    """7 hláv na A, 3 na B: polievka 200 g/hlava → 1400 g a 600 g, spolu 2000 g."""
    plan = _plan_with_soup_and_two_menus(datetime.date(2026, 7, 28))
    celok = Celok.objects.create(nazov="MŠ Testovacia")
    prevadzka = Prevadzka.objects.create(celok=celok, nazov="MŠ Testovacia")
    user = User.objects.create_user(username="test@example.com", password="x")
    DailyOrder.objects.create(
        user=user,
        prevadzka=prevadzka,
        date=plan.date,
        data={"lunch": {"Škôlka": {"menuCounts": {"A": 7, "B": 3}, "diets": {}}}},
    )

    data = MealPlanService.gramage_dashboard(plan.date.isoformat())
    sub_rows = data["rows"][0]["sub_rows"]
    soup_index = next(
        index
        for index, group in enumerate(data["col_groups"])
        if group["meal"] == "soup"
    )

    # Žiadny samostatný polievkový riadok — len dva menu riadky.
    assert [row["meal"] for row in sub_rows] == ["main_course", "main_course"]
    assert [row["variant"] for row in sub_rows] == ["A", "B"]
    assert sub_rows[0]["col_grams"][soup_index] == ["1400.00"]
    assert sub_rows[1]["col_grams"][soup_index] == ["600.00"]

    # Celkový stĺpcový súčet polievky sa zlúčením nesmie zmeniť.
    assert [Decimal(v) for v in data["totals"][soup_index]] == [Decimal("2000.00")]

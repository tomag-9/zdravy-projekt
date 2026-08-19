"""Tabuľka „Gramáž jedál" — dáta z MealPlanService až po vykreslené HTML.

HTML je to isté, z ktorého WeasyPrint robí PDF, a stavia sa z rovnakého spec-u
ako obrazovka — takže čo je overené tu, platí pre oba výstupy.
"""

import datetime
from decimal import Decimal

import pytest
from django.contrib.auth.models import User

from api.exporters.gramage_dashboard_export import portion_summary
from api.exporters.gramage_table_html import render_table
from api.exporters.gramage_table_spec import build_table_spec, format_count
from api.models import (
    Celok,
    DailyMealPlan,
    DailyOrder,
    DeliveryBlock,
    DeliveryRoute,
    MealPlanItem,
    MealTemplate,
    PortionType,
    Prevadzka,
)
from api.services.meal_plan_service import MealPlanService


def _rendered_rows(data: dict) -> list[tuple[str, str]]:
    """(label, počet) pre každý riadok vykresleného HTML, v poradí tabuľky."""
    spec = build_table_spec(data)
    rows = []
    for row in [*spec["rows"], *spec["footer"]]:
        cells = row["cells"]
        rows.append((str(cells[0].get("text") or ""), cells[0].get("count") or ""))
    return rows


@pytest.mark.django_db
class TestGramageDashboardExports:
    def test_dashboard_subtotals_exclude_diets_and_export_to_xlsx(self):
        user = User.objects.create_user(
            username="dashboard@example.com",
            email="dashboard@example.com",
            first_name="Dashboard",
            last_name="Client",
        )
        portion_type = PortionType.objects.create(
            name="Škôlka", coefficient=Decimal("1.0000"), sort_order=1
        )
        plan = DailyMealPlan.objects.create(
            date=datetime.date(2024, 1, 15),
            created_by=user,
        )
        breakfast = MealTemplate.objects.create(
            category="breakfast_snack",
            name="Kaša",
            weight_label="100g",
            base_weight_grams=Decimal("100.00"),
        )
        lunch_a = MealTemplate.objects.create(
            category="main_course",
            name="Menu A",
            weight_label="200g",
            base_weight_grams=Decimal("200.00"),
            menu_variant="A",
        )
        lunch_b = MealTemplate.objects.create(
            category="main_course",
            name="Menu B",
            weight_label="250g",
            base_weight_grams=Decimal("250.00"),
            menu_variant="B",
        )
        snack = MealTemplate.objects.create(
            category="afternoon_snack",
            name="Ovocie",
            weight_label="50g",
            base_weight_grams=Decimal("50.00"),
        )
        MealPlanItem.objects.create(
            meal_plan=plan,
            template=breakfast,
            category="breakfast_snack",
            menu_variant="",
        )
        MealPlanItem.objects.create(
            meal_plan=plan, template=lunch_a, category="main_course", menu_variant="A"
        )
        MealPlanItem.objects.create(
            meal_plan=plan, template=lunch_b, category="main_course", menu_variant="B"
        )
        MealPlanItem.objects.create(
            meal_plan=plan,
            template=snack,
            category="afternoon_snack",
            menu_variant="",
        )
        plan.enrolled_counts.create(portion_type=portion_type, count=1)

        celok = Celok.objects.create(nazov="Dashboard celok")
        prevadzka = Prevadzka.objects.create(celok=celok, nazov="Dashboard prevádzka")
        DailyOrder.objects.create(
            user=user,
            date=plan.date,
            prevadzka=prevadzka,
            data={
                "breakfast": {
                    "Škôlka": {"menuCounts": {"A": 4}, "diets": {"Vegan": 1}}
                },
                "lunch": {
                    "Škôlka": {
                        "menuCounts": {"A": 5, "B": 2},
                        "diets": {"Bezlepková": 2},
                    }
                },
                "olovrant": {"Škôlka": {"menuCounts": {"A": 3}, "diets": {}}},
            },
        )

        data = MealPlanService.gramage_dashboard(plan.date.isoformat())
        row = data["rows"][0]
        standard_rows = [sr for sr in row["sub_rows"] if sr["type"] == "standard"]

        assert row["standard_total_count"] == 11
        assert sorted(sr["count"] for sr in standard_rows) == [2, 3, 3, 3]
        assert {sr["label"]: sr["count"] for sr in standard_rows} == {
            "Škôlka - Raňajky-desiata": 3,
            "Škôlka - Hlavný chod Menu A": 3,
            "Škôlka - Hlavný chod Menu B": 2,
            "Škôlka - Olovrant": 3,
        }
        assert row["standard_col_grams"] == [
            ["300.00"],
            ["600.00"],
            ["500.00"],
            ["150.00"],
        ]
        assert row["diet_summary_rows"] == [
            {
                "name": "Bezlepková",
                "color": "#FDE68A",
                "base_colors": [],
                "count": 2,
                "col_grams": [["0.00"], ["400.00"], ["0.00"], ["0.00"]],
            },
            {
                "name": "Vegan",
                "color": "#FDE68A",
                "base_colors": [],
                "count": 1,
                "col_grams": [["100.00"], ["0.00"], ["0.00"], ["0.00"]],
            },
        ]
        assert data["totals"] == [["300.00"], ["600.00"], ["500.00"], ["150.00"]]

        rendered = _rendered_rows(data)
        assert ("Súčet bez diét", "11") in rendered
        assert ("Bezlepková", "2") in rendered
        assert ("Vegan", "1") in rendered

    def test_portion_summaries_export_per_vydaj_and_globally(self):
        user = User.objects.create_user(
            username="delivery-export@example.com",
            email="delivery-export@example.com",
        )
        portion_type = PortionType.objects.create(
            name="Škôlka", coefficient=Decimal("1.0000"), sort_order=1
        )
        plan = DailyMealPlan.objects.create(
            date=datetime.date(2024, 1, 16),
            created_by=user,
        )
        lunch = MealTemplate.objects.create(
            category="main_course",
            name="Obed",
            weight_label="200g",
            base_weight_grams=Decimal("200.00"),
            menu_variant="A",
        )
        MealPlanItem.objects.create(
            meal_plan=plan,
            template=lunch,
            category="main_course",
            menu_variant="A",
        )
        plan.enrolled_counts.create(portion_type=portion_type, count=1)

        first_block = DeliveryBlock.objects.create(
            name="Prvý blok",
            sort_order=1,
            is_active=True,
            include_in_main_summary=True,
            include_in_extra_summary=False,
        )
        second_block = DeliveryBlock.objects.create(
            name="Druhý blok",
            sort_order=2,
            is_active=True,
            include_in_main_summary=False,
            include_in_extra_summary=True,
        )
        first_route = DeliveryRoute.objects.create(
            block=first_block,
            name="Prvá trasa",
            driver="Vodič 1",
            departure_time=datetime.time(7, 30),
            note="Poznámka trasy 1",
            sort_order=1,
            is_active=True,
        )
        second_route = DeliveryRoute.objects.create(
            block=second_block,
            # Druhý výdajný bod kuchyne — tabuľka sa delí podľa výdaja trasy.
            vydaj="B",
            name="Druhá trasa",
            driver="Vodič 2",
            departure_time=datetime.time(8, 0),
            note="Poznámka trasy 2",
            sort_order=1,
            is_active=True,
        )
        celok = Celok.objects.create(nazov="Rozvozový celok")
        prevadzky = [
            Prevadzka.objects.create(
                celok=celok,
                nazov="Prevádzka 1",
                delivery_route=first_route,
                delivery_sort_order=1,
            ),
            Prevadzka.objects.create(
                celok=celok,
                nazov="Prevádzka 2",
                delivery_route=second_route,
                delivery_sort_order=1,
            ),
            Prevadzka.objects.create(
                celok=celok,
                nazov="Nepriradená prevádzka",
                delivery_sort_order=1,
            ),
        ]
        for count, prevadzka in enumerate(prevadzky, start=1):
            DailyOrder.objects.create(
                user=user,
                date=plan.date,
                prevadzka=prevadzka,
                data={"lunch": {"Škôlka": {"menuCounts": {"A": count}, "diets": {}}}},
            )

        data = MealPlanService.gramage_dashboard(plan.date.isoformat())
        assert len(data["vydaje"]) == 2
        assert len(data["unassigned_rows"]) == 1
        expected_summaries = [
            (
                f"Súhrn porcií — {vydaj['name']}",
                portion_summary(
                    data,
                    [
                        row
                        for route in vydaj.get("routes", [])
                        for row in route.get("rows", [])
                    ],
                ),
            )
            for vydaj in data["vydaje"]
        ]
        expected_summaries.append(("Porcie celkom", portion_summary(data)))

        rendered = _rendered_rows(data)
        for title, expected_rows in expected_summaries:
            band_index = next(
                index for index, (label, _) in enumerate(rendered) if label == title
            )
            for offset, expected in enumerate(expected_rows, start=1):
                label, count = rendered[band_index + offset]
                assert label == expected["label"]
                assert count == format_count(expected["count"])

    def test_admin_order_and_delivery_notes_export_to_xlsx_and_pdf(self):
        user = User.objects.create_user(
            username="note-export@example.com",
            email="note-export@example.com",
        )
        portion_type = PortionType.objects.create(
            name="Škôlka", coefficient=Decimal("1.0000"), sort_order=1
        )
        plan = DailyMealPlan.objects.create(
            date=datetime.date(2024, 1, 17),
            created_by=user,
        )
        lunch = MealTemplate.objects.create(
            category="main_course",
            name="Obed s poznámkami",
            weight_label="200g",
            base_weight_grams=Decimal("200.00"),
            menu_variant="A",
        )
        MealPlanItem.objects.create(
            meal_plan=plan,
            template=lunch,
            category="main_course",
            menu_variant="A",
        )
        plan.enrolled_counts.create(portion_type=portion_type, count=1)
        celok = Celok.objects.create(nazov="Celok s poznámkami")
        prevadzka = Prevadzka.objects.create(
            celok=celok,
            nazov="Prevádzka s poznámkami",
            admin_order_note="bez cibule",
            delivery_note="zadný vchod",
        )
        DailyOrder.objects.create(
            user=user,
            date=plan.date,
            prevadzka=prevadzka,
            data={"lunch": {"Škôlka": {"menuCounts": {"A": 1}, "diets": {}}}},
        )

        data = MealPlanService.gramage_dashboard(plan.date.isoformat())
        html = render_table(build_table_spec(data))

        assert "<strong>Poznámka k objednávke:</strong> bez cibule" in html
        assert "<strong>Rozvoz:</strong> zadný vchod" in html
        # #513 — poznámka prevádzky je aj v stĺpci Poznámka na klientskom
        # riadku, nielen v collapsible note-admin sub-riadku vyššie.
        assert '<td class="cell-note client-note">bez cibule</td>' in html

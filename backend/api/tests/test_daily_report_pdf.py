"""Denný report = PDF prehľadu gramáže, zúžený na jedlá daného mailu."""

import datetime
from unittest.mock import patch

from api.exporters.daily_report_pdf import build_report_pdf_bytes, sections_for_meals

# Stĺpce, aké dá `gramage_dashboard()`: kľúč nesie aj variant/diétu, jedlo je
# v poli `meal` — filtrovať sa preto musí podľa neho, nie podľa kľúča.
_COL_GROUPS = [
    {"key": "breakfast_snack", "meal": "breakfast_snack"},
    {"key": "soup", "meal": "soup"},
    {"key": "main_course_A", "meal": "main_course"},
    {"key": "main_course_B", "meal": "main_course"},
    {"key": "afternoon_snack_diet_3", "meal": "afternoon_snack"},
]


def test_breakfast_report_takes_only_the_breakfast_column():
    assert sections_for_meals(_COL_GROUPS, ["breakfast"]) == ["breakfast_snack"]


def test_lunch_covers_soup_and_every_main_course_variant():
    assert sections_for_meals(_COL_GROUPS, ["lunch"]) == [
        "soup",
        "main_course_A",
        "main_course_B",
    ]


def test_olovrant_matches_afternoon_snack_including_diet_columns():
    assert sections_for_meals(_COL_GROUPS, ["olovrant"]) == ["afternoon_snack_diet_3"]


def test_meal_without_a_column_that_day_selects_nothing():
    """Prázdny výber musí volajúci zachytiť — `build_table_spec` ho vracia na celú tabuľku."""
    assert sections_for_meals([{"key": "soup", "meal": "soup"}], ["breakfast"]) == []


def test_no_pdf_when_the_day_has_no_menu():
    with patch(
        "api.services.meal_plan_service.MealPlanService.gramage_dashboard",
        return_value={"date": "2026-02-25", "col_groups": [], "rows": []},
    ):
        assert build_report_pdf_bytes(datetime.date(2026, 2, 25)) is None


def test_no_pdf_when_the_requested_meal_is_missing_that_day():
    """Mail „Raňajky" nesmie odísť s obedovou tabuľkou, keď raňajky ten deň nie sú."""
    with patch(
        "api.services.meal_plan_service.MealPlanService.gramage_dashboard",
        return_value={
            "date": "2026-02-25",
            "col_groups": [{"key": "soup", "meal": "soup", "components": []}],
            "rows": [],
        },
    ):
        assert (
            build_report_pdf_bytes(datetime.date(2026, 2, 25), meals=["breakfast"])
            is None
        )


def test_pdf_is_generated_for_a_day_with_a_menu():
    data = {
        "date": "2026-02-25",
        "col_groups": [
            {
                "key": "soup",
                "label": "Polievka",
                "meal": "soup",
                "variant": None,
                "template_name": "Hrášková",
                "components": [
                    {"label": "Polievka", "base_grams": "200", "unit": "ml"}
                ],
            }
        ],
        "rows": [
            {
                "client": "Škôlka A",
                "row_key": "a",
                "sub_rows": [
                    {
                        "type": "standard",
                        "label": "Menu A",
                        "count": 5,
                        "col_grams": [["1000"]],
                    }
                ],
                "standard_col_grams": [["1000"]],
                "diet_summary_rows": [],
            }
        ],
        "totals": [["1000"]],
    }
    with patch(
        "api.services.meal_plan_service.MealPlanService.gramage_dashboard",
        return_value=data,
    ):
        pdf = build_report_pdf_bytes(datetime.date(2026, 2, 25))

    assert pdf is not None
    assert pdf.startswith(b"%PDF")

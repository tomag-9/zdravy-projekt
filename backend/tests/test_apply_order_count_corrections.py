import json
from io import StringIO

import pytest
from django.contrib.auth.models import User
from django.core.management import call_command

from api.models import (
    DailyMealPlan,
    DailyOrder,
    MealPlanItem,
    MealTemplate,
    UserProfile,
)
from api.services.meal_plan_service import MealPlanService

pytestmark = pytest.mark.django_db


def _write_json(path, payload):
    path.write_text(json.dumps(payload), encoding="utf-8")


def test_apply_order_count_corrections_merges_missing_olovrant(tmp_path):
    user = User.objects.create_user(
        username="pramen@example.com",
        email="pramen@example.com",
        password="password",
    )
    UserProfile.objects.create(user=user, company_name="MŠ Prameň")
    DailyOrder.objects.create(
        user=user,
        date="2026-07-08",
        data={
            "lunch": {"MŠ Prameň": {"Škôlka": {"menuCounts": {"A": 24}, "diets": {}}}}
        },
    )
    path = tmp_path / "corrections.json"
    _write_json(
        path,
        [
            {
                "date": "2026-07-08",
                "company_name": "MŠ Prameň",
                "meal": "olovrant",
                "portion": "Škôlka",
                "menuCounts": {"A": 23},
            }
        ],
    )

    out = StringIO()
    call_command("apply_order_count_corrections", str(path), stdout=out)

    order = DailyOrder.objects.get(user=user, date="2026-07-08")
    assert order.data["lunch"]["MŠ Prameň"]["Škôlka"]["menuCounts"]["A"] == 24
    assert order.data["olovrant"]["Škôlka"] == {
        "menuCounts": {"A": 23},
        "diets": {},
    }
    assert "Applied 1 corrections" in out.getvalue()


def test_apply_order_count_corrections_can_replace_existing_portion(tmp_path):
    user = User.objects.create_user(
        username="client@example.com",
        email="client@example.com",
        password="password",
    )
    UserProfile.objects.get_or_create(user=user, defaults={"company_name": user.email})
    DailyOrder.objects.create(
        user=user,
        date="2026-07-08",
        data={
            "olovrant": {
                "client@example.com": {
                    "Škôlka": {"menuCounts": {"A": 5}, "diets": {"NO MILK": 1}}
                }
            }
        },
    )
    path = tmp_path / "corrections.json"
    _write_json(
        path,
        [
            {
                "date": "2026-07-08",
                "email": "client@example.com",
                "meal": "olovrant",
                "category": "client@example.com",
                "portion": "Škôlka",
                "replace": True,
                "menuCounts": {"A": 7},
                "diets": {},
            }
        ],
    )

    call_command("apply_order_count_corrections", str(path), stdout=StringIO())

    order = DailyOrder.objects.get(user=user, date="2026-07-08")
    assert order.data["olovrant"]["client@example.com"]["Škôlka"] == {
        "menuCounts": {"A": 7},
        "diets": {},
    }


def test_apply_order_count_corrections_dry_run_does_not_save(tmp_path):
    user = User.objects.create_user(
        username="client@example.com",
        email="client@example.com",
        password="password",
    )
    path = tmp_path / "corrections.json"
    _write_json(
        path,
        [
            {
                "date": "2026-07-08",
                "email": user.email,
                "meal": "olovrant",
                "portion": "Škôlka",
                "menuCounts": {"A": 7},
            }
        ],
    )

    call_command("apply_order_count_corrections", str(path), "--dry-run")

    assert not DailyOrder.objects.filter(user=user, date="2026-07-08").exists()


def test_apply_order_count_corrections_adds_component_gram_adjustment(tmp_path):
    user = User.objects.create_user(
        username="skolicka@example.com",
        email="skolicka@example.com",
        password="password",
    )
    UserProfile.objects.get_or_create(user=user, defaults={"company_name": user.email})
    DailyOrder.objects.create(
        user=user,
        date="2026-07-08",
        data={"lunch": {"Škôlka": {"menuCounts": {"A": 1}, "diets": {}}}},
    )
    plan = DailyMealPlan.objects.create(date="2026-07-08")
    template = MealTemplate.objects.create(
        category="main_course",
        name="Main",
        weight_label="90g + 110g + 25g",
        base_weight_grams="225.00",
        components=[
            {"label": "Main", "grams": "90", "unit": "g"},
            {"label": "Side", "grams": "110", "unit": "g"},
            {"label": "Salad", "grams": "25", "unit": "g"},
        ],
    )
    MealPlanItem.objects.create(
        meal_plan=plan,
        template=template,
        category="main_course",
        menu_variant="",
    )
    path = tmp_path / "corrections.json"
    _write_json(
        path,
        [
            {
                "date": "2026-07-08",
                "email": user.email,
                "meal": "lunch",
                "gramCorrections": [
                    {
                        "meal": "main_course",
                        "component_index": 2,
                        "grams": "69.3",
                        "label": "Škôlka MS šalát",
                    }
                ],
            }
        ],
    )

    call_command("apply_order_count_corrections", str(path), stdout=StringIO())

    order = DailyOrder.objects.get(user=user, date="2026-07-08")
    assert order.data["__gram_corrections__"] == [
        {
            "meal": "main_course",
            "variant": "",
            "diet_name": None,
            "component_index": 2,
            "grams": "69.3",
            "label": "Škôlka MS šalát",
        }
    ]
    row = MealPlanService.gramage_dashboard("2026-07-08")["rows"][0]
    assert row["standard_col_grams"] == [["90.00", "110.00", "94.30"]]

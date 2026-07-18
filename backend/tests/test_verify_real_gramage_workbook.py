from io import StringIO

import openpyxl
import pytest
from django.contrib.auth.models import User
from django.core.management import CommandError, call_command

from api.models import (
    DailyMealPlan,
    DailyOrder,
    MealPlanItem,
    MealTemplate,
    PortionType,
    UserProfile,
)

pytestmark = pytest.mark.django_db


def _create_dashboard_data(target_date="2026-07-08"):
    user = User.objects.create_user(
        username="client@example.com",
        email="client@example.com",
        password="password",
    )
    UserProfile.objects.get_or_create(user=user, defaults={"company_name": user.email})
    PortionType.objects.create(name="Škôlka", coefficient="1.0000", sort_order=1)
    plan = DailyMealPlan.objects.create(date=target_date)
    soup = MealTemplate.objects.create(
        category="soup",
        name="Soup",
        weight_label="200ml",
        base_weight_grams="200.00",
        components=[{"label": "Soup", "grams": "200", "unit": "ml"}],
    )
    main = MealTemplate.objects.create(
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
    snack = MealTemplate.objects.create(
        category="afternoon_snack",
        name="Snack",
        weight_label="75g",
        base_weight_grams="75.00",
        components=[{"label": "Snack", "grams": "75", "unit": "g"}],
    )
    for template in (soup, main, snack):
        MealPlanItem.objects.create(
            meal_plan=plan,
            template=template,
            category=template.category,
            menu_variant="",
        )
    DailyOrder.objects.create(
        user=user,
        date=target_date,
        status="submitted",
        data={
            "lunch": {"Škôlka": {"menuCounts": {"A": 2}, "diets": {}}},
            "olovrant": {"Škôlka": {"menuCounts": {"A": 2}, "diets": {}}},
        },
    )
    return user.email


def _write_real_workbook(path, client_label, values):
    workbook = openpyxl.Workbook()
    sheet = workbook.active
    sheet.append(["date", "soup", "main", "side", "salad", "snack"])
    sheet.append([client_label, *values])
    workbook.save(path)


def test_verify_real_gramage_workbook_passes_for_matching_workbook(tmp_path):
    client_label = _create_dashboard_data()
    workbook_path = tmp_path / "real.xlsx"
    _write_real_workbook(workbook_path, client_label, [400, 180, 220, 50, 150])

    out = StringIO()
    call_command(
        "verify_real_gramage_workbook",
        "--date=2026-07-08",
        f"--workbook={workbook_path}",
        stdout=out,
    )

    assert "Real workbook verification passed." in out.getvalue()
    assert "OK" in out.getvalue()


def test_verify_real_gramage_workbook_writes_actionable_diffs(tmp_path):
    client_label = _create_dashboard_data()
    workbook_path = tmp_path / "real.xlsx"
    output_path = tmp_path / "diff.csv"
    _write_real_workbook(workbook_path, client_label, [400, 999, 220, 50, 150])

    with pytest.raises(CommandError, match="found differences"):
        call_command(
            "verify_real_gramage_workbook",
            "--date=2026-07-08",
            f"--workbook={workbook_path}",
            f"--output-csv={output_path}",
        )

    csv_text = output_path.read_text(encoding="utf-8")
    assert "DIFF" in csv_text
    assert "Main" in csv_text
    assert "-819.00" in csv_text

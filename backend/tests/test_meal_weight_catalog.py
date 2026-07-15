import datetime
import io

import openpyxl
import pytest
from django.contrib.auth.models import User
from django.core.management import call_command

from api.models import (
    DailyMealPlan,
    DailyOrder,
    EnrolledCount,
    MealPlanItem,
    MealTemplate,
    PortionType,
)
from api.services.meal_plan_service import MealPlanService


@pytest.mark.django_db
def test_seed_meal_weight_catalog_creates_21_templates_idempotently():
    call_command("seed_meal_weight_catalog")
    call_command("seed_meal_weight_catalog")

    assert MealTemplate.objects.count() == 21
    assert MealTemplate.objects.filter(category="breakfast_snack").count() == 7
    assert MealTemplate.objects.filter(category="soup").count() == 4
    assert MealTemplate.objects.filter(category="main_course").count() == 7
    assert MealTemplate.objects.filter(category="afternoon_snack").count() == 3


@pytest.mark.django_db
def test_seed_meal_weight_catalog_sets_unit_exceptions_on_two_templates():
    call_command("seed_meal_weight_catalog")

    egg_template = MealTemplate.objects.get(name="Raňajky-desiata 7")
    assert egg_template.unit_exception["component_label"] == "Vajce"
    assert egg_template.unit_exception["counts_by_portion_type"]["Škôlka"] == "0.5"
    assert egg_template.unit_exception["counts_by_portion_type"]["Dospelý (SŠ)"] == "1"

    gulicka_template = MealTemplate.objects.get(name="Hlavný chod 7")
    assert gulicka_template.unit_exception["component_label"] == "Gulička/fašírka"
    assert (
        gulicka_template.unit_exception["counts_by_portion_type"]["ZŠ 1.stupeň"] == "2"
    )

    other_templates = MealTemplate.objects.exclude(
        name__in=["Raňajky-desiata 7", "Hlavný chod 7"]
    )
    assert all(t.unit_exception is None for t in other_templates)


@pytest.mark.django_db
def test_seed_meal_weight_catalog_bakes_unit_exception_into_weight_label():
    """
    The piece-count exception must be visible in the composition text itself
    (weight_label) — shown everywhere a template is listed (Katalóg jedál,
    admin day-editor dropdown, client MenuPage) — not hidden behind a
    separate admin-only tag.
    """
    call_command("seed_meal_weight_catalog")

    egg_template = MealTemplate.objects.get(name="Raňajky-desiata 7")
    assert egg_template.weight_label == "50g + 15g + Vajce (ks podľa vekovej skupiny)"

    gulicka_template = MealTemplate.objects.get(name="Hlavný chod 7")
    assert (
        gulicka_template.weight_label
        == "90g + 70g + Gulička/fašírka (ks podľa vekovej skupiny)"
    )

    # Templates without an exception are unaffected.
    soup_1 = MealTemplate.objects.get(name="Polievka 1")
    assert soup_1.weight_label == "200ml"


@pytest.mark.django_db
def test_seed_meal_weight_catalog_computes_base_weight_grams():
    call_command("seed_meal_weight_catalog")

    main_course_3 = MealTemplate.objects.get(name="Hlavný chod 3")
    # 185g Hlavná časť + 25g Šalát + 10g Syr
    assert str(main_course_3.base_weight_grams) == "220.00"

    soup_1 = MealTemplate.objects.get(name="Polievka 1")
    assert str(soup_1.base_weight_grams) == "200.00"


@pytest.mark.django_db
def test_calculate_gramage_uses_fixed_count_for_unit_exception_not_coefficient():
    call_command("seed_meal_weight_catalog")
    skolka = PortionType.objects.create(
        name="Škôlka", coefficient="1.0000", sort_order=1
    )
    dospely = PortionType.objects.create(
        name="Dospelý (SŠ)", coefficient="1.5000", sort_order=2
    )
    template = MealTemplate.objects.get(name="Hlavný chod 7")

    plan = DailyMealPlan.objects.create(date=datetime.date(2026, 4, 1))
    MealPlanItem.objects.create(
        meal_plan=plan, template=template, category="main_course"
    )
    EnrolledCount.objects.create(meal_plan=plan, portion_type=skolka, count=10)
    EnrolledCount.objects.create(meal_plan=plan, portion_type=dospely, count=2)

    data = MealPlanService.calculate_gramage(plan)
    item = data["sections"]["main_course"]["items"][0]
    unit_breakdown = {u["portion_type"]: u for u in item["unit_breakdown"]}

    # Škôlka: 1 ks/person * 10 people = 10, NOT multiplied by coefficient
    assert unit_breakdown["Škôlka"]["total_units"] == "10"
    # Dospelý: 3 ks/person * 2 people = 6, NOT multiplied by 1.5 coefficient
    assert unit_breakdown["Dospelý (SŠ)"]["total_units"] == "6"

    # Gram breakdown (Príloha 90g + Omáčka 70g = 160g base) still uses the coefficient
    gram_breakdown = {b["portion_type"]: b for b in item["breakdown"]}
    assert gram_breakdown["Škôlka"]["total_grams"] == "1600.00"
    assert gram_breakdown["Dospelý (SŠ)"]["total_grams"] == "480.00"


@pytest.mark.django_db
def test_gramage_dashboard_pools_all_order_variants_for_variant_less_main_course():
    """
    The new admin day editor always saves main_course with menu_variant="".
    Real client orders still pick between menu variants (A/B/...). The single
    variant-less main_course selection must apply to ALL of those variants
    instead of matching none of them (which would silently compute 0g).
    """
    call_command("seed_meal_weight_catalog")
    PortionType.objects.create(name="Škôlka", coefficient="1.0000", sort_order=1)
    main_course = MealTemplate.objects.get(name="Hlavný chod 4")  # 100g + 100g

    plan = DailyMealPlan.objects.create(date=datetime.date(2026, 5, 4))
    MealPlanItem.objects.create(
        meal_plan=plan, template=main_course, category="main_course", menu_variant=""
    )

    user = User.objects.create_user(username="client@example.com", password="x")
    DailyOrder.objects.create(
        user=user,
        date=plan.date,
        data={"lunch": {"Škôlka": {"menuCounts": {"A": 3, "B": 2}, "diets": {}}}},
    )

    data = MealPlanService.gramage_dashboard(plan.date.isoformat())
    row = data["rows"][0]
    main_course_rows = [sr for sr in row["sub_rows"] if sr["meal"] == "main_course"]
    # All 5 people (3 + 2, regardless of which menu variant they chose) are
    # attributed to the single main_course column, with non-zero grams.
    assert sum(sr["count"] for sr in main_course_rows) == 5
    assert all(sr["col_grams"] != [] for sr in main_course_rows)
    non_empty_grams = [g for sr in main_course_rows for g in sr["col_grams"] if g]
    assert any(g != ["0.00", "0.00"] for g in non_empty_grams)


@pytest.mark.django_db
def test_menu_b_uses_real_xlsx_component_split_when_main_course_is_unvarianted():
    """
    Week 28/2026 real workbooks keep Menu B in the same component columns as
    Menu A. Until a daily plan has a real B-specific template, B counts must use
    the imported XLSX component split instead of the PDF-only 275g total.
    """
    PortionType.objects.create(name="Škôlka", coefficient="1.0000", sort_order=1)
    main_course = MealTemplate.objects.create(
        category="main_course",
        name="Real XLSX main course",
        weight_label="90g + 110g + 25g",
        base_weight_grams="225.00",
        components=[
            {"label": "Mäso", "grams": "90", "unit": "g"},
            {"label": "Príloha", "grams": "110", "unit": "g"},
            {"label": "Šalát", "grams": "25", "unit": "g"},
        ],
    )
    plan = DailyMealPlan.objects.create(date=datetime.date(2026, 7, 7))
    MealPlanItem.objects.create(
        meal_plan=plan,
        template=main_course,
        category="main_course",
        menu_variant="",
    )
    user = User.objects.create_user(username="menu-b@example.com", password="x")
    DailyOrder.objects.create(
        user=user,
        date=plan.date,
        data={"lunch": {"Škôlka": {"menuCounts": {"A": 3, "B": 2}, "diets": {}}}},
    )

    data = MealPlanService.gramage_dashboard(plan.date.isoformat())

    assert [
        (
            group["meal"],
            group["variant"],
            [component["label"] for component in group["components"]],
        )
        for group in data["col_groups"]
    ] == [("main_course", "", ["Mäso", "Príloha", "Šalát"])]
    assert data["rows"][0]["standard_col_grams"] == [["450.00", "550.00", "125.00"]]


@pytest.mark.django_db
def test_gramage_dashboard_does_not_double_count_headcount_for_soup_and_main_course():
    """
    A 'lunch' order fans out to both soup and main_course (two dishes prepared
    from the same headcount). The reported person-count must not double just
    because two dishes are prepared from it.
    """
    call_command("seed_meal_weight_catalog")
    PortionType.objects.create(name="Škôlka", coefficient="1.0000", sort_order=1)
    soup = MealTemplate.objects.get(name="Polievka 1")
    main_course = MealTemplate.objects.get(name="Hlavný chod 1")

    plan = DailyMealPlan.objects.create(date=datetime.date(2026, 5, 5))
    MealPlanItem.objects.create(
        meal_plan=plan, template=soup, category="soup", menu_variant=""
    )
    MealPlanItem.objects.create(
        meal_plan=plan, template=main_course, category="main_course", menu_variant=""
    )

    user = User.objects.create_user(username="client2@example.com", password="x")
    DailyOrder.objects.create(
        user=user,
        date=plan.date,
        data={"lunch": {"Škôlka": {"menuCounts": {"A": 5}, "diets": {"Vegan": 1}}}},
    )

    data = MealPlanService.gramage_dashboard(plan.date.isoformat())
    row = data["rows"][0]

    # 5 ordered, 1 of them is the Vegan diet portion (reported separately) →
    # standard count is 4, diet count is 1; neither should double to 8/2 just
    # because two dishes (soup + main_course) are prepared from this order.
    assert row["standard_total_count"] == 4
    assert row["diet_summary_rows"][0]["count"] == 1
    # Two sub_rows (one per dish) still carry the correct per-dish count each.
    standard_rows = [sr for sr in row["sub_rows"] if sr["type"] == "standard"]
    assert {sr["meal"] for sr in standard_rows} == {"soup", "main_course"}
    assert all(sr["count"] == 4 for sr in standard_rows)


@pytest.mark.django_db
def test_gramage_dashboard_shows_ml_soup_columns():
    """
    Polievka templates only have an 'ml' component. The dashboard's
    col_groups must not silently drop it (it used to only accept 'g').
    """
    call_command("seed_meal_weight_catalog")
    PortionType.objects.create(name="Škôlka", coefficient="1.0000", sort_order=1)
    soup = MealTemplate.objects.get(name="Polievka 1")  # 200ml, no other components

    plan = DailyMealPlan.objects.create(date=datetime.date(2026, 5, 6))
    MealPlanItem.objects.create(
        meal_plan=plan, template=soup, category="soup", menu_variant=""
    )

    user = User.objects.create_user(username="client3@example.com", password="x")
    DailyOrder.objects.create(
        user=user,
        date=plan.date,
        data={"lunch": {"Škôlka": {"menuCounts": {"A": 4}, "diets": {}}}},
    )

    data = MealPlanService.gramage_dashboard(plan.date.isoformat())
    soup_group = next(cg for cg in data["col_groups"] if cg["meal"] == "soup")
    assert len(soup_group["components"]) == 1
    assert soup_group["components"][0]["unit"] == "ml"
    assert soup_group["components"][0]["base_grams"] == "200"

    soup_row = next(sr for sr in data["rows"][0]["sub_rows"] if sr["meal"] == "soup")
    # 200ml * coeff(1.0) * 4 people = 800
    assert soup_row["col_grams"][data["col_groups"].index(soup_group)] == ["800.00"]


@pytest.mark.django_db
def test_gramage_dashboard_shows_unit_exception_as_its_own_column():
    """
    Selecting a template with a unit_exception (e.g. Hlavný chod 7 / vajce)
    must surface a piece-count column in the dashboard, not silently vanish.
    """
    call_command("seed_meal_weight_catalog")
    PortionType.objects.create(name="Škôlka", coefficient="1.0000", sort_order=1)
    PortionType.objects.create(name="Dospelý (SŠ)", coefficient="1.5000", sort_order=2)
    main_course = MealTemplate.objects.get(name="Hlavný chod 7")

    plan = DailyMealPlan.objects.create(date=datetime.date(2026, 5, 7))
    MealPlanItem.objects.create(
        meal_plan=plan,
        template=main_course,
        category="main_course",
        menu_variant="",
    )

    user = User.objects.create_user(username="client4@example.com", password="x")
    DailyOrder.objects.create(
        user=user,
        date=plan.date,
        data={"lunch": {"Škôlka": {"menuCounts": {"A": 4}, "diets": {}}}},
    )

    data = MealPlanService.gramage_dashboard(plan.date.isoformat())
    main_group = next(cg for cg in data["col_groups"] if cg["meal"] == "main_course")
    exception_components = [
        c for c in main_group["components"] if c.get("is_exception")
    ]
    assert len(exception_components) == 1
    assert exception_components[0]["label"] == "Gulička/fašírka"
    assert exception_components[0]["unit"] == "ks"

    main_row = next(
        sr for sr in data["rows"][0]["sub_rows"] if sr["meal"] == "main_course"
    )
    exception_index = main_group["components"].index(exception_components[0])
    group_index = data["col_groups"].index(main_group)
    # Škôlka gulička count is 1 ks/person * 4 people = 4, NOT multiplied by coefficient
    assert main_row["col_grams"][group_index][exception_index] == "4.00"

    # Both dashboard exporters must not crash on a component with
    # base_grams=None (the exception column has no gram value).
    from api.exporters.gramage_dashboard_pdf_exporter import GramageDashboardPDFExporter
    from api.exporters.gramage_dashboard_xlsx_exporter import (
        GramageDashboardXLSXExporter,
    )

    assert GramageDashboardXLSXExporter(data).generate()
    assert GramageDashboardPDFExporter(data).generate()


@pytest.mark.django_db
def test_gramage_dashboard_keeps_fractional_egg_piece_counts():
    call_command("seed_meal_weight_catalog")
    PortionType.objects.create(name="Jasle", coefficient="0.5000", sort_order=1)
    PortionType.objects.create(name="ZŠ 2.stupeň", coefficient="1.2500", sort_order=2)
    breakfast = MealTemplate.objects.get(name="Raňajky-desiata 7")

    plan = DailyMealPlan.objects.create(date=datetime.date(2026, 5, 8))
    MealPlanItem.objects.create(
        meal_plan=plan,
        template=breakfast,
        category="breakfast_snack",
        menu_variant="",
    )

    user = User.objects.create_user(username="client5@example.com", password="x")
    DailyOrder.objects.create(
        user=user,
        date=plan.date,
        data={
            "breakfast": {
                "Jasle": {"menuCounts": {"A": 1}, "diets": {}},
                "ZŠ 2.stupeň": {"menuCounts": {"A": 3}, "diets": {}},
            }
        },
    )

    data = MealPlanService.gramage_dashboard(plan.date.isoformat())
    breakfast_group = next(
        cg for cg in data["col_groups"] if cg["meal"] == "breakfast_snack"
    )
    egg_component = next(
        c for c in breakfast_group["components"] if c["label"] == "Vajce"
    )
    egg_index = breakfast_group["components"].index(egg_component)
    group_index = data["col_groups"].index(breakfast_group)

    rows_by_portion = {
        sr["portion_name"]: sr
        for sr in data["rows"][0]["sub_rows"]
        if sr["meal"] == "breakfast_snack"
    }
    assert rows_by_portion["Jasle"]["col_grams"][group_index][egg_index] == "0.50"
    assert rows_by_portion["ZŠ 2.stupeň"]["col_grams"][group_index][egg_index] == "3.00"
    assert data["totals"][group_index][egg_index] == "3.50"


@pytest.mark.django_db
def test_gramage_dashboard_maps_operation_portion_names_for_piece_counts():
    call_command("seed_meal_weight_catalog")
    PortionType.objects.create(name="Škôlka", coefficient="1.0000", sort_order=1)
    breakfast = MealTemplate.objects.get(name="Raňajky-desiata 7")
    main_course = MealTemplate.objects.get(name="Hlavný chod 7")

    plan = DailyMealPlan.objects.create(date=datetime.date(2026, 5, 10))
    MealPlanItem.objects.create(
        meal_plan=plan,
        template=breakfast,
        category="breakfast_snack",
        menu_variant="",
    )
    MealPlanItem.objects.create(
        meal_plan=plan,
        template=main_course,
        category="main_course",
        menu_variant="",
    )

    user = User.objects.create_user(username="fantasticka@example.com", password="x")
    DailyOrder.objects.create(
        user=user,
        date=plan.date,
        data={
            "breakfast": {"Fantastická Škôlka": {"menuCounts": {"A": 7}, "diets": {}}},
            "lunch": {"Fantastická Škôlka": {"menuCounts": {"A": 14}, "diets": {}}},
        },
    )

    data = MealPlanService.gramage_dashboard(plan.date.isoformat())
    breakfast_group = next(
        cg for cg in data["col_groups"] if cg["meal"] == "breakfast_snack"
    )
    main_group = next(cg for cg in data["col_groups"] if cg["meal"] == "main_course")
    breakfast_group_index = data["col_groups"].index(breakfast_group)
    main_group_index = data["col_groups"].index(main_group)
    egg_index = next(
        index
        for index, component in enumerate(breakfast_group["components"])
        if component["label"] == "Vajce"
    )
    ball_index = next(
        index
        for index, component in enumerate(main_group["components"])
        if component["label"] == "Gulička/fašírka"
    )

    rows_by_meal = {sr["meal"]: sr for sr in data["rows"][0]["sub_rows"]}
    assert (
        rows_by_meal["breakfast_snack"]["col_grams"][breakfast_group_index][egg_index]
        == "3.50"
    )
    assert (
        rows_by_meal["main_course"]["col_grams"][main_group_index][ball_index]
        == "14.00"
    )
    assert data["totals"][breakfast_group_index][egg_index] == "3.50"
    assert data["totals"][main_group_index][ball_index] == "14.00"


@pytest.mark.django_db
def test_meal_plan_xlsx_export_includes_unit_breakdown_columns():
    from api.exporters.meal_plan_xlsx_exporter import MealPlanXLSXExporter

    call_command("seed_meal_weight_catalog")
    jasle = PortionType.objects.create(name="Jasle", coefficient="0.5000", sort_order=1)
    zst = PortionType.objects.create(
        name="ZŠ 2.stupeň", coefficient="1.2500", sort_order=2
    )
    breakfast = MealTemplate.objects.get(name="Raňajky-desiata 7")

    plan = DailyMealPlan.objects.create(date=datetime.date(2026, 5, 9))
    MealPlanItem.objects.create(
        meal_plan=plan,
        template=breakfast,
        category="breakfast_snack",
        menu_variant="",
    )
    EnrolledCount.objects.create(meal_plan=plan, portion_type=jasle, count=1)
    EnrolledCount.objects.create(meal_plan=plan, portion_type=zst, count=3)

    data = MealPlanService.calculate_gramage(plan)
    workbook = openpyxl.load_workbook(
        io.BytesIO(MealPlanXLSXExporter([data]).generate())
    )
    rows = list(workbook.active.iter_rows(values_only=True))
    header = next(row for row in rows if row and row[0] == "Sekcia")
    jasle_egg_col = header.index("Jasle - Vajce (ks)")
    zst_egg_col = header.index("ZŠ 2.stupeň - Vajce (ks)")
    item_row = next(row for row in rows if row and row[1] == "Raňajky-desiata 7")

    assert item_row[jasle_egg_col] == "0.5"
    assert item_row[zst_egg_col] == "3"

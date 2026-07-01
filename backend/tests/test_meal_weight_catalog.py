import datetime

import pytest
from django.core.management import call_command

from api.models import (
    DailyMealPlan,
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

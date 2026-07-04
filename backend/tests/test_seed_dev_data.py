import pytest
from django.core.management import call_command

from api.management.commands.seed_dev_data import Command
from api.models import MealPlanItem, MealTemplate

_VALID_CATEGORIES = {"breakfast_snack", "soup", "main_course", "afternoon_snack"}


@pytest.mark.django_db
def test_seed_meal_plan_data_uses_current_meal_categories():
    call_command("init_reference_data")
    Command()._seed_meal_plan_data(days=2, flush=False)

    categories = set(MealTemplate.objects.values_list("category", flat=True))
    assert categories
    assert categories <= _VALID_CATEGORIES

    item_categories = set(MealPlanItem.objects.values_list("category", flat=True))
    assert item_categories
    assert item_categories <= _VALID_CATEGORIES

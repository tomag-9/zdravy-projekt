import pytest
from django.core.management import call_command

from api.management.commands.seed_dev_data import SEED_USERS, Command
from api.models import MealPlanItem, MealTemplate, UserProfile

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


@pytest.mark.django_db
def test_seed_dev_data_syncs_settings_to_prevadzka(settings):
    settings.DEBUG = True
    call_command("seed_dev_data", "--days", "1")

    seed = SEED_USERS[0]
    profile = UserProfile.objects.get(user__username=seed["username"])
    prevadzka = profile.dostupne_prevadzky().get()

    assert profile.celok.nazov == seed["company_name"]
    assert profile.celok.billing_name == seed["billing_name"]
    assert profile.user.settings.visible_menus == seed["menus"]
    assert profile.user.settings.visible_meals == seed["meals"]
    assert prevadzka.visible_menus == seed["menus"]
    assert prevadzka.visible_meals == seed["meals"]

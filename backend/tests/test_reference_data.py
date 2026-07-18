import pytest
from django.contrib.auth.models import User
from django.core.management import call_command

from api.default_visibility import DEFAULT_VISIBLE_MEALS
from api.models import Celok, ClientSettings, Diet, PortionType, Prevadzka


@pytest.mark.django_db
def test_init_reference_data_seeds_default_diets_idempotently():
    call_command("init_reference_data")
    call_command("init_reference_data")

    expected = {
        "NO MILK",
        "NO GLUTEN",
        "NO MILK/NO GLUTEN",
        "VEGGIE",
        "HISTAMIN",
        "NONONO",
        "NO ORECH",
        "NO PARADAJKA",
        "NO FISH",
        "NO EGG",
        "NO ZEMIAK",
        "NO SOJA",
        "NO ZELER",
    }

    assert expected.issubset(set(Diet.objects.values_list("name", flat=True)))
    assert Diet.objects.filter(name="DIA").exists()
    assert Diet.objects.filter(name="NO MILK").count() == 1
    assert Diet.objects.get(name="NO MILK").description


@pytest.mark.django_db
def test_init_reference_data_syncs_real_portion_coefficients():
    call_command("init_reference_data")
    call_command("init_reference_data")

    coefficients = {
        name: str(coefficient)
        for name, coefficient in PortionType.objects.values_list("name", "coefficient")
    }

    assert coefficients["Jasle"] == "0.7500"
    assert coefficients["Škôlka"] == "1.0000"
    assert coefficients["ZŠ 1.stupeň"] == "1.2500"
    assert coefficients["ZŠ 2.stupeň"] == "1.5000"
    assert coefficients["Dospelý (SŠ)"] == "2.0000"


@pytest.mark.django_db
def test_init_reference_data_enables_default_diets_for_empty_client_settings():
    user = User.objects.create_user(
        username="client@example.com",
        email="client@example.com",
    )
    settings, _ = ClientSettings.objects.get_or_create(user=user)
    settings.visible_diets.clear()

    call_command("init_reference_data")
    call_command("init_reference_data")

    enabled_diets = set(settings.visible_diets.values_list("name", flat=True))
    assert {
        "NO MILK",
        "NO GLUTEN",
        "NO MILK/NO GLUTEN",
        "VEGGIE",
        "HISTAMIN",
        "NONONO",
        "NO ORECH",
        "NO PARADAJKA",
        "NO FISH",
        "NO EGG",
        "NO ZEMIAK",
        "NO SOJA",
        "NO ZELER",
    }.issubset(enabled_diets)
    assert "DIA" not in enabled_diets


@pytest.mark.django_db
def test_init_reference_data_creates_missing_client_settings_with_default_diets():
    user = User.objects.create_user(
        username="missing-settings@example.com",
        email="missing-settings@example.com",
    )
    ClientSettings.objects.filter(user=user).delete()

    call_command("init_reference_data")

    settings = ClientSettings.objects.get(user=user)
    assert settings.visible_diets.filter(name="NO MILK").exists()
    assert settings.visible_diets.filter(name="NO ZELER").exists()


@pytest.mark.django_db
def test_init_reference_data_enables_default_diets_for_empty_prevadzky():
    call_command("init_reference_data")
    celok = Celok.objects.create(nazov="Prázdna prevádzka")
    prevadzka = Prevadzka.objects.create(celok=celok, nazov="Prázdna prevádzka")
    prevadzka.visible_diets.clear()

    call_command("init_reference_data")
    call_command("init_reference_data")

    enabled_diets = set(prevadzka.visible_diets.values_list("name", flat=True))
    assert enabled_diets == {
        "NO MILK",
        "NO GLUTEN",
        "NO MILK/NO GLUTEN",
        "VEGGIE",
        "HISTAMIN",
        "NONONO",
        "NO ORECH",
        "NO PARADAJKA",
        "NO FISH",
        "NO EGG",
        "NO ZEMIAK",
        "NO SOJA",
        "NO ZELER",
    }
    assert "DIA" not in enabled_diets


@pytest.mark.django_db
def test_init_reference_data_enables_all_meals_for_everyone():
    user = User.objects.create_user(
        username="legacy-meals@example.com",
        email="legacy-meals@example.com",
    )
    settings, _ = ClientSettings.objects.get_or_create(user=user)
    settings.visible_meals = ["lunch"]
    settings.save(update_fields=["visible_meals"])
    celok = Celok.objects.create(nazov="Legacy chody")
    prevadzka = Prevadzka.objects.create(celok=celok, nazov="Legacy chody")
    prevadzka.visible_meals = ["lunch"]
    prevadzka.save(update_fields=["visible_meals"])

    call_command("init_reference_data")
    call_command("init_reference_data")

    settings.refresh_from_db()
    prevadzka.refresh_from_db()
    assert settings.visible_meals == DEFAULT_VISIBLE_MEALS
    assert prevadzka.visible_meals == DEFAULT_VISIBLE_MEALS

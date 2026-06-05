import pytest
from django.contrib.auth.models import User
from django.core.management import call_command

from api.models import ClientSettings, Diet


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
    assert Diet.objects.filter(name="NO MILK").count() == 1
    assert Diet.objects.get(name="NO MILK").description


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

import pytest
from django.core.management import call_command

from api.default_visibility import DEFAULT_VISIBLE_MEALS, DEFAULT_VISIBLE_MENUS
from api.models import Celok, Diet, PortionType, Prevadzka


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
    assert "VEGAN" not in enabled_diets


@pytest.mark.django_db
def test_init_reference_data_does_not_reset_admin_narrowed_menus_and_meals():
    """Regression test: init_reference_data runs on every deploy and must not
    silently reset an admin's narrowed visible_menus/visible_meals back to
    "everything enabled"."""
    celok = Celok.objects.create(nazov="Legacy chody")
    prevadzka = Prevadzka.objects.create(celok=celok, nazov="Legacy chody")
    prevadzka.visible_menus = ["A"]
    prevadzka.visible_meals = ["lunch"]
    prevadzka.save(update_fields=["visible_menus", "visible_meals"])

    call_command("init_reference_data")
    call_command("init_reference_data")

    prevadzka.refresh_from_db()
    assert prevadzka.visible_menus == ["A"]
    assert prevadzka.visible_meals == ["lunch"]


@pytest.mark.django_db
def test_init_reference_data_sets_default_menus_and_meals_for_new_prevadzka():
    celok = Celok.objects.create(nazov="Nová prevádzka")
    prevadzka = Prevadzka.objects.create(celok=celok, nazov="Nová prevádzka")

    call_command("init_reference_data")

    prevadzka.refresh_from_db()
    assert prevadzka.visible_menus == DEFAULT_VISIBLE_MENUS
    assert prevadzka.visible_meals == DEFAULT_VISIBLE_MEALS

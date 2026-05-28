import pytest
from django.core.management import call_command

from api.models import Diet


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

import pytest
from django.core.management import call_command

from api.management.commands.seed_british_school_2026_08 import BRITISH_SCHOOL_URL
from api.models import Celok, EdupageConnection, Prevadzka


@pytest.mark.django_db
def test_seed_british_school_creates_celok_prevadzka_and_edupage_link():
    call_command("seed_british_school_2026_08")

    celok = Celok.objects.get(nazov="British School")
    prevadzka = celok.prevadzky.get(nazov="British School")
    assert celok.zdroj_objednavok == Celok.ZdrojObjednavok.EDUPAGE
    assert prevadzka.edupage_connection.mealsguest_url == BRITISH_SCHOOL_URL
    assert prevadzka.edupage_match == ""
    assert (
        EdupageConnection.objects.filter(mealsguest_url=BRITISH_SCHOOL_URL).count() == 1
    )


@pytest.mark.django_db
def test_seed_british_school_is_idempotent():
    call_command("seed_british_school_2026_08")
    first_state = {
        "celky": list(Celok.objects.order_by("pk").values()),
        "prevadzky": list(Prevadzka.objects.order_by("pk").values()),
        "connections": list(EdupageConnection.objects.order_by("pk").values()),
    }

    call_command("seed_british_school_2026_08")

    second_state = {
        "celky": list(Celok.objects.order_by("pk").values()),
        "prevadzky": list(Prevadzka.objects.order_by("pk").values()),
        "connections": list(EdupageConnection.objects.order_by("pk").values()),
    }
    assert second_state == first_state
    assert (
        EdupageConnection.objects.filter(mealsguest_url=BRITISH_SCHOOL_URL).count() == 1
    )


@pytest.mark.django_db
def test_seed_british_school_dry_run_rolls_back():
    call_command("seed_british_school_2026_08", "--dry-run")

    assert not Celok.objects.filter(nazov="British School").exists()
    assert not EdupageConnection.objects.filter(
        mealsguest_url=BRITISH_SCHOOL_URL
    ).exists()

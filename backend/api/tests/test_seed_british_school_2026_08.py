from io import StringIO

import pytest
from django.core.management import call_command

from api.management.commands.seed_british_school_2026_08 import (
    BRITISH_SCHOOL_DIET_NAMES,
    BRITISH_SCHOOL_URL,
)
from api.models import (
    Celok,
    DeliveryBlock,
    DeliveryRoute,
    Diet,
    EdupageConnection,
    Prevadzka,
    Vydaj,
)


def _seed_trasa_extra_block() -> DeliveryBlock:
    return DeliveryBlock.objects.create(
        name="Trasa extra", sort_order=2, include_in_extra_summary=True
    )


def _seed_british_school_diets() -> None:
    for name in BRITISH_SCHOOL_DIET_NAMES:
        Diet.objects.create(name=name)


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
def test_seed_british_school_enables_its_translated_diets_when_they_exist():
    _seed_british_school_diets()

    call_command("seed_british_school_2026_08")

    prevadzka = Prevadzka.objects.get(nazov="British School")
    enabled = set(prevadzka.visible_diets.values_list("name", flat=True))
    assert enabled == set(BRITISH_SCHOOL_DIET_NAMES)


@pytest.mark.django_db
def test_seed_british_school_warns_when_its_diets_are_missing():
    stdout = StringIO()

    call_command("seed_british_school_2026_08", stdout=stdout)

    assert "diéty" in stdout.getvalue() and "chýbajú" in stdout.getvalue()
    prevadzka = Prevadzka.objects.get(nazov="British School")
    assert prevadzka.visible_diets.count() == 0


@pytest.mark.django_db
def test_seed_british_school_assigns_a_cluster_c_route_when_trasa_extra_exists():
    _seed_trasa_extra_block()

    call_command("seed_british_school_2026_08")

    prevadzka = Prevadzka.objects.get(nazov="British School")
    route = prevadzka.delivery_route
    assert route is not None
    assert route.vydaj == Vydaj.C
    assert route.block.name == "Trasa extra"


@pytest.mark.django_db
def test_seed_british_school_warns_when_trasa_extra_is_missing():
    stdout = StringIO()

    call_command("seed_british_school_2026_08", stdout=stdout)

    assert "blok 'Trasa extra' neexistuje" in stdout.getvalue()
    prevadzka = Prevadzka.objects.get(nazov="British School")
    assert prevadzka.delivery_route is None


@pytest.mark.django_db
def test_seed_british_school_is_idempotent():
    _seed_trasa_extra_block()
    call_command("seed_british_school_2026_08")
    first_state = {
        "celky": list(Celok.objects.order_by("pk").values()),
        "prevadzky": list(Prevadzka.objects.order_by("pk").values()),
        "connections": list(EdupageConnection.objects.order_by("pk").values()),
        "routes": list(DeliveryRoute.objects.order_by("pk").values()),
    }

    call_command("seed_british_school_2026_08")

    second_state = {
        "celky": list(Celok.objects.order_by("pk").values()),
        "prevadzky": list(Prevadzka.objects.order_by("pk").values()),
        "connections": list(EdupageConnection.objects.order_by("pk").values()),
        "routes": list(DeliveryRoute.objects.order_by("pk").values()),
    }
    assert second_state == first_state
    assert (
        EdupageConnection.objects.filter(mealsguest_url=BRITISH_SCHOOL_URL).count() == 1
    )
    assert DeliveryRoute.objects.filter(name="British School").count() == 1


@pytest.mark.django_db
def test_seed_british_school_dry_run_rolls_back():
    _seed_trasa_extra_block()

    call_command("seed_british_school_2026_08", "--dry-run")

    assert not Celok.objects.filter(nazov="British School").exists()
    assert not EdupageConnection.objects.filter(
        mealsguest_url=BRITISH_SCHOOL_URL
    ).exists()
    assert not DeliveryRoute.objects.filter(name="British School").exists()

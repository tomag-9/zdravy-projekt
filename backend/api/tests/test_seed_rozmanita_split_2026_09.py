from io import StringIO

import pytest
from django.core.management import call_command

from api.models import Celok, EdupageConnection, Prevadzka


def _seed_existing_facility() -> None:
    celok = Celok.objects.create(nazov="Rozmanitá")
    connection = EdupageConnection.objects.create(
        name="Rozmanitá",
        mealsguest_url="https://rozmanita.edupage.org/menu/mealsGuest?id=test",
    )
    Prevadzka.objects.create(
        celok=celok,
        nazov="MŠ Rozmanitá",
        edupage_connection=connection,
        edupage_match="",
    )
    Prevadzka.objects.create(celok=celok, nazov="Rozmanita Škola")
    return connection


@pytest.mark.django_db
def test_seed_rozmanita_split_links_skola_and_sets_matches():
    connection = _seed_existing_facility()

    call_command("seed_rozmanita_split_2026_09")

    celok = Celok.objects.get(nazov="Rozmanitá")
    ms = celok.prevadzky.get(nazov="MŠ Rozmanitá")
    zs = celok.prevadzky.get(nazov="Rozmanita Škola")

    assert ms.edupage_connection == connection
    assert ms.edupage_match == "MŠ"
    assert zs.edupage_connection == connection
    assert zs.edupage_match == "ZŠ; Dosp"


@pytest.mark.django_db
def test_seed_rozmanita_split_is_idempotent():
    _seed_existing_facility()

    call_command("seed_rozmanita_split_2026_09")
    first_state = list(Prevadzka.objects.order_by("pk").values())

    call_command("seed_rozmanita_split_2026_09")
    second_state = list(Prevadzka.objects.order_by("pk").values())

    assert first_state == second_state


@pytest.mark.django_db
def test_seed_rozmanita_split_warns_when_ms_missing_connection():
    celok = Celok.objects.create(nazov="Rozmanitá")
    Prevadzka.objects.create(celok=celok, nazov="MŠ Rozmanitá")
    Prevadzka.objects.create(celok=celok, nazov="Rozmanita Škola")
    stdout = StringIO()

    call_command("seed_rozmanita_split_2026_09", stdout=stdout)

    assert (
        "MŠ Rozmanitá: prevádzka alebo EduPage spojenie chýba, preskakujem"
        in stdout.getvalue()
    )
    zs = celok.prevadzky.get(nazov="Rozmanita Škola")
    assert zs.edupage_connection is None


@pytest.mark.django_db
def test_seed_rozmanita_split_warns_when_celok_missing():
    stdout = StringIO()

    call_command("seed_rozmanita_split_2026_09", stdout=stdout)

    assert "Rozmanitá: celok neexistuje, preskakujem" in stdout.getvalue()

from io import StringIO

import pytest
from django.core.management import call_command

from api.management.commands.seed_skolicka_zs_2026_09 import SKOLICKA_URL
from api.models import Celok, EdupageConnection, Prevadzka


def _seed_existing_facility() -> None:
    celok = Celok.objects.create(nazov="Školička")
    Prevadzka.objects.create(celok=celok, nazov="Školička 1.stupeň")
    Prevadzka.objects.create(celok=celok, nazov="Školička 2. stupeň")


@pytest.mark.django_db
def test_seed_skolicka_zs_links_facility():
    _seed_existing_facility()

    call_command("seed_skolicka_zs_2026_09")

    connection = EdupageConnection.objects.get(mealsguest_url=SKOLICKA_URL)

    celok = Celok.objects.get(nazov="Školička")
    assert celok.zdroj_objednavok == Celok.ZdrojObjednavok.EDUPAGE

    prvy = celok.prevadzky.get(nazov="Školička 1.stupeň")
    druhy = celok.prevadzky.get(nazov="Školička 2. stupeň")
    assert prvy.edupage_connection == connection
    assert prvy.edupage_match == "1.stupeň"
    assert druhy.edupage_connection == connection
    assert druhy.edupage_match == "2.stupeň"


@pytest.mark.django_db
def test_seed_skolicka_zs_is_idempotent():
    _seed_existing_facility()

    call_command("seed_skolicka_zs_2026_09")
    first_state = {
        "celky": list(Celok.objects.order_by("pk").values()),
        "prevadzky": list(Prevadzka.objects.order_by("pk").values()),
        "connections": list(EdupageConnection.objects.order_by("pk").values()),
    }

    call_command("seed_skolicka_zs_2026_09")
    second_state = {
        "celky": list(Celok.objects.order_by("pk").values()),
        "prevadzky": list(Prevadzka.objects.order_by("pk").values()),
        "connections": list(EdupageConnection.objects.order_by("pk").values()),
    }

    assert second_state == first_state
    assert EdupageConnection.objects.filter(mealsguest_url=SKOLICKA_URL).count() == 1


@pytest.mark.django_db
def test_seed_skolicka_zs_warns_and_continues_when_celok_missing():
    stdout = StringIO()

    call_command("seed_skolicka_zs_2026_09", stdout=stdout)

    assert "Školička: celok neexistuje, prepojenie preskakujem" in stdout.getvalue()
    assert EdupageConnection.objects.filter(mealsguest_url=SKOLICKA_URL).exists()


@pytest.mark.django_db
def test_seed_skolicka_zs_warns_and_continues_when_prevadzka_missing():
    celok = Celok.objects.create(nazov="Školička")
    Prevadzka.objects.create(celok=celok, nazov="Školička 1.stupeň")
    stdout = StringIO()

    call_command("seed_skolicka_zs_2026_09", stdout=stdout)

    assert (
        "Školička 2. stupeň: prevádzka neexistuje, prepojenie preskakujem"
        in stdout.getvalue()
    )
    prvy = celok.prevadzky.get(nazov="Školička 1.stupeň")
    assert prvy.edupage_match == "1.stupeň"

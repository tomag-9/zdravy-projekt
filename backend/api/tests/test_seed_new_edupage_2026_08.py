from io import StringIO

import pytest
from django.core.management import call_command

from api.management.commands.seed_new_edupage_2026_08 import (
    CVERNICKA_URL,
    MONTESSORI_URL,
)
from api.models import Celok, EdupageConnection, Prevadzka


def _facility(nazov: str) -> tuple[Celok, Prevadzka]:
    celok = Celok.objects.create(nazov=nazov)
    prevadzka = Prevadzka.objects.create(celok=celok, nazov=nazov)
    return celok, prevadzka


def _seed_existing_facilities() -> None:
    for nazov in [
        "SZŠ FAN",
        "MŠ Prameň",
        "Cvernička",
        "MŠ Dobrodružstvo",
        "ZŠ Dobrodružstvo",
        "Montesori škôlka",
        "montesori škola",
    ]:
        _facility(nazov)

    EdupageConnection.objects.create(
        name="SZŠ FAN",
        mealsguest_url="https://szsfan.edupage.org/menu/mealsGuest?id=test",
    )
    EdupageConnection.objects.create(
        name="MŠ Prameň",
        mealsguest_url="https://skolkapramienok.edupage.org/menu/mealsGuest?id=test",
    )
    dobrodruzstvo_connection = EdupageConnection.objects.create(
        name="Dobrodružstvo",
        mealsguest_url="https://dobrodruzstvo.edupage.org/menu/mealsGuest?id=Gxem3jq",
    )
    ms_dobrodruzstvo = Prevadzka.objects.get(nazov="MŠ Dobrodružstvo")
    ms_dobrodruzstvo.edupage_connection = dobrodruzstvo_connection
    ms_dobrodruzstvo.edupage_match = ""
    ms_dobrodruzstvo.save(update_fields=["edupage_connection", "edupage_match"])


@pytest.mark.django_db
def test_seed_new_edupage_renames_and_links_existing_facilities():
    _seed_existing_facilities()

    call_command("seed_new_edupage_2026_08")

    assert not Celok.objects.filter(nazov__in=["SZŠ FAN", "MŠ Prameň"]).exists()
    assert not Prevadzka.objects.filter(nazov__in=["SZŠ FAN", "MŠ Prameň"]).exists()
    assert not EdupageConnection.objects.filter(
        name__in=["SZŠ FAN", "MŠ Prameň"]
    ).exists()
    assert Celok.objects.filter(nazov="Fantastická Škola").exists()
    assert Prevadzka.objects.filter(nazov="Fantastická Škola").exists()
    assert EdupageConnection.objects.filter(name="Fantastická Škola").exists()
    assert Celok.objects.filter(nazov="Pramienok").exists()
    assert Prevadzka.objects.filter(nazov="Pramienok").exists()
    assert EdupageConnection.objects.filter(name="Pramienok").exists()

    cvernicka = Celok.objects.get(nazov="Cvernička")
    cvernicka_prevadzka = cvernicka.prevadzky.get(nazov="Cvernička")
    assert cvernicka.zdroj_objednavok == Celok.ZdrojObjednavok.EDUPAGE
    assert cvernicka_prevadzka.edupage_connection.mealsguest_url == CVERNICKA_URL
    assert cvernicka_prevadzka.edupage_match == ""

    ms_dobrodruzstvo = Celok.objects.get(nazov="MŠ Dobrodružstvo")
    ms_dobrodruzstvo_prevadzka = ms_dobrodruzstvo.prevadzky.get(
        nazov="MŠ Dobrodružstvo"
    )
    zs_dobrodruzstvo = Celok.objects.get(nazov="ZŠ Dobrodružstvo")
    zs_dobrodruzstvo_prevadzka = zs_dobrodruzstvo.prevadzky.get(
        nazov="ZŠ Dobrodružstvo"
    )
    assert ms_dobrodruzstvo_prevadzka.edupage_match == "MŠ"
    assert (
        zs_dobrodruzstvo_prevadzka.edupage_connection
        == ms_dobrodruzstvo_prevadzka.edupage_connection
    )
    assert zs_dobrodruzstvo_prevadzka.edupage_match == "1.st; 2.st; Dospelý"
    assert zs_dobrodruzstvo.zdroj_objednavok == Celok.ZdrojObjednavok.EDUPAGE

    for nazov, match in [
        ("Montesori škôlka", "MŠ"),
        ("montesori škola", "ZŠ"),
    ]:
        celok = Celok.objects.get(nazov=nazov)
        prevadzka = celok.prevadzky.get(nazov=nazov)
        assert celok.zdroj_objednavok == Celok.ZdrojObjednavok.EDUPAGE
        assert prevadzka.edupage_connection.mealsguest_url == MONTESSORI_URL
        assert prevadzka.edupage_match == match

    walldom = Celok.objects.get(nazov="Walldom")
    walldom_prevadzka = walldom.prevadzky.get(nazov="Walldom")
    assert walldom.zdroj_objednavok == Celok.ZdrojObjednavok.APP
    assert walldom_prevadzka.edupage_connection is None


@pytest.mark.django_db
def test_seed_new_edupage_is_idempotent():
    _seed_existing_facilities()

    call_command("seed_new_edupage_2026_08")
    first_state = {
        "celky": list(Celok.objects.order_by("pk").values()),
        "prevadzky": list(Prevadzka.objects.order_by("pk").values()),
        "connections": list(EdupageConnection.objects.order_by("pk").values()),
    }

    call_command("seed_new_edupage_2026_08")

    second_state = {
        "celky": list(Celok.objects.order_by("pk").values()),
        "prevadzky": list(Prevadzka.objects.order_by("pk").values()),
        "connections": list(EdupageConnection.objects.order_by("pk").values()),
    }
    assert second_state == first_state
    assert EdupageConnection.objects.filter(mealsguest_url=CVERNICKA_URL).count() == 1
    assert EdupageConnection.objects.filter(mealsguest_url=MONTESSORI_URL).count() == 1


@pytest.mark.django_db
def test_seed_new_edupage_warns_and_continues_when_celok_is_missing():
    _seed_existing_facilities()
    cvernicka = Celok.objects.get(nazov="Cvernička")
    cvernicka.prevadzky.all().delete()
    cvernicka.delete()
    zs_dobrodruzstvo = Celok.objects.get(nazov="ZŠ Dobrodružstvo")
    zs_dobrodruzstvo.prevadzky.all().delete()
    zs_dobrodruzstvo.delete()
    stdout = StringIO()

    call_command("seed_new_edupage_2026_08", stdout=stdout)

    assert "Cvernička: celok neexistuje, prepojenie preskakujem" in stdout.getvalue()
    assert (
        "ZŠ Dobrodružstvo: celok neexistuje, prepojenie preskakujem"
        in stdout.getvalue()
    )
    assert Prevadzka.objects.get(nazov="MŠ Dobrodružstvo").edupage_match == "MŠ"
    assert Celok.objects.filter(nazov="Walldom").exists()

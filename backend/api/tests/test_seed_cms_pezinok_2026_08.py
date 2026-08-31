from io import StringIO

import pytest
from django.core.management import call_command

from api.management.commands.seed_cms_pezinok_2026_08 import CMS_PEZINOK_URL
from api.models import Celok, EdupageConnection, Prevadzka


def _seed_manually_created_facility() -> None:
    celok = Celok.objects.create(
        nazov="CMŠ Pezinok", zdroj_objednavok=Celok.ZdrojObjednavok.EDUPAGE
    )
    Prevadzka.objects.create(
        celok=celok, nazov="CMŠ Pezinok", edupage_match=CMS_PEZINOK_URL
    )


@pytest.mark.django_db
def test_seed_cms_pezinok_links_facility_to_edupage():
    _seed_manually_created_facility()

    call_command("seed_cms_pezinok_2026_08")

    celok = Celok.objects.get(nazov="CMŠ Pezinok")
    prevadzka = celok.prevadzky.get(nazov="CMŠ Pezinok")
    assert celok.zdroj_objednavok == Celok.ZdrojObjednavok.EDUPAGE
    assert prevadzka.edupage_connection.mealsguest_url == CMS_PEZINOK_URL
    assert prevadzka.edupage_match == ""


@pytest.mark.django_db
def test_seed_cms_pezinok_is_idempotent():
    _seed_manually_created_facility()

    call_command("seed_cms_pezinok_2026_08")
    first_state = {
        "celky": list(Celok.objects.order_by("pk").values()),
        "prevadzky": list(Prevadzka.objects.order_by("pk").values()),
        "connections": list(EdupageConnection.objects.order_by("pk").values()),
    }

    call_command("seed_cms_pezinok_2026_08")
    second_state = {
        "celky": list(Celok.objects.order_by("pk").values()),
        "prevadzky": list(Prevadzka.objects.order_by("pk").values()),
        "connections": list(EdupageConnection.objects.order_by("pk").values()),
    }
    assert second_state == first_state
    assert EdupageConnection.objects.filter(mealsguest_url=CMS_PEZINOK_URL).count() == 1


@pytest.mark.django_db
def test_seed_cms_pezinok_warns_and_skips_when_celok_missing():
    stdout = StringIO()

    call_command("seed_cms_pezinok_2026_08", stdout=stdout)

    assert "CMŠ Pezinok: celok neexistuje, preskakujem" in stdout.getvalue()
    assert not EdupageConnection.objects.filter(mealsguest_url=CMS_PEZINOK_URL).exists()

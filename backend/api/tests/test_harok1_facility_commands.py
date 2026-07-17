import datetime
from pathlib import Path

import pytest
from django.contrib.auth.models import User
from django.core.management import call_command
from django.utils import timezone
from openpyxl import Workbook

from api.models import Celok, DailyOrder, Prevadzka, UserProfile


def _workbook(path: Path, rows: list[list[object]]) -> Path:
    wb = Workbook()
    ws = wb.active
    ws.title = "Hárok1"
    ws.append(["dátum", "Polievka", "Hlavné", "Pečivo", "Nátierka", None, None, None])
    for row in rows:
        ws.append(row)
    wb.save(path)
    return path


@pytest.mark.django_db
def test_seed_facilities_keeps_duplicate_names_as_separate_logins(tmp_path):
    path = _workbook(
        tmp_path / "harok1.xlsx",
        [
            ["Škôlkáreň", 3400, 1700, 17, 425, None, None, None],
            ["Komárovská 64, Podunajské", None, None, None, None, None, None, None],
            [17, None, None, None, None, None, None, None],
            ["Škôlkáreň", 4200, 2100, 21, 525, None, None, None],
            ["PATRÓNKA", None, None, None, None, None, None, None],
            [21, None, None, None, None, None, None, None],
        ],
    )

    call_command("seed_facilities_from_harok1", "--workbook", str(path))
    call_command("seed_facilities_from_harok1", "--workbook", str(path))

    assert set(Celok.objects.values_list("nazov", flat=True)) == {
        "Škôlkáreň (Komárovská 64, Podunajské)",
        "Škôlkáreň (PATRÓNKA)",
    }
    assert set(Prevadzka.objects.values_list("nazov", flat=True)) == {
        "Škôlkáreň (Komárovská 64, Podunajské)",
        "Škôlkáreň (PATRÓNKA)",
    }
    assert set(UserProfile.objects.values_list("company_name", flat=True)) == {
        "Škôlkáreň (Komárovská 64, Podunajské)",
        "Škôlkáreň (PATRÓNKA)",
    }
    assert User.objects.count() == 2


@pytest.mark.django_db
def test_seed_facilities_upgrades_old_duplicate_seed_by_address(tmp_path):
    old = Celok.objects.create(nazov="Škôlkáreň", adresa="Komárovská 64, Podunajské")
    Prevadzka.objects.create(
        celok=old, nazov="Škôlkáreň", adresa="Komárovská 64, Podunajské"
    )
    user = User.objects.create_user(username="old@example.com", email="old@example.com")
    UserProfile.objects.create(user=user, company_name="Škôlkáreň", celok=old)

    path = _workbook(
        tmp_path / "harok1.xlsx",
        [
            ["Škôlkáreň", 3400, 1700, 17, 425, None, None, None],
            ["Komárovská 64, Podunajské", None, None, None, None, None, None, None],
            [17, None, None, None, None, None, None, None],
            ["Škôlkáreň", 4200, 2100, 21, 525, None, None, None],
            ["PATRÓNKA", None, None, None, None, None, None, None],
            [21, None, None, None, None, None, None, None],
        ],
    )

    call_command("seed_facilities_from_harok1", "--workbook", str(path))

    assert set(Celok.objects.values_list("nazov", flat=True)) == {
        "Škôlkáreň (Komárovská 64, Podunajské)",
        "Škôlkáreň (PATRÓNKA)",
    }
    user.profile.refresh_from_db()
    assert user.profile.company_name == "Škôlkáreň (Komárovská 64, Podunajské)"


@pytest.mark.django_db
def test_rename_harok1_renames_single_prevadzka_with_different_old_name(
    tmp_path, monkeypatch
):
    celok = Celok.objects.create(nazov="MŠ Zdravé Bruško")
    prevadzka = Prevadzka.objects.create(celok=celok, nazov="Starý interný názov")
    user = User.objects.create_user(username="zb@example.com", email="zb@example.com")
    profile = UserProfile.objects.create(
        user=user, company_name="Starý interný názov", celok=celok
    )
    profile.prevadzky.add(prevadzka)

    alias_path = tmp_path / "aliases.json"
    alias_path.write_text('{"MŠ Zdravé Bruško": "Deutsche schule"}', encoding="utf-8")
    monkeypatch.setattr(
        "api.management.commands.rename_facilities_from_harok1.ALIAS_MAP",
        alias_path,
    )
    path = _workbook(
        tmp_path / "harok1.xlsx",
        [
            ["Deutsche schule", 200, 100, 1, 25, None, None, None],
            ["Ulica 1", None, None, None, None, None, None, None],
            [1, None, None, None, None, None, None, None],
        ],
    )

    call_command("rename_facilities_from_harok1", "--workbook", str(path))

    celok.refresh_from_db()
    prevadzka.refresh_from_db()
    profile.refresh_from_db()
    assert celok.nazov == "Deutsche schule"
    assert prevadzka.nazov == "Deutsche schule"
    assert profile.company_name == "Deutsche schule"


@pytest.mark.django_db
def test_rename_harok1_does_not_rewrite_unrelated_profile_subset(tmp_path, monkeypatch):
    celok = Celok.objects.create(nazov="MŠ Zdravé Bruško")
    target_prevadzka = Prevadzka.objects.create(celok=celok, nazov="MŠ Zdravé Bruško")
    other_prevadzka = Prevadzka.objects.create(celok=celok, nazov="Iná")
    user = User.objects.create_user(username="zb@example.com", email="zb@example.com")
    profile = UserProfile.objects.create(
        user=user, company_name="Iný login", celok=celok
    )
    profile.prevadzky.add(other_prevadzka)

    alias_path = tmp_path / "aliases.json"
    alias_path.write_text('{"MŠ Zdravé Bruško": "Deutsche schule"}', encoding="utf-8")
    monkeypatch.setattr(
        "api.management.commands.rename_facilities_from_harok1.ALIAS_MAP",
        alias_path,
    )
    path = _workbook(
        tmp_path / "harok1.xlsx",
        [
            ["Deutsche schule", 200, 100, 1, 25, None, None, None],
            ["Ulica 1", None, None, None, None, None, None, None],
            [1, None, None, None, None, None, None, None],
        ],
    )

    call_command("rename_facilities_from_harok1", "--workbook", str(path))

    profile.refresh_from_db()
    target_prevadzka.refresh_from_db()
    assert profile.company_name == "Iný login"
    assert target_prevadzka.nazov == "MŠ Zdravé Bruško"


@pytest.mark.django_db
def test_seed_zdrave_brusko_deletes_fake_aggregate_school():
    stary = Celok.objects.create(nazov="MŠ Zdravé Bruško", zdroj_objednavok="edupage")
    stara_prevadzka = Prevadzka.objects.create(celok=stary, nazov="MŠ Zdravé Bruško")
    user = User.objects.create_user(
        username="zdravebrusko@edupage.local",
        email="zdravebrusko@edupage.local",
    )
    UserProfile.objects.create(
        user=user,
        company_name="MŠ Zdravé Bruško",
        celok=stary,
        is_edupage=True,
    )
    dnes = timezone.localdate()
    historicka = DailyOrder.objects.create(
        user=user,
        prevadzka=stara_prevadzka,
        date=dnes - datetime.timedelta(days=1),
        data={"lunch": {"Škôlka": {"menuCounts": {"A": 1}, "diets": {}}}},
    )
    duplicitna = DailyOrder.objects.create(
        user=user,
        prevadzka=stara_prevadzka,
        date=dnes,
        data={"lunch": {"Škôlka": {"menuCounts": {"A": 2}, "diets": {}}}},
    )

    call_command("seed_zdrave_brusko")

    assert not Celok.objects.filter(pk=stary.pk).exists()
    assert not Prevadzka.objects.filter(pk=stara_prevadzka.pk).exists()
    assert not DailyOrder.objects.filter(pk=historicka.pk).exists()
    assert not DailyOrder.objects.filter(pk=duplicitna.pk).exists()
    assert set(user.profile.prevadzky.values_list("nazov", flat=True)) == {
        "Deutsche schule",
        "SŠ VETERINÁRNA",
        "ZŠ Malokarpatská",
        "MŠ Heyrovského 4",
        "MŠ Malokarpatké námestie 6",
    }

import csv

import pytest
from django.contrib.auth.models import User
from django.core import management

from api.models import (
    Celok,
    EdupageConnection,
    Prevadzka,
    ProfileCelokAccess,
    ProfilePrevadzkaAccess,
    UserProfile,
)


def _credentials_csv(tmp_path, rows):
    path = tmp_path / "prevadzky.csv"
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=["meno prevadzky", "email", "heslo"],
        )
        writer.writeheader()
        writer.writerows(rows)
    return path


@pytest.mark.django_db
def test_import_creates_one_login_for_multi_prevadzka_celok(tmp_path, api_client):
    celok = Celok.objects.create(nazov="Bystrá")
    first = Prevadzka.objects.create(celok=celok, nazov="BYSTRÁ 1 Slnečnice")
    second = Prevadzka.objects.create(celok=celok, nazov="BYSTRÁ 2 Slnečnice")
    path = _credentials_csv(
        tmp_path,
        [
            {
                "meno prevadzky": first.nazov,
                "email": "first@example.com",
                "heslo": "first-password",
            },
            {
                "meno prevadzky": second.nazov,
                "email": "second@example.com",
                "heslo": "second-password",
            },
        ],
    )

    management.call_command("import_operation_logins", str(path))

    user = User.objects.get(username="first@example.com")
    assert user.check_password("first-password")
    assert not User.objects.filter(username="second@example.com").exists()
    assert set(user.profile.dostupne_prevadzky()) == {first, second}
    assert set(
        ProfilePrevadzkaAccess.objects.filter(profile=user.profile).values_list(
            "prevadzka_id", flat=True
        )
    ) == {first.id, second.id}
    assert user.groups.filter(name="Client").exists()

    login = api_client.post(
        "/api/token/",
        {"email": "first@example.com", "password": "first-password"},
        format="json",
    )
    assert login.status_code == 200
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
    available = api_client.get("/api/prevadzky/")
    assert available.status_code == 200
    assert {row["nazov"] for row in available.json()} == {
        "BYSTRÁ 1 Slnečnice",
        "BYSTRÁ 2 Slnečnice",
    }

    user.set_password("client-changed-password")
    user.save(update_fields=["password"])
    management.call_command("import_operation_logins", str(path))
    user.refresh_from_db()
    assert user.check_password("client-changed-password")
    assert User.objects.filter(username__endswith="@example.com").count() == 1


@pytest.mark.django_db
def test_import_never_assigns_login_to_edupage_prevadzka(tmp_path):
    connection = EdupageConnection.objects.create(
        name="Prameň",
        mealsguest_url="https://example.edupage.org/menu/mealsGuest?id=test",
    )
    celok = Celok.objects.create(
        nazov="Pramienok",
        zdroj_objednavok=Celok.ZdrojObjednavok.EDUPAGE,
    )
    prevadzka = Prevadzka.objects.create(
        celok=celok,
        # Produkčný bootstrap premenuje pôvodné „MŠ Prameň" na alias z rosteru.
        # Import musí vedieť nájsť prevádzku pred aj po tomto rename kroku.
        nazov="Pramienok",
        edupage_connection=connection,
    )
    existing = User.objects.create_user(
        username="skolkapramienok@edupage.local",
        email="skolkapramienok@edupage.local",
        password="original-password",
    )
    profile = UserProfile(user=existing, company_name=celok.nazov)
    profile._skip_default_facility = True
    profile.save()
    ProfileCelokAccess.objects.create(profile=profile, celok=celok)
    original_hash = existing.password
    path = _credentials_csv(
        tmp_path,
        [
            {
                "meno prevadzky": "Pramienok",
                "email": "should-not-exist@example.com",
                "heslo": "new-password",
            }
        ],
    )

    management.call_command("import_operation_logins", str(path))

    existing.refresh_from_db()
    assert existing.password == original_hash
    assert list(existing.profile.dostupne_prevadzky()) == [prevadzka]
    assert not User.objects.filter(username="should-not-exist@example.com").exists()


@pytest.mark.django_db
def test_import_dry_run_rolls_back_users_and_access(tmp_path):
    celok = Celok.objects.create(nazov="Pohodička")
    Prevadzka.objects.create(celok=celok, nazov="pohodička 1")
    Prevadzka.objects.create(celok=celok, nazov="pohodička 2")
    path = _credentials_csv(
        tmp_path,
        [
            {
                "meno prevadzky": "pohodička 1",
                "email": "pohodicka@example.com",
                "heslo": "password",
            },
            {
                "meno prevadzky": "pohodička 2",
                "email": "pohodicka-2@example.com",
                "heslo": "password-2",
            },
        ],
    )

    management.call_command("import_operation_logins", str(path), "--dry-run")

    assert not User.objects.exists()
    assert not ProfilePrevadzkaAccess.objects.exists()

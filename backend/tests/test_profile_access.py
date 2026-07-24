import importlib

import pytest
from django.apps import apps
from django.contrib.auth.models import User

from api.models import (
    Celok,
    Prevadzka,
    ProfileCelokAccess,
    ProfilePrevadzkaAccess,
    UserProfile,
)


def create_profile(email, celok):
    user = User.objects.create_user(username=email, email=email)
    return UserProfile.objects.create(user=user, company_name=email, celok=celok)


@pytest.mark.django_db
def test_empty_legacy_selection_creates_whole_celok_access():
    celok = Celok.objects.create(nazov="Celok")
    active = Prevadzka.objects.create(celok=celok, nazov="Aktívna")
    Prevadzka.objects.create(celok=celok, nazov="Neaktívna", is_active=False)

    profile = create_profile("whole@example.com", celok)

    assert list(profile.celok_accesses.values_list("celok_id", flat=True)) == [celok.id]
    assert not profile.prevadzka_accesses.exists()
    assert list(profile.dostupne_prevadzky()) == [active]


@pytest.mark.django_db
def test_legacy_selection_switches_to_specific_access_and_clear_restores_celok():
    celok = Celok.objects.create(nazov="Celok")
    first = Prevadzka.objects.create(celok=celok, nazov="Prvá")
    second = Prevadzka.objects.create(celok=celok, nazov="Druhá")
    profile = create_profile("specific@example.com", celok)

    profile.prevadzky.add(second)

    assert not profile.celok_accesses.exists()
    assert list(profile.prevadzka_accesses.values_list("prevadzka_id", flat=True)) == [
        second.id
    ]
    assert list(profile.dostupne_prevadzky()) == [second]

    profile.prevadzky.clear()

    assert list(profile.celok_accesses.values_list("celok_id", flat=True)) == [celok.id]
    assert not profile.prevadzka_accesses.exists()
    assert set(profile.dostupne_prevadzky()) == {first, second}


@pytest.mark.django_db
def test_specific_access_can_span_multiple_celky():
    first_celok = Celok.objects.create(nazov="Prvý")
    second_celok = Celok.objects.create(nazov="Druhý")
    first = Prevadzka.objects.create(celok=first_celok, nazov="Prvá")
    second = Prevadzka.objects.create(celok=second_celok, nazov="Druhá")
    profile = create_profile("cross@example.com", first_celok)

    profile.prevadzky.set([first, second])

    assert not profile.celok_accesses.exists()
    assert set(profile.dostupne_prevadzky()) == {first, second}


@pytest.mark.django_db
def test_profile_without_any_access_returns_no_prevadzky():
    celok = Celok.objects.create(nazov="Celok")
    profile = create_profile("none@example.com", celok)
    UserProfile.objects.filter(pk=profile.pk).update(celok=None)
    profile.refresh_from_db()
    profile.celok_accesses.all().delete()

    assert not profile.dostupne_prevadzky().exists()


@pytest.mark.django_db
def test_migration_backfills_legacy_access():
    celok = Celok.objects.create(nazov="Celok")
    whole = create_profile("migration-whole@example.com", celok)
    selected = create_profile("migration-selected@example.com", celok)
    prevadzka = Prevadzka.objects.create(celok=celok, nazov="Vybraná")
    selected.prevadzky.add(prevadzka)
    ProfileCelokAccess.objects.all().delete()
    ProfilePrevadzkaAccess.objects.all().delete()

    migration = importlib.import_module("api.migrations.0056_explicit_profile_access")
    migration.forwards(apps, None)

    assert ProfileCelokAccess.objects.filter(
        profile=whole,
        celok=celok,
    ).exists()
    assert ProfilePrevadzkaAccess.objects.filter(
        profile=selected,
        prevadzka=prevadzka,
    ).exists()

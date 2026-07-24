import pytest
from django.contrib.auth.models import User

from api.models import (
    Celok,
    Prevadzka,
    ProfileCelokAccess,
    ProfilePrevadzkaAccess,
    UserProfile,
)
from api.serializers_facilities import AdminCelokSerializer


def create_profile(email):
    user = User.objects.create_user(username=email, email=email)
    profile = UserProfile(user=user, company_name=email)
    profile._skip_default_facility = True
    profile.save()
    return profile


@pytest.mark.django_db
def test_whole_celok_access_exposes_active_prevadzky():
    celok = Celok.objects.create(nazov="Celok")
    active = Prevadzka.objects.create(celok=celok, nazov="Aktívna")
    Prevadzka.objects.create(celok=celok, nazov="Neaktívna", is_active=False)

    profile = create_profile("whole@example.com")
    ProfileCelokAccess.objects.create(profile=profile, celok=celok)

    assert list(profile.celok_accesses.values_list("celok_id", flat=True)) == [celok.id]
    assert not profile.prevadzka_accesses.exists()
    assert list(profile.dostupne_prevadzky()) == [active]


@pytest.mark.django_db
def test_specific_access_restricts_profile_to_selected_prevadzka():
    celok = Celok.objects.create(nazov="Celok")
    first = Prevadzka.objects.create(celok=celok, nazov="Prvá")
    second = Prevadzka.objects.create(celok=celok, nazov="Druhá")
    profile = create_profile("specific@example.com")
    ProfilePrevadzkaAccess.objects.create(profile=profile, prevadzka=second)

    assert not profile.celok_accesses.exists()
    assert list(profile.prevadzka_accesses.values_list("prevadzka_id", flat=True)) == [
        second.id
    ]
    assert list(profile.dostupne_prevadzky()) == [second]


@pytest.mark.django_db
def test_specific_access_can_span_multiple_celky():
    first_celok = Celok.objects.create(nazov="Prvý")
    second_celok = Celok.objects.create(nazov="Druhý")
    first = Prevadzka.objects.create(celok=first_celok, nazov="Prvá")
    second = Prevadzka.objects.create(celok=second_celok, nazov="Druhá")
    profile = create_profile("cross@example.com")
    ProfilePrevadzkaAccess.objects.bulk_create(
        [
            ProfilePrevadzkaAccess(profile=profile, prevadzka=first),
            ProfilePrevadzkaAccess(profile=profile, prevadzka=second),
        ]
    )

    assert not profile.celok_accesses.exists()
    assert set(profile.dostupne_prevadzky()) == {first, second}


@pytest.mark.django_db
def test_profile_without_any_access_returns_no_prevadzky():
    profile = create_profile("none@example.com")

    assert not profile.dostupne_prevadzky().exists()


@pytest.mark.django_db
def test_primary_celok_is_only_returned_when_unambiguous():
    first = Celok.objects.create(nazov="Prvý")
    second = Celok.objects.create(nazov="Druhý")
    profile = create_profile("primary@example.com")
    ProfileCelokAccess.objects.create(profile=profile, celok=first)

    assert profile.primary_celok() == first

    ProfileCelokAccess.objects.create(profile=profile, celok=second)

    assert profile.primary_celok() is None


@pytest.mark.django_db
def test_whole_celok_access_wins_over_mixed_specific_access_in_admin_payload():
    celok = Celok.objects.create(nazov="Celok")
    prevadzka = Prevadzka.objects.create(celok=celok, nazov="Prevádzka")
    profile = create_profile("mixed@example.com")
    ProfileCelokAccess.objects.create(profile=profile, celok=celok)
    ProfilePrevadzkaAccess.objects.create(profile=profile, prevadzka=prevadzka)

    payload = AdminCelokSerializer(celok).data

    assert payload["logins"][0]["prevadzka_ids"] == []

import pytest
from django.contrib.auth.models import User

from api.models import Celok, Prevadzka, ProfileCelokAccess, UserProfile


@pytest.fixture
def canonical_profile(db):
    user = User.objects.create_user(
        username="canonical@example.com",
        email="canonical@example.com",
    )
    celok = Celok.objects.create(
        nazov="Canonical",
        billing_name="Canonical billing",
        ico="12345678",
        dic="2020202020",
    )
    profile = UserProfile(user=user)
    profile._skip_default_facility = True
    profile.save()
    ProfileCelokAccess.objects.create(profile=profile, celok=celok)
    return user, profile, celok


@pytest.mark.django_db
def test_profile_api_reads_billing_from_celok(api_client, canonical_profile):
    user, _, _ = canonical_profile
    api_client.force_authenticate(user=user)

    response = api_client.get("/api/user/profile/")

    assert response.status_code == 200
    assert response.json()["billing_name"] == "Canonical billing"
    assert response.json()["ico"] == "12345678"
    assert response.json()["dic"] == "2020202020"
    assert response.json()["profile"]["billing_name"] == "Canonical billing"


@pytest.mark.django_db
def test_profile_api_writes_billing_to_celok(api_client, canonical_profile):
    user, _, celok = canonical_profile
    api_client.force_authenticate(user=user)

    response = api_client.patch(
        "/api/user/profile/",
        {
            "billing_name": "Updated billing",
            "ico": "11111111",
            "dic": "2121212121",
        },
        format="json",
    )

    assert response.status_code == 200
    celok.refresh_from_db()
    assert celok.billing_name == "Updated billing"
    assert celok.ico == "11111111"
    assert celok.dic == "2121212121"


@pytest.mark.django_db
def test_profile_api_does_not_guess_settings_for_multiple_prevadzky(
    api_client, canonical_profile
):
    user, profile, celok = canonical_profile
    Prevadzka.objects.create(celok=celok, nazov="Prvá")
    Prevadzka.objects.create(celok=celok, nazov="Druhá")
    api_client.force_authenticate(user=user)

    response = api_client.get("/api/user/profile/")

    assert response.status_code == 200
    assert response.json()["settings"] == {}
    assert profile.primary_celok() == celok

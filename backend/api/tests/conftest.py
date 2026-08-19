"""Shared pytest fixtures for structured API tests."""

from datetime import date

import pytest
from django.contrib.auth.models import User
from django.core.cache import cache
from rest_framework.test import APIClient


@pytest.fixture(autouse=True)
def clear_cache():
    """Prevent cache leakage between tests (rate-limit related flakes)."""
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    user, created = User.objects.get_or_create(
        username="client@example.com",
        defaults={
            "email": "client@example.com",
        },
    )
    if created:
        user.set_password("client123")
        user.save()
    # Klient bez profilu nemá prevádzku, a teda nemá kam objednávať. V produkcii
    # profil vzniká pri založení klienta, tak ho fixture musí mať tiež.
    from api.models import UserProfile

    UserProfile.objects.get_or_create(
        user=user, defaults={"company_name": "Client Test"}
    )
    return user


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        username="admin@example.com",
        email="admin@example.com",
        password="admin123",
        is_staff=True,
        is_superuser=True,
    )


@pytest.fixture
def authenticated_client(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def admin_client(api_client, admin_user):
    api_client.force_authenticate(user=admin_user)
    return api_client


@pytest.fixture
def plain_admin_user(db):
    """Rola `admin` — teda BEZ sekcií, ktoré #483 presunul na superadmina."""
    from api.models import UserProfile

    user = User.objects.create_user(
        username="plainadmin@example.com",
        email="plainadmin@example.com",
        password="admin123",
        is_staff=True,
    )
    profile = UserProfile(user=user, role=UserProfile.Role.ADMIN)
    profile._skip_default_facility = True
    profile.save()
    return user


@pytest.fixture
def plain_admin_client(api_client, plain_admin_user):
    api_client.force_authenticate(user=plain_admin_user)
    return api_client


@pytest.fixture
def order_payload():
    """Default payload used by integration/e2e order API tests."""
    return {
        "date": date.today().isoformat(),
        "data": {
            "breakfast": {"Dospelý": {"menuCounts": {"A": 1}, "diets": {}}},
            "lunch": {},
            "olovrant": {},
        },
    }

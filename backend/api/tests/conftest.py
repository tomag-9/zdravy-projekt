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
    return user


@pytest.fixture
def admin_user(db):
    user, created = User.objects.get_or_create(
        username="admin@example.com",
        defaults={
            "email": "admin@example.com",
            "is_staff": True,
            "is_superuser": True,
        },
    )
    if created:
        user.set_password("admin123")
        user.save()
    return user


@pytest.fixture
def authenticated_client(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def admin_client(api_client, admin_user):
    api_client.force_authenticate(user=admin_user)
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

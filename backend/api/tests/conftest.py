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
    return User.objects.create_user(
        username="client@example.com",
        email="client@example.com",
        password="client123",
    )


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

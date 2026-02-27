"""
Pytest configuration and fixtures.
"""

import pytest
from django.contrib.auth.models import User
from django.core.cache import cache
from rest_framework.test import APIClient


@pytest.fixture(autouse=True)
def clear_cache():
    """Clear cache before each test to prevent rate limit issues."""
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def api_client():
    """API client fixture."""
    return APIClient()


@pytest.fixture
def user(db):
    """Create a test user."""
    return User.objects.create_user(
        username="client@example.com", password="client123", email="client@example.com"
    )


@pytest.fixture
def other_user(db):
    """Create another test user."""
    return User.objects.create_user(
        username="other@example.com",
        password="otherpassword",
        email="other@example.com",
    )


@pytest.fixture
def admin_user(db):
    """Create an admin user."""
    return User.objects.create_user(
        username="admin@example.com",
        password="admin123",
        email="admin@example.com",
        is_staff=True,
        is_superuser=True,
    )


@pytest.fixture
def authenticated_client(api_client, user):
    """Authenticated API client fixture."""
    api_client.force_authenticate(user=user)
    return api_client

"""
Pytest configuration and fixtures.
"""

import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient


@pytest.fixture
def api_client():
    """API client fixture."""
    return APIClient()


@pytest.fixture
def user(db):
    """Create a test user."""
    return User.objects.create_user(
        username="testuser", password="testpassword", email="test@example.com"
    )


@pytest.fixture
def other_user(db):
    """Create another test user."""
    return User.objects.create_user(
        username="otheruser", password="otherpassword", email="other@example.com"
    )


@pytest.fixture
def authenticated_client(api_client, user):
    """Authenticated API client fixture."""
    api_client.force_authenticate(user=user)
    return api_client

"""
Pytest configuration and fixtures.
"""

import pytest
from rest_framework.test import APIClient


@pytest.fixture
def api_client():
    """API client fixture."""
    return APIClient()


@pytest.fixture
def authenticated_client(api_client, user):
    """Authenticated API client fixture."""
    api_client.force_authenticate(user=user)
    return api_client

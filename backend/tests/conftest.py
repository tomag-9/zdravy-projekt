"""
Pytest configuration and fixtures.
"""

from contextlib import contextmanager

import pytest
from django.contrib.auth.models import User
from django.core.cache import cache
from django.db import connection
from django.test.utils import CaptureQueriesContext
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


@pytest.fixture
def admin_authenticated_client(api_client, admin_user):
    """Admin authenticated API client fixture."""
    api_client.force_authenticate(user=admin_user)
    return api_client


@contextmanager
def assert_max_queries(num: int, using: str = "default", verbose: bool = False):
    """
    Context manager to assert that at most `num` queries are executed.

    Usage:
        with assert_max_queries(5):
            User.objects.all().select_related('profile').prefetch_related('settings')

    Useful for detecting N+1 queries and verifying optimization.
    """
    from django.db import connections

    with CaptureQueriesContext(connections[using]) as context:
        yield

    actual = len(context.captured_queries)
    if actual > num:
        msg = f"Expected at most {num} queries, but {actual} were executed.\n"
        if verbose:
            for i, query in enumerate(context.captured_queries, 1):
                msg += f"\n[Query {i}]:\n{query['sql']}\n"
        raise AssertionError(msg)


@pytest.fixture
def query_counter():
    """Fixture to capture and analyze database queries."""
    return CaptureQueriesContext(connection)


def get_query_count(func, *args, **kwargs):
    """Execute function and return the number of queries it triggered."""
    with CaptureQueriesContext(connection) as context:
        func(*args, **kwargs)
    return len(context.captured_queries)

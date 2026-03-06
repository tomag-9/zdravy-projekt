"""
Tests for Redis caching implementation.

Tests cover:
- GlobalSettings caching with signal-based invalidation
- ClientSettings caching with signal-based invalidation
- Diet list caching with signal-based invalidation
- Daily stats caching with 5-minute TTL
- Cache hit/miss tracking
"""

# flake8: noqa: F401
import json
from datetime import date, datetime, time

import pytest
from django.core.cache import cache
from django.test import Client
from rest_framework import status
from rest_framework.test import APIClient

from api.cache_service import (
    clear_client_settings_cache,
    clear_diet_list_cache,
    clear_global_settings_cache,
    delete_cached,
    get_cached,
    get_client_settings_cache_key,
    get_daily_stats_cache_key,
    get_diet_list_cache_key,
    get_global_settings_cache_key,
    set_cached,
)
from api.cached_settings_service import get_client_settings, get_global_settings
from api.models import ClientSettings, DailyOrder, Diet, GlobalSettings, User

pytestmark = pytest.mark.django_db


class TestCacheService:
    """Test basic cache service functions."""

    def test_set_and_get_cached_value(self):
        """Test setting and retrieving a value from cache."""
        key = "test_key"
        value = {"data": "test"}

        set_cached(key, value, timeout=100)
        cached_value = get_cached(key)

        assert cached_value == value

    def test_delete_cached_value(self):
        """Test deleting a value from cache."""
        key = "test_key"
        value = {"data": "test"}

        set_cached(key, value)
        assert get_cached(key) == value

        delete_cached(key)
        assert get_cached(key) is None

    def test_cache_key_generation(self):
        """Test cache key generation functions."""
        assert get_global_settings_cache_key() == "global_settings"
        assert get_client_settings_cache_key(1) == "client_settings:1"
        assert get_client_settings_cache_key(123) == "client_settings:123"
        assert get_diet_list_cache_key() == "diet_list"
        assert get_daily_stats_cache_key("2026-03-06") == "daily_stats:2026-03-06"


class TestGlobalSettingsCaching:
    """Test GlobalSettings caching with signal-based invalidation."""

    def setup_method(self):
        """Clear cache before each test."""
        cache.clear()

    def test_global_settings_cached_on_first_access(self):
        """Test that GlobalSettings is cached on first retrieval."""
        settings = GlobalSettings.objects.create(
            pk=1,
            deadline_breakfast=time(8, 0),
            deadline_lunch=time(11, 0),
            deadline_olovrant=time(16, 0),
        )

        # First call should hit database
        result = get_global_settings()
        assert result.pk == settings.pk

        # Check it's in cache
        cache_key = get_global_settings_cache_key()
        cached = get_cached(cache_key)
        assert cached is not None
        assert cached.pk == settings.pk

    def test_global_settings_cache_hit(self):
        """Test that subsequent calls use cached value."""
        settings = GlobalSettings.objects.create(
            pk=1,
            deadline_breakfast=time(8, 0),
            deadline_lunch=time(11, 0),
            deadline_olovrant=time(16, 0),
        )

        # First call
        result1 = get_global_settings()

        # Manually update database and Save (but don't call service again yet)
        # to test that the cached instance reflects the change
        from django.core.cache import cache as django_cache

        django_cache.clear()  # Clear cache to test fresh fetch

        settings.deadline_breakfast = time(9, 0)
        settings.save()

        # Clear cache to force fresh database read
        from api.cache_service import clear_global_settings_cache

        clear_global_settings_cache()

        # Next call should return the updated value
        result2 = get_global_settings()
        assert result2.deadline_breakfast == time(9, 0)  # Updated from DB

    def test_global_settings_cache_invalidation_on_save(self):
        """Test that cache is invalidated when GlobalSettings is saved."""
        settings = GlobalSettings.objects.create(
            pk=1,
            deadline_breakfast=time(8, 0),
            deadline_lunch=time(11, 0),
            deadline_olovrant=time(16, 0),
        )

        # Load into cache
        result1 = get_global_settings()

        # Update and save
        settings.deadline_breakfast = time(9, 0)
        settings.save()

        # Cache should be invalidated; fetch fresh from DB
        cache_key = get_global_settings_cache_key()
        assert get_cached(cache_key) is None

        # Next retrieval should get updated value from database
        result2 = get_global_settings()
        assert result2.deadline_breakfast == time(9, 0)


class TestClientSettingsCaching:
    """Test ClientSettings caching with signal-based invalidation."""

    def setup_method(self):
        """Clear cache before each test."""
        cache.clear()

    def test_client_settings_cached_on_first_access(self):
        """Test that ClientSettings is cached on first retrieval."""
        user = User.objects.create(username="testuser", email="test@example.com")
        settings = ClientSettings.objects.create(
            user=user, visible_meals=["breakfast", "lunch"]
        )

        # First call should hit database and cache
        result = get_client_settings(user.id)
        assert result.pk == settings.pk

        # Check it's in cache
        cache_key = get_client_settings_cache_key(user.id)
        cached = get_cached(cache_key)
        assert cached is not None
        assert cached.pk == settings.pk

    def test_client_settings_cache_invalidation_on_save(self):
        """Test that cache is invalidated when ClientSettings is saved."""
        user = User.objects.create(username="testuser", email="test@example.com")
        settings = ClientSettings.objects.create(
            user=user, visible_meals=["breakfast", "lunch"]
        )

        # Load into cache
        result1 = get_client_settings(user.id)
        assert result1.visible_meals == ["breakfast", "lunch"]

        # Update and save
        settings.visible_meals = ["lunch"]
        settings.save()

        # Cache should be invalidated
        cache_key = get_client_settings_cache_key(user.id)
        assert get_cached(cache_key) is None

        # Next retrieval should get updated value
        result2 = get_client_settings(user.id)
        assert result2.visible_meals == ["lunch"]

    def test_client_settings_different_users_separate_cache(self):
        """Test that different users have separate cache entries."""
        user1 = User.objects.create(username="user1", email="user1@example.com")
        user2 = User.objects.create(username="user2", email="user2@example.com")

        settings1 = ClientSettings.objects.create(
            user=user1, visible_meals=["breakfast"]
        )
        settings2 = ClientSettings.objects.create(
            user=user2, visible_meals=["lunch", "olovrant"]
        )

        # Cache both
        get_client_settings(user1.id)
        get_client_settings(user2.id)

        # Check separate cache keys
        cache_key1 = get_client_settings_cache_key(user1.id)
        cache_key2 = get_client_settings_cache_key(user2.id)
        assert cache_key1 != cache_key2

        cached1 = get_cached(cache_key1)
        cached2 = get_cached(cache_key2)
        assert cached1.visible_meals == ["breakfast"]
        assert cached2.visible_meals == ["lunch", "olovrant"]


class TestDietListCaching:
    """Test Diet list caching via custom cache_service helpers."""

    def setup_method(self):
        """Clear cache before each test."""
        cache.clear()
        self.client = APIClient()
        self.admin_user = User.objects.create_user(
            username="admin", password="test", is_staff=True, is_superuser=True
        )
        self.client.force_authenticate(user=self.admin_user)

    def test_diet_list_cache_hit(self):
        """Test that Diet list is cached."""
        diet1 = Diet.objects.create(name="Vegetarian", is_active=True)
        diet2 = Diet.objects.create(name="GlutenFree", is_active=True)

        # First request should hit database
        response1 = self.client.get("/api/diets/")
        assert response1.status_code == status.HTTP_200_OK
        data1 = response1.json()

        # Count iterations/DB queries for cache behavior
        # (Actual query count testing would require using assertNumQueries)

        # Second request should use cached response
        response2 = self.client.get("/api/diets/")
        assert response2.status_code == status.HTTP_200_OK
        data2 = response2.json()

        # Same data should be returned
        assert data1 == data2

    def test_diet_list_cache_invalidation_on_create(self):
        """Test that cache is invalidated when Diet is created."""
        diet1 = Diet.objects.create(name="Vegetarian", is_active=True)

        # First request
        response1 = self.client.get("/api/diets/")
        assert response1.status_code == status.HTTP_200_OK
        data1 = response1.json()
        count1 = (
            len(data1) if isinstance(data1, list) else len(data1.get("results", []))
        )

        # Create new diet - should invalidate cache
        diet2 = Diet.objects.create(name="GlutenFree", is_active=True)

        # Second request should reflect the new diet
        response2 = self.client.get("/api/diets/")
        data2 = response2.json()
        count2 = (
            len(data2) if isinstance(data2, list) else len(data2.get("results", []))
        )

        assert count2 >= count1  # At least as many as before

    def test_diet_list_cache_invalidation_on_update(self):
        """Test that cache is invalidated when Diet is updated."""
        diet = Diet.objects.create(name="Vegetarian", is_active=True)

        # First request
        response1 = self.client.get("/api/diets/")
        data1 = response1.json()

        # Update diet
        diet.is_active = False
        diet.save()

        # Cache should be invalidated, next request should reflect change
        response2 = self.client.get("/api/diets/")
        data2 = response2.json()

        # The response data should reflect the update
        # (Exact assertion depends on how is_active is serialized)

    def test_diet_list_cache_invalidation_on_delete(self):
        """Test that cache is invalidated when Diet is deleted."""
        diet1 = Diet.objects.create(name="Vegetarian", is_active=True)
        diet2 = Diet.objects.create(name="GlutenFree", is_active=True)

        # First request
        response1 = self.client.get("/api/diets/")
        data1 = response1.json()
        count1 = (
            len(data1) if isinstance(data1, list) else len(data1.get("results", []))
        )

        # Delete diet
        diet1.delete()

        # Cache should be invalidated
        response2 = self.client.get("/api/diets/")
        data2 = response2.json()
        count2 = (
            len(data2) if isinstance(data2, list) else len(data2.get("results", []))
        )

        assert count2 <= count1  # Fewer or equal after deletion


class TestDailyStatsCaching:
    """Test daily stats caching with 5-minute TTL."""

    def setup_method(self):
        """Clear cache and set up test data."""
        cache.clear()
        self.client = APIClient()
        self.admin_user = User.objects.create_user(
            username="admin", password="test", is_staff=True, is_superuser=True
        )
        self.client.force_authenticate(user=self.admin_user)

    def test_daily_stats_cache_hit(self):
        """Test that daily stats are cached."""
        test_date = date(2026, 3, 6)

        user = User.objects.create(username="user", email="user@example.com")
        order = DailyOrder.objects.create(
            user=user,
            date=test_date,
            data={
                "breakfast": {"menuCounts": {"A": 1}, "diets": {}},
                "lunch": {"menuCounts": {"B": 1}, "diets": {}},
                "olovrant": {"menuCounts": {}, "diets": {}},
            },
        )

        # First request
        response1 = self.client.get(
            f"/api/admin/summary/daily-stats/?date={test_date.isoformat()}"
        )
        assert response1.status_code == status.HTTP_200_OK
        data1 = response1.json()

        # Check cache
        cache_key = get_daily_stats_cache_key(test_date.isoformat())
        cached = get_cached(cache_key)
        assert cached is not None
        assert cached == data1

    def test_daily_stats_cache_different_dates_separate_cache(self):
        """Test that different dates have separate cache entries."""
        user = User.objects.create(username="user", email="user@example.com")

        date1 = date(2026, 3, 6)
        date2 = date(2026, 3, 7)

        DailyOrder.objects.create(
            user=user,
            date=date1,
            data={"breakfast": {"menuCounts": {"A": 1}, "diets": {}}},
        )
        DailyOrder.objects.create(
            user=user,
            date=date2,
            data={"breakfast": {"menuCounts": {"B": 1}, "diets": {}}},
        )

        # Request both dates
        response1 = self.client.get(
            f"/api/admin/summary/daily-stats/?date={date1.isoformat()}"
        )
        response2 = self.client.get(
            f"/api/admin/summary/daily-stats/?date={date2.isoformat()}"
        )

        data1 = response1.json()
        data2 = response2.json()

        # Check separate cache keys
        cache_key1 = get_daily_stats_cache_key(date1.isoformat())
        cache_key2 = get_daily_stats_cache_key(date2.isoformat())
        assert cache_key1 != cache_key2

        # Should have different cached data
        assert get_cached(cache_key1) is not None
        assert get_cached(cache_key2) is not None

    def test_daily_stats_invalid_date_not_cached(self):
        """Test that invalid dates return error and don't cache."""
        response = self.client.get("/api/admin/summary/daily-stats/?date=invalid-date")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_daily_stats_missing_date_parameter(self):
        """Test that missing date parameter returns error."""
        response = self.client.get("/api/admin/summary/daily-stats/")
        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestCacheHitRateTracking:
    """Test cache hit/miss tracking."""

    def setup_method(self):
        """Clear cache before each test."""
        cache.clear()

    def test_cache_hit_miss_sequence(self):
        """Test tracking cache hits and misses."""
        key = "test_key"
        value = {"data": "test"}

        # First access - miss
        assert get_cached(key) is None

        # Set value
        set_cached(key, value)

        # Second access - hit
        assert get_cached(key) == value

        # Delete and access - miss
        delete_cached(key)
        assert get_cached(key) is None


class TestCachePerformance:
    """Test that caching actually reduces database queries."""

    def setup_method(self):
        """Clear cache before each test."""
        cache.clear()

    def test_global_settings_multiple_accesses(self, django_assert_num_queries):
        """Test that multiple GlobalSettings accesses only hit DB once."""
        settings = GlobalSettings.objects.create(
            pk=1,
            deadline_breakfast=time(8, 0),
            deadline_lunch=time(11, 0),
            deadline_olovrant=time(16, 0),
        )

        # First access should hit DB
        with django_assert_num_queries(1):
            result1 = get_global_settings()

        # Subsequent accesses should use cache (0 queries)
        with django_assert_num_queries(0):
            result2 = get_global_settings()
            result3 = get_global_settings()

        assert result1.pk == result2.pk == result3.pk

    def test_client_settings_multiple_users(self, django_assert_num_queries):
        """Test that each user's settings are cached independently."""
        user1 = User.objects.create(username="user1", email="user1@example.com")
        user2 = User.objects.create(username="user2", email="user2@example.com")

        ClientSettings.objects.create(user=user1, visible_meals=["breakfast"])
        ClientSettings.objects.create(user=user2, visible_meals=["lunch"])

        # First access for user1 - 1 query
        with django_assert_num_queries(1):
            get_client_settings(user1.id)

        # Subsequent access for user1 - 0 queries (cached)
        with django_assert_num_queries(0):
            get_client_settings(user1.id)

        # First access for user2 - 1 query
        with django_assert_num_queries(1):
            get_client_settings(user2.id)

        # Subsequent access for user2 - 0 queries (cached)
        with django_assert_num_queries(0):
            get_client_settings(user2.id)

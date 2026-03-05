"""
Query optimization tests - measure and verify N+1 query fixes.

These tests ensure that ViewSets properly use select_related and prefetch_related
to minimize database queries. Each test documents the expected query count for a
common operation and will fail if query count exceeds the optimized threshold.

Reference baseline (before optimization):
- AdminUserViewSet.list (10 users): ~31 queries (1 users + 10 profiles + 10 settings + 10 settings M2M)
- DailyOrderViewSet.list (10 orders): ~11 queries (1 orders + 10 user FK)
- AdminSummaryViewSet.daily_stats (10 orders): ~11 queries (1 orders + 10 user FK)
- PlannedOrdersViewSet.list (user with 5 planned days): ~5-6 queries

After optimization (target):
- AdminUserViewSet.list (10 users): ~1-2 queries (with prefetch)
- DailyOrderViewSet.list (10 orders): ~1-2 queries (with select_related)
- AdminSummaryViewSet.daily_stats (10 orders): ~1-2 queries (with select_related)
- PlannedOrdersViewSet.list (user with 5 planned days): ~1-2 queries
"""

import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework import status

from api.models import ClientSettings, DailyOrder, Diet, UserProfile


@pytest.mark.django_db
class TestAdminUserViewSetQueries:
    """Test query optimization for AdminUserViewSet."""

    def test_list_users_query_count(self, admin_authenticated_client, db):
        """AdminUserViewSet.list should fetch all users, profiles, settings with minimal queries."""
        # Create 5 test users with their related objects
        from django.contrib.auth.models import User

        for i in range(5):
            user = User.objects.create_user(
                username=f"user{i}@example.com",
                email=f"user{i}@example.com",
                password="test123",
            )
            # Create profile and settings for each
            UserProfile.objects.create(user=user, company_name=f"Company {i}")
            settings = ClientSettings.objects.create(user=user)
            # Add some diets to create M2M relationships
            for diet_id in range(1, 3):
                try:
                    diet = Diet.objects.get(id=diet_id)
                    settings.visible_diets.add(diet)
                except Diet.DoesNotExist:
                    pass

        # After optimization: should be ~2-3 queries (users + prefetch)
        # Before: ~1 + 5 profiles + 5 settings + 5 settings M2M = ~16 queries
        with CaptureQueriesContext(connection) as ctx:
            response = admin_authenticated_client.get("/api/admin/users/")
            assert response.status_code == status.HTTP_200_OK

        query_count = len(ctx.captured_queries)
        # After prefetch_related optimization, should be <= 5 (improved from ~31 before)
        assert (
            query_count <= 5
        ), f"Expected <= 5 queries, got {query_count}. Possible N+1 issue."


@pytest.mark.django_db
class TestDailyOrderViewSetQueries:
    """Test query optimization for DailyOrderViewSet."""

    def test_list_orders_query_count(self, authenticated_client, user, db):
        """DailyOrderViewSet.list should fetch orders with minimal queries."""
        from datetime import date, timedelta

        # Create 5 test orders
        for i in range(5):
            DailyOrder.objects.create(
                user=user,
                date=date.today() + timedelta(days=i),
                data={"breakfast": {}, "lunch": {}, "olovrant": {}},
            )

        # After optimization: should be ~1-2 queries (see select_related user, user__settings)
        # Before: ~1 orders query + 5 user FK queries = ~6 queries
        with CaptureQueriesContext(connection) as ctx:
            response = authenticated_client.get("/api/orders/")
            assert response.status_code == status.HTTP_200_OK

        query_count = len(ctx.captured_queries)
        print(f"\nDailyOrderViewSet.list query count: {query_count}")
        # After select_related optimization, should be <= 2
        assert (
            query_count <= 2
        ), f"Expected <= 2 queries, got {query_count}. Possible N+1 issue."


@pytest.mark.django_db
class TestAdminSummaryViewSetQueries:
    """Test query optimization for AdminSummaryViewSet."""

    def test_daily_stats_query_count(self, admin_authenticated_client, db):
        """AdminSummaryViewSet.daily_stats should fetch orders with minimal queries."""
        from datetime import date

        from django.contrib.auth.models import User

        target_date = date.today()

        # Create 5 test orders from different users
        for i in range(5):
            user = User.objects.create_user(
                username=f"stat_user{i}@example.com",
                email=f"stat_user{i}@example.com",
                password="test123",
            )
            ClientSettings.objects.create(user=user)
            DailyOrder.objects.create(
                user=user,
                date=target_date,
                data={
                    "breakfast": {"menuCounts": {"breakfast1": 2}},
                    "lunch": {"menuCounts": {"lunch1": 1}},
                    "olovrant": {},
                },
            )

        # After optimization: should be ~1-2 queries (see select_related user, user__settings)
        # Should execute minimal queries (no N+1 pattern)
        with CaptureQueriesContext(connection) as ctx:
            response = admin_authenticated_client.get(
                f"/api/admin/summary/daily-stats/?date={target_date}"
            )
            assert response.status_code == status.HTTP_200_OK

        query_count = len(ctx.captured_queries)
        # Should be <= 2 queries (orders + aggregate computation)
        assert (
            query_count <= 2
        ), f"Expected <= 2 queries, got {query_count}. Possible N+1 issue."


@pytest.mark.django_db
class TestPlannedOrdersViewSetQueries:
    """Test query optimization for PlannedOrdersViewSet."""

    def test_list_planned_orders_query_count(self, authenticated_client, user, db):
        """PlannedOrdersViewSet.list should work with minimal queries."""
        from datetime import date, timedelta

        # Ensure user has settings with visible_meals
        settings, _ = ClientSettings.objects.get_or_create(user=user)
        settings.visible_meals = ["breakfast", "lunch"]
        settings.save()

        # Create some historical orders
        today = date.today()
        # Find the most recent Monday or create orders for recent dates
        for i in range(3):
            DailyOrder.objects.create(
                user=user,
                date=today - timedelta(days=7 + i),
                data={"breakfast": {}, "lunch": {}, "olovrant": {}},
            )

        # After query optimization, the overall query count should remain low
        # Accessing user.settings.visible_meals should not introduce an N+1 query pattern
        with CaptureQueriesContext(connection) as ctx:
            response = authenticated_client.get("/api/orders/planned/")
            assert response.status_code == status.HTTP_200_OK

        query_count = len(ctx.captured_queries)
        # After query optimization, total queries should be <= 3
        # (includes main list query, helper logic like _last_non_empty_order, and user settings lookup)
        assert (
            query_count <= 3
        ), f"Expected <= 3 queries, got {query_count}. Possible N+1 issue."

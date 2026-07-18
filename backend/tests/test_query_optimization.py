"""
Query optimization tests - measure and verify N+1 query fixes.

These tests ensure that ViewSets properly use select_related and prefetch_related
to minimize database queries. Each test documents the expected query count for a
common operation and will fail if query count exceeds the optimized threshold.

Reference baseline (before optimization / regression checks):
- AdminUserViewSet.list (10 users): ~31 queries (1 users + 10 profiles + 10 settings + 10 settings M2M)
- DailyOrderViewSet.list (10 orders): constant number of queries from orders table only
- AdminSummaryViewSet.daily_stats (10 orders): constant number of queries iterating DailyOrder and reading order.data
- PlannedOrdersViewSet.list (user with 5 planned days): ~5-6 queries

After optimization / safeguards (target):
- AdminUserViewSet.list (10 users): ~1-2 queries (with prefetch for profiles, settings and visible_diets)
- DailyOrderViewSet.list (10 orders): ~1-2 queries; serializer only reads order fields, no user relations
- AdminSummaryViewSet.daily_stats (10 orders): ~1-2 queries; view aggregates order.data without dereferencing users
- PlannedOrdersViewSet.list (user with 5 planned days): ~1-2 queries (with appropriate eager loading)
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

        # Create Diet objects for visible_diets M2M relationship
        diets = [Diet.objects.create(name=f"Diet {i}") for i in range(1, 3)]

        for i in range(5):
            user = User.objects.create_user(
                username=f"user{i}@example.com",
                email=f"user{i}@example.com",
                password="test123",
            )
            # Create profile and settings for each
            UserProfile.objects.create(user=user, company_name=f"Company {i}")
            settings = ClientSettings.objects.create(user=user)
            # Add diets to exercise the settings__visible_diets prefetch path
            settings.visible_diets.set(diets)

        # After optimization: typically ~2-3 queries (users + select_related/prefetch).
        # Baseline for 5 users without optimization: ~1 + 5 profiles + 5 settings + 5 settings M2M = ~16 queries.
        with CaptureQueriesContext(connection) as ctx:
            response = admin_authenticated_client.get("/api/admin/users/")
            assert response.status_code == status.HTTP_200_OK

        query_count = len(ctx.captured_queries)
        # After select_related/prefetch_related optimization, should be <= 5 (improved from ~16 for 5 users).
        assert (
            query_count <= 5
        ), f"Expected <= 5 queries (was ~16 before optimizations), got {query_count}. Possible N+1 issue."


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

        # Expect a small, constant number of queries for listing multiple orders.
        # This test guards against introducing an N+1 pattern in the list endpoint.
        with CaptureQueriesContext(connection) as ctx:
            response = authenticated_client.get("/api/orders/")
            assert response.status_code == status.HTTP_200_OK

        query_count = len(ctx.captured_queries)
        # DailyOrderSerializer only accesses id/date/status/data/is_auto/updated_at
        # (no per-row related objects). The constant count is now 3: pagination
        # COUNT, the order fetch, and one access-control lookup (dostupne_prevadzky
        # does an .exists() to distinguish "empty M2M = whole celok" from a subset).
        # The bound guards against a *per-row* N+1, which this is not.
        assert (
            query_count <= 3
        ), f"Expected <= 3 queries, got {query_count}. Possible N+1 issue."


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
            UserProfile.objects.get_or_create(
                user=user, defaults={"company_name": user.email}
            )
            DailyOrder.objects.create(
                user=user,
                date=target_date,
                data={
                    "breakfast": {"menuCounts": {"breakfast1": 2}},
                    "lunch": {"menuCounts": {"lunch1": 1}},
                    "olovrant": {},
                },
            )

        # After optimization: should be ~1-2 queries (orders retrieval + aggregation only).
        # The view iterates DailyOrder for the given date and reads order.data without accessing user/settings,
        # so this test guards against introducing an N+1 pattern on that code path.
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

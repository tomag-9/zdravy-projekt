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

from api.models import (
    Celok,
    DailyOrder,
    Prevadzka,
    ProfileCelokAccess,
    ProfilePrevadzkaAccess,
    UserProfile,
)


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
            UserProfile.objects.create(user=user, company_name=f"Company {i}")

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

    def test_list_does_not_guess_billing_for_user_with_multiple_celky(
        self, admin_authenticated_client
    ):
        from django.contrib.auth.models import User

        user = User.objects.create_user(
            username="multi-billing@example.com",
            email="multi-billing@example.com",
        )
        profile = UserProfile(user=user)
        profile._skip_default_facility = True
        profile.save()
        first = Celok.objects.create(
            nazov="Billing first",
            billing_name="First billing",
            ico="11111111",
            dic="1111111111",
        )
        second = Celok.objects.create(
            nazov="Billing second",
            billing_name="Second billing",
            ico="22222222",
            dic="2222222222",
        )
        ProfileCelokAccess.objects.create(profile=profile, celok=first)
        ProfileCelokAccess.objects.create(profile=profile, celok=second)

        response = admin_authenticated_client.get("/api/admin/users/")

        assert response.status_code == status.HTTP_200_OK
        payload = response.json()
        users = payload.get("results", payload)
        listed_user = next(item for item in users if item["id"] == user.pk)
        assert listed_user["profile"]["billing_name"] == ""
        assert listed_user["profile"]["ico"] == ""
        assert listed_user["profile"]["dic"] == ""


@pytest.mark.django_db
class TestAdminCelokViewSetQueries:
    def test_list_celky_uses_bounded_prefetches(self, admin_authenticated_client):
        from django.contrib.auth.models import User

        expected_whole_user_ids = {}
        expected_scoped_user_ids = {}
        for index in range(5):
            celok = Celok.objects.create(nazov=f"Celok {index}")
            first = Prevadzka.objects.create(celok=celok, nazov=f"Prvá {index}")
            Prevadzka.objects.create(celok=celok, nazov=f"Druhá {index}")

            whole_user = User.objects.create_user(
                username=f"whole-{index}@example.com",
                email=f"whole-{index}@example.com",
            )
            whole_profile = UserProfile(user=whole_user)
            whole_profile._skip_default_facility = True
            whole_profile.save()
            ProfileCelokAccess.objects.create(
                profile=whole_profile,
                celok=celok,
            )
            expected_whole_user_ids[f"Druhá {index}"] = whole_user.pk

            scoped_user = User.objects.create_user(
                username=f"scoped-{index}@example.com",
                email=f"scoped-{index}@example.com",
            )
            scoped_profile = UserProfile(user=scoped_user)
            scoped_profile._skip_default_facility = True
            scoped_profile.save()
            ProfilePrevadzkaAccess.objects.create(
                profile=scoped_profile,
                prevadzka=first,
            )
            expected_scoped_user_ids[first.nazov] = scoped_user.pk

        with CaptureQueriesContext(connection) as ctx:
            response = admin_authenticated_client.get("/api/admin/celky/")
            assert response.status_code == status.HTTP_200_OK
            payload = response.json()
            assert len(payload) == 5

        query_count = len(ctx.captured_queries)
        assert query_count <= 5, f"Expected <= 5 queries, got {query_count}."
        prevadzky = {
            prevadzka["nazov"]: prevadzka
            for celok_payload in payload
            for prevadzka in celok_payload["prevadzky"]
        }
        for nazov, user_id in expected_whole_user_ids.items():
            assert prevadzky[nazov]["client_user_id"] == user_id
        for nazov, user_id in expected_scoped_user_ids.items():
            assert prevadzky[nazov]["client_user_id"] == user_id


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

        prevadzka = user.profile.dostupne_prevadzky().get()
        prevadzka.visible_meals = ["breakfast", "lunch"]
        prevadzka.save(update_fields=["visible_meals"])

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
        # Facility visibility lookup must not introduce an N+1 query pattern.
        with CaptureQueriesContext(connection) as ctx:
            response = authenticated_client.get("/api/orders/planned/")
            assert response.status_code == status.HTTP_200_OK

        query_count = len(ctx.captured_queries)
        # After query optimization, total queries should be <= 3
        # (includes main list query, helper logic like _last_non_empty_order, and user settings lookup)
        assert (
            query_count <= 3
        ), f"Expected <= 3 queries, got {query_count}. Possible N+1 issue."

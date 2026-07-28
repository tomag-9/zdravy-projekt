"""
Global (not per-user) throttles on /api/token/ and /api/orders/ create.

See api/throttles.py and load-tests/README.md "Overload Plan": these cap
aggregate throughput across ALL callers, so a burst of many different
legitimate users gets a fast 429 instead of piling up behind gunicorn's
backlog until requests time out.
"""

import pytest
from django.conf import settings
from django.contrib.auth.models import User
from django.test import override_settings
from django.urls import reverse
from rest_framework import status

from api.models import UserProfile


def _low_throttle_settings():
    # Replace only DEFAULT_THROTTLE_RATES; keep the rest of REST_FRAMEWORK
    # (EXCEPTION_HANDLER, DEFAULT_AUTHENTICATION_CLASSES, ...) intact, since
    # overriding the whole dict would silently fall back to DRF's own
    # defaults for everything else.
    return {
        "REST_FRAMEWORK": {
            **settings.REST_FRAMEWORK,
            "DEFAULT_THROTTLE_RATES": {
                "login_global": "1/min",
                "order_submit_global": "1/min",
            },
        }
    }


def _user_with_profile(**kwargs):
    kwargs.setdefault("email", kwargs.get("username"))
    user = User.objects.create_user(**kwargs)
    UserProfile.objects.get_or_create(user=user, defaults={"company_name": user.email})
    return user


@pytest.mark.django_db
class TestLoginGlobalThrottle:
    def test_second_login_within_window_is_throttled_regardless_of_user(
        self, api_client
    ):
        """A global throttle blocks request #2 even from a DIFFERENT user —
        this is the whole point: per-user throttles don't protect against
        many distinct users arriving at once."""
        _user_with_profile(username="a@example.com", password="pw12345678")
        _user_with_profile(username="b@example.com", password="pw12345678")
        auth_url = reverse("token_obtain_pair")

        with override_settings(**_low_throttle_settings()):
            first = api_client.post(
                auth_url,
                {"email": "a@example.com", "password": "pw12345678"},
                format="json",
            )
            assert first.status_code == status.HTTP_200_OK

            second = api_client.post(
                auth_url,
                {"email": "b@example.com", "password": "pw12345678"},
                format="json",
            )

        assert second.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert second.data["error"]["code"] == "rate_limit_exceeded"
        assert "retry_after_seconds" in second.data["error"]["details"]
        assert "Retry-After" in second.headers


@pytest.mark.django_db
class TestOrderSubmitGlobalThrottle:
    def test_second_order_create_within_window_is_throttled(self, api_client):
        user_a = _user_with_profile(username="c@example.com", password="pw12345678")
        user_b = _user_with_profile(username="d@example.com", password="pw12345678")
        orders_url = reverse("dailyorder-list")

        with override_settings(**_low_throttle_settings()):
            api_client.force_authenticate(user=user_a)
            first = api_client.post(
                orders_url,
                {"date": "2099-01-05", "data": {}},
                format="json",
            )
            assert first.status_code in (
                status.HTTP_200_OK,
                status.HTTP_201_CREATED,
            )

            api_client.force_authenticate(user=user_b)
            second = api_client.post(
                orders_url,
                {"date": "2099-01-06", "data": {}},
                format="json",
            )

        assert second.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert second.data["error"]["code"] == "rate_limit_exceeded"

    def test_list_and_retrieve_are_not_throttled_by_order_submit_scope(
        self, api_client
    ):
        """get_throttles() must scope the limiter to `create` only — list/
        retrieve traffic (far more frequent) shouldn't share its budget."""
        user = _user_with_profile(username="e@example.com", password="pw12345678")
        orders_url = reverse("dailyorder-list")

        with override_settings(**_low_throttle_settings()):
            api_client.force_authenticate(user=user)
            for _ in range(3):
                resp = api_client.get(orders_url)
                assert resp.status_code == status.HTTP_200_OK

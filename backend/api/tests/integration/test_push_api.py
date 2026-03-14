"""
Integration tests for push notification API views.

Covers:
  GET  /api/push/vapid-public-key/  – VapidPublicKeyView
  POST /api/push/subscribe/         – PushSubscribeView
  DEL  /api/push/subscribe/         – PushSubscribeView
  POST /api/admin/push/send/        – AdminSendPushView
"""

import pytest
from rest_framework import status

from api.models import PushSubscription
from api.tests.factories import PushSubscriptionFactory, UserFactory

pytestmark = pytest.mark.integration

VAPID_KEY_URL = "/api/push/vapid-public-key/"
SUBSCRIBE_URL = "/api/push/subscribe/"
ADMIN_SEND_URL = "/api/admin/push/send/"

VALID_SUBSCRIPTION = {
    "endpoint": "https://fcm.googleapis.com/fcm/send/test-endpoint-abc",
    "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtS5k5eR...",
    "auth": "tBHItJI5svbpez7KI4CCXg==",
}


# ─────────────────────────────────────────────────────────────────────────────
# VapidPublicKeyView
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestVapidPublicKeyView:
    def test_returns_public_key_without_authentication(self, api_client, settings):
        """VAPID public key endpoint is accessible without authentication."""
        settings.VAPID_PUBLIC_KEY = "test-public-key-abc"
        response = api_client.get(VAPID_KEY_URL)

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["vapid_public_key"] == "test-public-key-abc"

    def test_returns_empty_string_when_not_configured(self, api_client, settings):
        """Returns empty string if VAPID_PUBLIC_KEY is not set."""
        settings.VAPID_PUBLIC_KEY = ""
        response = api_client.get(VAPID_KEY_URL)

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["vapid_public_key"] == ""

    def test_authenticated_user_can_also_access(self, authenticated_client, settings):
        """Authenticated users can also access the VAPID key endpoint."""
        settings.VAPID_PUBLIC_KEY = "some-key"
        response = authenticated_client.get(VAPID_KEY_URL)

        assert response.status_code == status.HTTP_200_OK


# ─────────────────────────────────────────────────────────────────────────────
# PushSubscribeView – POST (subscribe)
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestPushSubscribePost:
    def test_unauthenticated_returns_403_forbidden(self, api_client):
        """Unauthenticated requests are rejected with 403 FORBIDDEN."""
        response = api_client.post(SUBSCRIBE_URL, VALID_SUBSCRIPTION, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_creates_subscription(self, authenticated_client, user):
        """Valid subscription data is saved to the database."""
        response = authenticated_client.post(
            SUBSCRIBE_URL, VALID_SUBSCRIPTION, format="json"
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["status"] == "subscribed"
        assert PushSubscription.objects.filter(user=user).count() == 1

        sub = PushSubscription.objects.get(user=user)
        assert sub.endpoint == VALID_SUBSCRIPTION["endpoint"]
        assert sub.p256dh == VALID_SUBSCRIPTION["p256dh"]
        assert sub.auth == VALID_SUBSCRIPTION["auth"]

    def test_updates_existing_subscription_for_same_endpoint(
        self, authenticated_client, user
    ):
        """Re-subscribing with the same endpoint updates keys instead of duplicating."""
        PushSubscriptionFactory(
            user=user,
            endpoint=VALID_SUBSCRIPTION["endpoint"],
            p256dh="old-p256dh",
            auth="old-auth",
        )

        updated = {**VALID_SUBSCRIPTION, "p256dh": "new-p256dh", "auth": "new-auth"}
        response = authenticated_client.post(SUBSCRIBE_URL, updated, format="json")

        assert response.status_code == status.HTTP_200_OK  # 200 for update
        assert PushSubscription.objects.filter(user=user).count() == 1

        sub = PushSubscription.objects.get(user=user)
        assert sub.p256dh == "new-p256dh"
        assert sub.auth == "new-auth"

    def test_same_user_can_have_multiple_endpoints(self, authenticated_client, user):
        """One user can subscribe from multiple devices."""
        sub1 = {**VALID_SUBSCRIPTION, "endpoint": "https://example.com/endpoint-1"}
        sub2 = {**VALID_SUBSCRIPTION, "endpoint": "https://example.com/endpoint-2"}

        authenticated_client.post(SUBSCRIBE_URL, sub1, format="json")
        authenticated_client.post(SUBSCRIBE_URL, sub2, format="json")

        assert PushSubscription.objects.filter(user=user).count() == 2

    def test_missing_endpoint_returns_400(self, authenticated_client):
        """Missing endpoint field returns 400."""
        bad_payload = {"p256dh": "key", "auth": "auth"}
        response = authenticated_client.post(SUBSCRIBE_URL, bad_payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_missing_p256dh_returns_400(self, authenticated_client):
        """Missing p256dh field returns 400."""
        bad_payload = {
            "endpoint": "https://example.com/ep",
            "auth": "auth",
        }
        response = authenticated_client.post(SUBSCRIBE_URL, bad_payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_missing_auth_returns_400(self, authenticated_client):
        """Missing auth field returns 400."""
        bad_payload = {
            "endpoint": "https://example.com/ep",
            "p256dh": "key",
        }
        response = authenticated_client.post(SUBSCRIBE_URL, bad_payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_subscription_belongs_to_authenticated_user_only(self, api_client):
        """Each subscription is tied to the authenticated user, not another."""
        user_a = UserFactory()
        user_b = UserFactory()

        api_client.force_authenticate(user=user_a)
        api_client.post(SUBSCRIBE_URL, VALID_SUBSCRIPTION, format="json")

        assert PushSubscription.objects.filter(user=user_a).count() == 1
        assert PushSubscription.objects.filter(user=user_b).count() == 0


# ─────────────────────────────────────────────────────────────────────────────
# PushSubscribeView – DELETE (unsubscribe)
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestPushSubscribeDelete:
    def test_unauthenticated_returns_403_forbidden(self, api_client):
        response = api_client.delete(
            SUBSCRIBE_URL,
            {"endpoint": "https://example.com/ep"},
            format="json",
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_removes_existing_subscription(self, authenticated_client, user):
        """Deleting a subscription removes it from the database."""
        sub = PushSubscriptionFactory(user=user, endpoint="https://example.com/ep-del")

        response = authenticated_client.delete(
            SUBSCRIBE_URL,
            {"endpoint": sub.endpoint},
            format="json",
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not PushSubscription.objects.filter(pk=sub.pk).exists()

    def test_returns_404_when_endpoint_not_found(self, authenticated_client):
        """Attempting to delete a non-existent endpoint returns 404."""
        response = authenticated_client.delete(
            SUBSCRIBE_URL,
            {"endpoint": "https://example.com/nonexistent"},
            format="json",
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_cannot_delete_another_users_subscription(self, authenticated_client, user):
        """User cannot delete a subscription that belongs to someone else."""
        other = UserFactory()
        other_sub = PushSubscriptionFactory(
            user=other, endpoint="https://example.com/ep-other"
        )

        response = authenticated_client.delete(
            SUBSCRIBE_URL,
            {"endpoint": other_sub.endpoint},
            format="json",
        )

        # Returns 404 (not visible to this user) and record is untouched
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert PushSubscription.objects.filter(pk=other_sub.pk).exists()

    def test_missing_endpoint_field_returns_400(self, authenticated_client):
        """DELETE without endpoint field returns 400."""
        response = authenticated_client.delete(SUBSCRIBE_URL, {}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST


# ─────────────────────────────────────────────────────────────────────────────
# AdminSendPushView
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestAdminSendPushView:
    def test_non_admin_returns_403(self, authenticated_client):
        """Regular users cannot access the admin push endpoint."""
        response = authenticated_client.post(
            ADMIN_SEND_URL,
            {"title": "Test", "body": "Hello"},
            format="json",
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_unauthenticated_returns_403_forbidden(self, api_client):
        response = api_client.post(
            ADMIN_SEND_URL, {"title": "Test", "body": "Hello"}, format="json"
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_missing_title_returns_400(self, admin_client):
        response = admin_client.post(ADMIN_SEND_URL, {"body": "Hello"}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_missing_body_returns_400(self, admin_client):
        response = admin_client.post(ADMIN_SEND_URL, {"title": "Test"}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_bulk_send_calls_send_to_all_subscribers(self, admin_client):
        """Omitting user_id triggers bulk send to all subscribers."""
        from unittest.mock import patch

        with patch(
            "api.views.push_views.PushNotificationService.send_to_all_subscribers"
        ) as mock_send:
            mock_send.return_value = {"sent": 5, "failed": 0}

            response = admin_client.post(
                ADMIN_SEND_URL,
                {"title": "Reminder", "body": "Order now!", "url": "/order"},
                format="json",
            )

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["sent"] == 5
        mock_send.assert_called_once_with(
            title="Reminder", body="Order now!", url="/order"
        )

    def test_targeted_send_calls_send_to_user(self, admin_client, user):
        """Providing user_id triggers single-user send."""
        from unittest.mock import patch

        with patch(
            "api.views.push_views.PushNotificationService.send_to_user"
        ) as mock_send:
            mock_send.return_value = {"sent": 1, "stale_removed": 0}

            response = admin_client.post(
                ADMIN_SEND_URL,
                {"title": "Hi", "body": "Message", "user_id": user.pk},
                format="json",
            )

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["sent"] == 1
        mock_send.assert_called_once_with(
            user_id=user.pk, title="Hi", body="Message", url="/home"
        )

    def test_default_url_is_home(self, admin_client):
        """When url is omitted the default /home is passed to the service."""
        from unittest.mock import patch

        with patch(
            "api.views.push_views.PushNotificationService.send_to_all_subscribers"
        ) as mock_send:
            mock_send.return_value = {"sent": 0, "failed": 0}

            admin_client.post(
                ADMIN_SEND_URL,
                {"title": "Test", "body": "Body"},
                format="json",
            )

        _, kwargs = mock_send.call_args
        assert kwargs["url"] == "/home"


# ─────────────────────────────────────────────────────────────────────────────
# PushSubscription model constraints
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestPushSubscriptionModel:
    def test_unique_together_user_endpoint(self, user):
        """(user, endpoint) pair must be unique."""
        from django.db import IntegrityError

        PushSubscriptionFactory(user=user, endpoint="https://example.com/ep-unique")

        with pytest.raises(IntegrityError):
            PushSubscription.objects.create(
                user=user,
                endpoint="https://example.com/ep-unique",
                p256dh="other-key",
                auth="other-auth",
            )

    def test_same_endpoint_different_users_is_allowed(self, user):
        """Two different users may share the same endpoint string."""
        other = UserFactory()
        endpoint = "https://example.com/shared-endpoint"

        PushSubscriptionFactory(user=user, endpoint=endpoint)
        PushSubscriptionFactory(user=other, endpoint=endpoint)

        assert PushSubscription.objects.filter(endpoint=endpoint).count() == 2

    def test_cascade_delete_with_user(self, user):
        """Deleting a user also removes their push subscriptions."""
        PushSubscriptionFactory(user=user)
        PushSubscriptionFactory(user=user)
        user_pk = user.pk

        user.delete()

        assert PushSubscription.objects.filter(user_id=user_pk).count() == 0

    def test_str_representation(self, user):
        sub = PushSubscriptionFactory(
            user=user, endpoint="https://example.com/some-very-long-endpoint-string"
        )
        assert user.email in str(sub)

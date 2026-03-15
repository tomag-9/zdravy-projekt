"""
Unit tests for PushNotificationService.

pywebpush.webpush is mocked throughout – these tests verify:
  - Successful delivery returns True
  - HTTP 410 / 404 responses delete the stale subscription
  - Other errors return False without deleting the record
  - send_to_user iterates all user subscriptions
  - send_to_all_subscribers iterates all records
"""

from unittest.mock import MagicMock, patch

import pytest

from api.models import PushSubscription
from api.services.push_notification_service import PushNotificationService
from api.tests.factories import PushSubscriptionFactory, UserFactory


def _make_push_exception(status_code: int):
    """Build a WebPushException whose .response.status_code == status_code."""
    from pywebpush import WebPushException

    response = MagicMock()
    response.status_code = status_code
    exc = WebPushException("push error", response=response)
    return exc


@pytest.mark.django_db
class TestSendToSubscription:
    def test_returns_false_when_pywebpush_is_unavailable(self, settings):
        settings.VAPID_PRIVATE_KEY = "fake-private-key"
        settings.VAPID_ADMIN_EMAIL = "admin@example.com"
        sub = PushSubscriptionFactory()

        with patch(
            "api.services.push_notification_service._load_pywebpush",
            return_value=(None, None),
        ):
            result = PushNotificationService.send_to_subscription(
                sub, title="Hello", body="World"
            )

        assert result == (False, False)

    def test_returns_true_on_success(self, settings):
        from pywebpush import WebPushException

        settings.VAPID_PRIVATE_KEY = "fake-private-key"
        settings.VAPID_ADMIN_EMAIL = "admin@example.com"
        sub = PushSubscriptionFactory()

        with patch(
            "api.services.push_notification_service._load_pywebpush",
            return_value=(WebPushException, MagicMock()),
        ) as mock_loader:
            result = PushNotificationService.send_to_subscription(
                sub, title="Hello", body="World"
            )

        assert result == (True, False)
        mock_wp = mock_loader.return_value[1]
        mock_wp.assert_called_once()

    def test_returns_false_and_deletes_on_410(self, settings):
        """HTTP 410 (Gone) marks subscription as stale and removes it."""
        from pywebpush import WebPushException

        settings.VAPID_PRIVATE_KEY = "fake-key"
        settings.VAPID_ADMIN_EMAIL = "admin@example.com"
        sub = PushSubscriptionFactory()
        sub_pk = sub.pk

        with patch(
            "api.services.push_notification_service._load_pywebpush",
            return_value=(
                WebPushException,
                MagicMock(side_effect=_make_push_exception(410)),
            ),
        ):
            result = PushNotificationService.send_to_subscription(
                sub, title="Test", body="Body"
            )

        assert result == (False, True)
        assert not PushSubscription.objects.filter(pk=sub_pk).exists()

    def test_returns_false_and_deletes_on_404(self, settings):
        """HTTP 404 (endpoint not found) also removes the stale subscription."""
        from pywebpush import WebPushException

        settings.VAPID_PRIVATE_KEY = "fake-key"
        settings.VAPID_ADMIN_EMAIL = "admin@example.com"
        sub = PushSubscriptionFactory()
        sub_pk = sub.pk

        with patch(
            "api.services.push_notification_service._load_pywebpush",
            return_value=(
                WebPushException,
                MagicMock(side_effect=_make_push_exception(404)),
            ),
        ):
            result = PushNotificationService.send_to_subscription(
                sub, title="Test", body="Body"
            )

        assert result == (False, True)
        assert not PushSubscription.objects.filter(pk=sub_pk).exists()

    def test_returns_false_but_keeps_record_on_other_http_error(self, settings):
        """A 500-class error returns False but does NOT remove the subscription."""
        from pywebpush import WebPushException

        settings.VAPID_PRIVATE_KEY = "fake-key"
        settings.VAPID_ADMIN_EMAIL = "admin@example.com"
        sub = PushSubscriptionFactory()
        sub_pk = sub.pk

        with patch(
            "api.services.push_notification_service._load_pywebpush",
            return_value=(
                WebPushException,
                MagicMock(side_effect=_make_push_exception(500)),
            ),
        ):
            result = PushNotificationService.send_to_subscription(
                sub, title="Test", body="Body"
            )

        assert result == (False, False)
        # Record should still be present
        assert PushSubscription.objects.filter(pk=sub_pk).exists()

    def test_returns_false_on_unexpected_exception(self, settings):
        """Non-WebPushException errors are caught and return False."""
        from pywebpush import WebPushException

        settings.VAPID_PRIVATE_KEY = "fake-key"
        settings.VAPID_ADMIN_EMAIL = "admin@example.com"
        sub = PushSubscriptionFactory()

        with patch(
            "api.services.push_notification_service._load_pywebpush",
            return_value=(
                WebPushException,
                MagicMock(side_effect=RuntimeError("unexpected")),
            ),
        ):
            result = PushNotificationService.send_to_subscription(
                sub, title="Test", body="Body"
            )

        assert result == (False, False)

    def test_webpush_receives_correct_subscription_info(self, settings):
        """send_to_subscription passes endpoint and keys correctly to webpush."""
        from pywebpush import WebPushException

        settings.VAPID_PRIVATE_KEY = "fake-key"
        settings.VAPID_ADMIN_EMAIL = "admin@example.com"
        sub = PushSubscriptionFactory(
            endpoint="https://example.com/ep",
            p256dh="my-p256dh",
            auth="my-auth",
        )

        with patch(
            "api.services.push_notification_service._load_pywebpush",
            return_value=(WebPushException, MagicMock()),
        ) as mock_loader:
            PushNotificationService.send_to_subscription(sub, title="T", body="B")

        mock_wp = mock_loader.return_value[1]
        call_kwargs = mock_wp.call_args.kwargs
        sub_info = call_kwargs["subscription_info"]
        assert sub_info["endpoint"] == "https://example.com/ep"
        assert sub_info["keys"]["p256dh"] == "my-p256dh"
        assert sub_info["keys"]["auth"] == "my-auth"


@pytest.mark.django_db
class TestSendToUser:
    def test_sends_to_all_user_subscriptions(self, settings):
        """send_to_user calls send_to_subscription once per subscription."""
        settings.VAPID_PRIVATE_KEY = "fake-key"
        settings.VAPID_ADMIN_EMAIL = "admin@example.com"
        user = UserFactory()
        PushSubscriptionFactory(user=user)
        PushSubscriptionFactory(user=user)

        with patch.object(
            PushNotificationService,
            "send_to_subscription",
            return_value=(True, False),
        ) as mock_send:
            result = PushNotificationService.send_to_user(
                user_id=user.pk, title="T", body="B"
            )

        assert mock_send.call_count == 2
        assert result["sent"] == 2
        assert result["stale_removed"] == 0

    def test_counts_stale_removals(self, settings):
        """Failed sends (stale) are counted correctly."""
        settings.VAPID_PRIVATE_KEY = "fake-key"
        settings.VAPID_ADMIN_EMAIL = "admin@example.com"
        user = UserFactory()
        PushSubscriptionFactory(user=user)
        PushSubscriptionFactory(user=user)

        # First call succeeds, second fails (stale)
        with patch.object(
            PushNotificationService,
            "send_to_subscription",
            side_effect=[(True, False), (False, True)],
        ):
            result = PushNotificationService.send_to_user(
                user_id=user.pk, title="T", body="B"
            )

        assert result["sent"] == 1
        assert result["stale_removed"] == 1

    def test_returns_zeros_when_no_subscriptions(self, settings):
        settings.VAPID_PRIVATE_KEY = "fake-key"
        settings.VAPID_ADMIN_EMAIL = "admin@example.com"
        user = UserFactory()

        result = PushNotificationService.send_to_user(
            user_id=user.pk, title="T", body="B"
        )

        assert result["sent"] == 0
        assert result["stale_removed"] == 0


@pytest.mark.django_db
class TestSendToAllSubscribers:
    def test_sends_to_all_subscriptions(self, settings):
        """send_to_all_subscribers iterates every subscription in the database."""
        settings.VAPID_PRIVATE_KEY = "fake-key"
        settings.VAPID_ADMIN_EMAIL = "admin@example.com"
        PushSubscriptionFactory()
        PushSubscriptionFactory()
        PushSubscriptionFactory()

        with patch.object(
            PushNotificationService,
            "send_to_subscription",
            return_value=(True, False),
        ) as mock_send:
            result = PushNotificationService.send_to_all_subscribers(
                title="Broadcast", body="Hello all"
            )

        assert mock_send.call_count == 3
        assert result["sent"] == 3
        assert result["failed"] == 0

    def test_counts_failed_deliveries(self, settings):
        settings.VAPID_PRIVATE_KEY = "fake-key"
        settings.VAPID_ADMIN_EMAIL = "admin@example.com"
        PushSubscriptionFactory()
        PushSubscriptionFactory()

        with patch.object(
            PushNotificationService,
            "send_to_subscription",
            side_effect=[(True, False), (False, False)],
        ):
            result = PushNotificationService.send_to_all_subscribers(
                title="T", body="B"
            )

        assert result["sent"] == 1
        assert result["failed"] == 1

    def test_returns_zeros_when_no_subscriptions(self, settings):
        result = PushNotificationService.send_to_all_subscribers(title="T", body="B")
        assert result == {"sent": 0, "failed": 0}

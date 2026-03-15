"""
Push notification service using Web Push / VAPID.

Sends push messages to subscribed browsers/devices via pywebpush.
Stale subscriptions (HTTP 410/404 from the push server) are automatically removed.
"""

import json
import logging
from functools import lru_cache
from importlib import import_module
from typing import Any

from django.conf import settings

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _load_pywebpush() -> tuple[type[Exception] | None, Any | None]:
    try:
        module = import_module("pywebpush")
    except ImportError:
        return None, None
    return getattr(module, "WebPushException", None), getattr(module, "webpush", None)


class PushNotificationService:
    """Wraps pywebpush to send Web Push notifications to stored subscriptions."""

    @staticmethod
    def is_available() -> bool:
        _, webpush_func = _load_pywebpush()
        return webpush_func is not None

    @staticmethod
    def _build_subscription_info(subscription: Any) -> dict:
        return {
            "endpoint": subscription.endpoint,
            "keys": {
                "p256dh": subscription.p256dh,
                "auth": subscription.auth,
            },
        }

    @staticmethod
    def send_to_subscription(
        subscription: Any,
        title: str,
        body: str,
        url: str = "/home",
    ) -> tuple[bool, bool]:
        """
        Send a single push message to one subscription.

                Returns (sent, stale_removed):
                        - sent=True when delivery succeeded
                        - stale_removed=True when a stale subscription
                            (404/410) was deleted
        """
        payload = json.dumps({"title": title, "body": body, "url": url})
        claims = {"sub": f"mailto:{settings.VAPID_ADMIN_EMAIL}"}
        webpush_exception_cls, webpush_func = _load_pywebpush()

        if webpush_func is None:
            logger.error(
                "pywebpush is not installed; push notifications are unavailable"
            )
            return False, False

        try:
            webpush_func(
                subscription_info=PushNotificationService._build_subscription_info(
                    subscription
                ),
                data=payload,
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims=claims,
            )
            return True, False
        except Exception as exc:
            if webpush_exception_cls is not None and isinstance(
                exc, webpush_exception_cls
            ):
                response = getattr(exc, "response", None)
                status = response.status_code if response is not None else None
                if status in (404, 410):
                    logger.info(
                        "Removing stale push subscription pk=%s (HTTP %s)",
                        subscription.pk,
                        status,
                    )
                    subscription.delete()
                    return False, True
                logger.warning(
                    "Push delivery failed for subscription pk=%s: %s",
                    subscription.pk,
                    exc,
                )
                return False, False

            logger.exception(
                "Unexpected error sending push to subscription pk=%s: %s",
                subscription.pk,
                exc,
            )
            return False, False

    @staticmethod
    def send_to_user(
        user_id: int,
        title: str,
        body: str,
        url: str = "/home",
    ) -> dict:
        """
        Send a push notification to all subscriptions of a given user.

        Returns {"sent": int, "stale_removed": int}.
        """
        from api.models import PushSubscription

        subscriptions = list(PushSubscription.objects.filter(user_id=user_id))
        sent = 0
        stale_removed = 0

        for sub in subscriptions:
            delivered, removed = PushNotificationService.send_to_subscription(
                sub, title, body, url
            )
            if delivered:
                sent += 1
            if removed:
                stale_removed += 1

        return {"sent": sent, "stale_removed": stale_removed}

    @staticmethod
    def send_to_all_subscribers(
        title: str,
        body: str,
        url: str = "/home",
    ) -> dict:
        """
        Send a push notification to all stored subscriptions (bulk send).

        Returns {"sent": int, "failed": int}.
        """
        from api.models import PushSubscription

        subscriptions = list(PushSubscription.objects.select_related("user").all())
        sent = 0
        failed = 0

        for sub in subscriptions:
            delivered, _ = PushNotificationService.send_to_subscription(
                sub, title, body, url
            )
            if delivered:
                sent += 1
            else:
                failed += 1

        logger.info(
            "Bulk push sent=%d failed=%d title=%r",
            sent,
            failed,
            title,
        )
        return {"sent": sent, "failed": failed}

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
from django.db.models import F
from django.utils import timezone

logger = logging.getLogger(__name__)
TRANSIENT_WEB_PUSH_STATUSES = {408, 409, 425, 429, 500, 502, 503, 504}


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
    def _record_attempt(
        subscription: Any,
        title: str,
        body: str,
        url: str,
        status: str,
        attempt_number: int,
        http_status: int | None = None,
        error_message: str = "",
    ) -> None:
        from api.models import PushNotificationAttempt

        try:
            PushNotificationAttempt.objects.create(
                subscription=(
                    subscription if getattr(subscription, "pk", None) else None
                ),
                user_id=getattr(subscription, "user_id", None),
                endpoint=getattr(subscription, "endpoint", ""),
                title=title[:200],
                body=body,
                url=url[:500],
                status=status,
                http_status=http_status,
                error_message=error_message[:2000],
                attempt_number=attempt_number,
            )
        except Exception:
            logger.exception(
                "Failed to record push notification attempt for subscription pk=%s",
                getattr(subscription, "pk", None),
            )

    @staticmethod
    def _mark_success(subscription: Any) -> None:
        from api.models import PushSubscription

        PushSubscription.objects.filter(pk=subscription.pk).update(
            last_success_at=timezone.now(),
            failure_count=0,
        )

    @staticmethod
    def _mark_failure(subscription: Any) -> None:
        from api.models import PushSubscription

        PushSubscription.objects.filter(pk=subscription.pk).update(
            last_failure_at=timezone.now(),
            failure_count=F("failure_count") + 1,
        )

    @staticmethod
    def _is_transient_status(status_code: int | None) -> bool:
        return status_code in TRANSIENT_WEB_PUSH_STATUSES

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
            PushNotificationService._record_attempt(
                subscription=subscription,
                title=title,
                body=body,
                url=url,
                status="unavailable",
                attempt_number=1,
                error_message="pywebpush is not installed",
            )
            return False, False

        max_attempts = 2
        for attempt_number in range(1, max_attempts + 1):
            try:
                webpush_func(
                    subscription_info=PushNotificationService._build_subscription_info(
                        subscription
                    ),
                    data=payload,
                    vapid_private_key=settings.VAPID_PRIVATE_KEY,
                    vapid_claims=claims,
                )
                PushNotificationService._record_attempt(
                    subscription=subscription,
                    title=title,
                    body=body,
                    url=url,
                    status="sent",
                    attempt_number=attempt_number,
                )
                PushNotificationService._mark_success(subscription)
                return True, False
            except Exception as exc:
                if webpush_exception_cls is not None and isinstance(
                    exc, webpush_exception_cls
                ):
                    response = getattr(exc, "response", None)
                    status = response.status_code if response is not None else None
                    if status in (404, 410):
                        PushNotificationService._record_attempt(
                            subscription=subscription,
                            title=title,
                            body=body,
                            url=url,
                            status="stale_removed",
                            http_status=status,
                            error_message=str(exc),
                            attempt_number=attempt_number,
                        )
                        logger.info(
                            "Removing stale push subscription pk=%s (HTTP %s)",
                            subscription.pk,
                            status,
                        )
                        subscription.delete()
                        return False, True

                    PushNotificationService._record_attempt(
                        subscription=subscription,
                        title=title,
                        body=body,
                        url=url,
                        status="failed",
                        http_status=status,
                        error_message=str(exc),
                        attempt_number=attempt_number,
                    )
                    PushNotificationService._mark_failure(subscription)
                    logger.warning(
                        "Push delivery failed for subscription pk=%s "
                        "(attempt %d/%d, HTTP %s): %s",
                        subscription.pk,
                        attempt_number,
                        max_attempts,
                        status,
                        exc,
                    )
                    if (
                        attempt_number < max_attempts
                        and PushNotificationService._is_transient_status(status)
                    ):
                        continue
                    return False, False

                PushNotificationService._record_attempt(
                    subscription=subscription,
                    title=title,
                    body=body,
                    url=url,
                    status="failed",
                    error_message=str(exc),
                    attempt_number=attempt_number,
                )
                PushNotificationService._mark_failure(subscription)
                logger.exception(
                    "Unexpected error sending push to subscription pk=%s: %s",
                    subscription.pk,
                    exc,
                )
                return False, False

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

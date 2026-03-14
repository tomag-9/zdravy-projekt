"""
Push notification API views.

Endpoints:
  GET  /api/push/vapid-public-key/  – return VAPID public key (unauthenticated)
  POST /api/push/subscribe/         – save/update a push subscription
  DEL  /api/push/subscribe/         – remove a push subscription
  POST /api/admin/push/send/        – admin: send notification to user(s)
"""

import logging
from typing import Any

from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import PushSubscription

logger = logging.getLogger(__name__)


class VapidPublicKeyView(APIView):
    """Return the VAPID public key so the frontend can create a push subscription."""

    permission_classes = [AllowAny]
    authentication_classes: list[type[Any]] = []  # No auth needed; key is public

    def get(self, request: Request) -> Response:
        return Response({"vapid_public_key": settings.VAPID_PUBLIC_KEY})


class PushSubscribeView(APIView):
    """
    POST – save or update a Web Push subscription for the authenticated user.
    DELETE – remove a subscription by endpoint.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        endpoint = request.data.get("endpoint", "").strip()
        p256dh = request.data.get("p256dh", "").strip()
        auth = request.data.get("auth", "").strip()

        if not endpoint or not p256dh or not auth:
            return Response(
                {"detail": "endpoint, p256dh and auth are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        obj, created = PushSubscription.objects.update_or_create(
            user=request.user,
            endpoint=endpoint,
            defaults={"p256dh": p256dh, "auth": auth},
        )
        http_status = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response({"status": "subscribed"}, status=http_status)

    def delete(self, request: Request) -> Response:
        endpoint = request.data.get("endpoint", "").strip()
        if not endpoint:
            return Response(
                {"detail": "endpoint is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        deleted, _ = PushSubscription.objects.filter(
            user=request.user, endpoint=endpoint
        ).delete()
        if deleted:
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response(
            {"detail": "Subscription not found."},
            status=status.HTTP_404_NOT_FOUND,
        )


class AdminSendPushView(APIView):
    """
    Admin endpoint to manually send a push notification.

    Body:
      title   (str, required)
      body    (str, required)
      url     (str, optional, default "/home")
      user_id (int, optional) – send to a specific user; omit to send to all
    """

    permission_classes = [IsAdminUser]

    def post(self, request: Request) -> Response:
        from api.services.push_notification_service import PushNotificationService

        title = request.data.get("title", "").strip()
        body_text = request.data.get("body", "").strip()
        url = request.data.get("url", "/home").strip() or "/home"
        user_id = request.data.get("user_id")

        if not title or not body_text:
            return Response(
                {"detail": "title and body are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if user_id:
            result = PushNotificationService.send_to_user(
                user_id=int(user_id), title=title, body=body_text, url=url
            )
            return Response(result)

        result = PushNotificationService.send_to_all_subscribers(
            title=title, body=body_text, url=url
        )
        return Response(result)

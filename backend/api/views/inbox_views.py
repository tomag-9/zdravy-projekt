"""Client inbox: user's received push notifications as in-app messages."""

from django.utils import timezone
from rest_framework import permissions, serializers, status
from rest_framework.decorators import action
from rest_framework.mixins import ListModelMixin
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from ..models import PushNotificationAttempt


class InboxMessageSerializer(serializers.ModelSerializer):
    is_read = serializers.SerializerMethodField()

    class Meta:
        model = PushNotificationAttempt
        fields = ["id", "title", "body", "url", "created_at", "read_at", "is_read"]

    def get_is_read(self, obj):
        return obj.read_at is not None


class InboxViewSet(ListModelMixin, GenericViewSet):
    """
    Read-only inbox for the authenticated client.
    Only shows successfully sent messages addressed to this user.
    """

    serializer_class = InboxMessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PushNotificationAttempt.objects.filter(
            user=self.request.user,
            status=PushNotificationAttempt.STATUS_SENT,
        ).order_by("-created_at")

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        unread_count = qs.filter(read_at__isnull=True).count()
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response = self.get_paginated_response(serializer.data)
            response.data["unread_count"] = unread_count
            return response
        serializer = self.get_serializer(qs, many=True)
        return Response({"results": serializer.data, "unread_count": unread_count})

    @action(detail=True, methods=["post"], url_path="read")
    def mark_read(self, request, pk=None):
        """POST /api/inbox/{id}/read/ — mark one message read."""
        msg = self.get_object()
        if msg.read_at is None:
            msg.read_at = timezone.now()
            msg.save(update_fields=["read_at"])
        return Response(self.get_serializer(msg).data)

    @action(detail=False, methods=["post"], url_path="read-all")
    def mark_all_read(self, request):
        """POST /api/inbox/read-all/ — mark all unread messages read."""
        now = timezone.now()
        updated = self.get_queryset().filter(read_at__isnull=True).update(read_at=now)
        return Response({"marked_read": updated}, status=status.HTTP_200_OK)

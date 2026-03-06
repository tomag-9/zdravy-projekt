import logging

from django.contrib.auth.models import User
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from ..services import RegistrationError, UserService

logger = logging.getLogger(__name__)


@extend_schema_view(
    list=extend_schema(tags=["admin"]),
    approve=extend_schema(tags=["admin"]),
    deny=extend_schema(tags=["admin"]),
)
class PendingRegistrationsViewSet(viewsets.ViewSet):
    """
    ViewSet for managing pending user registrations (admin only).

    GET /api/admin/pending-registrations/ - List pending registrations
    POST /api/admin/pending-registrations/{id}/approve/ - Approve registration
    POST /api/admin/pending-registrations/{id}/deny/ - Deny registration
    """

    permission_classes = [permissions.IsAdminUser]

    def list(self, request):
        """List all pending registrations."""
        from ..serializers_user import PendingRegistrationSerializer

        pending_users = UserService.get_pending_registrations()
        serializer = PendingRegistrationSerializer(pending_users, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        """Approve a pending registration."""
        try:
            user = UserService.approve_registration(pk, request.user)
        except User.DoesNotExist:
            return Response(
                {"detail": "Používateľ nebol nájdený."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except RegistrationError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "detail": "Registrácia bola úspešne schválená.",
                "user_id": user.id,
                "email": user.email,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def deny(self, request, pk=None):
        """Deny a pending registration."""
        denial_reason = request.data.get("reason", "")
        try:
            user = UserService.deny_registration(pk, request.user, denial_reason)
        except User.DoesNotExist:
            return Response(
                {"detail": "Používateľ nebol nájdený."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except RegistrationError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "detail": "Registrácia bola zamietnutá.",
                "user_id": user.id,
                "email": user.email,
            },
            status=status.HTTP_200_OK,
        )

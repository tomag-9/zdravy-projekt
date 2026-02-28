import logging

from django.conf import settings
from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.db import transaction
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.html import strip_tags
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

logger = logging.getLogger(__name__)


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
        from ..models import UserProfile
        from ..serializers_user import PendingRegistrationSerializer

        pending_users = User.objects.filter(
            profile__registration_status=UserProfile.REGISTRATION_PENDING
        ).select_related("profile")

        serializer = PendingRegistrationSerializer(pending_users, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        """Approve a pending registration."""
        from ..models import UserProfile

        try:
            user = User.objects.select_related("profile").get(pk=pk)
        except User.DoesNotExist:
            return Response(
                {"detail": "Používateľ nebol nájdený."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not hasattr(user, "profile"):
            return Response(
                {"detail": "Používateľ nemá profil."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        profile = user.profile

        if profile.registration_status != UserProfile.REGISTRATION_PENDING:
            return Response(
                {"detail": "Registrácia nie je v stave čakajúca."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not profile.email_verified:
            return Response(
                {"detail": "Email používateľa ešte nebol overený."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Approve registration with transaction protection
        with transaction.atomic():
            profile.registration_status = UserProfile.REGISTRATION_APPROVED
            profile.approval_date = timezone.now()
            profile.approved_by = request.user
            profile.save()

            # Activate user account
            user.is_active = True
            user.save()

        # Send approval email
        try:
            frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
            login_url = f"{frontend_url}/login"

            context = {
                "user": user,
                "company_name": profile.company_name,
                "login_url": login_url,
            }

            subject = "Účet schválený - Zdravý projekt"
            html_message = render_to_string("email/registration_approved.html", context)
            plain_message = strip_tags(html_message)

            send_mail(
                subject=subject,
                message=plain_message,
                from_email=getattr(
                    settings, "DEFAULT_FROM_EMAIL", "noreply@example.com"
                ),
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=False,
            )

            logger.info(f"Approval email sent to {user.email}")
        except Exception as e:
            logger.error(f"Failed to send approval email to {user.email}: {e}")

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
        from ..models import UserProfile

        try:
            user = User.objects.select_related("profile").get(pk=pk)
        except User.DoesNotExist:
            return Response(
                {"detail": "Používateľ nebol nájdený."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not hasattr(user, "profile"):
            return Response(
                {"detail": "Používateľ nemá profil."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        profile = user.profile

        if profile.registration_status != UserProfile.REGISTRATION_PENDING:
            return Response(
                {"detail": "Registrácia nie je v stave čakajúca."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get denial reason from request
        denial_reason = request.data.get("reason", "")

        # Deny registration with transaction protection
        with transaction.atomic():
            profile.registration_status = UserProfile.REGISTRATION_DENIED
            profile.approval_date = timezone.now()
            profile.approved_by = request.user
            profile.denial_reason = denial_reason
            profile.save()

        # Send denial email
        try:
            context = {
                "user": user,
                "company_name": profile.company_name,
                "denial_reason": denial_reason,
            }

            subject = "Registrácia zamietnutá - Zdravý projekt"
            html_message = render_to_string("email/registration_denied.html", context)
            plain_message = strip_tags(html_message)

            send_mail(
                subject=subject,
                message=plain_message,
                from_email=getattr(
                    settings, "DEFAULT_FROM_EMAIL", "noreply@example.com"
                ),
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=False,
            )

            logger.info(f"Denial email sent to {user.email}")
        except Exception as e:
            logger.error(f"Failed to send denial email to {user.email}: {e}")

        return Response(
            {
                "detail": "Registrácia bola zamietnutá.",
                "user_id": user.id,
                "email": user.email,
            },
            status=status.HTTP_200_OK,
        )

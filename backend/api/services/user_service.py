"""User service – business logic for registration, approval and profile management."""

import logging

from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import QuerySet
from django.utils import timezone

from .notification_service import NotificationService

logger = logging.getLogger(__name__)


class RegistrationError(ValueError):
    """Raised when a registration business-rule is violated."""


class UserService:
    """Business logic for user lifecycle: registration, approval, denial."""

    # ------------------------------------------------------------------ #
    # Registration
    # ------------------------------------------------------------------ #

    @staticmethod
    def register_user(request_data: dict, client_ip: str) -> User:
        """
        Validate, create and send a verification email for a new user.

        Args:
            request_data: Raw POST data (company, email, password …).
            client_ip: Caller's IP address for rate-limit enforcement.

        Returns:
            The newly created (inactive) User instance.

        Raises:
            RateLimitExceeded: IP has exceeded the registration rate limit.
            RegistrationError: Serializer validation failed – wraps the error
                               dict as the exception *args[0]*.
        """
        from ..email_verification_service import (
            generate_verification_token,
            send_verification_email,
        )
        from ..rate_limit import check_registration_rate_limit, record_verification_sent
        from ..serializers_user import RegistrationSerializer

        check_registration_rate_limit(client_ip)  # raises RateLimitExceeded

        serializer = RegistrationSerializer(data=request_data)
        if not serializer.is_valid():
            raise RegistrationError(serializer.errors)

        user: User = serializer.save()

        try:
            token = generate_verification_token(user)
            send_verification_email(user, token)
            record_verification_sent(user.email)
        except Exception as exc:
            logger.error(
                "Failed to send verification email for %s: %s", user.email, exc
            )
            # Do not roll back – registration succeeded; email failure is non-fatal.

        return user

    # ------------------------------------------------------------------ #
    # Pending registrations (admin)
    # ------------------------------------------------------------------ #

    @staticmethod
    def get_pending_registrations() -> QuerySet:
        """Return all users currently in REGISTRATION_PENDING status."""
        from ..models import UserProfile

        return User.objects.filter(
            profile__registration_status=UserProfile.REGISTRATION_PENDING
        ).select_related("profile")

    @staticmethod
    def approve_registration(user_id: int, admin_user: User) -> User:
        """
        Approve a pending registration.

        Args:
            user_id: PK of the user to approve.
            admin_user: The admin performing the action (stored on the profile).

        Returns:
            The approved User instance.

        Raises:
            User.DoesNotExist: *user_id* not found.
            RegistrationError: Business-rule violation (no profile, wrong
                               status, or email not verified).
        """
        from ..models import UserProfile

        user = User.objects.select_related("profile").get(pk=user_id)

        if not hasattr(user, "profile"):
            raise RegistrationError("Používateľ nemá profil.")

        profile = user.profile

        if profile.registration_status != UserProfile.REGISTRATION_PENDING:
            raise RegistrationError("Registrácia nie je v stave čakajúca.")

        if not profile.email_verified:
            raise RegistrationError("Email používateľa ešte nebol overený.")

        with transaction.atomic():
            profile.registration_status = UserProfile.REGISTRATION_APPROVED
            profile.approval_date = timezone.now()
            profile.approved_by = admin_user
            profile.save()

            user.is_active = True
            user.save()

        NotificationService.send_approval_email(user, profile.company_name)
        return user

    @staticmethod
    def deny_registration(user_id: int, admin_user: User, reason: str = "") -> User:
        """
        Deny a pending registration.

        Args:
            user_id: PK of the user to deny.
            admin_user: The admin performing the action.
            reason: Optional textual reason stored on the profile.

        Returns:
            The denied User instance.

        Raises:
            User.DoesNotExist: *user_id* not found.
            RegistrationError: Business-rule violation (no profile or wrong status).
        """
        from ..models import UserProfile

        user = User.objects.select_related("profile").get(pk=user_id)

        if not hasattr(user, "profile"):
            raise RegistrationError("Používateľ nemá profil.")

        profile = user.profile

        if profile.registration_status != UserProfile.REGISTRATION_PENDING:
            raise RegistrationError("Registrácia nie je v stave čakajúca.")

        with transaction.atomic():
            profile.registration_status = UserProfile.REGISTRATION_DENIED
            profile.approved_by = admin_user
            profile.denial_reason = reason
            profile.save()

        NotificationService.send_denial_email(user, profile.company_name, reason)
        return user

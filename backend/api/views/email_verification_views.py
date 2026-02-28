import logging

from django.contrib.auth.models import User
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)


class EmailVerificationView(APIView):
    """
    POST /api/auth/verify-email/
    Body: {"token": "<verification_token>"}

    Verify user's email address using verification token.
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from ..email_verification_service import verify_email_token

        token = request.data.get("token", "").strip()

        if not token:
            return Response(
                {"detail": "Token je povinný."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        success, message, user = verify_email_token(token)

        if not success:
            return Response(
                {"detail": message},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "detail": message,
                "email": user.email if user else None,
            },
            status=status.HTTP_200_OK,
        )


class ResendVerificationEmailView(APIView):
    """
    POST /api/auth/resend-verification/
    Body: {"email": "<user_email>"}

    Resend verification email to user.
    Rate limited to prevent email spam.
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from ..email_verification_service import resend_verification_email
        from ..rate_limit import (
            TooSoonError,
            check_verification_resend_rate_limit,
            record_verification_sent,
        )

        email = request.data.get("email", "").strip().lower()

        if not email:
            return Response(
                {"detail": "Email je povinný."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check rate limit for this email
        try:
            check_verification_resend_rate_limit(email)
        except TooSoonError as e:
            return Response(
                {
                    "detail": f"Počkajte {e.wait_seconds} sekúnd pred opätovným odoslaním."
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
                headers={"Retry-After": str(e.wait_seconds)},
            )

        try:
            user = User.objects.get(username__iexact=email)
        except User.DoesNotExist:
            # Don't reveal if email exists
            return Response(
                {"detail": "Ak je email registrovaný, bol odoslaný verifikačný link."},
                status=status.HTTP_200_OK,
            )

        if hasattr(user, "profile") and user.profile.email_verified:
            # Don't reveal that email is already verified (prevent enumeration)
            return Response(
                {"detail": "Ak je email registrovaný, bol odoslaný verifikačný link."},
                status=status.HTTP_200_OK,
            )

        try:
            resend_verification_email(user)
            record_verification_sent(email)
        except Exception as e:
            logger.error(f"Failed to resend verification email: {e}")

        return Response(
            {"detail": "Ak je email registrovaný, bol odoslaný verifikačný link."},
            status=status.HTTP_200_OK,
        )

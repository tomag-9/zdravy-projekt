import logging

from django.contrib.auth.models import User
from rest_framework import permissions, status
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

logger = logging.getLogger(__name__)


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """JWT token serializer that authenticates via email instead of username."""

    username_field = "email"

    def validate(self, attrs):
        email = attrs.get("email", "").strip().lower()
        password = attrs.get("password", "")

        if not email:
            raise AuthenticationFailed("Nesprávny email alebo heslo.")

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            raise AuthenticationFailed("Nesprávny email alebo heslo.")
        except User.MultipleObjectsReturned:
            raise AuthenticationFailed("Nesprávny email alebo heslo.")

        if not user.check_password(password):
            raise AuthenticationFailed("Nesprávny email alebo heslo.")

        if not user.is_active:
            raise AuthenticationFailed("Tento účet je neaktívny.")

        refresh = RefreshToken.for_user(user)
        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }


class EmailTokenObtainPairView(TokenObtainPairView):
    """JWT token view that authenticates via email instead of username."""

    serializer_class = EmailTokenObtainPairSerializer


class PasswordResetRequestView(APIView):
    """
    POST /api/auth/password-reset/
    Body: {"email": "user@example.com"}

    Initiates a password-reset flow.
    Always returns HTTP 200 to avoid leaking whether an email is registered.
    Returns HTTP 429 with a retry_after field when rate-limited.
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from ..password_reset_service import (
            RateLimitExceeded,
            TooSoonError,
            request_password_reset,
        )

        email = request.data.get("email", "").strip()
        if not email:
            return Response(
                {"detail": "Pole e-mail je povinné."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            request_password_reset(email)
        except RateLimitExceeded as exc:
            minutes = round(exc.retry_after_seconds / 60)
            return Response(
                {
                    "detail": (
                        f"Príliš veľa pokusov. Skúste to znova za {minutes} minút."
                    ),
                    "retry_after_seconds": exc.retry_after_seconds,
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        except TooSoonError as exc:
            return Response(
                {
                    "detail": (
                        f"E-mail bol práve odoslaný. "
                        f"Opätovné odoslanie bude možné za {exc.wait_seconds} sekúnd."
                    ),
                    "wait_seconds": exc.wait_seconds,
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        except Exception:
            logger.exception(
                "Unexpected error during password reset request for %s", email
            )
            return Response(
                {
                    "detail": (
                        "Ak je táto e-mailová adresa registrovaná, "
                        "bol na ňu odoslaný odkaz na obnovu hesla."
                    )
                },
                status=status.HTTP_200_OK,
            )

        return Response(
            {
                "detail": (
                    "Ak je táto e-mailová adresa registrovaná, "
                    "bol na ňu odoslaný odkaz na obnovu hesla."
                )
            },
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    """
    POST /api/auth/password-reset/confirm/
    Body: {"token": "<reset_token>", "new_password": "<new_password>"}

    Validates the token and sets the new password.
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from ..password_reset_service import confirm_password_reset

        token = request.data.get("token", "").strip()
        new_password = request.data.get("new_password", "")

        if not token or not new_password:
            return Response(
                {"detail": "Polia token a new_password sú povinné."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            confirm_password_reset(token=token, new_password=new_password)
        except ValueError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"detail": "Heslo bolo úspešne zmenené. Môžete sa prihlásiť."},
            status=status.HTTP_200_OK,
        )

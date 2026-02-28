import logging

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)


class RegistrationView(APIView):
    """
    POST /api/auth/register/

    Register new user with company details. Creates user with pending status
    and sends email verification link.

    Rate limited to prevent spam registrations.
    """

    permission_classes = [permissions.AllowAny]

    def _get_client_ip(self, request):
        """Get client IP address from request."""
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            ip = x_forwarded_for.split(",")[0].strip()
        else:
            ip = request.META.get("REMOTE_ADDR")
        return ip

    def post(self, request):
        from ..email_verification_service import (
            generate_verification_token,
            send_verification_email,
        )
        from ..rate_limit import (
            RateLimitExceeded,
            check_registration_rate_limit,
            record_verification_sent,
        )
        from ..serializers_user import RegistrationSerializer

        # Check rate limit by IP address
        client_ip = self._get_client_ip(request)
        try:
            check_registration_rate_limit(client_ip)
        except RateLimitExceeded as e:
            return Response(
                {
                    "detail": f"Príliš veľa pokusov o registráciu. Skúste znova o {e.retry_after_seconds} sekúnd."
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
                headers={"Retry-After": str(e.retry_after_seconds)},
            )

        serializer = RegistrationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Create user and profile
        user = serializer.save()

        # Generate and send verification email
        try:
            token = generate_verification_token(user)
            send_verification_email(user, token)
            record_verification_sent(user.email)
        except Exception as e:
            logger.error(f"Failed to send verification email: {e}")
            # Don't fail registration if email fails
            pass

        return Response(
            {
                "detail": (
                    "Registrácia bola úspešná! "
                    "Na váš email sme odoslali odkaz na overenie."
                ),
                "email": user.email,
            },
            status=status.HTTP_201_CREATED,
        )

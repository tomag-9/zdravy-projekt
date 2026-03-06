import logging

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from ..services import RegistrationError, UserService

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
        from ..rate_limit import RateLimitExceeded

        client_ip = self._get_client_ip(request)
        try:
            user = UserService.register_user(request.data, client_ip)
        except RateLimitExceeded as e:
            return Response(
                {
                    "detail": f"Príliš veľa pokusov o registráciu. Skúste znova o {e.retry_after_seconds} sekúnd."
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
                headers={"Retry-After": str(e.retry_after_seconds)},
            )
        except RegistrationError as e:
            return Response(e.args[0], status=status.HTTP_400_BAD_REQUEST)

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

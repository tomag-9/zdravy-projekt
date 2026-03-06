import logging

from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from ..services import RegistrationError, UserService

logger = logging.getLogger(__name__)


@extend_schema(tags=["registration"])
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
        """
        Register a new user account.

        Creates a user with *pending* status and sends an email-verification
        link.  Returns HTTP 201 on success.  Rate-limited by IP to prevent
        spam registrations (HTTP 429 when exceeded).
        """
        client_ip = self._get_client_ip(request)
        try:
            user = UserService.register_user(request.data, client_ip)
        except RegistrationError as e:
            # Normalize registration errors to the standardized error format.
            raw_details = e.args[0] if e.args else None
            if not isinstance(raw_details, dict):
                raw_details = {"non_field_errors": [str(e)]}
            error_payload = {
                "error": {
                    "code": "registration_error",
                    "message": "Registration failed due to invalid input.",
                    "details": raw_details,
                }
            }
            return Response(error_payload, status=status.HTTP_400_BAD_REQUEST)

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

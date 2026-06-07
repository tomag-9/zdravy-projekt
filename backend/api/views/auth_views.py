import logging
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.models import User
from django.db.models import QuerySet
from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from ..exceptions import (
    InactiveAccountError,
    InvalidCredentialsError,
    MissingRequiredFieldError,
)

logger = logging.getLogger(__name__)

# Differentiated refresh token lifetimes by role.
# Admins: 1 day — they use the web admin UI, not the PWA; short lifetime appropriate
#   given they have access to all client data.
# Clients: 30 days — they may open the app as infrequently as every two weeks;
#   rotation resets the clock on each visit so they're only logged out after 30 days
#   of complete inactivity.
_ADMIN_REFRESH_LIFETIME = timedelta(days=1)
_CLIENT_REFRESH_LIFETIME = timedelta(days=30)

_COOKIE_NAME = settings.REFRESH_TOKEN_COOKIE_NAME
_COOKIE_PATH = settings.REFRESH_TOKEN_COOKIE_PATH


def _set_refresh_cookie(response: Response, refresh_str: str, max_age: int) -> None:
    response.set_cookie(
        _COOKIE_NAME,
        refresh_str,
        max_age=max_age,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="Lax",
        path=_COOKIE_PATH,
    )


def _delete_refresh_cookie(response: Response) -> None:
    response.delete_cookie(_COOKIE_NAME, path=_COOKIE_PATH)


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """JWT token serializer that authenticates via email instead of username."""

    username_field = "email"

    @staticmethod
    def _find_user_for_login(email: str, password: str) -> User:
        """
        Resolve the login user for an email even if historical duplicate rows exist.

        Priority:
        1) active account with matching password
        2) inactive account with matching password (so caller can raise inactive error)
        """
        candidates: QuerySet[User] = User.objects.filter(email__iexact=email).order_by(
            "-is_active", "id"
        )
        if not candidates.exists():
            raise InvalidCredentialsError()

        if candidates.count() > 1:
            logger.error(
                "Duplicate user emails detected for %s (count=%s)",
                email,
                candidates.count(),
            )

        inactive_match: User | None = None
        for candidate in candidates:
            if not candidate.check_password(password):
                continue
            if candidate.is_active:
                return candidate
            if inactive_match is None:
                inactive_match = candidate

        if inactive_match is not None:
            raise InactiveAccountError()
        raise InvalidCredentialsError()

    def validate(self, attrs):
        """
        Authenticate by email + password and return JWT tokens.

        The refresh token is NOT included in the returned dict — the view pops
        it out and sets it as an httpOnly cookie.  The ``_refresh`` attribute is
        set on the serializer so the view can compute the correct max_age.
        """
        email = attrs.get("email", "").strip().lower()
        password = attrs.get("password", "")

        if not email:
            raise InvalidCredentialsError()

        user = self._find_user_for_login(email=email, password=password)

        lifetime = (
            _ADMIN_REFRESH_LIFETIME if user.is_staff else _CLIENT_REFRESH_LIFETIME
        )
        refresh = RefreshToken.for_user(user)
        refresh.set_exp(lifetime=lifetime)

        # Store on the instance so the view can read the lifetime without re-parsing
        self._refresh = refresh

        return {
            "refresh": str(refresh),  # view pops this before returning to client
            "access": str(refresh.access_token),
        }


@extend_schema(tags=["auth"])
class EmailTokenObtainPairView(TokenObtainPairView):
    """JWT login view. Returns access token in body; sets refresh token as httpOnly cookie."""

    serializer_class = EmailTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        refresh_str: str = serializer.validated_data["refresh"]
        access_str: str = serializer.validated_data["access"]
        refresh_obj: RefreshToken = serializer._refresh

        exp = refresh_obj.payload["exp"]
        iat = refresh_obj.payload["iat"]
        max_age = int(exp - iat)

        response = Response({"access": access_str}, status=status.HTTP_200_OK)
        _set_refresh_cookie(response, refresh_str, max_age=max_age)
        return response


@extend_schema(tags=["auth"])
class SafeTokenRefreshView(TokenRefreshView):
    """
    Token refresh view.

    Reads the refresh token from the httpOnly cookie (not the request body).
    Returns the new access token in the body and rotates the refresh cookie.
    """

    def post(self, request, *args, **kwargs):
        refresh_str = request.COOKIES.get(_COOKIE_NAME)
        if not refresh_str:
            raise InvalidToken("Refresh token nenájdený.")

        # Inject the cookie value into request data so the parent serializer can read it
        data = (
            request.data.copy() if hasattr(request.data, "copy") else dict(request.data)
        )
        data["refresh"] = refresh_str

        serializer = self.get_serializer(data=data)
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as exc:
            raise InvalidToken(exc.args[0]) from exc
        except User.DoesNotExist:
            raise InvalidToken("Token neplatný alebo expirovaný.")

        new_access: str = serializer.validated_data["access"]
        # ROTATE_REFRESH_TOKENS=True → the serializer returns a new refresh token
        new_refresh: str | None = serializer.validated_data.get("refresh")

        response = Response({"access": new_access}, status=status.HTTP_200_OK)

        if new_refresh:
            try:
                obj = RefreshToken(new_refresh)  # type: ignore[arg-type]
                max_age = int(obj.payload["exp"] - obj.payload["iat"])
            except Exception:
                max_age = int(_CLIENT_REFRESH_LIFETIME.total_seconds())
            _set_refresh_cookie(response, new_refresh, max_age=max_age)

        return response


@extend_schema(tags=["auth"])
class LogoutView(APIView):
    """
    POST /api/token/logout/

    Blacklists the refresh token from the httpOnly cookie and clears it.
    Requires a valid access token in the Authorization header.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh_str = request.COOKIES.get(_COOKIE_NAME)
        if refresh_str:
            try:
                token = RefreshToken(refresh_str)
                token.blacklist()
            except Exception:
                # Already blacklisted or otherwise invalid — proceed with logout anyway
                pass

        response = Response(
            {"detail": "Odhlásenie bolo úspešné."}, status=status.HTTP_200_OK
        )
        _delete_refresh_cookie(response)
        return response


@extend_schema(tags=["auth"])
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
        from ..exceptions import RateLimitExceeded, TooSoonError
        from ..password_reset_service import request_password_reset

        email = request.data.get("email", "").strip()
        if not email:
            raise MissingRequiredFieldError("email", detail="Pole e-mail je povinné.")

        try:
            request_password_reset(email)
        except (RateLimitExceeded, TooSoonError):
            raise
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


@extend_schema(tags=["auth"])
class PasswordResetConfirmView(APIView):
    """
    POST /api/auth/password-reset/confirm/
    Body: {"token": "<reset_token>", "new_password": "<new_password>"}

    Validates the token, sets the new password, and invalidates all outstanding
    JWT refresh tokens for the user so existing sessions are terminated.
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from ..password_reset_service import confirm_password_reset

        token = request.data.get("token", "").strip()
        new_password = request.data.get("new_password", "")

        if not token:
            raise MissingRequiredFieldError("token", detail="Token je povinný.")
        if not new_password:
            raise MissingRequiredFieldError(
                "new_password", detail="Nové heslo je povinné."
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

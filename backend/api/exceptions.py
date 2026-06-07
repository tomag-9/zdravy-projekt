"""
Custom exception classes for API error handling.

All custom exceptions inherit from APIException for consistent handling
and provide error codes for client-side processing.
"""

from rest_framework import status
from rest_framework.exceptions import APIException


class BaseAPIException(APIException):
    """
    Base exception for all custom API errors.

    Attributes:
        error_code: Machine-readable error code for client-side handling
        detail: Human-readable error message (can be localized)
        extra: Additional context data (e.g., deadline times, validation details)
    """

    status_code = status.HTTP_400_BAD_REQUEST
    error_code = "api_error"
    default_detail = "An error occurred."

    def __init__(self, detail=None, error_code=None, extra=None):
        """
        Initialize API exception.

        Args:
            detail: Override default error message
            error_code: Override default error code
            extra: Dictionary with additional error context
        """
        if detail is not None:
            self.detail = detail
        else:
            self.detail = self.default_detail

        if error_code is not None:
            self.error_code = error_code

        self.extra = extra or {}


# ──────────────────────────────────────────────────────────────────────────────
# Authentication & Authorization Errors
# ──────────────────────────────────────────────────────────────────────────────


class AuthenticationError(BaseAPIException):
    """Raised when authentication fails."""

    status_code = status.HTTP_401_UNAUTHORIZED
    error_code = "authentication_failed"
    default_detail = "Authentication failed."


class InvalidCredentialsError(AuthenticationError):
    """Raised when login credentials are invalid."""

    error_code = "invalid_credentials"
    default_detail = "Nesprávny email alebo heslo."


class InactiveAccountError(AuthenticationError):
    """Retired — no longer raised at login (H3: login must not leak account state).
    Kept for import compatibility; do not use in new code."""

    error_code = "inactive_account"
    default_detail = "Tento účet je neaktívny."


class PermissionDeniedError(BaseAPIException):
    """Raised when user lacks required permissions."""

    status_code = status.HTTP_403_FORBIDDEN
    error_code = "permission_denied"
    default_detail = "Nemáte oprávnenie na túto akciu."


class AdminOnlyError(PermissionDeniedError):
    """Raised when non-admin tries to access admin-only resource."""

    error_code = "admin_only"
    default_detail = "Táto akcia je dostupná iba pre administrátorov."


class ClientOnlyError(PermissionDeniedError):
    """Raised when admin tries to access client-only resource."""

    error_code = "client_only"
    default_detail = "Administrators cannot place orders."


# ──────────────────────────────────────────────────────────────────────────────
# Validation Errors
# ──────────────────────────────────────────────────────────────────────────────


class ValidationError(BaseAPIException):
    """Raised when input validation fails."""

    status_code = status.HTTP_400_BAD_REQUEST
    error_code = "validation_error"
    default_detail = "Validation failed."


class InvalidEmailError(ValidationError):
    """Raised when email format is invalid or email already exists."""

    error_code = "invalid_email"
    default_detail = "Invalid email address."


class EmailAlreadyExistsError(ValidationError):
    """Raised when trying to register with existing email."""

    error_code = "email_already_exists"
    default_detail = "Používateľ s týmto emailom už existuje."


class PasswordMismatchError(ValidationError):
    """Raised when password and confirmation don't match."""

    error_code = "password_mismatch"
    default_detail = "Heslá sa nezhodujú."


class WeakPasswordError(ValidationError):
    """Raised when password doesn't meet security requirements."""

    error_code = "weak_password"
    default_detail = "Heslo nespĺňa bezpečnostné požiadavky."


class InvalidDateFormatError(ValidationError):
    """Raised when date format is invalid."""

    error_code = "invalid_date_format"
    default_detail = "Invalid date format, expected YYYY-MM-DD."


class MissingRequiredFieldError(ValidationError):
    """Raised when required field is missing."""

    error_code = "missing_required_field"
    default_detail = "Required field is missing."

    def __init__(self, field_name, detail=None):
        """Initialize with field name context."""
        if detail is None:
            detail = f"Pole {field_name} je povinné."
        super().__init__(detail=detail, extra={"field": field_name})


# ──────────────────────────────────────────────────────────────────────────────
# Rate Limiting Errors
# ──────────────────────────────────────────────────────────────────────────────


class RateLimitError(BaseAPIException):
    """Base class for rate limiting errors."""

    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    error_code = "rate_limit_exceeded"
    default_detail = "Too many requests."


class RateLimitExceeded(RateLimitError):
    """Raised when rate limit is exceeded (hard block)."""

    error_code = "rate_limit_exceeded"
    default_detail = "Rate limit exceeded."

    def __init__(self, retry_after_seconds, detail=None):
        """
        Initialize rate limit error.

        Args:
            retry_after_seconds: Time in seconds until retry is allowed
            detail: Optional custom message
        """
        if detail is None:
            minutes = round(retry_after_seconds / 60)
            detail = f"Príliš veľa pokusov. Skúste to znova za {minutes} minút."

        super().__init__(
            detail=detail,
            extra={
                "retry_after_seconds": retry_after_seconds,
                "retry_after_minutes": round(retry_after_seconds / 60),
            },
        )
        self.retry_after_seconds = retry_after_seconds


class TooSoonError(RateLimitError):
    """Raised when action is attempted too soon (soft cooldown)."""

    error_code = "too_soon"
    default_detail = "Please wait before trying again."

    def __init__(self, wait_seconds, detail=None):
        """
        Initialize too soon error.

        Args:
            wait_seconds: Time in seconds to wait before retry
            detail: Optional custom message
        """
        if detail is None:
            detail = f"Opakujte akciu o {wait_seconds} sekúnd."

        super().__init__(detail=detail, extra={"wait_seconds": wait_seconds})
        self.wait_seconds = wait_seconds


# ──────────────────────────────────────────────────────────────────────────────
# Business Logic Errors
# ──────────────────────────────────────────────────────────────────────────────


class OrderDeadlinePassedError(BaseAPIException):
    """Raised when trying to modify order after deadline."""

    status_code = status.HTTP_400_BAD_REQUEST
    error_code = "order_deadline_passed"
    default_detail = "Cannot modify orders after deadline."

    def __init__(self, deadline_time, current_time=None, detail=None):
        """
        Initialize deadline error with time context.

        Args:
            deadline_time: The deadline time (string or datetime)
            current_time: Current time (string or datetime)
            detail: Optional custom message
        """
        if detail is None:
            detail = f"Objednávka už nie je možná. Termín: {deadline_time}"

        extra = {"deadline": str(deadline_time)}
        if current_time:
            extra["current_time"] = str(current_time)

        super().__init__(detail=detail, extra=extra)


class OrderNotFoundError(BaseAPIException):
    """Raised when order doesn't exist."""

    status_code = status.HTTP_404_NOT_FOUND
    error_code = "order_not_found"
    default_detail = "Order not found."


class InvalidOrderDataError(ValidationError):
    """Raised when order data structure is invalid."""

    error_code = "invalid_order_data"
    default_detail = "Order data is invalid."


class HolidayOrderNotAllowedError(BaseAPIException):
    """Raised when a non-staff user tries to place an order on a holiday."""

    status_code = status.HTTP_400_BAD_REQUEST
    error_code = "holiday"
    default_detail = "Na tento deň nie je možné zadať objednávku (voľný deň)."


# ──────────────────────────────────────────────────────────────────────────────
# Token & Verification Errors
# ──────────────────────────────────────────────────────────────────────────────


class TokenError(BaseAPIException):
    """Base class for token-related errors."""

    status_code = status.HTTP_400_BAD_REQUEST
    error_code = "token_error"
    default_detail = "Token error."


class InvalidTokenError(TokenError):
    """Raised when token is invalid or doesn't exist."""

    error_code = "invalid_token"
    default_detail = "Token je neplatný alebo neexistuje."


class ExpiredTokenError(TokenError):
    """Raised when token has expired."""

    error_code = "expired_token"
    default_detail = "Token vypršal."


class AlreadyUsedTokenError(TokenError):
    """Raised when token was already used."""

    error_code = "token_already_used"
    default_detail = "Token bol už použitý."


# ──────────────────────────────────────────────────────────────────────────────
# Resource Errors
# ──────────────────────────────────────────────────────────────────────────────


class ResourceNotFoundError(BaseAPIException):
    """Raised when requested resource doesn't exist."""

    status_code = status.HTTP_404_NOT_FOUND
    error_code = "resource_not_found"
    default_detail = "Resource not found."


class ResourceAlreadyExistsError(BaseAPIException):
    """Raised when trying to create resource that already exists."""

    status_code = status.HTTP_409_CONFLICT
    error_code = "resource_already_exists"
    default_detail = "Resource already exists."


# ──────────────────────────────────────────────────────────────────────────────
# Report Generation Errors
# ──────────────────────────────────────────────────────────────────────────────


class ReportGenerationError(BaseAPIException):
    """Raised when report generation fails."""

    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    error_code = "report_generation_failed"
    default_detail = "Report generation failed."


class InvalidReportFormatError(ValidationError):
    """Raised when report format is not supported."""

    error_code = "invalid_report_format"
    default_detail = "Invalid report format."

    def __init__(self, valid_formats=None, detail=None):
        """
        Initialize with valid formats context.

        Args:
            valid_formats: List of valid format strings
            detail: Optional custom message
        """
        if detail is None and valid_formats:
            detail = f"Format must be one of: {', '.join(sorted(valid_formats))}"

        extra = {}
        if valid_formats:
            extra["valid_formats"] = sorted(valid_formats)

        super().__init__(detail=detail, extra=extra)

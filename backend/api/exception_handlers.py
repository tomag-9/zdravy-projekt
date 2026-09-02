"""
Custom exception handler for DRF API.

Provides standardized error response format across all endpoints.
"""

import logging

from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models.deletion import ProtectedError
from django.http import Http404
from rest_framework import status
from rest_framework.exceptions import APIException, Throttled, ValidationError
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

from .exceptions import (
    BaseAPIException,
    HolidayOrderNotAllowedError,
    OrderDeadlinePassedError,
    PrevadzkaClosureOrderNotAllowedError,
)

logger = logging.getLogger(__name__)

# Objednávkové zamietnutia, ktoré klientovi vyzerajú ako "nepodarilo sa
# odoslať" bez zjavnej príčiny — predtým sa nelogovali vôbec, takže dohľadať
# PREČO konkrétny request padol (ktoré jedlo, aký termín) šlo len ručnou
# rekonštrukciou nad produkčnou DB (viď incident Vyšehradská, 2.9.2026).
_ORDER_REJECTION_EXCEPTIONS = (
    OrderDeadlinePassedError,
    HolidayOrderNotAllowedError,
    PrevadzkaClosureOrderNotAllowedError,
)


def custom_exception_handler(exc, context):
    """
    Custom exception handler for DRF that returns standardized error format.

    Error Response Format:
    {
        "error": {
            "code": "error_code",
            "message": "Human-readable error message",
            "details": {
                "field": "additional context",
                "retry_after_seconds": 60
            }
        }
    }

    Args:
        exc: The exception instance
        context: Dict with 'view' and 'request' keys

    Returns:
        Response with standardized error format
    """
    # Let DRF handle the exception first to get the response
    response = drf_exception_handler(exc, context)

    # If DRF couldn't handle it, handle Django exceptions
    if response is None:
        if isinstance(exc, Http404):
            return Response(
                {
                    "error": {
                        "code": "not_found",
                        "message": "Resource not found.",
                        "details": {},
                    }
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if isinstance(exc, DjangoPermissionDenied):
            return Response(
                {
                    "error": {
                        "code": "permission_denied",
                        "message": "You do not have permission to perform this action.",
                        "details": {},
                    }
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if isinstance(exc, DjangoValidationError):
            return Response(
                {
                    "error": {
                        "code": "validation_error",
                        "message": "Validation failed.",
                        "details": {
                            "errors": (
                                exc.messages if hasattr(exc, "messages") else str(exc)
                            )
                        },
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if isinstance(exc, ProtectedError):
            return Response(
                {
                    "error": {
                        "code": "protected_error",
                        "message": (
                            "Túto položku nie je možné odstrániť, pretože sú na ňu "
                            "naviazané ďalšie záznamy."
                        ),
                        "details": {},
                    }
                },
                status=status.HTTP_409_CONFLICT,
            )

        # Log unhandled exceptions
        logger.exception("Unhandled exception: %s", exc)
        return Response(
            {
                "error": {
                    "code": "internal_error",
                    "message": "An internal error occurred.",
                    "details": {},
                }
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # Customize response for our custom exceptions
    if isinstance(exc, BaseAPIException):
        error_data = {
            "code": exc.error_code,
            "message": str(exc.detail),
            "details": exc.extra,
        }
        if isinstance(exc, _ORDER_REJECTION_EXCEPTIONS):
            request = context.get("request")
            user = getattr(request, "user", None)
            logger.warning(
                "Objednávka zamietnutá (%s): user=%s path=%s detail=%s extra=%s",
                exc.error_code,
                getattr(user, "email", None) or "anonymous",
                getattr(request, "path", "?"),
                exc.detail,
                exc.extra,
            )
        response.data = {"error": error_data}
        return response

    # DRF's built-in Throttled (used by GlobalRateThrottle) — reshape into the
    # same rate_limit_exceeded/retry_after_seconds shape as the hand-rolled
    # RateLimitExceeded in exceptions.py, so callers only handle one format.
    if isinstance(exc, Throttled):
        wait = exc.wait or 0
        error_data = {
            "code": "rate_limit_exceeded",
            "message": "Príliš veľa požiadaviek. Skúste to znova o chvíľu.",
            "details": {
                "retry_after_seconds": wait,
                "retry_after_minutes": round(wait / 60),
            },
        }
        response.data = {"error": error_data}
        return response

    # Handle DRF ValidationError (from serializers)
    if isinstance(exc, ValidationError):
        # ValidationError can have different formats
        if isinstance(exc.detail, dict):
            # Field-specific errors: {"email": ["This field is required"], ...}
            error_data = {
                "code": "validation_error",
                "message": "Validation failed.",
                "details": exc.detail,
            }
        elif isinstance(exc.detail, list):
            # Non-field errors: ["Error message 1", "Error message 2"]
            error_data = {
                "code": "validation_error",
                "message": exc.detail[0] if exc.detail else "Validation failed.",
                "details": {"errors": exc.detail},
            }
        else:
            # String error
            error_data = {
                "code": "validation_error",
                "message": str(exc.detail),
                "details": {},
            }

        response.data = {"error": error_data}
        return response

    # Handle other DRF APIExceptions
    if isinstance(exc, APIException):
        error_code = getattr(exc, "default_code", "error")

        error_data = {
            "code": error_code,
            "message": str(exc.detail),
            "details": {},
        }

        response.data = {"error": error_data}
        return response

    return response


def get_error_response(
    error_code: str,
    message: str,
    details: dict | None = None,
    status_code: int = status.HTTP_400_BAD_REQUEST,
) -> Response:
    """
    Helper function to create standardized error responses manually.

    Use this in views when you want to return an error without raising an exception.

    Args:
        error_code: Machine-readable error code
        message: Human-readable error message
        details: Additional context dictionary
        status_code: HTTP status code

    Returns:
        Response object with standardized error format

    Example:
        return get_error_response(
            error_code="invalid_date",
            message="Date must be in YYYY-MM-DD format",
            details={"provided": "2024-13-45"},
            status_code=400
        )
    """
    return Response(
        {
            "error": {
                "code": error_code,
                "message": message,
                "details": details or {},
            }
        },
        status=status_code,
    )

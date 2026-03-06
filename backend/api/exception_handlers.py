"""
Custom exception handler for DRF API.

Provides standardized error response format across all endpoints.
"""

import logging

from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import Http404
from rest_framework import status
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

from .exceptions import BaseAPIException

logger = logging.getLogger(__name__)


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

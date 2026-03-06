"""
Unit tests for custom exceptions and exception handler.
"""

import pytest
from rest_framework import status
from rest_framework.test import APIRequestFactory

from api.exception_handlers import custom_exception_handler, get_error_response
from api.exceptions import (
    ClientOnlyError,
    EmailAlreadyExistsError,
    InactiveAccountError,
    InvalidCredentialsError,
    InvalidDateFormatError,
    InvalidReportFormatError,
    MissingRequiredFieldError,
    OrderDeadlinePassedError,
    RateLimitExceeded,
    TooSoonError,
)


class TestCustomExceptions:
    """Test custom exception classes."""

    def test_invalid_credentials_error(self):
        """Test InvalidCredentialsError has correct attributes."""
        exc = InvalidCredentialsError()
        assert exc.status_code == status.HTTP_401_UNAUTHORIZED
        assert exc.error_code == "invalid_credentials"
        assert "Nesprávny" in str(exc.detail)

    def test_inactive_account_error(self):
        """Test InactiveAccountError has correct attributes."""
        exc = InactiveAccountError()
        assert exc.status_code == status.HTTP_401_UNAUTHORIZED
        assert exc.error_code == "inactive_account"
        assert "neaktívny" in str(exc.detail)

    def test_client_only_error(self):
        """Test ClientOnlyError has correct attributes."""
        exc = ClientOnlyError()
        assert exc.status_code == status.HTTP_403_FORBIDDEN
        assert exc.error_code == "client_only"
        assert "Administrators" in str(exc.detail)

    def test_email_already_exists_error(self):
        """Test EmailAlreadyExistsError has correct attributes."""
        exc = EmailAlreadyExistsError()
        assert exc.status_code == status.HTTP_400_BAD_REQUEST
        assert exc.error_code == "email_already_exists"
        assert "existuje" in str(exc.detail)

    def test_missing_required_field_error(self):
        """Test MissingRequiredFieldError includes field name in extra."""
        exc = MissingRequiredFieldError("email")
        assert exc.status_code == status.HTTP_400_BAD_REQUEST
        assert exc.error_code == "missing_required_field"
        assert exc.extra["field"] == "email"
        assert "email" in str(exc.detail)

    def test_rate_limit_exceeded(self):
        """Test RateLimitExceeded includes retry_after in extra."""
        exc = RateLimitExceeded(retry_after_seconds=3600)
        assert exc.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert exc.error_code == "rate_limit_exceeded"
        assert exc.extra["retry_after_seconds"] == 3600
        assert exc.extra["retry_after_minutes"] == 60
        assert exc.retry_after_seconds == 3600

    def test_too_soon_error(self):
        """Test TooSoonError includes wait_seconds in extra."""
        exc = TooSoonError(wait_seconds=60)
        assert exc.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert exc.error_code == "too_soon"
        assert exc.extra["wait_seconds"] == 60
        assert exc.wait_seconds == 60

    def test_order_deadline_passed_error(self):
        """Test OrderDeadlinePassedError includes deadline context."""
        exc = OrderDeadlinePassedError(deadline_time="10:00", current_time="11:30")
        assert exc.status_code == status.HTTP_400_BAD_REQUEST
        assert exc.error_code == "order_deadline_passed"
        assert exc.extra["deadline"] == "10:00"
        assert exc.extra["current_time"] == "11:30"

    def test_invalid_date_format_error(self):
        """Test InvalidDateFormatError has correct attributes."""
        exc = InvalidDateFormatError()
        assert exc.status_code == status.HTTP_400_BAD_REQUEST
        assert exc.error_code == "invalid_date_format"
        assert "YYYY-MM-DD" in str(exc.detail)

    def test_invalid_report_format_error(self):
        """Test InvalidReportFormatError includes valid formats."""
        exc = InvalidReportFormatError(valid_formats=["pdf", "xlsx"])
        assert exc.status_code == status.HTTP_400_BAD_REQUEST
        assert exc.error_code == "invalid_report_format"
        assert exc.extra["valid_formats"] == ["pdf", "xlsx"]
        assert "pdf" in str(exc.detail)

    def test_custom_detail_message(self):
        """Test that custom detail message overrides default."""
        exc = InvalidCredentialsError(detail="Custom error message")
        assert str(exc.detail) == "Custom error message"

    def test_custom_error_code(self):
        """Test that custom error code overrides default."""
        exc = InvalidCredentialsError(error_code="custom_code")
        assert exc.error_code == "custom_code"


class TestExceptionHandler:
    """Test custom exception handler."""

    @pytest.fixture
    def factory(self):
        return APIRequestFactory()

    @pytest.fixture
    def context(self, factory):
        """Create mock context for exception handler."""
        request = factory.get("/api/test/")
        return {"request": request, "view": None}

    def test_base_api_exception_formatting(self, context):
        """Test that BaseAPIException is formatted correctly."""
        exc = InvalidCredentialsError()
        response = custom_exception_handler(exc, context)

        assert response is not None
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "error" in response.data
        assert response.data["error"]["code"] == "invalid_credentials"
        assert response.data["error"]["message"] == exc.default_detail
        assert "details" in response.data["error"]

    def test_rate_limit_exception_with_extra(self, context):
        """Test that exception with extra data includes it in response."""
        exc = RateLimitExceeded(retry_after_seconds=3600)
        response = custom_exception_handler(exc, context)

        assert response is not None
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert response.data["error"]["code"] == "rate_limit_exceeded"
        assert response.data["error"]["details"]["retry_after_seconds"] == 3600
        assert response.data["error"]["details"]["retry_after_minutes"] == 60

    def test_order_deadline_with_context(self, context):
        """Test that deadline error includes time context."""
        exc = OrderDeadlinePassedError(deadline_time="10:00", current_time="11:30")
        response = custom_exception_handler(exc, context)

        assert response is not None
        assert response.data["error"]["code"] == "order_deadline_passed"
        assert response.data["error"]["details"]["deadline"] == "10:00"
        assert response.data["error"]["details"]["current_time"] == "11:30"

    def test_missing_field_error(self, context):
        """Test that missing field error includes field name."""
        exc = MissingRequiredFieldError("email")
        response = custom_exception_handler(exc, context)

        assert response is not None
        assert response.data["error"]["code"] == "missing_required_field"
        assert response.data["error"]["details"]["field"] == "email"

    def test_get_error_response_helper(self):
        """Test get_error_response helper function."""
        response = get_error_response(
            error_code="test_error",
            message="Test error message",
            details={"field": "test_field"},
            status_code=status.HTTP_400_BAD_REQUEST,
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["error"]["code"] == "test_error"
        assert response.data["error"]["message"] == "Test error message"
        assert response.data["error"]["details"]["field"] == "test_field"

    def test_get_error_response_without_details(self):
        """Test get_error_response without details dict."""
        response = get_error_response(
            error_code="simple_error", message="Simple message"
        )

        assert response.data["error"]["details"] == {}

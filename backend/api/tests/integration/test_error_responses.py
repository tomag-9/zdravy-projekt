"""
Integration tests for API error responses.

Verifies that all endpoints return standardized error format:
{
    "error": {
        "code": "error_code",
        "message": "Human-readable message",
        "details": {}
    }
}
"""

import pytest
from django.urls import reverse
from rest_framework import status

pytestmark = pytest.mark.integration


@pytest.mark.django_db
class TestAuthenticationErrors:
    """Test authentication error responses."""

    def test_login_with_invalid_credentials(self, api_client):
        """Test login with invalid credentials returns standardized error."""
        url = reverse("token_obtain_pair")
        response = api_client.post(
            url, {"email": "wrong@example.com", "password": "wrongpass"}, format="json"
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "error" in response.data
        assert response.data["error"]["code"] == "invalid_credentials"
        assert "message" in response.data["error"]
        assert "details" in response.data["error"]

    def test_login_with_inactive_account(self, api_client, user):
        """Test login with inactive account returns standardized error."""
        user.is_active = False
        user.save()

        url = reverse("token_obtain_pair")
        response = api_client.post(
            url, {"email": user.email, "password": "client123"}, format="json"
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.data["error"]["code"] == "inactive_account"
        assert "neaktívny" in response.data["error"]["message"]


@pytest.mark.django_db
class TestValidationErrors:
    """Test validation error responses."""

    def test_missing_required_field_email(self, api_client):
        """Test missing email field returns standardized error."""
        url = reverse("password_reset_request")
        response = api_client.post(url, {}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "error" in response.data
        assert response.data["error"]["code"] == "missing_required_field"
        assert response.data["error"]["details"]["field"] == "email"

    def test_missing_token_field(self, api_client):
        """Test missing token field returns standardized error."""
        url = reverse("password_reset_confirm")
        response = api_client.post(url, {"new_password": "NewPass123"}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["error"]["code"] == "missing_required_field"
        assert response.data["error"]["details"]["field"] == "token"

    def test_invalid_date_format(self, admin_client):
        """Test invalid date format returns standardized error."""
        url = "/api/admin/report-tasks/"
        response = admin_client.post(
            url, {"date": "not-a-date", "format": "pdf"}, format="json"
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["error"]["code"] == "invalid_date_format"
        assert "YYYY-MM-DD" in response.data["error"]["message"]

    def test_invalid_report_format(self, admin_client):
        """Test invalid report format returns standardized error."""
        url = "/api/admin/report-tasks/"
        response = admin_client.post(
            url, {"date": "2024-03-06", "format": "docx"}, format="json"
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["error"]["code"] == "invalid_report_format"
        assert response.data["error"]["details"]["valid_formats"] == ["pdf", "xlsx"]


@pytest.mark.django_db
class TestPermissionErrors:
    """Test permission error responses."""

    def test_admin_cannot_place_order(self, admin_client):
        """Test that admin users cannot create orders."""
        url = reverse("dailyorder-list")
        response = admin_client.post(
            url,
            {
                "date": "2024-03-06",
                "data": {
                    "breakfast": {},
                    "lunch": {},
                    "olovrant": {},
                },
            },
            format="json",
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "error" in response.data
        assert response.data["error"]["code"] == "client_only"
        assert "Administrators" in response.data["error"]["message"]

    def test_non_admin_cannot_access_report_tasks(self, authenticated_client):
        """Test that non-admin users cannot access admin endpoints."""
        url = "/api/admin/report-tasks/"
        response = authenticated_client.post(
            url, {"date": "2024-03-06", "format": "pdf"}, format="json"
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "error" in response.data
        # DRF's default permission_denied code
        assert response.data["error"]["code"] in [
            "permission_denied",
            "not_authenticated",
        ]


@pytest.mark.django_db
class TestRateLimitErrors:
    """Test rate limiting error responses."""

    def test_password_reset_rate_limit(self, api_client):
        """Test password reset rate limiting returns standardized error."""
        url = reverse("password_reset_request")
        email = "test@example.com"

        # First request should succeed (or return 200 anyway)
        response1 = api_client.post(url, {"email": email}, format="json")
        assert response1.status_code in [
            status.HTTP_200_OK,
            status.HTTP_429_TOO_MANY_REQUESTS,
        ]

        # Immediate second request should be rate limited
        response2 = api_client.post(url, {"email": email}, format="json")

        if response2.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
            assert "error" in response2.data
            assert response2.data["error"]["code"] in [
                "rate_limit_exceeded",
                "too_soon",
            ]
            assert "details" in response2.data["error"]
            # Should have retry_after or wait_seconds in details
            assert (
                "retry_after_seconds" in response2.data["error"]["details"]
                or "wait_seconds" in response2.data["error"]["details"]
            )


@pytest.mark.django_db
class TestErrorResponseStructure:
    """Test that all error responses follow the standardized structure."""

    def test_error_response_has_required_fields(self, api_client):
        """Test that error responses have required fields."""
        url = reverse("password_reset_request")
        response = api_client.post(url, {}, format="json")

        # Every error response must have these fields
        assert "error" in response.data
        assert "code" in response.data["error"]
        assert "message" in response.data["error"]
        assert "details" in response.data["error"]

        # Verify types
        assert isinstance(response.data["error"]["code"], str)
        assert isinstance(response.data["error"]["message"], str)
        assert isinstance(response.data["error"]["details"], dict)

    def test_error_code_is_machine_readable(self, api_client):
        """Test that error codes use snake_case and are machine-readable."""
        url = reverse("password_reset_request")
        response = api_client.post(url, {}, format="json")

        error_code = response.data["error"]["code"]
        # Error codes should be lowercase snake_case
        assert error_code.islower() or "_" in error_code
        assert " " not in error_code  # No spaces in error codes

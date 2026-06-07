import pytest
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status

COOKIE_NAME = "refresh_token"


@pytest.mark.django_db
class TestTokenRefresh:
    """Tests for JWT token refresh functionality"""

    def _login(self, api_client, email, password):
        return api_client.post(
            reverse("token_obtain_pair"), {"email": email, "password": password}
        )

    def test_refresh_token_success(self, api_client):
        """Valid refresh cookie returns new access token."""
        User.objects.create_user(
            "client@example.com", "client@example.com", "client123"
        )

        auth_resp = self._login(api_client, "client@example.com", "client123")
        assert auth_resp.status_code == status.HTTP_200_OK
        assert COOKIE_NAME in auth_resp.cookies

        refresh_resp = api_client.post(reverse("token_refresh"))

        assert refresh_resp.status_code == status.HTTP_200_OK
        assert "access" in refresh_resp.data
        assert refresh_resp.data["access"] != auth_resp.data["access"]

    def test_refresh_token_invalid(self, api_client):
        """Invalid refresh cookie returns 401."""
        api_client.cookies[COOKIE_NAME] = "invalid_token_here"
        response = api_client.post(reverse("token_refresh"))

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_access_token_works_after_refresh(self, api_client):
        """New access token from refresh works for authenticated requests."""
        User.objects.create_user(
            "client@example.com", "client@example.com", "client123"
        )

        self._login(api_client, "client@example.com", "client123")

        refresh_resp = api_client.post(reverse("token_refresh"))
        new_access_token = refresh_resp.data["access"]

        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {new_access_token}")
        profile_resp = api_client.get(reverse("user-profile"))

        assert profile_resp.status_code == status.HTTP_200_OK
        assert profile_resp.data["email"] == "client@example.com"


@pytest.mark.django_db
class TestSessionSecurity:
    """Tests for session and token security"""

    def test_401_or_403_on_expired_token(self, api_client):
        """Expired or invalid token returns 401 or 403"""
        api_client.credentials(HTTP_AUTHORIZATION="Bearer invalid_expired_token")

        url = reverse("user-profile")
        response = api_client.get(url)

        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ]

    def test_no_token_returns_401_or_403(self, api_client):
        """Request without token returns 401 or 403"""
        url = reverse("user-profile")
        response = api_client.get(url)

        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ]

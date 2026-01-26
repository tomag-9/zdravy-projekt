import pytest
from django.urls import reverse
from rest_framework import status
from django.contrib.auth.models import User


@pytest.mark.django_db
class TestTokenRefresh:
    """Tests for JWT token refresh functionality"""

    def test_refresh_token_success(self, api_client):
        """Valid refresh token returns new access token"""
        # Create user and get tokens
        user = User.objects.create_user("testuser", "test@example.com", "testpass")

        # Get initial token pair
        auth_url = reverse("token_obtain_pair")
        auth_resp = api_client.post(
            auth_url, {"username": "testuser", "password": "testpass"}
        )

        assert auth_resp.status_code == status.HTTP_200_OK
        refresh_token = auth_resp.data["refresh"]

        # Use refresh token to get new access token
        refresh_url = reverse("token_refresh")
        refresh_resp = api_client.post(refresh_url, {"refresh": refresh_token})

        assert refresh_resp.status_code == status.HTTP_200_OK
        assert "access" in refresh_resp.data
        assert refresh_resp.data["access"] != auth_resp.data["access"]

    def test_refresh_token_invalid(self, api_client):
        """Invalid refresh token returns error"""
        refresh_url = reverse("token_refresh")
        response = api_client.post(refresh_url, {"refresh": "invalid_token_here"})

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_access_token_works_after_refresh(self, api_client):
        """New access token from refresh works for authenticated requests"""
        # Create user and get tokens
        user = User.objects.create_user("testuser", "test@example.com", "testpass")

        # Get initial tokens
        auth_url = reverse("token_obtain_pair")
        auth_resp = api_client.post(
            auth_url, {"username": "testuser", "password": "testpass"}
        )
        refresh_token = auth_resp.data["refresh"]

        # Refresh to get new access token
        refresh_url = reverse("token_refresh")
        refresh_resp = api_client.post(refresh_url, {"refresh": refresh_token})
        new_access_token = refresh_resp.data["access"]

        # Use new access token for authenticated request
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {new_access_token}")
        profile_url = reverse("user-profile")
        profile_resp = api_client.get(profile_url)

        assert profile_resp.status_code == status.HTTP_200_OK
        assert profile_resp.data["username"] == "testuser"


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

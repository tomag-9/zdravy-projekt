import pytest
from django.urls import reverse
from rest_framework import status

COOKIE_NAME = "refresh_token"


@pytest.mark.django_db
class TestAuthentication:
    def test_obtain_token_success(self, api_client, user):
        """Test able to obtain JWT access token; refresh token is set as cookie."""
        url = reverse("token_obtain_pair")
        data = {"email": "client@example.com", "password": "client123"}
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data
        # Refresh token lives in the httpOnly cookie, not the body
        assert "refresh" not in response.data
        assert COOKIE_NAME in response.cookies

    def test_obtain_token_failure(self, api_client, user):
        """Test invalid credentials fail"""
        url = reverse("token_obtain_pair")
        data = {"email": "client@example.com", "password": "wrongpassword"}
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_refresh_token(self, api_client, user):
        """Test refreshing token via cookie."""
        # Login — cookie is set on api_client automatically
        api_client.post(
            reverse("token_obtain_pair"),
            {"email": "client@example.com", "password": "client123"},
        )

        # Refresh uses the cookie
        refresh_url = reverse("token_refresh")
        response = api_client.post(refresh_url)
        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data

    def test_refresh_token_returns_401_when_user_deleted(self, api_client, user):
        """Token refresh must return 401 (not 500) when the user no longer exists."""
        api_client.post(
            reverse("token_obtain_pair"),
            {"email": "client@example.com", "password": "client123"},
        )

        user.delete()

        response = api_client.post(reverse("token_refresh"))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

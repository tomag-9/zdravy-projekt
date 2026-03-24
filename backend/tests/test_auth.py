import pytest
from django.urls import reverse
from rest_framework import status


@pytest.mark.django_db
class TestAuthentication:
    def test_obtain_token_success(self, api_client, user):
        """Test able to obtain JWT pair"""
        url = reverse("token_obtain_pair")
        data = {"email": "client@example.com", "password": "client123"}
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data
        assert "refresh" in response.data

    def test_obtain_token_failure(self, api_client, user):
        """Test invalid credentials fail"""
        url = reverse("token_obtain_pair")
        data = {"email": "client@example.com", "password": "wrongpassword"}
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_refresh_token(self, api_client, user):
        """Test refreshing token"""
        # Get token first
        url = reverse("token_obtain_pair")
        data = {"email": "client@example.com", "password": "client123"}
        response = api_client.post(url, data)
        refresh_token = response.data["refresh"]

        # Refresh it
        refresh_url = reverse("token_refresh")
        response = api_client.post(refresh_url, {"refresh": refresh_token})
        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data

    def test_refresh_token_returns_401_when_user_deleted(self, api_client, user):
        """Token refresh must return 401 (not 500) when the user no longer exists."""
        url = reverse("token_obtain_pair")
        response = api_client.post(
            url, {"email": "client@example.com", "password": "client123"}
        )
        refresh_token = response.data["refresh"]

        user.delete()

        refresh_url = reverse("token_refresh")
        response = api_client.post(refresh_url, {"refresh": refresh_token})
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

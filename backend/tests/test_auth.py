import pytest
from django.urls import reverse
from rest_framework import status


@pytest.mark.django_db
class TestAuthentication:
    def test_obtain_token_success(self, api_client, user):
        """Test able to obtain JWT pair"""
        url = reverse("token_obtain_pair")
        data = {"username": "testuser", "password": "testpassword"}
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data
        assert "refresh" in response.data

    def test_obtain_token_failure(self, api_client, user):
        """Test invalid credentials fail"""
        url = reverse("token_obtain_pair")
        data = {"username": "testuser", "password": "wrongpassword"}
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_refresh_token(self, api_client, user):
        """Test refreshing token"""
        # Get token first
        url = reverse("token_obtain_pair")
        data = {"username": "testuser", "password": "testpassword"}
        response = api_client.post(url, data)
        refresh_token = response.data["refresh"]

        # Refresh it
        refresh_url = reverse("token_refresh")
        response = api_client.post(refresh_url, {"refresh": refresh_token})
        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data

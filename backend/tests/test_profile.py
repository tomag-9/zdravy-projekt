import pytest
from django.urls import reverse
from rest_framework import status


@pytest.mark.django_db
class TestUserProfile:
    """Tests for user profile management"""

    def test_get_profile_authenticated(self, authenticated_client, user):
        """Authenticated user can get their profile"""
        url = reverse("user-profile")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["username"] == user.username
        assert "email" in response.data
        assert "first_name" in response.data
        assert "last_name" in response.data
        assert "date_joined" in response.data
        assert "groups" in response.data

    def test_get_profile_unauthenticated(self, api_client):
        """Unauthenticated user cannot get profile"""
        url = reverse("user-profile")
        response = api_client.get(url)

        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ]

    def test_update_profile_first_name(self, authenticated_client, user):
        """User can update their first name"""
        url = reverse("user-profile")
        data = {"first_name": "Nové"}

        response = authenticated_client.patch(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["first_name"] == "Nové"

        # Verify in database
        user.refresh_from_db()
        assert user.first_name == "Nové"

    def test_update_profile_last_name(self, authenticated_client, user):
        """User can update their last name"""
        url = reverse("user-profile")
        data = {"last_name": "Priezvisko"}

        response = authenticated_client.patch(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["last_name"] == "Priezvisko"

    def test_update_profile_email(self, authenticated_client, user):
        """User can update their email"""
        url = reverse("user-profile")
        data = {"email": "novy@email.sk"}

        response = authenticated_client.patch(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["email"] == "novy@email.sk"

    def test_update_profile_multiple_fields(self, authenticated_client, user):
        """User can update multiple fields at once"""
        url = reverse("user-profile")
        data = {
            "first_name": "Ján",
            "last_name": "Novák",
            "email": "jan.novak@email.sk",
        }

        response = authenticated_client.patch(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["first_name"] == "Ján"
        assert response.data["last_name"] == "Novák"
        assert response.data["email"] == "jan.novak@email.sk"

    def test_cannot_update_username(self, authenticated_client, user):
        """User cannot change their username (read-only field)"""
        url = reverse("user-profile")
        original_username = user.username
        data = {"username": "newusername"}

        response = authenticated_client.patch(url, data, format="json")

        # Should succeed but username should not change
        assert response.status_code == status.HTTP_200_OK
        assert response.data["username"] == original_username

        user.refresh_from_db()
        assert user.username == original_username

    def test_profile_shows_user_groups(self, authenticated_client, user, db):
        """Profile shows user's groups"""
        from django.contrib.auth.models import Group

        # Create and assign a group
        group = Group.objects.create(name="client")
        user.groups.add(group)

        url = reverse("user-profile")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "client" in response.data["groups"]

    def test_update_profile_invalid_email_returns_400(self, authenticated_client):
        """Invalid email format should return 400 Bad Request"""
        url = reverse("user-profile")
        response = authenticated_client.patch(
            url, {"email": "not-an-email"}, format="json"
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "email" in response.data

    def test_update_profile_empty_email_returns_400(self, authenticated_client):
        """Empty (blank) email should return 400 because email is required"""
        url = reverse("user-profile")
        response = authenticated_client.patch(url, {"email": ""}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "email" in response.data

    def test_update_profile_cannot_set_is_staff(self, authenticated_client, user):
        """Read-only field is_staff cannot be changed by the user"""
        assert user.is_staff is False
        url = reverse("user-profile")
        response = authenticated_client.patch(url, {"is_staff": True}, format="json")

        assert response.status_code == status.HTTP_200_OK
        user.refresh_from_db()
        assert user.is_staff is False

    def test_update_profile_cannot_change_id(self, authenticated_client, user):
        """Read-only field id cannot be changed by the user"""
        original_id = user.pk
        url = reverse("user-profile")
        response = authenticated_client.patch(
            url, {"id": original_id + 999}, format="json"
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == original_id

    def test_profile_response_contains_settings(self, authenticated_client):
        """Profile response includes the nested settings object"""
        url = reverse("user-profile")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "settings" in response.data
        settings = response.data["settings"]
        assert "visible_menus" in settings
        assert "visible_meals" in settings

    def test_profile_response_contains_is_staff_flag(self, authenticated_client):
        """Profile response includes the is_staff flag (needed by frontend)"""
        url = reverse("user-profile")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "is_staff" in response.data


@pytest.mark.django_db
class TestUserDataIsolation:
    """Critical security tests to ensure users cannot see each other's data"""

    def test_user_cannot_see_other_user_profile(self, api_client, db):
        """User A cannot see User B's profile - critical security test"""
        from django.contrib.auth.models import User
        from rest_framework_simplejwt.tokens import RefreshToken

        # Create two different users
        user_a = User.objects.create_user(
            username="user_a",
            email="user_a@example.com",
            password="password123",
            first_name="User",
            last_name="A",
        )
        user_b = User.objects.create_user(
            username="user_b",
            email="user_b@example.com",
            password="password123",
            first_name="User",
            last_name="B",
        )

        # Authenticate as User A
        refresh_a = RefreshToken.for_user(user_a)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh_a.access_token}")

        url = reverse("user-profile")
        response = api_client.get(url)

        # Verify User A sees their own data
        assert response.status_code == status.HTTP_200_OK
        assert response.data["username"] == "user_a"
        assert response.data["email"] == "user_a@example.com"
        assert response.data["first_name"] == "User"
        assert response.data["last_name"] == "A"

        # Now authenticate as User B with a NEW token
        refresh_b = RefreshToken.for_user(user_b)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh_b.access_token}")

        # Fetch profile again - should get User B's data, NOT User A's
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["username"] == "user_b", "User B is seeing wrong username!"
        assert (
            response.data["email"] == "user_b@example.com"
        ), "User B is seeing wrong email!"
        assert (
            response.data["first_name"] == "User"
        ), "User B is seeing wrong first name!"
        assert response.data["last_name"] == "B", "User B is seeing wrong last name!"

        # Ensure User B does NOT see User A's data
        assert response.data["username"] != "user_a"
        assert response.data["email"] != "user_a@example.com"
        assert response.data["last_name"] != "A"

    def test_switching_users_returns_correct_data(self, api_client, db):
        """Test that switching between users returns the correct data each time"""
        from django.contrib.auth.models import User
        from rest_framework_simplejwt.tokens import RefreshToken

        # Create three users
        users = [
            User.objects.create_user(
                username=f"user_{i}",
                email=f"user_{i}@example.com",
                password="password123",
                first_name=f"First{i}",
                last_name=f"Last{i}",
            )
            for i in range(3)
        ]

        url = reverse("user-profile")

        # Test switching between users multiple times
        for _ in range(2):  # Loop twice to catch caching issues
            for i, user in enumerate(users):
                refresh = RefreshToken.for_user(user)
                api_client.credentials(
                    HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}"
                )

                response = api_client.get(url)

                assert response.status_code == status.HTTP_200_OK
                assert (
                    response.data["username"] == f"user_{i}"
                ), f"Expected user_{i}, got {response.data['username']}"
                assert (
                    response.data["email"] == f"user_{i}@example.com"
                ), f"Expected user_{i}@example.com, got {response.data['email']}"
                assert (
                    response.data["first_name"] == f"First{i}"
                ), f"Expected First{i}, got {response.data['first_name']}"
                assert (
                    response.data["last_name"] == f"Last{i}"
                ), f"Expected Last{i}, got {response.data['last_name']}"

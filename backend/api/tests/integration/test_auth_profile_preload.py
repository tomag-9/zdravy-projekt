"""JWT autentifikácia s prednačítaným profilom (#482).

`ProfileAwareJWTAuthentication.get_user` je kópiou metódy zo simplejwt, ktorá
sa líši jediným `select_related`. Tieto testy zamykajú správanie, ktoré by sa
pri aktualizácii knižnice mohlo rozísť — a hlavne to, kvôli čomu kópia vznikla:
že profil príde bez dotazu navyše.
"""

import pytest
from django.contrib.auth.models import User
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework_simplejwt.exceptions import AuthenticationFailed, InvalidToken
from rest_framework_simplejwt.tokens import AccessToken

from api.authentication import ProfileAwareJWTAuthentication
from api.models import UserProfile
from api.roles import role_of

pytestmark = pytest.mark.django_db


def _user(email="auth@example.com", *, role=UserProfile.Role.ADMIN, active=True):
    user = User.objects.create_user(
        username=email, email=email, password="x", is_staff=True, is_active=active
    )
    profile = UserProfile(user=user, role=role)
    profile._skip_default_facility = True
    profile.save()
    return user


class TestProfileComesForFree:
    def test_profile_is_loaded_with_the_user(self):
        """Jadro veci: `role_of` nesmie po autentifikácii siahať do DB."""
        user = _user()
        token = AccessToken.for_user(user)

        authenticated = ProfileAwareJWTAuthentication().get_user(token)
        with CaptureQueriesContext(connection) as ctx:
            assert role_of(authenticated) == UserProfile.Role.ADMIN
        assert len(ctx.captured_queries) == 0

    def test_login_without_profile_still_works(self):
        """Legacy login bez profilu — `role_of` spadne na príznaky, nie na chybu."""
        user = User.objects.create_user(
            username="bezprofilu@example.com",
            email="bezprofilu@example.com",
            password="x",
            is_staff=True,
            is_superuser=True,
        )
        authenticated = ProfileAwareJWTAuthentication().get_user(
            AccessToken.for_user(user)
        )
        assert role_of(authenticated) == UserProfile.Role.SUPERADMIN


class TestParityWithSimplejwt:
    """Správanie, ktoré kópia musí zachovať."""

    def test_missing_user_is_refused(self):
        user = _user("zmazany@example.com")
        token = AccessToken.for_user(user)
        user.delete()
        with pytest.raises(AuthenticationFailed):
            ProfileAwareJWTAuthentication().get_user(token)

    def test_inactive_user_is_refused(self):
        user = _user("neaktivny@example.com", active=False)
        with pytest.raises(AuthenticationFailed):
            ProfileAwareJWTAuthentication().get_user(AccessToken.for_user(user))

    def test_token_without_user_claim_is_refused(self):
        token = AccessToken()
        with pytest.raises(InvalidToken):
            ProfileAwareJWTAuthentication().get_user(token)


class TestRequestPath:
    def test_authenticated_request_works_end_to_end(self, api_client):
        """Poistka, že zapojená trieda naozaj autentifikuje bežný request."""
        user = _user("request@example.com")
        token = AccessToken.for_user(user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        res = api_client.get("/api/user/profile/")
        assert res.status_code == 200
        assert res.data["role"] == UserProfile.Role.ADMIN

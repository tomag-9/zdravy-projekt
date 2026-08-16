"""Rolový základ (#482).

Ťažisko testov je na dvoch vlastnostiach, na ktorých stojí bezpečnosť nasadenia:
`role_of` nesmie odstrihnúť login bez profilu a #482 nesmie zmeniť správanie
existujúcich endpointov.
"""

import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIRequestFactory

from api import roles
from api.models import UserProfile
from api.permissions import IsAdminOrAbove, IsKuchyna, IsSuperadmin

pytestmark = pytest.mark.django_db


def _user(email, *, is_staff=False, is_superuser=False, role=None):
    user = User.objects.create_user(
        username=email, email=email, password="x", is_staff=is_staff
    )
    if is_superuser:
        User.objects.filter(pk=user.pk).update(is_superuser=True)
        user.refresh_from_db()
    if role is not None:
        profile = UserProfile(user=user, role=role)
        profile._skip_default_facility = True
        profile.save()
    return user


class TestRoleOf:
    def test_role_from_profile_wins(self):
        user = _user("a@example.com", role=roles.KUCHYNA)
        assert roles.role_of(user) == roles.KUCHYNA

    @pytest.mark.parametrize(
        "is_staff,is_superuser,expected",
        [
            (False, False, roles.KLIENT),
            (True, False, roles.ADMIN),
            (True, True, roles.SUPERADMIN),
        ],
    )
    def test_falls_back_to_flags_without_profile(
        self, is_staff, is_superuser, expected
    ):
        """Login bez profilu (legacy `createsuperuser`) sa nesmie stratiť."""
        user = _user("b@example.com", is_staff=is_staff, is_superuser=is_superuser)
        assert not hasattr(user, "profile")
        assert roles.role_of(user) == expected

    def test_default_klient_role_never_demotes_staff(self):
        """`UserProfile.objects.create(user=admin)` nesmie adminovi zobrať práva.

        `klient` je default stĺpca, takže je nerozoznateľný od nenastavenej
        roly — príznaky preto rozhodujú smerom hore.
        """
        user = _user("stale@example.com", is_staff=True, is_superuser=True)
        profile = UserProfile(user=user)  # bez explicitnej roly
        profile._skip_default_facility = True
        profile.save()
        assert profile.role == roles.KLIENT
        assert roles.role_of(user) == roles.SUPERADMIN

    def test_explicit_non_klient_role_wins_over_flags(self):
        user = _user("k@example.com", is_staff=True, role=roles.KUCHYNA)
        assert roles.role_of(user) == roles.KUCHYNA

    def test_anonymous_is_klient(self):
        from django.contrib.auth.models import AnonymousUser

        assert roles.role_of(AnonymousUser()) == roles.KLIENT


class TestPermissionClasses:
    @pytest.mark.parametrize(
        "role,admin_ok,super_ok,kuchyna_ok",
        [
            (roles.KLIENT, False, False, False),
            (roles.KUCHYNA, False, False, True),
            (roles.ADMIN, True, False, False),
            (roles.SUPERADMIN, True, True, False),
        ],
    )
    def test_matrix(self, role, admin_ok, super_ok, kuchyna_ok):
        user = _user(f"{role}@example.com", role=role)
        request = APIRequestFactory().get("/")
        request.user = user
        assert IsAdminOrAbove().has_permission(request, None) is admin_ok
        assert IsSuperadmin().has_permission(request, None) is super_ok
        assert IsKuchyna().has_permission(request, None) is kuchyna_ok


class TestBackfillInvariants:
    def test_admin_created_via_api_gets_matching_role(self, admin_client):
        res = admin_client.post(
            "/api/admin/users/",
            {"email": "novy@example.com", "is_staff": True},
            format="json",
        )
        assert res.status_code == 201, res.data
        user = User.objects.get(email="novy@example.com")
        assert roles.role_of(user) == roles.ADMIN

    def test_client_created_via_api_is_klient(self, admin_client):
        res = admin_client.post(
            "/api/admin/users/",
            {"email": "klient@example.com", "is_staff": False},
            format="json",
        )
        assert res.status_code == 201, res.data
        assert (
            roles.role_of(User.objects.get(email="klient@example.com")) == roles.KLIENT
        )

    def test_kuchyna_account_created_via_api(self, admin_client):
        """Kuchyňa je rola bez `is_staff` — do admin rozhrania nesmie vidieť."""
        res = admin_client.post(
            "/api/admin/users/",
            {"email": "kuchyna@example.com", "is_staff": False, "role": roles.KUCHYNA},
            format="json",
        )
        assert res.status_code == 201, res.data
        user = User.objects.get(email="kuchyna@example.com")
        assert user.is_staff is False
        assert roles.role_of(user) == roles.KUCHYNA

    def test_kuchyna_cannot_reach_admin_endpoints(self, api_client):
        user = _user("k2@example.com", role=roles.KUCHYNA)
        api_client.force_authenticate(user=user)
        assert api_client.get("/api/admin/celky/").status_code == 403
        assert api_client.get("/api/admin/users/").status_code == 403

    def test_superadmin_account_created_via_api(self, admin_client):
        res = admin_client.post(
            "/api/admin/users/",
            {"email": "sa@example.com", "is_staff": True, "role": roles.SUPERADMIN},
            format="json",
        )
        assert res.status_code == 201, res.data
        assert (
            roles.role_of(User.objects.get(email="sa@example.com")) == roles.SUPERADMIN
        )

    def test_role_filter_lists_only_that_role(self, admin_client):
        _user("k3@example.com", role=roles.KUCHYNA)
        res = admin_client.get("/api/admin/users/?role=kuchyna")
        assert res.status_code == 200
        emails = [u["email"] for u in res.data["results"]]
        assert emails == ["k3@example.com"]

    def test_toggling_is_staff_keeps_role_in_sync(self, admin_client):
        """Bez tohto by `role` a `is_staff` po zmene v UI rozišli."""
        user = _user("c@example.com", role=roles.KLIENT)
        res = admin_client.patch(
            f"/api/admin/users/{user.pk}/", {"is_staff": True}, format="json"
        )
        assert res.status_code == 200, res.data
        user.profile.refresh_from_db()
        assert user.profile.role == roles.ADMIN


class TestNoOpProperty:
    """#482 sa nesmie dotknúť práv, ktoré dnes platia."""

    def test_profile_save_does_not_demote_staff(self):
        """Uloženie profilu s defaultnou rolou nesmie zobrať `is_staff`."""
        user = _user("d@example.com", is_staff=True)
        profile = UserProfile(user=user)
        profile._skip_default_facility = True
        profile.save()
        user.refresh_from_db()
        assert user.is_staff is True

    def test_role_endpoint_exposes_role(self, admin_client):
        res = admin_client.get("/api/user/profile/")
        assert res.status_code == 200
        assert res.data["role"] == roles.SUPERADMIN

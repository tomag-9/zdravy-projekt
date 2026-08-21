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
from api.permissions import IsAdminOrAbove, IsKlient, IsKuchynaOrAbove, IsSuperadmin

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
        "role,kuchyna_ok,admin_ok,super_ok,klient_ok",
        [
            # Klient nie je v rebríku — neprejde žiadnym interným prahom.
            (roles.KLIENT, False, False, False, True),
            (roles.KUCHYNA, True, False, False, False),
            # Admin je NAD kuchyňou, takže jej prah prejde tiež.
            (roles.ADMIN, True, True, False, False),
            (roles.SUPERADMIN, True, True, True, False),
        ],
    )
    def test_matrix(self, role, kuchyna_ok, admin_ok, super_ok, klient_ok):
        user = _user(f"{role}@example.com", role=role)
        request = APIRequestFactory().get("/")
        request.user = user
        assert IsKuchynaOrAbove().has_permission(request, None) is kuchyna_ok
        assert IsAdminOrAbove().has_permission(request, None) is admin_ok
        assert IsSuperadmin().has_permission(request, None) is super_ok
        assert IsKlient().has_permission(request, None) is klient_ok

    def test_ladder_is_ordered(self):
        """kuchyňa < admin < superadmin; klient stojí mimo rebríka."""
        for role in (roles.KUCHYNA, roles.ADMIN, roles.SUPERADMIN):
            user = _user(f"ladder-{role}@example.com", role=role)
            assert roles.is_kuchyna_or_above(user)
            assert roles.is_internal(user)
            assert not roles.is_klient(user)
        klient = _user("ladder-klient@example.com", role=roles.KLIENT)
        assert not roles.is_kuchyna_or_above(klient)
        assert not roles.is_internal(klient)


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


class TestAdminManagesClientLoginsOnly:
    """Admin smie spravovať bežný klientsky login (onboarding škôlky), ale nie
    interné admin/superadmin/kuchyňa účty — tie ostávajú superadminovi (#483
    zamklo pôvodne úplne všetko na `/admin/users/`, čo blokovalo aj rutinné
    zakladanie klientov)."""

    def test_plain_admin_creates_client_login(self, plain_admin_client):
        res = plain_admin_client.post(
            "/api/admin/users/", {"email": "nova.skolka@example.com"}, format="json"
        )
        assert res.status_code == 201, res.data
        assert User.objects.get(email="nova.skolka@example.com").profile.role == (
            roles.KLIENT
        )

    def test_plain_admin_cannot_create_internal_login(self, plain_admin_client):
        res = plain_admin_client.post(
            "/api/admin/users/",
            {"email": "novy.admin@example.com", "role": roles.ADMIN},
            format="json",
        )
        assert res.status_code == 403

    def test_plain_admin_cannot_escalate_client_to_admin(self, plain_admin_client):
        target = _user("skolka@example.com", role=roles.KLIENT)
        res = plain_admin_client.patch(
            f"/api/admin/users/{target.pk}/", {"role": roles.ADMIN}, format="json"
        )
        assert res.status_code == 403

    def test_plain_admin_cannot_delete_existing_internal_login(
        self, plain_admin_client
    ):
        target = _user("other-admin@example.com", role=roles.ADMIN)
        res = plain_admin_client.delete(f"/api/admin/users/{target.pk}/")
        assert res.status_code == 403

    def test_plain_admin_still_cannot_list_users(self, plain_admin_client):
        """`list` je AdminUserList.tsx — obrazovka na interné účty, tá ostáva
        superadmin-only aj po uvoľnení klientskeho onboardingu."""
        assert plain_admin_client.get("/api/admin/users/").status_code == 403


class TestSuperadminOnlySections:
    """#483 — správa loginov, logy a systémové nastavenia sú len pre superadmina."""

    # `event-logs` tu zámerne NIE JE — audit vidí aj admin, viď
    # `TestEventLogVsSystemLogs` nižšie.
    SUPERADMIN_ONLY = [
        "/api/admin/users/",
        "/api/admin/logs/",
    ]

    @pytest.mark.parametrize("url", SUPERADMIN_ONLY)
    def test_plain_admin_is_forbidden(self, plain_admin_client, url):
        assert plain_admin_client.get(url).status_code == 403

    @pytest.mark.parametrize("url", SUPERADMIN_ONLY)
    def test_superadmin_still_allowed(self, admin_client, url):
        assert admin_client.get(url).status_code == 200

    def test_plain_admin_cannot_write_global_settings(self, plain_admin_client):
        res = plain_admin_client.post(
            "/api/admin/global-settings/", {"deadline_lunch": "09:00"}, format="json"
        )
        assert res.status_code == 403

    def test_global_settings_stay_publicly_readable(self, api_client):
        """Login stránka číta nastavenia bez prihlásenia — nesmelo sa to zúžiť."""
        assert api_client.get("/api/admin/global-settings/").status_code == 200


class TestKuchynaIsNotAClient:
    """Kuchyňa má `is_staff=False`, takže ju dátová vrstva kedysi brala ako
    zákazníka — dostávala fantómový celok, auto-objednávky aj klientske
    notifikácie. Toto sú regresné testy na tú triedu chýb."""

    def _kuchyna(self, admin_client, email="kuch@example.com"):
        res = admin_client.post(
            "/api/admin/users/",
            {"email": email, "is_staff": False, "role": roles.KUCHYNA},
            format="json",
        )
        assert res.status_code == 201, res.data
        return User.objects.get(email=email)

    def test_gets_no_phantom_celok(self, admin_client):
        user = self._kuchyna(admin_client)
        assert user.profile.dostupne_celky().count() == 0
        assert user.profile.dostupne_prevadzky().count() == 0

    def test_excluded_from_auto_orders(self, admin_client):
        """`klient_q()` je presne dotaz, ktorým auto_order_service vyberá klientov."""
        user = self._kuchyna(admin_client)
        assert not User.objects.filter(roles.klient_q(), pk=user.pk).exists()

    def test_client_still_matches_klient_q(self, admin_client):
        res = admin_client.post(
            "/api/admin/users/",
            {"email": "zakaznik@example.com", "is_staff": False},
            format="json",
        )
        assert res.status_code == 201, res.data
        user = User.objects.get(email="zakaznik@example.com")
        assert User.objects.filter(roles.klient_q(), pk=user.pk).exists()

    def test_login_without_profile_still_counts_as_client(self):
        """Fallback z `role_of` musí platiť aj na úrovni DB dotazu."""
        user = _user("bezprofilu@example.com")
        assert not hasattr(user, "profile")
        assert User.objects.filter(roles.klient_q(), pk=user.pk).exists()

    def test_admin_is_not_a_client(self, admin_client):
        assert not User.objects.filter(
            roles.klient_q(), email="admin@example.com"
        ).exists()


class TestKuchynaOverviewAccess:
    """#486 — kuchyňa vidí prehľad nakladania, ale nič v ňom nezmení."""

    DATE = "2026-08-17"

    def test_can_read_gramage_dashboard(self, api_client):
        user = _user("kuch-read@example.com", role=roles.KUCHYNA)
        api_client.force_authenticate(user=user)
        res = api_client.get(
            f"/api/admin/meal-plans/gramage-dashboard/?date={self.DATE}"
        )
        assert res.status_code == 200
        assert "spec" in res.data

    def test_admin_reads_the_same_endpoint(self, admin_client):
        """Admin je v rebríku nad kuchyňou, takže jej prah prejde tiež."""
        res = admin_client.get(
            f"/api/admin/meal-plans/gramage-dashboard/?date={self.DATE}"
        )
        assert res.status_code == 200

    def test_client_cannot_read_it(self, authenticated_client):
        res = authenticated_client.get(
            f"/api/admin/meal-plans/gramage-dashboard/?date={self.DATE}"
        )
        assert res.status_code == 403

    @pytest.mark.parametrize(
        "method,url",
        [
            ("post", "/api/admin/meal-plans/"),
            ("get", "/api/admin/meal-plans/"),
            ("get", "/api/admin/closed-days/"),
            ("get", "/api/admin/summary/daily-report/"),
        ],
    )
    def test_cannot_touch_the_rest_of_admin(self, api_client, method, url):
        user = _user("kuch-write@example.com", role=roles.KUCHYNA)
        api_client.force_authenticate(user=user)
        assert getattr(api_client, method)(url).status_code == 403


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


class TestEventLogVsSystemLogs:
    """Audit vidí admin, systémové logy nie (#483).

    Rozdiel je vecný: „Udalosti" hovoria, kto čo v systéme zmenil — to admin
    pri svojej práci potrebuje. Systémové logy sú prevádzková diagnostika
    a ostávajú superadminovi.
    """

    def test_admin_reads_the_audit_trail(self, plain_admin_client):
        assert plain_admin_client.get("/api/admin/event-logs/").status_code == 200

    def test_admin_cannot_read_system_logs(self, plain_admin_client):
        assert plain_admin_client.get("/api/admin/logs/").status_code == 403

    def test_superadmin_reads_both(self, admin_client):
        assert admin_client.get("/api/admin/event-logs/").status_code == 200
        assert admin_client.get("/api/admin/logs/").status_code == 200

    def test_client_reads_neither(self, authenticated_client):
        assert authenticated_client.get("/api/admin/event-logs/").status_code == 403
        assert authenticated_client.get("/api/admin/logs/").status_code == 403

    def test_admin_sees_the_audit_section_but_not_system_logs(self):
        from api import access, roles, sections

        user = _user("audit@example.com", role=roles.ADMIN)
        levels = access.effective_map(user)
        assert sections.UDALOSTI in levels
        assert sections.LOGY not in levels

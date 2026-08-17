"""Granulárne oprávnenia per sekcia (#484).

Dve vlastnosti, na ktorých to celé stojí:
`override vie prístup len obmedziť, nie povýšiť nad rolu` a
`chýbajúci záznam znamená ako určuje rola, nie bez prístupu`.
"""

import pytest
from django.contrib.auth.models import User

from api import access, roles, sections
from api.models import SectionPermission, UserProfile

pytestmark = pytest.mark.django_db

URL = "/api/admin/section-permissions/"


def _user(email, role):
    user = User.objects.create_user(
        username=email,
        email=email,
        password="x",
        is_staff=role in roles.STAFF_ROLES,
    )
    profile = UserProfile(user=user, role=role)
    profile._skip_default_facility = True
    profile.save()
    return user


class TestDefaultsFollowTheRole:
    def test_missing_record_means_role_decides(self):
        """Chýbajúci override nesmie znamenať „bez prístupu" — inak by nová
        sekcia odstrihla všetkých existujúcich adminov."""
        admin = _user("a@example.com", roles.ADMIN)
        assert SectionPermission.objects.count() == 0
        assert access.level_for(admin, sections.JEDALNICEK) == sections.EDIT
        assert access.can_edit(admin, sections.JEDALNICEK)

    def test_admin_has_no_superadmin_sections(self):
        admin = _user("b@example.com", roles.ADMIN)
        assert access.level_for(admin, sections.NASTAVENIA) == sections.NONE
        assert access.level_for(admin, sections.LOGY) == sections.NONE

    def test_superadmin_reaches_everything(self):
        superadmin = _user("c@example.com", roles.SUPERADMIN)
        for section in sections.SECTIONS:
            assert access.level_for(superadmin, section.key) == sections.EDIT

    def test_kuchyna_reaches_only_loading(self):
        kuchyna = _user("d@example.com", roles.KUCHYNA)
        assert access.level_for(kuchyna, sections.NAKLADANIE) == sections.EDIT
        assert access.level_for(kuchyna, sections.JEDALNICEK) == sections.NONE

    def test_client_reaches_nothing(self):
        klient = _user("e@example.com", roles.KLIENT)
        for section in sections.SECTIONS:
            assert access.level_for(klient, section.key) == sections.NONE


class TestOverrideOnlyNarrows:
    def test_override_can_downgrade_to_read(self):
        admin = _user("f@example.com", roles.ADMIN)
        SectionPermission.objects.create(
            profile=admin.profile, section=sections.JEDALNICEK, level=sections.READ
        )
        assert access.can_read(admin, sections.JEDALNICEK)
        assert not access.can_edit(admin, sections.JEDALNICEK)

    def test_override_can_remove_access(self):
        admin = _user("g@example.com", roles.ADMIN)
        SectionPermission.objects.create(
            profile=admin.profile, section=sections.DIETY, level=sections.NONE
        )
        assert not access.can_read(admin, sections.DIETY)

    def test_override_cannot_grant_above_the_role(self):
        """Toto je jadro veci — inak by rolový systém prestal niečo znamenať."""
        admin = _user("h@example.com", roles.ADMIN)
        SectionPermission.objects.create(
            profile=admin.profile, section=sections.NASTAVENIA, level=sections.EDIT
        )
        assert access.level_for(admin, sections.NASTAVENIA) == sections.NONE

    def test_override_cannot_promote_a_client(self):
        klient = _user("i@example.com", roles.KLIENT)
        SectionPermission.objects.create(
            profile=klient.profile, section=sections.JEDALNICEK, level=sections.EDIT
        )
        assert access.level_for(klient, sections.JEDALNICEK) == sections.NONE


class TestEndpointEnforcement:
    def _admin_client(self, api_client, email="j@example.com"):
        user = _user(email, roles.ADMIN)
        api_client.force_authenticate(user=user)
        return api_client, user

    def test_read_only_blocks_writes_but_allows_reads(self, api_client):
        client, user = self._admin_client(api_client)
        SectionPermission.objects.create(
            profile=user.profile, section=sections.VOLNE_DNI, level=sections.READ
        )
        assert client.get("/api/admin/holidays/").status_code == 200
        res = client.post("/api/admin/holidays/", {"date": "2026-12-24"}, format="json")
        assert res.status_code == 403

    def test_no_access_blocks_reads_too(self, api_client):
        client, user = self._admin_client(api_client, "k@example.com")
        SectionPermission.objects.create(
            profile=user.profile, section=sections.VOLNE_DNI, level=sections.NONE
        )
        assert client.get("/api/admin/holidays/").status_code == 403

    def test_untouched_section_still_works(self, api_client):
        """Override na jednej sekcii nesmie ovplyvniť ostatné."""
        client, user = self._admin_client(api_client, "l@example.com")
        SectionPermission.objects.create(
            profile=user.profile, section=sections.VOLNE_DNI, level=sections.NONE
        )
        assert client.get("/api/admin/celky/").status_code == 200


class TestMatrixApi:
    def test_only_superadmin_manages_the_matrix(self, api_client):
        user = _user("m@example.com", roles.ADMIN)
        api_client.force_authenticate(user=user)
        assert api_client.get(URL).status_code == 403

    def test_catalog_lists_sections_and_levels(self, admin_client):
        res = admin_client.get(URL)
        assert res.status_code == 200
        assert len(res.data["sections"]) == len(sections.SECTIONS)
        assert {level["value"] for level in res.data["levels"]} == {
            sections.NONE,
            sections.READ,
            sections.EDIT,
        }

    def test_matrix_marks_sections_out_of_reach(self, admin_client):
        target = _user("n@example.com", roles.ADMIN)
        res = admin_client.get(f"{URL}{target.pk}/")
        assert res.status_code == 200
        rows = {row["section"]: row for row in res.data["rows"]}
        assert rows[sections.JEDALNICEK]["available"] is True
        assert rows[sections.NASTAVENIA]["available"] is False

    def test_setting_and_clearing_an_override(self, admin_client):
        target = _user("o@example.com", roles.ADMIN)

        res = admin_client.patch(
            f"{URL}{target.pk}/",
            {"overrides": {sections.JEDALNICEK: sections.READ}},
            format="json",
        )
        assert res.status_code == 200
        rows = {row["section"]: row for row in res.data["rows"]}
        assert rows[sections.JEDALNICEK]["effective"] == sections.READ

        res = admin_client.patch(
            f"{URL}{target.pk}/",
            {"overrides": {sections.JEDALNICEK: None}},
            format="json",
        )
        rows = {row["section"]: row for row in res.data["rows"]}
        assert rows[sections.JEDALNICEK]["override"] is None
        assert rows[sections.JEDALNICEK]["effective"] == sections.EDIT

    @pytest.mark.parametrize(
        "payload",
        [
            {"overrides": {"neexistuje": "read"}},
            {"overrides": {sections.DIETY: "superedit"}},
            {"overrides": "nie objekt"},
        ],
    )
    def test_bad_payloads_are_refused(self, admin_client, payload):
        target = _user("p@example.com", roles.ADMIN)
        res = admin_client.patch(f"{URL}{target.pk}/", payload, format="json")
        assert res.status_code == 400
        assert not SectionPermission.objects.exists()


class TestProfileExposesSections:
    def test_profile_lists_effective_levels(self, api_client):
        user = _user("q@example.com", roles.ADMIN)
        SectionPermission.objects.create(
            profile=user.profile, section=sections.DIETY, level=sections.READ
        )
        api_client.force_authenticate(user=user)
        res = api_client.get("/api/user/profile/")
        assert res.status_code == 200
        assert res.data["sections"][sections.DIETY] == sections.READ
        assert res.data["sections"][sections.JEDALNICEK] == sections.EDIT
        # Sekcie mimo dosahu role sa vôbec neposielajú.
        assert sections.NASTAVENIA not in res.data["sections"]


def test_section_access_refuses_viewset_without_section():
    """Preklep v názve atribútu nesmie znamenať tichý priechod."""
    from rest_framework.test import APIRequestFactory

    from api.permissions import SectionAccess

    request = APIRequestFactory().get("/")
    request.user = None
    assert SectionAccess().has_permission(request, object()) is False

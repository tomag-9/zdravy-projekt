"""
Čo musí prežiť nasadenie rolí (#482).

Rolový systém sa dotkol autentifikácie aj celej dátovej vrstvy. Tieto testy
nestrážia nové funkcie, ale to, čo sa nesmie pokaziť:

* klient musí ďalej objednať — to je cesta, na ktorej je väčšina účtov,
* prihlásenie musí prežiť deploy aj s tokenom vydaným pred ním,
* login bez profilu (legacy) sa nesmie stať nepoužiteľným.
"""

from __future__ import annotations

import datetime

import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

from api import roles
from api.models import Celok, Prevadzka, ProfileCelokAccess, UserProfile

pytestmark = pytest.mark.django_db


def _future_weekday() -> str:
    """Deň, na ktorý sa ešte dá objednať — dnešok už môže mať po deadline."""
    day = datetime.date.today() + datetime.timedelta(days=1)
    while day.weekday() >= 5:
        day += datetime.timedelta(days=1)
    return day.isoformat()


@pytest.fixture
def klient():
    user = User.objects.create_user(
        username="objednavac@x.sk", email="objednavac@x.sk", password="x"
    )
    profile = UserProfile(user=user, company_name="Škôlka")
    profile._skip_default_facility = True
    profile.save()
    celok = Celok.objects.create(nazov="Celok klienta")
    Prevadzka.objects.create(celok=celok, nazov="Prevádzka klienta")
    ProfileCelokAccess.objects.create(profile=profile, celok=celok)
    return user


class TestClientOrderingStillWorks:
    """Objednávková cesta je to, čo systém reálne robí — musí ostať priechodná."""

    def test_role_is_klient(self, klient):
        assert roles.role_of(klient) == roles.KLIENT
        assert roles.is_klient(klient)
        assert not roles.is_admin_or_above(klient)

    def test_client_sees_own_prevadzky(self, klient):
        client = APIClient()
        client.force_authenticate(user=klient)
        res = client.get("/api/prevadzky/")
        assert res.status_code == 200
        assert len(res.data) >= 1

    def test_client_can_submit_an_order(self, klient, order_payload):
        client = APIClient()
        client.force_authenticate(user=klient)
        payload = {**order_payload, "date": _future_weekday()}
        res = client.post("/api/orders/", payload, format="json")
        assert res.status_code in (200, 201), res.data

    def test_client_reads_own_orders(self, klient, order_payload):
        client = APIClient()
        client.force_authenticate(user=klient)
        client.post(
            "/api/orders/", {**order_payload, "date": _future_weekday()}, format="json"
        )
        assert client.get("/api/orders/").status_code == 200

    def test_client_can_read_its_profile(self, klient):
        client = APIClient()
        client.force_authenticate(user=klient)
        res = client.get("/api/user/profile/")
        assert res.status_code == 200
        assert res.data["role"] == roles.KLIENT
        # Klient nedosiahne žiadnu internú sekciu, takže mapa je prázdna.
        assert res.data["sections"] == {}


class TestTokensIssuedBeforeTheDeploy:
    """Tokeny v obehu `role` claim nemajú — nesmú prestať platiť."""

    def _staff(self, email="stary@x.sk", superuser=False):
        user = User.objects.create_user(
            username=email,
            email=email,
            password="x",
            is_staff=True,
            is_superuser=superuser,
        )
        profile = UserProfile(
            user=user, role=roles.SUPERADMIN if superuser else roles.ADMIN
        )
        profile._skip_default_facility = True
        profile.save()
        return user

    def test_access_token_without_role_claim_still_authenticates(self):
        user = self._staff()
        token = AccessToken.for_user(user)
        token.payload.pop("role", None)

        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        res = client.get("/api/user/profile/")
        assert res.status_code == 200
        # Autorizácia sa berie z DB, nie z tokenu.
        assert res.data["role"] == roles.ADMIN

    def test_old_token_still_authorises_admin_sections(self):
        user = self._staff("stary2@x.sk", superuser=True)
        token = AccessToken.for_user(user)
        token.payload.pop("role", None)

        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        assert client.get("/api/admin/users/").status_code == 200

    def test_refresh_without_role_claim_works(self):
        user = self._staff("stary3@x.sk")
        refresh = RefreshToken.for_user(user)
        refresh.payload.pop("role", None)

        client = APIClient()
        client.cookies["refresh_token"] = str(refresh)
        res = client.post("/api/token/refresh/", {}, format="json")
        assert res.status_code == 200, res.data
        assert "access" in res.data


class TestLegacyLoginsWithoutProfile:
    """`createsuperuser` profil nezakladá — taký login musí ostať použiteľný."""

    def test_superuser_without_profile_reaches_everything(self):
        user = User.objects.create_user(
            username="cli@x.sk",
            email="cli@x.sk",
            password="x",
            is_staff=True,
            is_superuser=True,
        )
        assert not hasattr(user, "profile")

        client = APIClient()
        client.force_authenticate(user=user)
        assert client.get("/api/admin/users/").status_code == 200
        assert client.get("/api/admin/celky/").status_code == 200

    def test_profile_created_later_does_not_strip_access(self):
        """Uloženie profilu s defaultnou rolou nesmie adminovi zobrať práva."""
        user = User.objects.create_user(
            username="cli2@x.sk",
            email="cli2@x.sk",
            password="x",
            is_staff=True,
            is_superuser=True,
        )
        profile = UserProfile(user=user)
        profile._skip_default_facility = True
        profile.save()

        client = APIClient()
        client.force_authenticate(user=user)
        assert client.get("/api/admin/users/").status_code == 200


class TestKuchynaStaysOutOfClientFlows:
    """Kuchyňa má `is_staff=False` — dátová vrstva ju nesmie brať ako zákazníka."""

    @pytest.fixture
    def kuchyna(self):
        user = User.objects.create_user(
            username="kuch@x.sk", email="kuch@x.sk", password="x"
        )
        profile = UserProfile(user=user, role=roles.KUCHYNA)
        profile._skip_default_facility = True
        profile.save()
        return user

    def test_excluded_from_client_queries(self, kuchyna):
        assert not User.objects.filter(roles.klient_q(), pk=kuchyna.pk).exists()

    def test_gets_no_facility(self, kuchyna):
        assert kuchyna.profile.dostupne_prevadzky().count() == 0

    def test_cannot_order(self, kuchyna, order_payload):
        client = APIClient()
        client.force_authenticate(user=kuchyna)
        payload = {**order_payload, "date": _future_weekday()}
        assert client.post("/api/orders/", payload, format="json").status_code >= 400

    def test_auto_order_service_skips_it(self, kuchyna):
        from api.services.auto_order_service import apply_auto_orders

        result = apply_auto_orders(datetime.date(2026, 8, 18))
        created = {str(entry) for entry in result.get("created", [])}
        assert not any(kuchyna.email in entry for entry in created)

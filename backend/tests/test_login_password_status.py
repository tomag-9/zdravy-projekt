"""
Stav hesla loginu (success/pending/failed) v admin/celky a resend pozvánky.

Pozri CLAUDE.md — Celok -> Prevádzka -> Login. `AdminCelokSerializer.get_logins`
odvodzuje `password_status` z `has_usable_password()` + posledného nepoužitého
`PasswordResetToken`; `AdminUserViewSet.resend_invite` posiela nový setup link.
"""

import datetime

import pytest
from django.contrib.auth.models import User
from django.utils import timezone

from api.models import (
    Celok,
    PasswordResetToken,
    Prevadzka,
    ProfileCelokAccess,
    UserProfile,
)


def _make_login(celok, email, *, has_password=True):
    user = User.objects.create_user(
        username=email, email=email, password="s3cret-pass" if has_password else None
    )
    if not has_password:
        user.set_unusable_password()
        user.save(update_fields=["password"])
    profile = UserProfile(user=user)
    profile._skip_default_facility = True
    profile.save()
    ProfileCelokAccess.objects.create(profile=profile, celok=celok)
    return user


@pytest.fixture
def celok(db):
    celok = Celok.objects.create(nazov="Testovací celok")
    Prevadzka.objects.create(celok=celok, nazov="Jediná prevádzka")
    return celok


@pytest.mark.django_db
class TestLoginPasswordStatus:
    def test_password_set_is_success(self, admin_authenticated_client, celok):
        _make_login(celok, "hotovo@example.com", has_password=True)

        payload = admin_authenticated_client.get("/api/admin/celky/").json()
        login = next(c for c in payload if c["id"] == celok.id)["logins"][0]

        assert login["password_status"] == "success"

    def test_no_password_valid_token_is_pending(
        self, admin_authenticated_client, celok
    ):
        user = _make_login(celok, "ceka@example.com", has_password=False)
        PasswordResetToken.objects.create(
            user=user,
            token="valid-token",
            expires_at=timezone.now() + datetime.timedelta(days=7),
        )

        payload = admin_authenticated_client.get("/api/admin/celky/").json()
        login = next(c for c in payload if c["id"] == celok.id)["logins"][0]

        assert login["password_status"] == "pending"

    def test_no_password_expired_token_is_failed(
        self, admin_authenticated_client, celok
    ):
        user = _make_login(celok, "vyprsal@example.com", has_password=False)
        PasswordResetToken.objects.create(
            user=user,
            token="expired-token",
            expires_at=timezone.now() - datetime.timedelta(hours=1),
        )

        payload = admin_authenticated_client.get("/api/admin/celky/").json()
        login = next(c for c in payload if c["id"] == celok.id)["logins"][0]

        assert login["password_status"] == "failed"

    def test_no_password_no_token_is_failed(self, admin_authenticated_client, celok):
        _make_login(celok, "ziadny-token@example.com", has_password=False)

        payload = admin_authenticated_client.get("/api/admin/celky/").json()
        login = next(c for c in payload if c["id"] == celok.id)["logins"][0]

        assert login["password_status"] == "failed"

    def test_edupage_celok_has_no_password_status(
        self, admin_authenticated_client, celok
    ):
        _make_login(celok, "edupage@example.com", has_password=False)
        celok.zdroj_objednavok = Celok.ZdrojObjednavok.EDUPAGE
        celok.save(update_fields=["zdroj_objednavok"])

        payload = admin_authenticated_client.get("/api/admin/celky/").json()
        login = next(c for c in payload if c["id"] == celok.id)["logins"][0]

        assert login["password_status"] is None


@pytest.mark.django_db
class TestResendInvite:
    def test_resend_creates_new_valid_token(
        self, admin_authenticated_client, celok, mailoutbox
    ):
        user = _make_login(celok, "resend@example.com", has_password=False)
        old_token = PasswordResetToken.objects.create(
            user=user,
            token="old-token",
            expires_at=timezone.now() - datetime.timedelta(hours=1),
        )

        res = admin_authenticated_client.post(
            f"/api/admin/users/{user.id}/resend-invite/"
        )

        assert res.status_code == 200
        old_token.refresh_from_db()
        assert old_token.used is True
        new_token = PasswordResetToken.objects.filter(user=user, used=False).get()
        assert new_token.is_valid
        assert len(mailoutbox) == 1
        assert mailoutbox[0].to == [user.email]

    def test_resend_rejected_for_edupage_only_login(
        self, admin_authenticated_client, celok
    ):
        celok.zdroj_objednavok = Celok.ZdrojObjednavok.EDUPAGE
        celok.save(update_fields=["zdroj_objednavok"])
        user = _make_login(celok, "edupage-resend@example.com", has_password=False)

        res = admin_authenticated_client.post(
            f"/api/admin/users/{user.id}/resend-invite/"
        )

        assert res.status_code == 400

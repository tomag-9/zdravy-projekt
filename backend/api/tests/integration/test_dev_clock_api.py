"""Integration testy pre GET/POST/DELETE /api/admin/dev-clock/.

TDD pred implementáciou (18.9.2026) — dev-only testovací posun
`timezone.now()`, ovládaný cez appkové Admin nastavenia (frontend).
Mimo DEV_CLOCK_ENABLED (t.j. na produkcii/staging) sa endpoint musí správať,
akoby neexistoval (404), aj pre superadmina.
"""

import datetime

import pytest
from django.core.cache import cache
from django.utils import timezone
from rest_framework import status

from api import dev_clock

pytestmark = pytest.mark.integration

DEV_CLOCK_URL = "/api/admin/dev-clock/"


@pytest.fixture(autouse=True)
def _clear_dev_clock_cache():
    cache.delete(dev_clock.CACHE_KEY)
    yield
    cache.delete(dev_clock.CACHE_KEY)


@pytest.mark.django_db
class TestDevClockDisabledEnvironment:
    def test_get_404_when_disabled(self, admin_client, settings):
        settings.DEV_CLOCK_ENABLED = False
        res = admin_client.get(DEV_CLOCK_URL)
        assert res.status_code == status.HTTP_404_NOT_FOUND

    def test_post_404_when_disabled(self, admin_client, settings):
        settings.DEV_CLOCK_ENABLED = False
        res = admin_client.post(
            DEV_CLOCK_URL, {"datetime": "2026-09-20T08:00"}, format="json"
        )
        assert res.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_404_when_disabled(self, admin_client, settings):
        settings.DEV_CLOCK_ENABLED = False
        res = admin_client.delete(DEV_CLOCK_URL)
        assert res.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestDevClockPermissions:
    def test_requires_authentication(self, api_client, settings):
        settings.DEV_CLOCK_ENABLED = True
        res = api_client.get(DEV_CLOCK_URL)
        assert res.status_code in (
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        )

    def test_plain_admin_forbidden(self, plain_admin_client, settings):
        settings.DEV_CLOCK_ENABLED = True
        res = plain_admin_client.get(DEV_CLOCK_URL)
        assert res.status_code == status.HTTP_403_FORBIDDEN

    def test_superadmin_allowed(self, admin_client, settings):
        settings.DEV_CLOCK_ENABLED = True
        res = admin_client.get(DEV_CLOCK_URL)
        assert res.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestDevClockEnabledBehaviour:
    def test_get_reports_no_override_initially(self, admin_client, settings):
        settings.DEV_CLOCK_ENABLED = True
        res = admin_client.get(DEV_CLOCK_URL)
        assert res.status_code == status.HTTP_200_OK
        body = res.json()
        assert body["enabled"] is True
        assert body["override"] is None

    def test_post_sets_override_and_get_reflects_it(self, admin_client, settings):
        settings.DEV_CLOCK_ENABLED = True
        res = admin_client.post(
            DEV_CLOCK_URL, {"datetime": "2026-09-20T08:00:00"}, format="json"
        )
        assert res.status_code == status.HTTP_200_OK
        body = res.json()
        assert body["override"] is not None
        parsed = datetime.datetime.fromisoformat(body["override"])
        assert (parsed.year, parsed.month, parsed.day, parsed.hour, parsed.minute) == (
            2026,
            9,
            20,
            8,
            0,
        )

        res_get = admin_client.get(DEV_CLOCK_URL)
        assert res_get.json()["override"] == body["override"]

    def test_post_actually_moves_timezone_now(self, admin_client, settings):
        settings.DEV_CLOCK_ENABLED = True
        admin_client.post(
            DEV_CLOCK_URL, {"datetime": "2026-09-20T08:00:00"}, format="json"
        )
        assert timezone.localdate() == datetime.date(2026, 9, 20)

    def test_post_missing_datetime_is_400(self, admin_client, settings):
        settings.DEV_CLOCK_ENABLED = True
        res = admin_client.post(DEV_CLOCK_URL, {}, format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_post_invalid_datetime_is_400(self, admin_client, settings):
        settings.DEV_CLOCK_ENABLED = True
        res = admin_client.post(
            DEV_CLOCK_URL, {"datetime": "not-a-date"}, format="json"
        )
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_delete_clears_override(self, admin_client, settings):
        settings.DEV_CLOCK_ENABLED = True
        admin_client.post(
            DEV_CLOCK_URL, {"datetime": "2026-09-20T08:00:00"}, format="json"
        )
        res = admin_client.delete(DEV_CLOCK_URL)
        assert res.status_code == status.HTTP_200_OK
        assert res.json()["override"] is None
        assert dev_clock.get_dev_clock_override() is None

    def test_real_now_is_always_reported_untouched(self, admin_client, settings):
        settings.DEV_CLOCK_ENABLED = True
        res = admin_client.post(
            DEV_CLOCK_URL, {"datetime": "2020-01-01T00:00:00"}, format="json"
        )
        body = res.json()
        real_now = datetime.datetime.fromisoformat(body["real_now"])
        assert real_now.year >= 2026

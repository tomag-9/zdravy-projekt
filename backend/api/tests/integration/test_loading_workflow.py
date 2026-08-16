"""Naberací workflow kuchyne (#487).

Ťažisko je na kontrolnom kroku: prevádzku nesmie ísť potvrdiť s dierou a
odškrtnutie položky musí potvrdenie zrušiť — inak by v systéme ostal záznam
„naložené", ktorý nezodpovedá realite.
"""

import datetime

import pytest
from django.contrib.auth.models import User

from api import roles
from api.models import (
    Celok,
    LoadingStatus,
    Prevadzka,
    PrevadzkaLoadingConfirmation,
    UserProfile,
)
from api.services import loading_service

pytestmark = pytest.mark.django_db

DATE = datetime.date(2026, 8, 17)
URL = "/api/kuchyna/loading/"


@pytest.fixture
def kuchyna_client(api_client):
    user = User.objects.create_user(
        username="k@example.com", email="k@example.com", password="x"
    )
    profile = UserProfile(user=user, role=UserProfile.Role.KUCHYNA)
    profile._skip_default_facility = True
    profile.save()
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def prevadzka():
    celok = Celok.objects.create(nazov="Testovací celok")
    return Prevadzka.objects.create(celok=celok, nazov="Testovacia prevádzka")


class TestAccess:
    def test_client_is_refused(self, authenticated_client):
        assert authenticated_client.get(f"{URL}?date={DATE}").status_code == 403

    def test_kuchyna_can_read(self, kuchyna_client):
        res = kuchyna_client.get(f"{URL}?date={DATE}")
        assert res.status_code == 200
        assert res.data["date"] == DATE.isoformat()

    def test_admin_can_read(self, admin_client):
        """Admin je nad kuchyňou, takže workflow vidí tiež."""
        assert admin_client.get(f"{URL}?date={DATE}").status_code == 200

    def test_date_is_required(self, kuchyna_client):
        assert kuchyna_client.get(URL).status_code == 400


class TestItemToggle:
    def test_unknown_item_is_refused(self, kuchyna_client, prevadzka):
        """Kľúč mimo jedálnička dňa sa nesmie dať odkliknúť."""
        res = kuchyna_client.post(
            f"{URL}item/",
            {"date": DATE, "prevadzka": prevadzka.pk, "item_key": "neexistuje"},
            format="json",
        )
        assert res.status_code == 400
        assert not LoadingStatus.objects.exists()

    def test_toggle_records_who_and_when(self, kuchyna_client, prevadzka, monkeypatch):
        monkeypatch.setattr(
            loading_service,
            "expected_items",
            lambda date: [{"key": "soup", "label": "Polievka"}],
        )
        res = kuchyna_client.post(
            f"{URL}item/",
            {"date": DATE, "prevadzka": prevadzka.pk, "item_key": "soup"},
            format="json",
        )
        assert res.status_code == 200
        mark = LoadingStatus.objects.get()
        assert mark.is_loaded is True
        assert mark.marked_by.email == "k@example.com"
        assert mark.marked_at is not None

    def test_unchecking_keeps_the_trace(self, kuchyna_client, prevadzka, monkeypatch):
        """Riadok sa nemaže — `kto odškrtol` je pri reklamácii podstatné."""
        monkeypatch.setattr(
            loading_service,
            "expected_items",
            lambda date: [{"key": "soup", "label": "Polievka"}],
        )
        payload = {"date": DATE, "prevadzka": prevadzka.pk, "item_key": "soup"}
        kuchyna_client.post(f"{URL}item/", payload, format="json")
        kuchyna_client.post(
            f"{URL}item/", {**payload, "is_loaded": False}, format="json"
        )
        mark = LoadingStatus.objects.get()
        assert mark.is_loaded is False
        assert mark.marked_by is not None


class TestConfirmation:
    @pytest.fixture(autouse=True)
    def _two_items(self, monkeypatch):
        monkeypatch.setattr(
            loading_service,
            "expected_items",
            lambda date: [
                {"key": "soup", "label": "Polievka"},
                {"key": "main_course", "label": "Hlavný chod"},
            ],
        )

    def _row(self, prevadzka):
        return {
            "prevadzka_id": prevadzka.pk,
            "client": prevadzka.nazov,
            "total_count": "10",
        }

    @pytest.fixture(autouse=True)
    def _one_prevadzka(self, monkeypatch, prevadzka):
        monkeypatch.setattr(
            loading_service,
            "_rows_by_prevadzka",
            lambda date: {prevadzka.pk: self._row(prevadzka)},
        )

    def test_cannot_confirm_with_a_gap(self, kuchyna_client, prevadzka):
        kuchyna_client.post(
            f"{URL}item/",
            {"date": DATE, "prevadzka": prevadzka.pk, "item_key": "soup"},
            format="json",
        )
        res = kuchyna_client.post(
            f"{URL}confirm/", {"date": DATE, "prevadzka": prevadzka.pk}, format="json"
        )
        assert res.status_code == 400
        assert res.data["missing"] == ["Hlavný chod"]
        assert not PrevadzkaLoadingConfirmation.objects.exists()

    def test_confirm_when_everything_is_loaded(self, kuchyna_client, prevadzka):
        for key in ("soup", "main_course"):
            kuchyna_client.post(
                f"{URL}item/",
                {"date": DATE, "prevadzka": prevadzka.pk, "item_key": key},
                format="json",
            )
        res = kuchyna_client.post(
            f"{URL}confirm/", {"date": DATE, "prevadzka": prevadzka.pk}, format="json"
        )
        assert res.status_code == 200, res.data
        confirmation = PrevadzkaLoadingConfirmation.objects.get()
        assert confirmation.confirmed_by.email == "k@example.com"

    def test_unchecking_cancels_the_confirmation(self, kuchyna_client, prevadzka):
        """Inak by prevádzka ostala „naložená" s dierou."""
        for key in ("soup", "main_course"):
            kuchyna_client.post(
                f"{URL}item/",
                {"date": DATE, "prevadzka": prevadzka.pk, "item_key": key},
                format="json",
            )
        kuchyna_client.post(
            f"{URL}confirm/", {"date": DATE, "prevadzka": prevadzka.pk}, format="json"
        )
        assert PrevadzkaLoadingConfirmation.objects.exists()

        kuchyna_client.post(
            f"{URL}item/",
            {
                "date": DATE,
                "prevadzka": prevadzka.pk,
                "item_key": "soup",
                "is_loaded": False,
            },
            format="json",
        )
        assert not PrevadzkaLoadingConfirmation.objects.exists()

    def test_checklist_lists_what_is_missing(self, kuchyna_client, prevadzka):
        res = kuchyna_client.get(
            f"{URL}checklist/?date={DATE}&prevadzka={prevadzka.pk}"
        )
        assert res.status_code == 200
        assert res.data["is_complete"] is False
        assert res.data["missing"] == ["Polievka", "Hlavný chod"]

    def test_overview_counts_progress(self, kuchyna_client, prevadzka):
        kuchyna_client.post(
            f"{URL}item/",
            {"date": DATE, "prevadzka": prevadzka.pk, "item_key": "soup"},
            format="json",
        )
        res = kuchyna_client.get(f"{URL}?date={DATE}")
        entry = res.data["prevadzky"][0]
        assert entry["loaded_count"] == 1
        assert entry["items_count"] == 2
        assert entry["is_confirmed"] is False


class TestItemsFollowTheMealPlan:
    def test_expected_items_come_from_the_menu(self, monkeypatch, prevadzka):
        """Očakávané položky sa neukladajú — zmena jedálnička ich mení hneď."""
        monkeypatch.setattr(
            loading_service,
            "_dashboard",
            lambda date: {"col_groups": [{"key": "soup", "label": "Polievka"}]},
        )
        assert loading_service.expected_items(DATE) == [
            {"key": "soup", "label": "Polievka"}
        ]


def test_roles_module_still_gates_the_endpoint():
    """Poistka, že sa endpoint neodpojil od rolového systému."""
    from api.views.loading_views import LoadingViewSet

    assert LoadingViewSet.permission_classes[0].__name__ == "_MinRolePermission"
    assert roles.KUCHYNA in roles.INTERNAL_ROLES

"""
Integration tests for admin-side order creation.

Covers the change to ``DailyOrderViewSet.perform_create`` that allows staff
users to create orders on behalf of client users via ``?user_id=`` query param.
"""

import datetime

import pytest
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status

from api.models import DailyOrder

pytestmark = pytest.mark.integration

FUTURE_DATE = datetime.date(2099, 6, 1)
ORDER_DATA = {
    "breakfast": {"Dospelý (SŠ)": {"menuCounts": {"A": 2}, "diets": {}}},
    "lunch": {},
    "olovrant": {},
}


def _client_user(**kwargs):
    """User + UserProfile (a tým celok + default prevádzka cez signál).

    Objednávky sa vedú per prevádzka, takže klient bez profilu nemá kam objednávať.
    V produkcii profil vzniká pri založení klienta.
    """
    from api.models import UserProfile

    user = User.objects.create_user(**kwargs)
    if not kwargs.get("is_staff"):
        UserProfile.objects.get_or_create(
            user=user, defaults={"company_name": user.email}
        )
    return user


@pytest.fixture
def client_user(db):
    return _client_user(
        username="client_for_admin@example.com",
        email="client_for_admin@example.com",
        password="pass123",
        is_staff=False,
    )


@pytest.mark.django_db
class TestAdminOrderCreate:
    """Staff user creates an order for a client via ?user_id=."""

    def test_admin_can_create_order_for_client(self, admin_client, client_user):
        url = reverse("dailyorder-list") + f"?user_id={client_user.pk}"
        payload = {"date": str(FUTURE_DATE), "data": ORDER_DATA}

        response = admin_client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        order = DailyOrder.objects.get()
        assert order.user == client_user
        assert order.date == FUTURE_DATE

    def test_admin_without_user_id_gets_client_only_error(self, admin_client):
        url = reverse("dailyorder-list")
        payload = {"date": str(FUTURE_DATE), "data": {}}

        response = admin_client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_with_nonexistent_user_id_gets_404(self, admin_client):
        url = reverse("dailyorder-list") + "?user_id=999999"
        payload = {"date": str(FUTURE_DATE), "data": {}}

        response = admin_client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_admin_cannot_create_order_for_another_staff_user(self, admin_client, db):
        other_staff = _client_user(
            username="staff2@example.com",
            email="staff2@example.com",
            password="pass",
            is_staff=True,
        )
        url = reverse("dailyorder-list") + f"?user_id={other_staff.pk}"
        payload = {"date": str(FUTURE_DATE), "data": {}}

        response = admin_client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_client_user_cannot_use_user_id_param(
        self, authenticated_client, client_user
    ):
        """Regular clients may not impersonate other users."""
        url = reverse("dailyorder-list") + f"?user_id={client_user.pk}"
        payload = {"date": str(FUTURE_DATE), "data": {}}

        response = authenticated_client.post(url, payload, format="json")

        # authenticated_client is a different user (not staff) — order is created
        # for themselves, ignoring user_id.  Verify the order belongs to the
        # fixture user, not client_user.
        assert response.status_code == status.HTTP_201_CREATED
        order = DailyOrder.objects.get()
        assert order.user != client_user

    def test_admin_order_data_is_stored_correctly(self, admin_client, client_user):
        url = reverse("dailyorder-list") + f"?user_id={client_user.pk}"
        payload = {"date": str(FUTURE_DATE), "data": ORDER_DATA}

        admin_client.post(url, payload, format="json")

        order = DailyOrder.objects.get(user=client_user)
        assert order.data == ORDER_DATA

    def test_admin_bypasses_deadline_for_past_date(self, admin_client, client_user):
        """Staff may create/edit orders for dates whose deadline has already passed."""
        past_date = datetime.date(2000, 1, 10)  # well in the past
        url = reverse("dailyorder-list") + f"?user_id={client_user.pk}"
        payload = {
            "date": str(past_date),
            "data": {"lunch": {"Dospelý (SŠ)": {"menuCounts": {"A": 1}, "diets": {}}}},
        }

        response = admin_client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_201_CREATED

    def test_admin_can_create_multiple_orders_for_different_dates(
        self, admin_client, client_user
    ):
        url = reverse("dailyorder-list") + f"?user_id={client_user.pk}"

        admin_client.post(url, {"date": str(FUTURE_DATE), "data": {}}, format="json")
        admin_client.post(
            url,
            {"date": str(FUTURE_DATE + datetime.timedelta(days=1)), "data": {}},
            format="json",
        )

        assert DailyOrder.objects.filter(user=client_user).count() == 2


@pytest.mark.django_db
class TestAdminOrderUpdate:
    """Staff user updates (PATCH) a client order via ?user_id=."""

    @pytest.fixture
    def client_user(self, db):
        return _client_user(
            username="patch_client@example.com",
            email="patch_client@example.com",
            password="pass",
            is_staff=False,
        )

    @pytest.fixture
    def existing_order(self, client_user):
        return DailyOrder.objects.create(
            user=client_user,
            date=FUTURE_DATE,
            data={"lunch": {"Dospelý (SŠ)": {"menuCounts": {"A": 1}, "diets": {}}}},
            status="submitted",
        )

    def test_admin_can_patch_client_order(
        self, admin_client, client_user, existing_order
    ):
        new_data = {"lunch": {"Dospelý (SŠ)": {"menuCounts": {"A": 3}, "diets": {}}}}
        url = (
            reverse("dailyorder-detail", kwargs={"pk": existing_order.pk})
            + f"?user_id={client_user.pk}"
        )

        response = admin_client.patch(url, {"data": new_data}, format="json")

        assert response.status_code == status.HTTP_200_OK
        existing_order.refresh_from_db()
        assert existing_order.data == new_data

    def test_admin_bypasses_deadline_on_patch(self, admin_client, client_user):
        """Staff can PATCH an order on a past date without a deadline error."""
        past_order = DailyOrder.objects.create(
            user=client_user,
            date=datetime.date(2000, 6, 1),
            data={},
            status="submitted",
        )
        url = (
            reverse("dailyorder-detail", kwargs={"pk": past_order.pk})
            + f"?user_id={client_user.pk}"
        )
        new_data = {"lunch": {"Dospelý (SŠ)": {"menuCounts": {"A": 2}, "diets": {}}}}

        response = admin_client.patch(url, {"data": new_data}, format="json")

        assert response.status_code == status.HTTP_200_OK

    def test_admin_patch_without_user_id_returns_404(
        self, admin_client, client_user, existing_order
    ):
        """Without user_id, the order is outside the staff queryset scope."""
        url = reverse("dailyorder-detail", kwargs={"pk": existing_order.pk})

        response = admin_client.patch(url, {"data": {}}, format="json")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_admin_delete_with_user_id_removes_order(
        self, admin_client, client_user, existing_order
    ):
        url = (
            reverse("dailyorder-detail", kwargs={"pk": existing_order.pk})
            + f"?user_id={client_user.pk}"
        )

        response = admin_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not DailyOrder.objects.filter(pk=existing_order.pk).exists()

    def test_admin_delete_without_user_id_returns_404(
        self, admin_client, client_user, existing_order
    ):
        url = reverse("dailyorder-detail", kwargs={"pk": existing_order.pk})

        response = admin_client.delete(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestAdminOrderQueryset:
    """Verify get_queryset scoping for staff users."""

    @pytest.fixture
    def client_a(self, db):
        return _client_user(
            username="qs_a@example.com", email="qs_a@example.com", password="p"
        )

    @pytest.fixture
    def client_b(self, db):
        return _client_user(
            username="qs_b@example.com", email="qs_b@example.com", password="p"
        )

    def _order_ids(self, response_data):
        """Extract order IDs from a response that may or may not be paginated."""
        if isinstance(response_data, dict) and "results" in response_data:
            return [o["id"] for o in response_data["results"]]
        return [o["id"] for o in response_data]

    def test_staff_without_user_id_sees_only_own_orders(
        self, admin_client, admin_user, client_a
    ):
        """Staff gets their own orders (not client orders) when user_id is omitted."""
        DailyOrder.objects.create(user=client_a, date=FUTURE_DATE, data={})
        # admin_user je staff bez profilu → prevádzku (NOT NULL) musíme určiť ručne.
        from api.models import Celok, Prevadzka

        celok = Celok.objects.create(nazov="Admin celok")
        prevadzka = Prevadzka.objects.create(celok=celok, nazov="Admin prevádzka")
        DailyOrder.objects.create(
            user=admin_user, date=FUTURE_DATE, data={}, prevadzka=prevadzka
        )

        response = admin_client.get(reverse("dailyorder-list"))

        assert response.status_code == status.HTTP_200_OK
        ids = self._order_ids(response.data)
        client_order = DailyOrder.objects.get(user=client_a)
        assert client_order.pk not in ids

    def test_staff_with_user_id_sees_only_that_clients_orders(
        self, admin_client, client_a, client_b
    ):
        """user_id filter scopes list to the specified client only."""
        order_a = DailyOrder.objects.create(user=client_a, date=FUTURE_DATE, data={})
        DailyOrder.objects.create(user=client_b, date=FUTURE_DATE, data={})

        url = reverse("dailyorder-list") + f"?user_id={client_a.pk}"
        response = admin_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        ids = self._order_ids(response.data)
        assert order_a.pk in ids
        assert len(ids) == 1

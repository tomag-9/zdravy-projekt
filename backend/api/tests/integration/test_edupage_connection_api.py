import pytest
from rest_framework import status

from api.models import Celok, EdupageConnection, Prevadzka

pytestmark = pytest.mark.integration

CONNECTIONS_URL = "/api/admin/edupage-connections/"


@pytest.mark.django_db
def test_shared_url_creates_one_connection_for_multiple_celky():
    url = "https://shared.edupage.org/menu/mealsGuest?id=token"
    first = Celok.objects.create(
        nazov="First school",
        zdroj_objednavok=Celok.ZdrojObjednavok.EDUPAGE,
    )
    second = Celok.objects.create(
        nazov="Second school",
        zdroj_objednavok=Celok.ZdrojObjednavok.EDUPAGE,
    )
    connection = EdupageConnection.objects.create(
        name="Shared EduPage",
        mealsguest_url=url,
    )
    first_prevadzka = Prevadzka.objects.create(
        celok=first,
        nazov="First",
        edupage_connection=connection,
    )
    second_prevadzka = Prevadzka.objects.create(
        celok=second,
        nazov="Second",
        edupage_connection=connection,
    )
    assert first_prevadzka.edupage_connection_id == connection.pk
    assert second_prevadzka.edupage_connection_id == connection.pk


@pytest.mark.django_db
def test_admin_can_manage_connections_and_assign_them_to_prevadzka(admin_client):
    create_response = admin_client.post(
        CONNECTIONS_URL,
        {
            "name": "Managed EduPage",
            "mealsguest_url": (
                "https://managed.edupage.org/menu/mealsGuest?id=managed-token"
            ),
            "api_identifier": "managed",
            "is_active": True,
        },
        format="json",
    )

    assert create_response.status_code == status.HTTP_201_CREATED
    connection_id = create_response.json()["id"]

    update_response = admin_client.patch(
        f"{CONNECTIONS_URL}{connection_id}/",
        {"is_active": False},
        format="json",
    )

    assert update_response.status_code == status.HTTP_200_OK
    assert update_response.json()["is_active"] is False
    assert admin_client.get(CONNECTIONS_URL).json()[0]["id"] == connection_id

    celok = Celok.objects.create(nazov="Managed school")
    prevadzka_response = admin_client.post(
        "/api/admin/facility-prevadzky/",
        {
            "celok": celok.pk,
            "nazov": "Managed school",
            "edupage_connection": connection_id,
        },
        format="json",
    )

    assert prevadzka_response.status_code == status.HTTP_201_CREATED
    assert prevadzka_response.json()["edupage_connection"] == connection_id
    assert prevadzka_response.json()["edupage_connection_name"] == "Managed EduPage"


@pytest.mark.django_db
def test_scrape_action_lives_on_connection_endpoint(admin_client):
    response = admin_client.post(f"{CONNECTIONS_URL}scrape/", {}, format="json")

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json() == {"error": "date is required"}

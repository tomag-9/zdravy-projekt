import datetime

import pytest
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status

from api.models import Celok, EdupageConnection, EdupageUpload, Prevadzka
from api.services.edupage_connection_service import SYSTEM_SCRAPE_EMAIL

pytestmark = pytest.mark.integration

CONNECTIONS_URL = "/api/admin/edupage-connections/"
UPLOADS_URL = "/api/admin/edupage-uploads/"


@pytest.mark.django_db
def test_shared_url_creates_one_connection_for_multiple_celky():
    url = "https://shared.edupage.org/menu/mealsGuest?id=token"
    first = Celok.objects.create(
        nazov="First school",
        zdroj_objednavok=Celok.ZdrojObjednavok.EDUPAGE,
        mealsguest_url=url,
    )
    second = Celok.objects.create(
        nazov="Second school",
        zdroj_objednavok=Celok.ZdrojObjednavok.EDUPAGE,
        mealsguest_url=url,
    )

    first_prevadzka = Prevadzka.objects.create(celok=first, nazov="First")
    second_prevadzka = Prevadzka.objects.create(celok=second, nazov="Second")

    connection = EdupageConnection.objects.get(mealsguest_url=url)
    first_prevadzka.refresh_from_db()
    second_prevadzka.refresh_from_db()
    assert first_prevadzka.edupage_connection_id == connection.pk
    assert second_prevadzka.edupage_connection_id == connection.pk


@pytest.mark.django_db
def test_admin_upload_and_status_use_connection(
    admin_client,
    settings,
    tmp_path,
):
    settings.MEDIA_ROOT = tmp_path
    celok = Celok.objects.create(
        nazov="Upload school",
        zdroj_objednavok=Celok.ZdrojObjednavok.EDUPAGE,
        mealsguest_url="https://upload.edupage.org/menu/mealsGuest?id=token",
    )
    Prevadzka.objects.create(celok=celok, nazov="Upload school")
    connection = EdupageConnection.objects.get(mealsguest_url=celok.mealsguest_url)

    list_response = admin_client.get(CONNECTIONS_URL)

    assert list_response.status_code == status.HTTP_200_OK
    assert list_response.json() == [
        {
            "id": connection.pk,
            "name": connection.name,
            "mealsguest_url": connection.mealsguest_url,
            "api_identifier": "",
            "is_active": True,
        }
    ]

    target_date = datetime.date(2026, 7, 24)
    upload_response = admin_client.post(
        f"{UPLOADS_URL}upload/",
        {
            "date": target_date.isoformat(),
            "connection_id": str(connection.pk),
            "file": SimpleUploadedFile("orders.xlsx", b"test-content"),
        },
        format="multipart",
    )

    assert upload_response.status_code == status.HTTP_201_CREATED
    upload = EdupageUpload.objects.get()
    assert upload.connection_id == connection.pk
    assert upload.operation_id is None
    assert upload_response.json()["operation_name"] == connection.name

    status_response = admin_client.get(
        f"{UPLOADS_URL}status_by_date/?date={target_date.isoformat()}"
    )

    assert status_response.status_code == status.HTTP_200_OK
    assert status_response.json()["schools"] == [
        {
            "id": connection.pk,
            "name": connection.name,
            "uploaded": True,
            "upload_count": 1,
        }
    ]
    assert not User.objects.filter(username=SYSTEM_SCRAPE_EMAIL).exists()

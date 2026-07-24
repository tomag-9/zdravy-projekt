import datetime
import importlib

import pytest
from django.apps import apps
from django.contrib.auth.models import User

from api.models import Celok, EdupageConnection, EdupageUpload, Prevadzka, UserProfile


@pytest.mark.django_db
def test_backfill_groups_celky_and_uploads_by_edupage_url():
    migration = importlib.import_module("api.migrations.0055_edupage_connection_expand")
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
    user = User.objects.create_user(
        username="shared@example.com",
        email="shared@example.com",
    )
    profile = UserProfile.objects.create(
        user=user,
        company_name="Shared EduPage",
        is_edupage=True,
        mealsguest_url=url,
        celok=None,
    )
    profile.prevadzky.set([first_prevadzka, second_prevadzka])
    upload = EdupageUpload.objects.create(
        operation=profile,
        date=datetime.date(2026, 7, 24),
        filename="orders.xlsx",
        file="edupage_uploads/orders.xlsx",
    )

    migration.forwards(apps, None)

    connection = EdupageConnection.objects.get(mealsguest_url=url)
    assert connection.name == "Shared EduPage"
    first_prevadzka.refresh_from_db()
    second_prevadzka.refresh_from_db()
    upload.refresh_from_db()
    assert first_prevadzka.edupage_connection_id == connection.pk
    assert second_prevadzka.edupage_connection_id == connection.pk
    assert upload.connection_id == connection.pk

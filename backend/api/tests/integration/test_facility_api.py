from datetime import date

import pytest

from api.models import Celok, DailyOrder, Prevadzka


@pytest.mark.django_db
def test_delete_prevadzka_with_orders_returns_protected_error(admin_client, admin_user):
    celok = Celok.objects.create(nazov="Chránený celok")
    prevadzka = Prevadzka.objects.create(celok=celok, nazov="Chránená prevádzka")
    DailyOrder.objects.create(
        user=admin_user,
        prevadzka=prevadzka,
        date=date.today(),
        data={},
    )

    response = admin_client.delete(f"/api/admin/facility-prevadzky/{prevadzka.pk}/")

    assert response.status_code == 409
    assert response.json() == {
        "error": {
            "code": "protected_error",
            "message": (
                "Túto položku nie je možné odstrániť, pretože sú na ňu naviazané "
                "ďalšie záznamy."
            ),
            "details": {},
        }
    }
    assert Prevadzka.objects.filter(pk=prevadzka.pk).exists()

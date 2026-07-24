import datetime

import pytest
from django.contrib.auth.models import User
from django.db.models.deletion import ProtectedError

from api.models import DailyOrder, Prevadzka, UserProfile


def _order():
    user = User.objects.create_user(
        username="history@example.com",
        email="history@example.com",
    )
    profile = UserProfile.objects.create(user=user, company_name="History school")
    profile.refresh_from_db()
    prevadzka = profile.dostupne_prevadzky().get()
    order = DailyOrder.objects.create(
        user=user,
        prevadzka=prevadzka,
        date=datetime.date(2026, 7, 24),
        data={"lunch": {"default": {"menuCounts": {"A": 1}, "diets": {}}}},
    )
    return user, profile.celok, prevadzka, order


@pytest.mark.django_db
def test_deleting_login_preserves_order_history():
    user, _, prevadzka, order = _order()

    user.delete()

    order.refresh_from_db()
    assert order.user_id is None
    assert order.prevadzka_id == prevadzka.pk


@pytest.mark.django_db
def test_deleting_prevadzka_with_orders_is_protected():
    _, _, prevadzka, order = _order()

    with pytest.raises(ProtectedError):
        prevadzka.delete()

    assert DailyOrder.objects.filter(pk=order.pk).exists()


@pytest.mark.django_db
def test_deleting_celok_with_prevadzky_is_protected():
    _, celok, prevadzka, _ = _order()

    with pytest.raises(ProtectedError):
        celok.delete()

    assert Prevadzka.objects.filter(pk=prevadzka.pk).exists()

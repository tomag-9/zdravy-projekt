import datetime

import pytest
from django.contrib.auth.models import User

from api.models import Celok, DailyOrder, Prevadzka, UserProfile
from api.utils import filter_order_data_for_prevadzka, order_row_label


def _user_with_profile(email: str, company_name: str, celok=None):
    user = User.objects.create_user(username=email, email=email)
    profile = UserProfile.objects.create(user=user, company_name=company_name)
    profile.celok = celok
    profile.save(update_fields=["celok"])
    return user, profile


@pytest.mark.django_db
class TestOrderRowLabel:
    def test_single_prevadzka_same_celok_keeps_login_label(self):
        celok = Celok.objects.create(nazov="MŠ Felix Karlovská")
        prevadzka = Prevadzka.objects.create(celok=celok, nazov="MŠ Felix Karlovská")
        user, _ = _user_with_profile(
            "felix@example.com", "MŠ Felix Karlovská", celok=celok
        )
        order = DailyOrder.objects.create(
            user=user,
            prevadzka=prevadzka,
            date=datetime.date(2026, 7, 17),
            data={},
        )

        assert order_row_label(order) == "MŠ Felix Karlovská"

    def test_cross_celok_edupage_login_uses_actual_celok_label(self):
        celok = Celok.objects.create(nazov="Deutsche schule")
        prevadzka = Prevadzka.objects.create(celok=celok, nazov="Deutsche schule")
        user, profile = _user_with_profile(
            "zdravebrusko@edupage.local", "MŠ Zdravé Bruško", celok=None
        )
        profile.prevadzky.add(prevadzka)
        order = DailyOrder.objects.create(
            user=user,
            prevadzka=prevadzka,
            date=datetime.date(2026, 7, 17),
            data={},
        )

        assert order_row_label(order) == "Deutsche schule"

    def test_cross_celok_with_multiple_prevadzky_in_celok_includes_prevadzka(self):
        celok = Celok.objects.create(nazov="Jolly Homeschool")
        jolly_1 = Prevadzka.objects.create(celok=celok, nazov="Jolly 1")
        Prevadzka.objects.create(celok=celok, nazov="Jolly 2")
        user, profile = _user_with_profile(
            "shared@example.com", "Spoločný EduPage", celok=None
        )
        profile.prevadzky.add(jolly_1)
        order = DailyOrder.objects.create(
            user=user,
            prevadzka=jolly_1,
            date=datetime.date(2026, 7, 17),
            data={},
        )

        assert order_row_label(order) == "Jolly Homeschool – Jolly 1"


class TestFilterOrderDataForPrevadzka:
    def test_deutsche_schule_serves_lunch_only(self):
        data = {
            "breakfast": {"Deutsche schule": {"Škôlka": {"menuCounts": {"A": 5}}}},
            "lunch": {"Deutsche schule": {"Škôlka": {"menuCounts": {"A": 56}}}},
            "olovrant": {"Deutsche schule": {"Škôlka": {"menuCounts": {"A": 57}}}},
        }

        assert filter_order_data_for_prevadzka(data, "Deutsche schule") == {
            "lunch": {"Deutsche schule": {"Škôlka": {"menuCounts": {"A": 56}}}}
        }

    def test_other_prevadzka_is_unchanged(self):
        data = {
            "breakfast": {"MŠ Felix Karlovská": {}},
            "lunch": {"MŠ Felix Karlovská": {}},
            "olovrant": {"MŠ Felix Karlovská": {}},
        }

        assert filter_order_data_for_prevadzka(data, "MŠ Felix Karlovská") == data

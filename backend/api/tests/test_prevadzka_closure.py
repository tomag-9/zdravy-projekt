"""Voľno prevádzky (#490) + zjednotený "objednáva sa v tento deň?" helper (#489).

Testuje sa hlavne to, čím sa `PrevadzkaClosure` líši od `Holiday`: platí len
pre jednu prevádzku, kým ostatné objednávajú ďalej.
"""

import datetime

import pytest
from django.contrib.auth.models import User
from django.db.utils import IntegrityError

from api.models import (
    Celok,
    DailyOrder,
    Holiday,
    Prevadzka,
    PrevadzkaClosure,
    ProfileCelokAccess,
    UserProfile,
)
from api.scheduling import (
    business_days,
    business_days_in_range,
    closed_dates_for_prevadzky,
    day_off_reason,
    is_day_off,
    is_prevadzka_closed,
    next_business_day,
    previous_business_day,
)

MONDAY = datetime.date(2026, 8, 24)
TUESDAY = datetime.date(2026, 8, 25)
WEDNESDAY = datetime.date(2026, 8, 26)
THURSDAY = datetime.date(2026, 8, 27)
FRIDAY = datetime.date(2026, 8, 28)
SATURDAY = datetime.date(2026, 8, 29)


@pytest.fixture
def celok(db):
    return Celok.objects.create(nazov="Jolly")


@pytest.fixture
def prevadzky(celok):
    return [
        Prevadzka.objects.create(celok=celok, nazov=f"Jolly {i}", sort_order=i)
        for i in (1, 2)
    ]


def _client(email, celok):
    user = User.objects.create_user(username=email, email=email)
    profile = UserProfile(user=user, company_name=email)
    profile._skip_default_facility = True
    profile.save()
    ProfileCelokAccess.objects.create(profile=profile, celok=celok)
    return user


@pytest.mark.django_db
class TestModel:
    def test_range_must_be_ordered(self, prevadzky):
        with pytest.raises(IntegrityError):
            PrevadzkaClosure.objects.create(
                prevadzka=prevadzky[0], date_from=WEDNESDAY, date_to=MONDAY
            )

    def test_covers_is_inclusive_on_both_ends(self, prevadzky):
        closure = PrevadzkaClosure.objects.create(
            prevadzka=prevadzky[0], date_from=MONDAY, date_to=WEDNESDAY
        )
        assert closure.covers(MONDAY)
        assert closure.covers(TUESDAY)
        assert closure.covers(WEDNESDAY)
        assert not closure.covers(FRIDAY)


@pytest.mark.django_db
class TestScheduling:
    def test_closure_is_scoped_to_its_prevadzka(self, prevadzky):
        PrevadzkaClosure.objects.create(
            prevadzka=prevadzky[0], date_from=MONDAY, date_to=WEDNESDAY
        )
        assert is_prevadzka_closed(TUESDAY, prevadzky[0])
        assert not is_prevadzka_closed(TUESDAY, prevadzky[1])

    def test_day_off_reason_prefers_the_broadest_layer(self, prevadzky):
        Holiday.objects.create(date=MONDAY, reason="Sviatok")
        PrevadzkaClosure.objects.create(
            prevadzka=prevadzky[0], date_from=MONDAY, date_to=MONDAY
        )
        # Celosystémové voľno je dôležitejšie: nevarí sa nikde.
        assert day_off_reason(MONDAY, prevadzky[0]) == "configured_day_off"
        assert day_off_reason(SATURDAY, prevadzky[0]) == "weekend"

    def test_closure_alone_gives_its_own_reason(self, prevadzky):
        PrevadzkaClosure.objects.create(
            prevadzka=prevadzky[0], date_from=TUESDAY, date_to=TUESDAY
        )
        assert day_off_reason(TUESDAY, prevadzky[0]) == "prevadzka_closure"
        assert day_off_reason(TUESDAY, prevadzky[1]) is None
        assert day_off_reason(TUESDAY) is None

    def test_is_day_off_without_prevadzka_ignores_closures(self, prevadzky):
        PrevadzkaClosure.objects.create(
            prevadzka=prevadzky[0], date_from=TUESDAY, date_to=TUESDAY
        )
        assert not is_day_off(TUESDAY)
        assert is_day_off(TUESDAY, prevadzky[0])

    def test_closed_dates_expands_ranges_and_clips_to_window(self, prevadzky):
        PrevadzkaClosure.objects.create(
            prevadzka=prevadzky[0], date_from=MONDAY, date_to=FRIDAY
        )
        result = closed_dates_for_prevadzky(
            [p.id for p in prevadzky], TUESDAY, WEDNESDAY
        )
        assert result[prevadzky[0].id] == {TUESDAY, WEDNESDAY}
        assert result[prevadzky[1].id] == set()

    def test_next_and_previous_business_day_skip_closures(self, prevadzky):
        PrevadzkaClosure.objects.create(
            prevadzka=prevadzky[0], date_from=MONDAY, date_to=TUESDAY
        )
        assert next_business_day(MONDAY, prevadzky[0]) == WEDNESDAY
        assert next_business_day(MONDAY, prevadzky[1]) == MONDAY
        assert previous_business_day(
            TUESDAY, prevadzky[0]
        ) == FRIDAY - datetime.timedelta(days=7)

    def test_business_days_skips_weekend_holiday_and_closure(self, prevadzky):
        Holiday.objects.create(date=TUESDAY, reason="Sviatok")
        PrevadzkaClosure.objects.create(
            prevadzka=prevadzky[0], date_from=WEDNESDAY, date_to=WEDNESDAY
        )
        days = business_days(MONDAY, 3, prevadzky[0])
        assert days == [
            MONDAY,
            THURSDAY,
            FRIDAY,
        ]

    def test_business_days_in_range_is_inclusive(self, prevadzky):
        PrevadzkaClosure.objects.create(
            prevadzka=prevadzky[0], date_from=TUESDAY, date_to=WEDNESDAY
        )
        days = business_days_in_range(MONDAY, SATURDAY, prevadzky[0])
        assert days == [MONDAY, THURSDAY, FRIDAY]


@pytest.mark.django_db
class TestOrderingIsBlocked:
    def _payload(self, prevadzka, date):
        return {
            "date": date.isoformat(),
            "status": "submitted",
            "prevadzka": prevadzka.id,
            "data": {"lunch": {"Jolly 1": {"menuCounts": {"A": 5}}}},
        }

    def test_client_cannot_order_on_a_closure_day(self, celok, prevadzky, client):
        from rest_framework.test import APIClient

        user = _client("eva@example.com", celok)
        PrevadzkaClosure.objects.create(
            prevadzka=prevadzky[0], date_from=TUESDAY, date_to=TUESDAY
        )
        api = APIClient()
        api.force_authenticate(user=user)

        res = api.post(
            "/api/orders/", self._payload(prevadzky[0], TUESDAY), format="json"
        )
        assert res.status_code == 400
        assert not DailyOrder.objects.filter(prevadzka=prevadzky[0]).exists()

    def test_other_prevadzka_of_the_same_celok_can_still_order(self, celok, prevadzky):
        from rest_framework.test import APIClient

        user = _client("jan@example.com", celok)
        PrevadzkaClosure.objects.create(
            prevadzka=prevadzky[0], date_from=TUESDAY, date_to=TUESDAY
        )
        api = APIClient()
        api.force_authenticate(user=user)

        res = api.post(
            "/api/orders/", self._payload(prevadzky[1], TUESDAY), format="json"
        )
        assert res.status_code in (200, 201), res.data
        assert DailyOrder.objects.filter(prevadzka=prevadzky[1]).exists()

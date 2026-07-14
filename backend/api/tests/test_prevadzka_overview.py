import datetime

import pytest

from api.models import Celok, DailyOrder, Prevadzka, UserProfile

URL = "/api/admin/summary/prevadzka-overview/"
DATE = datetime.date(2026, 7, 10)


def _celok_with_prevadzka(nazov, is_edupage):
    celok = Celok.objects.create(nazov=nazov)
    prevadzka = Prevadzka.objects.create(celok=celok, nazov=nazov)
    from django.contrib.auth.models import User

    user = User.objects.create_user(username=f"{nazov}@x.sk", email=f"{nazov}@x.sk")
    UserProfile.objects.create(
        user=user, company_name=nazov, celok=celok, is_edupage=is_edupage
    )
    return celok, prevadzka, user


@pytest.mark.django_db
def test_overview_splits_edupage_and_app_and_flags(admin_client):
    _edu_celok, edu_prev, edu_user = _celok_with_prevadzka("EduŠkola", is_edupage=True)
    _app_celok, app_prev, _app_user = _celok_with_prevadzka(
        "AppŠkola", is_edupage=False
    )

    # EduPage prevádzka dodala podklady s upozornením.
    DailyOrder.objects.create(
        user=edu_user,
        prevadzka=edu_prev,
        date=DATE,
        data={"lunch": {"EduŠkola": {"menuCounts": {"A": 12}}}},
        scrape_flags={"attention": ["A:KZ?"], "config_notes": []},
    )
    # App prevádzka nedodala nič (žiadny DailyOrder).

    res = admin_client.get(URL, {"date": DATE.isoformat()})
    assert res.status_code == 200
    body = res.json()

    assert [r["nazov"] for r in body["edupage"]] == ["EduŠkola"]
    assert [r["nazov"] for r in body["app"]] == ["AppŠkola"]

    edu = body["edupage"][0]
    assert edu["delivered"] is True
    assert edu["counts"]["lunch"] == 12
    assert edu["counts"]["total"] == 12
    assert edu["has_warning"] is True
    assert edu["flags"]["attention"] == ["A:KZ?"]

    app = body["app"][0]
    assert app["delivered"] is False
    assert app["counts"]["total"] == 0
    assert app["has_warning"] is False


@pytest.mark.django_db
@pytest.mark.parametrize(
    "fmt,ctype",
    [
        ("xlsx", "spreadsheetml"),
        ("pdf", "application/pdf"),
    ],
)
def test_overview_export(admin_client, fmt, ctype):
    _c, prev, user = _celok_with_prevadzka("EduŠkola", is_edupage=True)
    DailyOrder.objects.create(
        user=user,
        prevadzka=prev,
        date=DATE,
        data={"lunch": {"EduŠkola": {"menuCounts": {"A": 3}}}},
    )
    res = admin_client.get(
        f"/api/admin/summary/prevadzka-overview-{fmt}/", {"date": DATE.isoformat()}
    )
    assert res.status_code == 200
    assert ctype in res["Content-Type"]
    assert res["Content-Disposition"].endswith(f'.{fmt}"')


@pytest.mark.django_db
def test_overview_requires_date(admin_client):
    assert admin_client.get(URL).status_code == 400


@pytest.mark.django_db
def test_overview_requires_admin(authenticated_client):
    res = authenticated_client.get(URL, {"date": DATE.isoformat()})
    assert res.status_code in (401, 403)

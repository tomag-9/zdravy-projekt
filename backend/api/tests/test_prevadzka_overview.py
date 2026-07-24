import datetime

import pytest

from api.exporters.prevadzka_overview_exporter import _status_label
from api.models import Celok, DailyOrder, Prevadzka, ProfileCelokAccess, UserProfile

URL = "/api/admin/summary/prevadzka-overview/"
DATE = datetime.date(2026, 7, 10)


def _celok_with_prevadzka(nazov, is_edupage):
    celok = Celok.objects.create(
        nazov=nazov,
        zdroj_objednavok=(
            Celok.ZdrojObjednavok.EDUPAGE if is_edupage else Celok.ZdrojObjednavok.APP
        ),
    )
    prevadzka = Prevadzka.objects.create(celok=celok, nazov=nazov)
    from django.contrib.auth.models import User

    user = User.objects.create_user(username=f"{nazov}@x.sk", email=f"{nazov}@x.sk")
    profile = UserProfile(user=user, company_name=nazov)
    profile._skip_default_facility = True
    profile.save()
    ProfileCelokAccess.objects.create(profile=profile, celok=celok)
    return celok, prevadzka, user


@pytest.mark.django_db
def test_overview_splits_edupage_and_app_and_flags(admin_client):
    _edu_celok, edu_prev, edu_user = _celok_with_prevadzka("EduŠkola", is_edupage=True)
    _app_celok, _app_prev, _app_user = _celok_with_prevadzka(
        "AppŠkola", is_edupage=False
    )
    _zero_celok, zero_prev, zero_user = _celok_with_prevadzka(
        "Nulová App", is_edupage=False
    )
    _auto_celok, auto_prev, auto_user = _celok_with_prevadzka(
        "Auto App", is_edupage=False
    )
    _manual_celok, manual_prev, manual_user = _celok_with_prevadzka(
        "Manual App", is_edupage=False
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
    DailyOrder.objects.create(
        user=zero_user,
        prevadzka=zero_prev,
        date=DATE,
        data={},
        is_auto=False,
    )
    DailyOrder.objects.create(
        user=auto_user,
        prevadzka=auto_prev,
        date=DATE,
        data={"lunch": {"Auto App": {"menuCounts": {"A": 5}}}},
        is_auto=True,
    )
    DailyOrder.objects.create(
        user=manual_user,
        prevadzka=manual_prev,
        date=DATE,
        data={"lunch": {"Manual App": {"menuCounts": {"A": 7}}}},
        is_auto=False,
    )

    res = admin_client.get(URL, {"date": DATE.isoformat()})
    assert res.status_code == 200
    body = res.json()

    assert [r["nazov"] for r in body["edupage"]] == ["EduŠkola"]
    assert [r["nazov"] for r in body["app"]] == [
        "AppŠkola",
        "Auto App",
        "Manual App",
        "Nulová App",
    ]

    edu = body["edupage"][0]
    assert edu["delivered"] is True
    assert edu["counts"]["lunch"] == 12
    assert edu["counts"]["total"] == 12
    assert edu["has_warning"] is True
    assert edu["flags"]["attention"] == ["A:KZ?"]

    app = body["app"][0]
    assert app["delivered"] is False
    assert app["delivery_status"] == "missing"
    assert app["counts"]["total"] == 0
    assert app["has_warning"] is False

    app_by_name = {row["nazov"]: row for row in body["app"]}
    assert app_by_name["Nulová App"]["delivered"] is True
    assert app_by_name["Nulová App"]["delivery_status"] == "manual_zero"
    assert app_by_name["Nulová App"]["counts"]["total"] == 0
    assert app_by_name["Auto App"]["delivery_status"] == "auto"
    assert app_by_name["Auto App"]["counts"]["total"] == 5
    assert app_by_name["Manual App"]["delivery_status"] == "manual"
    assert app_by_name["Manual App"]["counts"]["total"] == 7


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


def test_overview_export_status_labels_prioritize_warnings():
    assert _status_label({"delivered": False, "has_warning": False}) == "NEDODANÉ"
    assert (
        _status_label(
            {"delivered": True, "has_warning": True, "delivery_status": "manual"}
        )
        == "SKONTROLUJ"
    )
    assert (
        _status_label(
            {"delivered": True, "has_warning": False, "delivery_status": "manual_zero"}
        )
        == "NULA"
    )
    assert (
        _status_label(
            {"delivered": True, "has_warning": False, "delivery_status": "auto"}
        )
        == "AUTO KÓPIA"
    )


@pytest.mark.django_db
def test_overview_requires_date(admin_client):
    assert admin_client.get(URL).status_code == 400


@pytest.mark.django_db
def test_overview_requires_admin(authenticated_client):
    res = authenticated_client.get(URL, {"date": DATE.isoformat()})
    assert res.status_code in (401, 403)

import datetime

import pytest

from api.models import (
    Celok,
    DailyOrder,
    ExternalOrderSnapshot,
    Prevadzka,
    ProfileCelokAccess,
    UserProfile,
)

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
    edu_prev.adults_pack_separately_enabled = True
    edu_prev.olovrant_s_obedom = True
    edu_prev.save(update_fields=["adults_pack_separately_enabled", "olovrant_s_obedom"])
    manual_prev.pack_separately_enabled = True
    manual_prev.save(update_fields=["pack_separately_enabled"])

    # EduPage prevádzka dodala podklady s upozornením, 3 deti majú diétu.
    DailyOrder.objects.create(
        user=edu_user,
        prevadzka=edu_prev,
        date=DATE,
        data={
            "lunch": {
                "EduŠkola": {
                    "menuCounts": {"A": 12},
                    "diets": {"Bezlaktózová": 3},
                }
            }
        },
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
    assert edu["counts"]["standard_total"] == 9
    assert edu["counts"]["diet_counts"] == {"Bezlaktózová": 3}
    assert edu["has_warning"] is True
    assert edu["flags"]["attention"] == ["A:KZ?"]
    assert edu["pack_separately_enabled"] is False
    assert edu["adults_pack_separately_enabled"] is True
    assert edu["olovrant_s_obedom"] is True

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
    assert app_by_name["Manual App"]["pack_separately_enabled"] is True
    assert app_by_name["Manual App"]["adults_pack_separately_enabled"] is False
    assert app_by_name["Manual App"]["olovrant_s_obedom"] is False


@pytest.mark.django_db
def test_overview_attention_dismissed_hides_all_flags_for_that_day(admin_client):
    """Odkliknuté (`attention_dismissed`) skryje warning bez ohľadu na typ
    flagu — `attention`, ale aj `config_notes`/`unmapped_diets`/
    `uncertain_diets` (user 9.9.2026: opakované false-positive olovrant/diet
    flagy naprieč prevádzkami, dovtedy sa nedali odkliknúť vôbec, len
    `attention`). Trvalé fakty (ZŠ Fan olovrant) sa rieši config fixom, nie
    dismissom — to len skrýva warning PRE TENTO DEŇ."""
    edu_celok, edu_prev, edu_user = _celok_with_prevadzka("Dismiss Test", True)
    DailyOrder.objects.create(
        user=edu_user,
        prevadzka=edu_prev,
        date=DATE,
        data={"lunch": {"Dismiss Test": {"menuCounts": {"A": 5}}}},
        scrape_flags={"attention": [], "config_notes": ["olovrant chýba"]},
        attention_dismissed=True,
    )

    res = admin_client.get(URL, {"date": DATE.isoformat()})
    row = res.json()["edupage"][0]
    assert row["attention_dismissed"] is True
    assert row["flags"]["config_notes"] == ["olovrant chýba"]
    assert row["has_warning"] is False

    DailyOrder.objects.filter(prevadzka=edu_prev, date=DATE).update(
        attention_dismissed=False
    )
    res = admin_client.get(URL, {"date": DATE.isoformat()})
    row = res.json()["edupage"][0]
    assert row["has_warning"] is True


@pytest.mark.django_db
def test_overview_adds_external_sa_snapshot_to_app_order(admin_client):
    """Kuchynský počet Stromčeka je súčet appky a izolovaného sA snapshotu."""
    _celok, prevadzka, user = _celok_with_prevadzka("Stromček", False)
    DailyOrder.objects.create(
        user=user,
        prevadzka=prevadzka,
        date=DATE,
        data={"lunch": {"Škôlka": {"menuCounts": {"A": 7}, "diets": {}}}},
    )
    ExternalOrderSnapshot.objects.create(
        prevadzka=prevadzka,
        date=DATE,
        source=ExternalOrderSnapshot.Source.EDUPAGE_SA,
        data={"lunch": {"Škôlka": {"menuCounts": {"A": 4}, "diets": {}}}},
    )

    response = admin_client.get(URL, {"date": DATE.isoformat()})

    row = response.json()["app"][0]
    assert row["counts"]["lunch"] == 11
    assert row["counts"]["total"] == 11


@pytest.mark.django_db
def test_overview_flags_missing_lunch_after_three_previous_fridays(admin_client):
    """Historická kontrola platí pre app objednávky rovnako ako pre EduPage.

    Porovnávame len rovnaký deň v týždni: ak prevádzka mala obed v troch
    predchádzajúcich piatkoch a v aktuálny piatok je nula, administrátor musí
    dostať nedismissnutý attention flag s viditeľným porovnaním hodnôt.
    """
    _celok, prevadzka, user = _celok_with_prevadzka("Piatková škola", False)
    for historical_date, count in zip(
        (
            DATE - datetime.timedelta(days=21),
            DATE - datetime.timedelta(days=14),
            DATE - datetime.timedelta(days=7),
        ),
        (12, 11, 10),
    ):
        DailyOrder.objects.create(
            user=user,
            prevadzka=prevadzka,
            date=historical_date,
            data={
                "lunch": {
                    "Piatková škola": {
                        "menuCounts": {"A": count},
                    }
                }
            },
        )
    DailyOrder.objects.create(
        user=user,
        prevadzka=prevadzka,
        date=DATE,
        data={"lunch": {"Piatková škola": {"menuCounts": {}}}},
    )

    res = admin_client.get(URL, {"date": DATE.isoformat()})

    assert res.status_code == 200
    row = res.json()["app"][0]
    assert row["attention_dismissed"] is False
    assert row["has_warning"] is True
    assert row["flags"]["attention"] == [
        "Obed: dnes 0, predchádzajúce piatky 12 / 11 / 10 — over objednávku"
    ]


@pytest.mark.django_db
def test_overview_does_not_skip_zero_in_recent_matching_weekdays(admin_client):
    _celok, prevadzka, user = _celok_with_prevadzka("Piatková nula", False)
    for historical_date, count in zip(
        (
            DATE - datetime.timedelta(days=28),
            DATE - datetime.timedelta(days=21),
            DATE - datetime.timedelta(days=14),
            DATE - datetime.timedelta(days=7),
        ),
        (12, 10, 11, 0),
    ):
        DailyOrder.objects.create(
            user=user,
            prevadzka=prevadzka,
            date=historical_date,
            data={"lunch": {"Piatková nula": {"menuCounts": {"A": count}}}},
        )
    DailyOrder.objects.create(
        user=user,
        prevadzka=prevadzka,
        date=DATE,
        data={"lunch": {"Piatková nula": {"menuCounts": {}}}},
    )

    res = admin_client.get(URL, {"date": DATE.isoformat()})

    assert res.status_code == 200
    row = res.json()["app"][0]
    assert row["flags"]["attention"] == []
    assert row["has_warning"] is False


@pytest.mark.django_db
def test_overview_does_not_flag_missing_meal_with_only_two_matching_weekdays(
    admin_client,
):
    _celok, prevadzka, user = _celok_with_prevadzka("Dve piatky", False)
    for historical_date, count in (
        (DATE - datetime.timedelta(days=14), 12),
        (DATE - datetime.timedelta(days=7), 10),
    ):
        DailyOrder.objects.create(
            user=user,
            prevadzka=prevadzka,
            date=historical_date,
            data={"lunch": {"Dve piatky": {"menuCounts": {"A": count}}}},
        )
    DailyOrder.objects.create(
        user=user,
        prevadzka=prevadzka,
        date=DATE,
        data={"lunch": {"Dve piatky": {"menuCounts": {}}}},
    )

    res = admin_client.get(URL, {"date": DATE.isoformat()})

    assert res.status_code == 200
    row = res.json()["app"][0]
    assert row["flags"]["attention"] == []
    assert row["has_warning"] is False


@pytest.mark.django_db
def test_dismiss_attention_endpoint_sets_flag_for_that_day_only(admin_client):
    _celok, prev, user = _celok_with_prevadzka("Dismiss Endpoint", True)
    other_date = DATE + datetime.timedelta(days=1)
    DailyOrder.objects.create(
        user=user,
        prevadzka=prev,
        date=DATE,
        data={},
        scrape_flags={"attention": ["A:sA — over"]},
    )
    DailyOrder.objects.create(
        user=user,
        prevadzka=prev,
        date=other_date,
        data={},
        scrape_flags={"attention": ["A:sA — over"]},
    )

    res = admin_client.post(
        "/api/admin/summary/dismiss-attention/",
        {"prevadzka_id": prev.id, "date": DATE.isoformat()},
        format="json",
    )
    assert res.status_code == 200

    assert DailyOrder.objects.get(prevadzka=prev, date=DATE).attention_dismissed is True
    # Iný deň má vlastný riadok — dismiss sa naň nedotkne.
    assert (
        DailyOrder.objects.get(prevadzka=prev, date=other_date).attention_dismissed
        is False
    )


@pytest.mark.django_db
def test_dismiss_attention_missing_order_returns_404(admin_client):
    _celok, prev, _user = _celok_with_prevadzka("Dismiss Missing", True)
    res = admin_client.post(
        "/api/admin/summary/dismiss-attention/",
        {"prevadzka_id": prev.id, "date": DATE.isoformat()},
        format="json",
    )
    assert res.status_code == 404


@pytest.mark.django_db
def test_dismiss_attention_requires_admin(authenticated_client):
    res = authenticated_client.post(
        "/api/admin/summary/dismiss-attention/",
        {"prevadzka_id": 1, "date": DATE.isoformat()},
        format="json",
    )
    assert res.status_code in (401, 403)


@pytest.mark.django_db
@pytest.mark.parametrize("fmt", ["xlsx", "pdf"])
def test_overview_export_endpoints_removed(admin_client, fmt):
    """#447: dodanie podkladov must not offer PDF/XLSX generation anymore."""
    res = admin_client.get(
        f"/api/admin/summary/prevadzka-overview-{fmt}/", {"date": DATE.isoformat()}
    )
    assert res.status_code == 404


@pytest.mark.django_db
def test_overview_requires_date(admin_client):
    assert admin_client.get(URL).status_code == 400


@pytest.mark.django_db
def test_overview_requires_admin(authenticated_client):
    res = authenticated_client.get(URL, {"date": DATE.isoformat()})
    assert res.status_code in (401, 403)

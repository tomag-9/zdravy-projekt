import datetime
from decimal import Decimal

import pytest
from django.contrib.auth.models import User
from django.core.management import call_command

from api.edupage_scraper import EdupageScraper
from api.management.commands.init_reference_data import PORTION_TYPES
from api.management.commands.reconcile_real import _app_counts_by_meal_type
from api.models import (
    Celok,
    DailyMealPlan,
    DailyOrder,
    MealPlanItem,
    MealTemplate,
    Prevadzka,
)
from api.services.meal_plan_service import (
    MealPlanService,
    _billed_count,
    _merge_billed_sub_rows,
    _tidy_count,
)


def _row(*sub_rows):
    return {"sub_rows": list(sub_rows)}


# ── Rozpad `porcia=1` na Predškolák / ZŠ 1.stupeň podľa labelu ─────────────────
@pytest.mark.parametrize(
    "nazov",
    [
        "Klasik - predškoláci",
        "noMilk - predškoláci",
        "noGlutén\xa0- predškoláci + dotácia",
        "noMG\xa0-\xa0predškoláci",
    ],
)
def test_predskolak_label_with_portion_1_resolves_to_predskolak(nazov):
    """Edulienka hlási predškolákov názvom skupiny, nie kódom porcie."""
    assert EdupageScraper.resolve_payer_portion_name(nazov, "1") == "Predškolák"


@pytest.mark.parametrize(
    "nazov",
    ["Klasik - ZŠ ročník 1-3", "Klasik - ZŠ ročník 1-3 + dotácia"],
)
def test_real_first_grade_keeps_zs_portion(nazov):
    assert EdupageScraper.resolve_payer_portion_name(nazov, "1") == "ZŠ 1.stupeň"


def test_predskolak_with_ms_portion_code_is_left_alone():
    """Libellus a Krásňanko hlásia predškolákov ako `porcia=0` — MŠ gramáž (200 g).

    Preznačenie na Predškolák by im posunulo porciu na 250 g.
    """
    assert EdupageScraper.resolve_payer_portion_name("Predškoláci", "0") == "Škôlka"


def test_predskolak_portion_type_matches_first_grade_gramage():
    """Predškolák je oddelený kvôli fakturácii, nie kvôli gramáži — 250 g oboch."""
    by_name = {pt["name"]: pt["coefficient"] for pt in PORTION_TYPES}
    assert by_name["Predškolák"] == by_name["ZŠ 1.stupeň"] == "1.2500"


# ── Model ─────────────────────────────────────────────────────────────────────
@pytest.mark.django_db
def test_unreadable_coefficient_falls_back_to_1():
    celok = Celok.objects.create(nazov="Rozbitá škôlka")
    prevadzka = Prevadzka.objects.create(
        celok=celok,
        nazov="Hlavná",
        billing_portion_coefficients={"Predškolák": "nezmysel"},
    )
    assert prevadzka.billing_coefficient("Predškolák") == Decimal("1")


@pytest.mark.django_db
def test_missing_coefficient_defaults_to_1():
    celok = Celok.objects.create(nazov="Bežná škôlka")
    prevadzka = Prevadzka.objects.create(celok=celok, nazov="Hlavná")
    assert prevadzka.billing_coefficient("Predškolák") == Decimal("1")


# ── Zlúčenie predškoláka do MŠ riadku ─────────────────────────────────────────
def test_merge_folds_predskolak_into_ms_row():
    """13.7 Klasik: 7 MŠ (1400 g) + 1 predškolák (250 g) = 8,25 porcie / 1650 g."""
    merged = _merge_billed_sub_rows(
        [
            {
                "type": "standard",
                "meal": "main_course",
                "variant": "",
                "portion_name": "Škôlka",
                "label": "Škôlka - Obed",
                "count": 7,
                "col_grams": [["1400.00"]],
            },
            {
                "type": "standard",
                "meal": "main_course",
                "variant": "",
                "portion_name": "Škôlka",
                "label": "Škôlka - Obed",
                "count": Decimal("1.25"),
                "col_grams": [["250.00"]],
            },
        ]
    )
    assert len(merged) == 1
    assert merged[0]["count"] == Decimal("8.25")
    assert merged[0]["col_grams"] == [["1650.00"]]


def test_merge_keeps_distinct_rows_apart():
    """Iný chod / variant / diéta sa zlúčiť nesmie."""
    rows = [
        {
            "type": "standard",
            "meal": "main_course",
            "variant": "A",
            "portion_name": "Škôlka",
            "label": "Škôlka - Obed Menu A",
            "count": 3,
            "col_grams": [["600.00"]],
        },
        {
            "type": "standard",
            "meal": "main_course",
            "variant": "B",
            "portion_name": "Škôlka",
            "label": "Škôlka - Obed Menu B",
            "count": 2,
            "col_grams": [["400.00"]],
        },
        {
            "type": "diet",
            "meal": "main_course",
            "variant": "",
            "diet_name": "NO MILK",
            "portion_name": "Škôlka",
            "label": "Škôlka - NO MILK",
            "count": 1,
            "col_grams": [["200.00"]],
        },
    ]
    assert len(_merge_billed_sub_rows(rows)) == 3


def test_merge_keeps_zvlast_rows_apart():
    rows = [
        {
            "type": "zvlast",
            "meal": "main_course",
            "variant": "A",
            "portion_name": "Škôlka",
            "label": "Škôlka - Menu A - zvlášť",
            "count": 1,
            "col_grams": [["200.00"]],
        },
        {
            "type": "standard",
            "meal": "main_course",
            "variant": "A",
            "portion_name": "Škôlka",
            "label": "Škôlka - Obed Menu A",
            "count": 3,
            "col_grams": [["600.00"]],
        },
    ]
    assert len(_merge_billed_sub_rows(rows)) == 2


def test_merge_handles_empty_gram_groups():
    """Riadok prispieva gramami len do svojej stĺpcovej skupiny, inde má []."""
    merged = _merge_billed_sub_rows(
        [
            {
                "type": "standard",
                "meal": "main_course",
                "variant": "",
                "portion_name": "Škôlka",
                "label": "Škôlka - Obed",
                "count": 7,
                "col_grams": [["1400.00"], []],
            },
            {
                "type": "standard",
                "meal": "main_course",
                "variant": "",
                "portion_name": "Škôlka",
                "label": "Škôlka - Obed",
                "count": Decimal("1.25"),
                "col_grams": [[], ["250.00"]],
            },
        ]
    )
    assert merged[0]["col_grams"] == [["1400.00"], ["250.00"]]


# ── Reconcile číta už zarátané počty ──────────────────────────────────────────
def test_reconcile_reads_billed_counts_without_reapplying():
    """Koeficient rieši dashboard — reconcile ho nesmie prenásobiť druhýkrát."""
    row = _row(
        {"meal": "main_course", "portion_name": "Škôlka", "count": Decimal("8.25")},
        {"meal": "main_course", "portion_name": "ZŠ 1.stupeň", "count": 2},
    )
    assert _app_counts_by_meal_type(row) == {"lunch": Decimal("10.25")}


# ── End-to-end: gramážový dashboard ───────────────────────────────────────────
@pytest.mark.django_db
def test_dashboard_folds_predskolak_into_ms_row_like_the_real_workbook():
    """Reprodukcia riadku 974 reálnej tabuľky z 13.7 (Edulienka, Klasik).

    Real: počet `8.25`, gramáž `1650` = 7 MŠ à 200 g + 1 predškolák à 250 g.
    """
    call_command("init_reference_data")

    template = MealTemplate.objects.create(
        name="Obed 200g",
        category="main_course",
        components=[{"label": "Hlavné jedlo", "grams": "200", "unit": "g"}],
        base_weight_grams="200",
    )
    plan = DailyMealPlan.objects.create(date=datetime.date(2026, 7, 13))
    MealPlanItem.objects.create(
        meal_plan=plan, template=template, category="main_course", menu_variant=""
    )

    celok = Celok.objects.create(nazov="MŠ Edulienka")
    prevadzka = Prevadzka.objects.create(
        celok=celok,
        nazov="MŠ Edulienka",
        billing_portion_coefficients={"Predškolák": "1.25"},
    )
    user = User.objects.create_user(username="edulienka@example.com", password="x")
    DailyOrder.objects.create(
        user=user,
        prevadzka=prevadzka,
        date=plan.date,
        data={
            "lunch": {
                "Škôlka": {"menuCounts": {"A": 7}, "diets": {}},
                "Predškolák": {"menuCounts": {"A": 1}, "diets": {}},
            }
        },
    )

    data = MealPlanService.gramage_dashboard(plan.date.isoformat())
    sub_rows = data["rows"][0]["sub_rows"]

    # Predškolák nemá vlastný riadok — je zlúčený do MŠ, tak ako to píše klient.
    assert [sr["label"] for sr in sub_rows] == ["Škôlka - Hlavný chod"]
    assert sub_rows[0]["count"] == Decimal("8.25")
    assert sub_rows[0]["col_grams"] == [["1650.00"]]
    assert data["rows"][0]["standard_total_count"] == Decimal("8.25")


@pytest.mark.django_db
def test_dashboard_keeps_predskolak_separate_without_coefficient():
    """Prevádzka bez koeficientu sa nesmie zmeniť — predškolák ostáva vlastný
    riadok s celým počtom a 250 g."""
    call_command("init_reference_data")

    template = MealTemplate.objects.create(
        name="Obed 200g",
        category="main_course",
        components=[{"label": "Hlavné jedlo", "grams": "200", "unit": "g"}],
        base_weight_grams="200",
    )
    plan = DailyMealPlan.objects.create(date=datetime.date(2026, 7, 13))
    MealPlanItem.objects.create(
        meal_plan=plan, template=template, category="main_course", menu_variant=""
    )

    celok = Celok.objects.create(nazov="Iná škôlka")
    prevadzka = Prevadzka.objects.create(celok=celok, nazov="Iná škôlka")
    user = User.objects.create_user(username="ina@example.com", password="x")
    DailyOrder.objects.create(
        user=user,
        prevadzka=prevadzka,
        date=plan.date,
        data={
            "lunch": {
                "Škôlka": {"menuCounts": {"A": 7}, "diets": {}},
                "Predškolák": {"menuCounts": {"A": 1}, "diets": {}},
            }
        },
    )

    data = MealPlanService.gramage_dashboard(plan.date.isoformat())
    by_label = {sr["label"]: sr for sr in data["rows"][0]["sub_rows"]}
    assert by_label["Škôlka - Hlavný chod"]["count"] == 7
    assert by_label["Predškolák - Hlavný chod"]["count"] == 1
    assert by_label["Predškolák - Hlavný chod"]["col_grams"] == [["250.00"]]


@pytest.mark.django_db
def test_dashboard_emits_zvlast_row_without_inflating_standard_total():
    call_command("init_reference_data")

    template = MealTemplate.objects.create(
        name="Obed 200g",
        category="main_course",
        components=[{"label": "Hlavné jedlo", "grams": "200", "unit": "g"}],
        base_weight_grams="200",
    )
    plan = DailyMealPlan.objects.create(date=datetime.date(2026, 7, 14))
    MealPlanItem.objects.create(
        meal_plan=plan, template=template, category="main_course", menu_variant="A"
    )

    celok = Celok.objects.create(nazov="Pack zvlášť")
    prevadzka = Prevadzka.objects.create(celok=celok, nazov="Pack zvlášť")
    user = User.objects.create_user(username="pack@example.com", password="x")
    DailyOrder.objects.create(
        user=user,
        prevadzka=prevadzka,
        date=plan.date,
        data={
            "lunch": {
                "Škôlka": {
                    "menuCounts": {"A": 5},
                    "diets": {"NO MILK": 2},
                    "packSeparately": {"menus": {"A": 2}, "diets": {"NO MILK": 1}},
                }
            }
        },
    )

    data = MealPlanService.gramage_dashboard(plan.date.isoformat())
    row = data["rows"][0]

    assert row["standard_total_count"] == 3
    assert row["total_count"] == 5

    zvlast_rows = [sr for sr in row["sub_rows"] if sr["type"] == "zvlast"]
    assert [sr["label"] for sr in zvlast_rows] == [
        "Škôlka - Menu A - zvlášť",
        "Škôlka - NO MILK - zvlášť",
    ]
    assert [sr["count"] for sr in zvlast_rows] == [2, 1]


# ── Formát počtu ──────────────────────────────────────────────────────────────
@pytest.mark.parametrize(
    "count, expected",
    [
        (4, 5),  # 4 x 1,25 = 5 — celé číslo, nie 5.0
        (8, 10),  # Decimal.normalize() by tu spravila 1E+1
        (12, 15),
        (7, Decimal("8.75")),  # zlomok ostáva zlomkom
        (1, Decimal("1.25")),
    ],
)
def test_billed_count_keeps_whole_numbers_whole(count, expected):
    result = _billed_count(count, Decimal("1.25"))
    assert result == expected
    assert isinstance(result, int) == isinstance(expected, int)
    assert str(result) == str(expected)


def test_billed_count_without_coefficient_stays_int():
    result = _billed_count(7, Decimal("1"))
    assert result == 7 and isinstance(result, int)


def test_tidy_count_never_emits_exponent_notation():
    """`str()` výsledku ide priamo do PDF exportu — `1E+1` by tam vypísalo."""
    assert str(_tidy_count(Decimal("10.00"))) == "10"
    assert str(_tidy_count(Decimal("8.250"))) == "8.25"
    assert str(_tidy_count(0)) == "0"

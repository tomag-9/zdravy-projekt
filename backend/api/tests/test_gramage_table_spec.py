"""Spec je jediný zdroj pravdy o vzhľade tabuľky — testy zamykajú jeho rozhodnutia.

Referenciou je obrazovka: `—` namiesto núl, žiadny stĺpec „Počet", poznámky pred
medzisúčtami, `template_name` v hlavičke.
"""

from decimal import Decimal

import pytest

from api.exporters.gramage_table_spec import build_table_spec, format_count, format_gram

GRAMS = {"label": "Mäso", "base_grams": "300", "unit": "g"}


def _payload(**overrides):
    data = {
        "date": "2026-07-28",
        "col_groups": [
            {
                "key": "soup",
                "meal": "soup",
                "variant": "",
                "label": "Polievka",
                "template_name": "Hrášková",
                "components": [{"label": "Polievka", "base_grams": "200", "unit": "g"}],
            },
            {
                "key": "main_course_A",
                "meal": "main_course",
                "variant": "A",
                "label": "Obed",
                "template_name": "Kuracie",
                "components": [GRAMS],
            },
            {
                "key": "main_course_B",
                "meal": "main_course",
                "variant": "B",
                "label": "Obed",
                "template_name": "Vege",
                "components": [GRAMS],
            },
        ],
        "rows": [
            {
                "client": "MŠ Testovacia",
                "client_id": 1,
                "total_count": 10,
                "standard_total_count": 8,
                "standard_col_grams": [["1600.00"], ["2400.00"], []],
                "diet_summary_rows": [
                    {
                        "name": "No Milk",
                        "count": 2,
                        "color": "#F59E0B",
                        "col_grams": [["400.00"], ["600.00"], []],
                    }
                ],
                "admin_order_note": "bez cibule",
                "delivery_note": "brána zozadu",
                "sub_rows": [
                    {
                        "type": "standard",
                        "meal": "main_course",
                        "variant": "A",
                        "label": "Škôlka - Obed Menu A",
                        "count": 8,
                        "col_grams": [["1600.00"], ["2400.00"], []],
                    },
                    {
                        "type": "diet",
                        "meal": "main_course",
                        "label": "No Milk",
                        "diet_color": "#F59E0B",
                        "count": 2,
                        "col_grams": [["400.00"], ["600.00"], []],
                    },
                ],
            }
        ],
        "totals": [["2000.00"], ["3000.00"], []],
        "count_summary": [],
    }
    data.update(overrides)
    return data


def _kinds(spec):
    return [row["kind"] for row in spec["rows"]]


# ── Formátovanie čísel ───────────────────────────────────────────────────────
@pytest.mark.parametrize(
    "raw,expected",
    [
        ("300.00", "300"),
        ("2000.50", "2000,5"),
        ("299.6", "299,6"),
        ("1.25", "1,25"),
        ("0.4", "0,4"),
    ],
)
def test_grams_keep_their_decimals(raw, expected):
    """Kuchyňa potrebuje vidieť desatiny; celé hodnoty ostávajú bez chvosta."""
    assert format_gram(raw) == expected


def test_whole_grams_do_not_turn_into_scientific_notation():
    """`Decimal("2000.00").normalize()` je `2E+3` — na to sa tu nesmie stúpiť."""
    assert format_gram("2000.00") == "2000"


@pytest.mark.parametrize("raw", ["0", "0.00", "-5", "", None, "abc"])
def test_nonpositive_and_broken_grams_render_as_dash(raw):
    assert format_gram(raw) is None


def test_count_badge_shows_a_dash_at_zero():
    assert format_count(0) == "—"
    assert format_count(12) == "12"
    assert format_count(Decimal("8.25")) == "8,25"


# ── Štruktúra ────────────────────────────────────────────────────────────────
def test_there_is_no_separate_count_column():
    """Počet je odznak v labeli, nie vlastný stĺpec — inak sa tlač rozíde s obrazovkou."""
    spec = build_table_spec(_payload())

    assert spec["total_columns"] == 1 + 3
    assert len(spec["header"]["components"]) == 3
    sub_row = next(r for r in spec["rows"] if r["kind"] == "sub-row")
    assert sub_row["cells"][0]["count"] == "8"
    assert len(sub_row["cells"]) == 1 + 3


def test_header_keeps_the_template_name():
    spec = build_table_spec(_payload())

    assert [g["sub"] for g in spec["header"]["groups"]] == [
        "Hrášková",
        "Kuracie",
        "Vege",
    ]


def test_notes_come_before_the_subtotals():
    spec = build_table_spec(_payload())

    assert _kinds(spec) == [
        "client",
        "sub-row",
        "sub-row",
        "note-admin",
        "note-delivery",
        "summary-std",
        "summary-diet",
    ]


def test_zero_grams_render_as_a_dash_not_a_zero():
    spec = build_table_spec(_payload())
    sub_row = next(r for r in spec["rows"] if r["kind"] == "sub-row")

    # Tretí stĺpec (Menu B) nemá gramáž → „—", nie „0".
    assert sub_row["cells"][3]["text"] == "—"
    assert "cell-empty" in sub_row["cells"][3]["css"]


def test_meal_separator_marks_each_group_boundary():
    spec = build_table_spec(_payload())
    sub_row = next(r for r in spec["rows"] if r["kind"] == "sub-row")

    assert "meal-sep" not in sub_row["cells"][1]["css"]
    assert "meal-sep" in sub_row["cells"][2]["css"]
    assert "meal-sep" in sub_row["cells"][3]["css"]


def test_client_row_carries_the_screen_metadata():
    spec = build_table_spec(_payload())
    client = next(r for r in spec["rows"] if r["kind"] == "client")

    assert client["cells"][0]["meta"] == "štandard 8, diéty 2"
    assert client["cells"][0]["meta_right"] == "spolu porcií 10"


def test_empty_routes_are_skipped():
    payload = _payload(
        blocks=[
            {
                "id": 1,
                "name": "Blok 1",
                "routes": [
                    {"id": 1, "name": "Prázdna trasa", "rows": []},
                    {"id": 2, "name": "Plná trasa", "rows": _payload()["rows"]},
                ],
            }
        ],
        rows=[],
    )
    spec = build_table_spec(payload)

    route_labels = [
        row["cells"][0]["text"] for row in spec["rows"] if row["kind"] == "route"
    ]
    assert route_labels == ["Plná trasa"]


def test_diet_rows_get_a_readable_font_colour_and_a_swatch():
    spec = build_table_spec(_payload())
    diet = next(r for r in spec["rows"] if r["kind"] == "summary-diet")

    # Swatch drží pôvodnú farbu diéty, text stmavenú (čitateľnú) verziu.
    assert diet["cells"][0]["swatch"]["color"] == "#F59E0B"
    assert diet["color"] == "#966107"


def test_footer_is_the_portion_summary_plus_the_grand_total():
    spec = build_table_spec(_payload())

    assert [row["kind"] for row in spec["footer"]] == [
        "portion-band",
        "portion-row",
        "portion-row",
        "portion-row",
        "total",
    ]
    assert spec["footer"][-1]["cells"][0]["text"] == "CELKOM (g / ml)"


def test_totals_row_uses_a_dash_for_empty_columns():
    """Obrazovka tu dnes píše „0", čo si protirečí s telom tabuľky — spec to zjednocuje."""
    spec = build_table_spec(_payload())

    assert spec["footer"][-1]["cells"][-1]["text"] == "—"


# ── Filter sekcií (verzie tlače aj prehľadu) ─────────────────────────────────
def _with_breakfast_and_snack():
    payload = _payload()
    payload["col_groups"].extend(
        [
            {
                "key": "breakfast_snack",
                "meal": "breakfast_snack",
                "variant": "",
                "label": "Raňajky",
                "template_name": "Chlieb",
                "components": [GRAMS],
            },
            {
                "key": "afternoon_snack",
                "meal": "afternoon_snack",
                "variant": "",
                "label": "Olovrant",
                "template_name": "Jogurt",
                "components": [GRAMS],
            },
        ]
    )
    for row in payload["rows"]:
        row["standard_col_grams"].extend([[], []])
        row["diet_summary_rows"][0]["col_grams"].extend([[], []])
        for sub_row in row["sub_rows"]:
            sub_row["col_grams"].extend([[], []])
        row["sub_rows"].append(
            {
                "type": "standard",
                "meal": "afternoon_snack",
                "variant": "",
                "label": "Škôlka - Olovrant",
                "count": 8,
                "col_grams": [[], [], [], [], ["1000.00"]],
            }
        )
    payload["totals"].extend([[], ["1000.00"]])
    return payload


def _group_labels(spec):
    return [group["text"] for group in spec["header"]["groups"]]


def test_no_filter_means_the_complete_table():
    assert _group_labels(build_table_spec(_with_breakfast_and_snack())) == [
        "Polievka",
        "Menu A",
        "Menu B",
        "Raňajky",
        "Olovrant",
    ]


def test_sections_select_exactly_what_was_ticked():
    """Každý prepínač platí sám za seba — polievka sa k menu nedoťahuje."""
    payload = _with_breakfast_and_snack()

    assert _group_labels(
        build_table_spec(payload, sections=["soup", "main_course_A"])
    ) == [
        "Polievka",
        "Menu A",
    ]
    assert _group_labels(build_table_spec(payload, sections=["breakfast_snack"])) == [
        "Raňajky"
    ]
    assert _group_labels(build_table_spec(payload, sections=["afternoon_snack"])) == [
        "Olovrant"
    ]
    assert _group_labels(
        build_table_spec(payload, sections=["main_course_A", "main_course_B"])
    ) == ["Menu A", "Menu B"]


def test_filter_also_trims_the_portion_summary():
    spec = build_table_spec(
        _with_breakfast_and_snack(), sections=["soup", "main_course_A"]
    )

    labels = [
        row["cells"][0]["text"]
        for row in spec["footer"]
        if row["kind"] == "portion-row"
    ]
    assert labels == ["Polievka", "Menu A"]


def test_filter_drops_rows_that_lose_all_their_numbers():
    """Olovrantový riadok pri tlači obeda nemá čo ukázať — nepatrí tam."""
    payload = _with_breakfast_and_snack()

    complete = [row["cells"][0]["text"] for row in build_table_spec(payload)["rows"]]
    assert "Škôlka - Olovrant" in complete

    lunch = [
        row["cells"][0]["text"]
        for row in build_table_spec(payload, sections=["soup", "main_course_A"])["rows"]
    ]
    assert "Škôlka - Olovrant" not in lunch
    assert "Škôlka - Obed Menu A" in lunch


def test_spec_lists_every_section_with_its_state():
    """Prepínače musia obsahovať aj odškrtnuté, inak sa už nedajú zapnúť späť."""
    spec = build_table_spec(_with_breakfast_and_snack(), sections=["main_course_A"])

    assert [(s["key"], s["selected"]) for s in spec["sections"]] == [
        ("soup", False),
        ("main_course_A", True),
        ("main_course_B", False),
        ("breakfast_snack", False),
        ("afternoon_snack", False),
    ]


def test_unknown_or_empty_selection_falls_back_to_everything():
    """Preklep v URL nesmie vrátiť prázdnu stranu."""
    payload = _with_breakfast_and_snack()

    assert len(_group_labels(build_table_spec(payload, sections=["nezmysel"]))) == 5
    assert len(_group_labels(build_table_spec(payload, sections=[]))) == 5

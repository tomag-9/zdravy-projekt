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
                        "diet_name": "No Milk",
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

    # 1 = názov riadku, 3 = zložky, 1 = prázdny stĺpec „Poznámka".
    assert spec["total_columns"] == 1 + 3 + 1
    assert len(spec["header"]["components"]) == 3 + 1
    sub_row = next(r for r in spec["rows"] if r["kind"] == "sub-row")
    assert sub_row["cells"][0]["count"] == "8"
    assert len(sub_row["cells"]) == 1 + 3 + 1


def test_every_second_sub_row_is_striped():
    """Jemný pruh na každom druhom riadku — bez neho sa na tlači stráca riadok."""
    spec = build_table_spec(_payload())
    sub_rows = [r for r in spec["rows"] if r["kind"] == "sub-row"]

    assert [("zebra" in r["css"]) for r in sub_rows] == [False, True]


def test_striping_restarts_at_every_client():
    """Parita sa počíta v rámci prevádzky, nie cez celú tabuľku."""
    payload = _payload()
    second = dict(payload["rows"][0])
    second["client"] = "MŠ Druhá"
    second["client_id"] = 2
    second["sub_rows"] = payload["rows"][0]["sub_rows"][:1]
    payload["rows"] = [payload["rows"][0], second]

    spec = build_table_spec(payload)
    first_of_each_client = [rows[0] for rows in _sub_rows_by_client(spec).values()]

    assert all("zebra" not in row["css"] for row in first_of_each_client)


def _sub_rows_by_client(spec):
    grouped: dict[str, list] = {}
    for row in spec["rows"]:
        if row["kind"] == "sub-row":
            grouped.setdefault(row["group_id"], []).append(row)
    return grouped


def test_header_keeps_the_template_name():
    spec = build_table_spec(_payload())

    assert [
        g["sub"] for g in spec["header"]["groups"] if "grp-note" not in g["css"]
    ] == [
        "Hrášková",
        "Kuracie",
        "Vege",
    ]


def test_notes_come_before_the_subtotals():
    """Poznámka prevádzky už vlastný riadok nemá — je v stĺpci Poznámka."""
    spec = build_table_spec(_payload())

    assert _kinds(spec) == [
        "client",
        "sub-row",
        "sub-row",
        "note-delivery",
        "summary-std",
        "summary-diet",
    ]


def test_include_summary_rows_false_drops_client_subtotals():
    """Issue #510: PDF export has no collapsed state, sub-rows are always
    shown, so the per-client subtotal rows would just duplicate numbers
    already printed one row up."""
    spec = build_table_spec(_payload(), include_summary_rows=False)

    kinds = _kinds(spec)
    assert "summary-std" not in kinds
    assert "summary-diet" not in kinds
    assert kinds == ["client", "sub-row", "sub-row", "note-delivery"]


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


def test_client_row_shows_the_prevadzka_note_in_the_note_column():
    """Issue #513: poznámka prevádzky musí byť vidno hneď na zbalenom riadku
    klienta (v stĺpci Poznámka), nielen v collapsible note-admin sub-riadku."""
    spec = build_table_spec(_payload())
    client = next(r for r in spec["rows"] if r["kind"] == "client")

    assert client["cells"][1]["text"] == "bez cibule"
    assert "cell-note" in client["cells"][1]["css"]
    total_columns = spec["total_columns"]
    assert client["cells"][0]["colspan"] == total_columns - 1


def test_client_row_note_column_is_empty_without_a_prevadzka_note():
    payload = _payload()
    payload["rows"][0]["admin_order_note"] = ""
    spec = build_table_spec(payload)
    client = next(r for r in spec["rows"] if r["kind"] == "client")

    assert client["cells"][1]["text"] == ""


def test_empty_routes_are_skipped():
    payload = _payload(
        vydaje=[
            {
                "key": "A",
                "name": "Výdaj A",
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

    # Posledná bunka je prázdna „Poznámka"; gramáž je tá pred ňou.
    assert spec["footer"][-1]["cells"][-1]["css"] == "cell-note meal-sep"
    assert spec["footer"][-1]["cells"][-2]["text"] == "—"


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
    """Názvy stĺpcových skupín bez koncového stĺpca „Poznámka" — ten nie je
    jedlo a s filtrom sekcií nemá nič spoločné."""
    return [
        group["text"]
        for group in spec["header"]["groups"]
        if "grp-note" not in group["css"]
    ]


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


def test_subtotals_count_only_the_visible_sections():
    """Na obedovom hárku nesmie „Súčet bez diét" rátať raňajky a olovrant."""
    payload = _with_breakfast_and_snack()

    complete = build_table_spec(payload)
    std = next(r for r in complete["rows"] if r["kind"] == "summary-std")
    # 8 obedov (Menu A) + 8 olovrantov.
    assert std["cells"][0]["count"] == "16"
    assert (
        next(r for r in complete["rows"] if r["kind"] == "client")["cells"][0]["meta"]
        == "štandard 16, diéty 2"
    )

    lunch = build_table_spec(payload, sections=["soup", "main_course_A"])
    std = next(r for r in lunch["rows"] if r["kind"] == "summary-std")
    assert std["cells"][0]["count"] == "8"
    assert (
        next(r for r in lunch["rows"] if r["kind"] == "client")["cells"][0]["meta"]
        == "štandard 8, diéty 2"
    )


def test_a_diet_absent_from_the_visible_sections_is_not_summarised():
    """Diéta bez viditeľného riadku nemá čo sumarizovať."""
    payload = _with_breakfast_and_snack()

    lunch = build_table_spec(payload, sections=["afternoon_snack"])
    assert not [r for r in lunch["rows"] if r["kind"] == "summary-diet"]
    # Poznámky sú na prevádzku, nie na jedlo — tie tam ostávajú.
    assert [r["kind"] for r in lunch["rows"]] == [
        "client",
        "sub-row",
        "note-delivery",
        "summary-std",
    ]


# ── Poznámkový stĺpec a pás jedál ────────────────────────────────────────────


def test_note_column_is_empty_on_every_data_row():
    """Prázdny stĺpec na ručné poznámky do vytlačenej tabuľky.

    `meal-sep` na poslednom stĺpci je zámerne rovnaké ako medzi ostatnými
    jedlami — bez neho by čiara medzi posledným jedlom (napr. Olovrant) a
    Poznámkou chýbala, hoci medzi Raňajkami/Obedom/Olovrantom je.
    """
    spec = build_table_spec(_payload())

    assert spec["header"]["groups"][-1]["text"] == "Poznámka"
    data_rows = [
        row
        for row in spec["rows"] + spec["footer"]
        # Pásy a poznámky idú cez celú šírku, tie posledný stĺpec nemajú.
        if row["kind"]
        in {"sub-row", "summary-std", "summary-diet", "portion-row", "total"}
    ]
    assert data_rows
    for row in data_rows:
        assert row["cells"][-1] == {"text": "", "css": "cell-note meal-sep"}


def test_meal_band_merges_soup_with_main_course():
    """Polievka a menu tvoria jeden „Obed"; raňajky a olovrant vlastné pásy."""
    spec = build_table_spec(_with_breakfast_and_snack())

    bands = [(band["text"], band["colspan"]) for band in spec["header"]["meals"]]
    # Posledný pás patrí stĺpcu „Poznámka" a je bez názvu.
    assert bands[-1][0] == ""
    assert [text for text, _ in bands[:-1]] == [
        "Obed",
        "Raňajky / desiata",
        "Olovrant",
    ]
    # Šírka pásov spolu sedí s počtom zložiek v hlavičke.
    assert sum(span for _, span in bands) == len(spec["header"]["components"])


# ── Filter výdajných bodov ───────────────────────────────────────────────────


def _two_vydaje_payload():
    """Dva výdajné body, každý s jednou prevádzkou — kuchyňa vydáva z dvoch miest."""
    rows = _payload()["rows"]
    return _payload(
        vydaje=[
            {
                "key": "A",
                "name": "Výdaj A",
                "routes": [{"id": 1, "name": "Trasa 1", "rows": rows}],
            },
            {
                "key": "B",
                "name": "Výdaj B",
                "routes": [{"id": 2, "name": "Trasa extra 1", "rows": rows}],
            },
        ],
        rows=[],
        unassigned_rows=[],
    )


def _band_texts(spec):
    return [
        row["cells"][0]["text"] for row in spec["rows"] if "block-band" in row["css"]
    ]


def test_vydaj_filter_prints_a_single_dispatch_point():
    spec = build_table_spec(_two_vydaje_payload(), vydaje=["B"])

    assert _band_texts(spec) == ["Výdaj B"]
    assert [vydaj["selected"] for vydaj in spec["vydaje"]] == [False, True]


def test_unknown_or_empty_vydaj_selection_falls_back_to_everything():
    payload = _two_vydaje_payload()

    assert _band_texts(build_table_spec(payload)) == ["Výdaj A", "Výdaj B"]
    assert _band_texts(build_table_spec(payload, vydaje=["nezmysel"])) == [
        "Výdaj A",
        "Výdaj B",
    ]


def test_every_vydaj_but_the_first_starts_on_a_new_page():
    spec = build_table_spec(_two_vydaje_payload())

    bands = [row for row in spec["rows"] if "block-band" in row["css"]]
    assert "page-break" not in bands[0]["css"]
    assert "page-break" in bands[1]["css"]


def test_filtered_vydaj_totals_ignore_the_other_vydaj():
    """Pri tlači jedného výdajného bodu nesmie v pätke svietiť gramáž celého dňa.

    `data["totals"]` je predpočítaný súčet za celý deň — fixture mu dá hodnotu,
    ktorú jeden blok dosiahnuť nemôže, takže je vidieť, či ju filtrovaná pätka
    naozaj prepočítala z vlastných riadkov.
    """
    payload = _two_vydaje_payload()
    payload["totals"] = [["9999.00"], ["9999.00"], []]

    full = build_table_spec(payload)
    single = build_table_spec(payload, vydaje=["A"])

    assert full["footer"][-1]["cells"][1]["text"] == "9999"
    # 8 porcií bez diét × 200 g polievky v jedinom výdaji.
    assert single["footer"][-1]["cells"][1]["text"] == "1600"


def test_unassigned_prevadzky_stay_out_of_a_filtered_print():
    payload = _two_vydaje_payload()
    payload["unassigned_rows"] = _payload()["rows"]

    assert "Nepriradené prevádzky" in _band_texts(build_table_spec(payload))
    assert "Nepriradené prevádzky" not in _band_texts(
        build_table_spec(payload, vydaje=["A"])
    )


# ── Sumáre pri troch výdajných bodoch (#531 — British School = Cluster C) ────


def _three_vydaje_payload():
    """Tri výdajné body — British School je prvý reálny 3. klaster."""
    rows = _payload()["rows"]
    return _payload(
        vydaje=[
            {
                "key": "A",
                "name": "Výdaj A",
                "routes": [{"id": 1, "name": "Trasa 1", "rows": rows}],
            },
            {
                "key": "B",
                "name": "Výdaj B",
                "routes": [{"id": 2, "name": "Trasa extra 1", "rows": rows}],
            },
            {
                "key": "C",
                "name": "Výdaj C",
                "routes": [{"id": 3, "name": "British School", "rows": rows}],
            },
        ],
        rows=[],
        unassigned_rows=[],
    )


def _portion_summary_titles(spec):
    return [
        row["cells"][0]["text"]
        for row in spec["rows"]
        if "portion-summary-band" in row["css"]
    ]


def test_three_vydaje_get_numbered_summaries_and_a_combined_first_two():
    spec = build_table_spec(_three_vydaje_payload())

    assert _portion_summary_titles(spec) == [
        "Sumár 1",
        "Sumár 2",
        "Sumár 1 a 2",
        "Sumár 3",
    ]
    assert spec["footer"][0]["cells"][0]["text"] == "Sumár dokopy"


def test_combined_first_two_summary_equals_the_portion_summary_over_both():
    from api.exporters.gramage_dashboard_export import portion_summary

    payload = _three_vydaje_payload()
    spec = build_table_spec(payload)
    rows = [r for r in spec["rows"] if r["kind"] == "portion-row"]
    # Sumár 1, Sumár 2, Sumár 1 a 2, Sumár 3 — v tomto poradí, 3 riadky každý
    # (Polievka, Menu A, Menu B podľa fixture).
    combined_rows = rows[6:9]

    vydaj_a_rows = payload["vydaje"][0]["routes"][0]["rows"]
    vydaj_b_rows = payload["vydaje"][1]["routes"][0]["rows"]
    expected = portion_summary(payload, [*vydaj_a_rows, *vydaj_b_rows])

    assert [row["cells"][0]["count"] for row in combined_rows] == [
        format_count(item["count"]) for item in expected
    ]


def test_two_vydaje_do_not_get_a_combined_summary():
    """Kombinovaný medzisúčet dáva zmysel len keď je čo kombinovať navyše."""
    spec = build_table_spec(_two_vydaje_payload())

    assert _portion_summary_titles(spec) == ["Sumár 1", "Sumár 2"]


def test_filtering_to_a_single_vydaj_drops_the_combined_summary():
    spec = build_table_spec(_three_vydaje_payload(), vydaje=["C"])

    assert _portion_summary_titles(spec) == ["Sumár 1"]

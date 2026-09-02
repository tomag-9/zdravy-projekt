"""Spec je jediný zdroj pravdy o vzhľade tabuľky — testy zamykajú jeho rozhodnutia.

Referenciou je obrazovka: `—` namiesto núl, žiadny stĺpec „Počet", poznámky pred
medzisúčtami, `template_name` v hlavičke.
"""

from decimal import Decimal

import pytest

from api.exporters.gramage_dashboard_export import blend_with_white, readable_text_color
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
                        "portion_name": "Škôlka",
                        "label": "Škôlka - Obed Menu A",
                        "count": 8,
                        "_heads": 8,
                        "_ms_recalc": Decimal("8"),
                        "col_grams": [["1600.00"], ["2400.00"], []],
                    },
                    {
                        "type": "diet",
                        "meal": "main_course",
                        "portion_name": "Škôlka",
                        "label": "No Milk",
                        "diet_name": "No Milk",
                        "diet_color": "#F59E0B",
                        "count": 2,
                        "_heads": 2,
                        "_ms_recalc": Decimal("2"),
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

    # 1 = názov riadku, 3 = zložky.
    assert spec["total_columns"] == 1 + 3
    assert len(spec["header"]["components"]) == 3
    sub_row = next(r for r in spec["rows"] if r["kind"] == "sub-row")
    assert sub_row["cells"][0]["count"] == "8"
    assert len(sub_row["cells"]) == 1 + 3


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

    assert [g["sub"] for g in spec["header"]["groups"]] == [
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


def test_client_row_shows_the_prevadzka_note_right_after_the_name():
    """Issue #513: poznámka prevádzky musí byť vidno hneď na zbalenom riadku
    klienta, nielen v collapsible note-admin sub-riadku. Ide priamo za názov
    (nie do samostatného stĺpca — ten bol zrušený, keďže je poznámka odvtedy
    vidno inline)."""
    spec = build_table_spec(_payload())
    client = next(r for r in spec["rows"] if r["kind"] == "client")

    assert client["cells"][0]["note"] == "bez cibule"
    assert client["cells"][0]["colspan"] == spec["total_columns"]


def test_client_row_note_column_is_empty_without_a_prevadzka_note():
    payload = _payload()
    payload["rows"][0]["admin_order_note"] = ""
    spec = build_table_spec(payload)
    client = next(r for r in spec["rows"] if r["kind"] == "client")

    assert client["cells"][0]["note"] is None


def test_diet_description_is_never_shown_in_the_table():
    """#528 — popis diéty (Diet.description) sa v tabuľke nezobrazuje vôbec,
    ani keď je nastavený; kuchyňa/rozvoz ho v tejto tabuľke nepotrebuje."""
    payload = _payload(diet_descriptions={"No Milk": "kontrolovať s rodičom"})
    spec = build_table_spec(payload)

    diet_sub_row = next(
        r for r in spec["rows"] if r["kind"] == "sub-row" and "diet" in r["css"]
    )
    assert diet_sub_row["cells"][0].get("note") is None

    diet_summary_row = next(r for r in spec["rows"] if r["kind"] == "summary-diet")
    assert diet_summary_row["cells"][0].get("note") is None


def test_empty_routes_are_skipped():
    payload = _payload(
        vydaje=[
            {
                "key": "A",
                "name": "Cluster A",
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
    # Jedna diéta (bez kombinácie): podfarbenie je odtieň tej istej farby (#536).
    assert diet["background"] == f"#{blend_with_white('F59E0B')}"


def test_combined_diet_of_two_colours_by_main_and_secondary():
    """Kombinovaná diéta z dvoch: text farbou hlavnej, podfarbenie vedľajšej (#536)."""
    payload = _payload()
    payload["rows"][0]["diet_summary_rows"][0]["base_colors"] = ["#F59E0B", "#EF4444"]
    payload["rows"][0]["sub_rows"][1]["diet_base_colors"] = ["#F59E0B", "#EF4444"]

    spec = build_table_spec(payload)

    summary = next(r for r in spec["rows"] if r["kind"] == "summary-diet")
    assert summary["color"] == f"#{readable_text_color('F59E0B')}"
    assert summary["background"] == f"#{blend_with_white('EF4444')}"

    sub_row = next(
        r for r in spec["rows"] if r["kind"] == "sub-row" and "diet" in r["css"]
    )
    assert sub_row["color"] == f"#{readable_text_color('F59E0B')}"
    assert sub_row["background"] == f"#{blend_with_white('EF4444')}"


def test_combined_diet_of_three_or_more_uses_fixed_orange_background():
    """Kombinácia troch a viac diét: text prvej, podfarbenie pevnou oranžovou,
    lebo farba jednej z troch a viac zložiek by pôsobila náhodne (#536)."""
    payload = _payload()
    colors = ["#F59E0B", "#EF4444", "#16A34A"]
    payload["rows"][0]["diet_summary_rows"][0]["base_colors"] = colors
    payload["rows"][0]["sub_rows"][1]["diet_base_colors"] = colors

    spec = build_table_spec(payload)

    summary = next(r for r in spec["rows"] if r["kind"] == "summary-diet")
    assert summary["color"] == f"#{readable_text_color('F59E0B')}"
    assert summary["background"] == f"#{blend_with_white('F97316')}"


def test_footer_is_the_cluster_summary_plus_the_grand_total():
    """#532 — súhrn porcií je jeden pás „SUMÁR ... S DIÉTAMI MŠ" s jedným
    riadkom na prítomné jedlo (tu len Obed — fixture nemá raňajky/olovrant),
    pod ním „DIÉTY" s rozpadom podľa mena, pred „total"/"total-ms-porcie"."""
    spec = build_table_spec(_payload())

    assert [row["kind"] for row in spec["footer"]] == [
        "portion-band",
        "cluster-ms-row",
        "portion-band",
        "summary-diet",
        "total",
        "total-ms-porcie",
    ]
    assert spec["footer"][0]["cells"][0]["text"] == "SUMÁR S DIÉTAMI MŠ"
    obed_row = spec["footer"][1]
    assert obed_row["cells"][0]["label"] == "Obed:"
    # 8 (štandard) + 2 (diéta) surových hláv × koeficient 1 z fixture = 10 MŠ.
    assert obed_row["cells"][0]["text"] == "10 MŠ"
    assert spec["footer"][2]["cells"][0]["text"] == "DIÉTY"
    assert spec["footer"][-2]["cells"][0]["text"] == "CELKOM (g / ml)"


def test_footer_diet_breakdown_sums_the_diet_across_all_clients():
    """Sumár dokopy má diétny rozpad sčítaný cez VŠETKÝCH klientov, nie len jedného."""
    payload = _payload()
    second_client = dict(payload["rows"][0])
    second_client["client"] = "MŠ Druhá"
    second_client["diet_summary_rows"] = [
        {
            "name": "No Milk",
            "count": 3,
            "color": "#F59E0B",
            "col_grams": [["300.00"], ["450.00"], []],
        }
    ]
    payload["rows"].append(second_client)

    spec = build_table_spec(payload)
    diet_row = next(row for row in spec["footer"] if row["kind"] == "summary-diet")

    assert diet_row["cells"][0]["text"] == "No Milk"
    assert diet_row["cells"][0]["count"] == format_count(2 + 3)


def test_totals_row_uses_a_dash_for_empty_columns():
    """Obrazovka tu dnes píše „0", čo si protirečí s telom tabuľky — spec to zjednocuje."""
    spec = build_table_spec(_payload())

    # Posledná pätková bunka je súčet MŠ porcií, gramáž je riadok pred ňou.
    totals_row = spec["footer"][-2]
    assert totals_row["cells"][-1]["text"] == "—"


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


def test_filter_also_trims_the_cluster_summary():
    """Filter na sekcie (obed) nesmie v súhrne ukázať raňajky/olovrant, hoci
    ich fixture má — súhrn rešpektuje viditeľné stĺpcové skupiny (#532)."""
    spec = build_table_spec(
        _with_breakfast_and_snack(), sections=["soup", "main_course_A"]
    )

    labels = [
        row["cells"][0]["label"]
        for row in spec["footer"]
        if row["kind"] == "cluster-ms-row"
    ]
    assert labels == ["Obed:"]


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
    # Zlúčený „štandard" riadok (#527) stráca príponu jedla v labeli — nesie
    # ho už count-odznak (R/Ob/Ol), nie text.
    assert "Škôlka" in lunch


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


# ── Pás jedál ────────────────────────────────────────────────────────────────


def test_meal_band_merges_soup_with_main_course():
    """Polievka a menu tvoria jeden „Obed"; raňajky a olovrant vlastné pásy."""
    spec = build_table_spec(_with_breakfast_and_snack())

    bands = [(band["text"], band["colspan"]) for band in spec["header"]["meals"]]
    assert [text for text, _ in bands] == [
        "Obed",
        "Raňajky / desiata",
        "Olovrant",
    ]
    # Šírka pásov spolu sedí s počtom zložiek v hlavičke.
    assert sum(span for _, span in bands) == len(spec["header"]["components"])


# ── Zlúčenie riadkov naprieč jedlami a skratky porcií (#527/#528) ────────────


def _with_breakfast_and_snack_same_portion():
    """Rovnaká porcia ("Škôlka") na raňajkách, obede aj olovrante — na
    rozdiel od `_with_breakfast_and_snack()` má aj olovrantový riadok
    `portion_name`, takže sa má so zvyškom zlúčiť do jedného riadku."""
    payload = _with_breakfast_and_snack()
    for row in payload["rows"]:
        for sub_row in row["sub_rows"]:
            if sub_row["label"] == "Škôlka - Olovrant":
                sub_row["portion_name"] = "Škôlka"
    return payload


def test_standard_rows_of_the_same_portion_merge_across_meals():
    """#527 — jedna porcia, tri jedlá → jeden riadok, nie tri."""
    spec = build_table_spec(_with_breakfast_and_snack_same_portion())

    standard_rows = [
        r for r in spec["rows"] if r["kind"] == "sub-row" and "diet" not in r["css"]
    ]
    assert len(standard_rows) == 1
    row = standard_rows[0]
    # Meno jedla mizne z labelu — nesie ho count-odznak nižšie.
    assert row["cells"][0]["text"] == "Škôlka"
    # Obed (8) + Olovrant (8) — R/Ob/Ol skratky, len jedlá, ktoré riadok má.
    assert row["cells"][0]["count"] == "Ob 8 + Ol 8"
    # Gramáž zostáva rozpísaná do svojich (disjunktných) stĺpcov jedla —
    # zlúčenie nesmie nič sčítať do jedného čísla.
    gram_cells = [c for c in row["cells"][1:] if "cell-num" in c["css"]]
    assert [c["text"] for c in gram_cells] == ["1600", "2400", "1000"]


def test_a_single_meal_portion_keeps_a_plain_count():
    """Bez druhého jedla ostáva count-odznak čistým číslom, nie „Ob 8"."""
    spec = build_table_spec(_payload())

    sub_row = next(
        r for r in spec["rows"] if r["kind"] == "sub-row" and "diet" not in r["css"]
    )
    assert sub_row["cells"][0]["count"] == "8"


def test_pack_separately_rows_are_not_merged_across_meals():
    """ "Zvlášť" riadky majú jedlo napísané v texte, zlúčenie by ho muselo
    prepisovať — ostávajú preto samostatné, jeden riadok na jedlo."""
    payload = _with_breakfast_and_snack_same_portion()
    for row in payload["rows"]:
        row["sub_rows"].append(
            {
                "type": "zvlast",
                "meal": "breakfast_snack",
                "variant": "",
                "portion_name": "Škôlka",
                "label": "Škôlka - Raňajky - zvlášť",
                "count": 1,
                "col_grams": [[], [], [], ["100.00"], []],
            }
        )
        row["sub_rows"].append(
            {
                "type": "zvlast",
                "meal": "afternoon_snack",
                "variant": "",
                "portion_name": "Škôlka",
                "label": "Škôlka - Olovrant - zvlášť",
                "count": 1,
                "col_grams": [[], [], [], [], ["100.00"]],
            }
        )

    spec = build_table_spec(payload)
    zvlast_labels = [
        r["cells"][0]["text"]
        for r in spec["rows"]
        if r["kind"] == "sub-row" and r["cells"][0]["text"].endswith("zvlášť")
    ]
    assert zvlast_labels == ["Škôlka - Raňajky - zvlášť", "Škôlka - Olovrant - zvlášť"]


def test_long_portion_names_are_abbreviated():
    """#528 — "ZŠ 1.stupeň"/"ZŠ 2.stupeň" sa v tabuľke skracujú na "1.st"/"2.st"."""
    payload = _payload()
    payload["rows"][0]["sub_rows"][0]["portion_name"] = "ZŠ 1.stupeň"

    spec = build_table_spec(payload)
    sub_row = next(
        r for r in spec["rows"] if r["kind"] == "sub-row" and "diet" not in r["css"]
    )
    assert sub_row["cells"][0]["text"] == "1.st"


# ── Filter výdajných bodov ───────────────────────────────────────────────────


def _two_vydaje_payload():
    """Dva výdajné body, každý s jednou prevádzkou — kuchyňa vydáva z dvoch miest."""
    rows = _payload()["rows"]
    return _payload(
        vydaje=[
            {
                "key": "A",
                "name": "Cluster A",
                "routes": [{"id": 1, "name": "Trasa 1", "rows": rows}],
            },
            {
                "key": "B",
                "name": "Cluster B",
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

    assert _band_texts(spec) == ["Cluster B"]
    assert [vydaj["selected"] for vydaj in spec["vydaje"]] == [False, True]


def test_unknown_or_empty_vydaj_selection_falls_back_to_everything():
    payload = _two_vydaje_payload()

    assert _band_texts(build_table_spec(payload)) == ["Cluster A", "Cluster B"]
    assert _band_texts(build_table_spec(payload, vydaje=["nezmysel"])) == [
        "Cluster A",
        "Cluster B",
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

    assert full["footer"][-2]["cells"][1]["text"] == "9999"
    # 8 porcií bez diét × 200 g polievky v jedinom výdaji.
    assert single["footer"][-2]["cells"][1]["text"] == "1600"


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
                "name": "Cluster A",
                "routes": [{"id": 1, "name": "Trasa 1", "rows": rows}],
            },
            {
                "key": "B",
                "name": "Cluster B",
                "routes": [{"id": 2, "name": "Trasa extra 1", "rows": rows}],
            },
            {
                "key": "C",
                "name": "Cluster C",
                "routes": [{"id": 3, "name": "British School", "rows": rows}],
            },
        ],
        rows=[],
        unassigned_rows=[],
    )


def _cluster_summary_band_titles(rows):
    """Zoznam nadpisov „SUMÁR ... S DIÉTAMI MŠ" v poradí — každý klaster (aj
    kombinácia) má teraz presne jeden takýto band (#532)."""
    return [
        row["cells"][0]["text"]
        for row in rows
        if "portion-summary-band" in row["css"]
        and row["cells"][0]["text"].startswith("SUMÁR")
    ]


def _rows_for_section(rows: list[dict], band_title: str) -> list[dict]:
    """`cluster-ms-row` riadky priamo pod pásmom s daným presným textom."""
    band_index = next(
        index
        for index, row in enumerate(rows)
        if row["kind"] == "portion-band" and row["cells"][0]["text"] == band_title
    )
    out = []
    for row in rows[band_index + 1 :]:
        if row["kind"] != "cluster-ms-row":
            break
        out.append(row)
    return out


def test_three_vydaje_get_named_summaries_and_a_combined_first_two():
    spec = build_table_spec(_three_vydaje_payload())

    assert _cluster_summary_band_titles(spec["rows"]) == [
        "SUMÁR CLUSTER A S DIÉTAMI MŠ",
        "SUMÁR CLUSTER B S DIÉTAMI MŠ",
        "SUMÁR CLUSTER A + B S DIÉTAMI MŠ",
        "SUMÁR CLUSTER C S DIÉTAMI MŠ",
    ]
    assert (
        spec["footer"][0]["cells"][0]["text"] == "SUMÁR CLUSTER A + B + C S DIÉTAMI MŠ"
    )


def test_combined_first_two_summary_doubles_a_single_clusters_total():
    """ "Sumár Cluster A + B" má dvojnásobok jedného klastra (rovnaké dáta v
    oboch, fixture ich zdieľa) — overuje, že sa naozaj sčítavajú obe."""
    spec = build_table_spec(_three_vydaje_payload())

    single = _rows_for_section(spec["rows"], "SUMÁR CLUSTER A S DIÉTAMI MŠ")
    combined = _rows_for_section(spec["rows"], "SUMÁR CLUSTER A + B S DIÉTAMI MŠ")

    assert [row["cells"][0]["label"] for row in single] == ["Obed:"]
    assert single[0]["cells"][0]["text"] == "10 MŠ"
    assert combined[0]["cells"][0]["text"] == "20 MŠ"


def test_each_named_summary_gets_its_own_diet_breakdown():
    """Sumár Cluster A/B/C aj A + B majú diétny rozpad (pod „... DIÉTY"),
    nielen ten za všetky klastre dokopy."""
    spec = build_table_spec(_three_vydaje_payload())

    def _diet_summary_after(diet_title: str) -> dict:
        band_index = next(
            index
            for index, row in enumerate(spec["rows"])
            if row["kind"] == "portion-band" and row["cells"][0]["text"] == diet_title
        )
        diet_rows = []
        for row in spec["rows"][band_index + 1 :]:
            if row["kind"] != "summary-diet":
                break
            diet_rows.append(row)
        return {row["cells"][0]["text"]: row["cells"][0]["count"] for row in diet_rows}

    # "Cluster A + B" sčíta rovnakého klienta z oboch výdajov (2 + 2 = 4),
    # ostatné súhrny (jeden výdaj) ostávajú pri pôvodných 2.
    assert _diet_summary_after("CLUSTER A DIÉTY")["No Milk"] == format_count(2)
    assert _diet_summary_after("CLUSTER B DIÉTY")["No Milk"] == format_count(2)
    assert _diet_summary_after("CLUSTER A + B DIÉTY")["No Milk"] == format_count(4)
    assert _diet_summary_after("CLUSTER C DIÉTY")["No Milk"] == format_count(2)


def test_two_vydaje_do_not_get_a_combined_summary():
    """Kombinovaný medzisúčet dáva zmysel len keď je čo kombinovať navyše."""
    spec = build_table_spec(_two_vydaje_payload())

    assert _cluster_summary_band_titles(spec["rows"]) == [
        "SUMÁR CLUSTER A S DIÉTAMI MŠ",
        "SUMÁR CLUSTER B S DIÉTAMI MŠ",
    ]


def test_filtering_to_a_single_vydaj_drops_the_combined_summary():
    spec = build_table_spec(_three_vydaje_payload(), vydaje=["C"])

    assert _cluster_summary_band_titles(spec["rows"]) == [
        "SUMÁR CLUSTER C S DIÉTAMI MŠ"
    ]


# ── Olovrant s obedom (Prevadzka.olovrant_s_obedom) ─────────────────────────
def _snack_cell_css(spec):
    """CSS triedy gramážovej bunky olovrantu sub-riadku "Škôlka - Olovrant"."""
    for row in spec["rows"]:
        if row.get("kind") != "sub-row":
            continue
        if row["cells"][0]["text"] != "Škôlka - Olovrant":
            continue
        # Posledná číselná bunka v riadku je stĺpec afternoon_snack.
        num_cells = [cell for cell in row["cells"] if "cell-num" in cell["css"]]
        return num_cells[-1]["css"]
    raise AssertionError("sub-row olovrantu sa v spec-e nenašiel")


def test_snack_column_uses_the_normal_hue_by_default():
    spec = build_table_spec(_with_breakfast_and_snack())

    assert "mh-snack-cell" in _snack_cell_css(spec)
    assert "mh-snacklunch-cell" not in _snack_cell_css(spec)


def test_snack_with_lunch_flag_recolours_only_the_snack_column():
    payload = _with_breakfast_and_snack()
    payload["rows"][0]["snack_with_lunch"] = True
    spec = build_table_spec(payload)

    assert "mh-snacklunch-cell" in _snack_cell_css(spec)
    # Ostatné jedlá (Polievka/Menu A/B) musia ostať v pôvodných farbách —
    # príznak sa týka výlučne stĺpca "Olovrant".
    for row in spec["rows"]:
        if row.get("kind") != "sub-row":
            continue
        if row["cells"][0]["text"] == "Škôlka - Olovrant":
            continue
        for cell in row["cells"]:
            assert "mh-snacklunch-cell" not in cell["css"]


def test_snack_with_lunch_flag_is_per_row_not_global():
    """Dve prevádzky v tabuľke, len jedna má olovrant_s_obedom — druhá musí
    ostať vo svojej normálnej farbe."""
    payload = _with_breakfast_and_snack()
    second = {
        **payload["rows"][0],
        "client": "MŠ Susedná",
        "client_id": 2,
        "snack_with_lunch": False,
    }
    payload["rows"][0]["snack_with_lunch"] = True
    payload["rows"].append(second)

    spec = build_table_spec(payload)
    snack_sub_rows = [
        row
        for row in spec["rows"]
        if row.get("kind") == "sub-row"
        and row["cells"][0]["text"] == "Škôlka - Olovrant"
    ]
    assert len(snack_sub_rows) == 2
    css_by_row = [
        [c["css"] for c in row["cells"] if "cell-num" in c["css"]][-1]
        for row in snack_sub_rows
    ]
    assert "mh-snacklunch-cell" in css_by_row[0]
    assert (
        "mh-snack-cell" in css_by_row[1] and "mh-snacklunch-cell" not in css_by_row[1]
    )

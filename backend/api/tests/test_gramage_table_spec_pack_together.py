"""Súhrnný riadok „Zabaliť spolu:" (10.9.2026, #568 nadväzba).

Sčíta JEDNEJ prevádzky (klientský riadok):
- štandardné porcie (`sub_row.type == "standard"`, hocijaké Menu/deti aj
  dospelí) — vždy,
- diétne porcie (`sub_row.type == "diet"`), LEN keď je tá diéta pre dané
  jedlo dnes na diet-component-merge boarde "spolu"
  (`data["diet_pack_state"]`, default bez zápisu).

Vynecháva klientom vyžiadané "zvlášť"/"zvlášť do GN" (`sub_row.type in
("zvlast", "zvlast_gn")`) — tie majú vlastný riadok a do spoločného balenia
nepatria. Objaví sa hneď za vlastnými riadkami TEJTO prevádzky, nikdy sa
nesčítava naprieč viacerými (nedá sa zabaliť spolu obsah dvoch rôznych
škôl, aj keby boli na tej istej trase/klastri)."""

from api.exporters.gramage_table_spec import build_table_spec

COMPONENTS = [{"label": "Mäso", "base_grams": "300", "unit": "g"}]


def _col_groups():
    return [
        {
            "key": "main_course_A",
            "meal": "main_course",
            "variant": "A",
            "label": "Obed",
            "template_name": "Kuracie",
            "components": COMPONENTS,
        }
    ]


def _diet_sub_row(count, grams, diet_name="No Milk"):
    components = grams if isinstance(grams, list) else [grams]
    return {
        "type": "diet",
        "meal": "main_course",
        "portion_name": "Škôlka",
        "label": f"Škôlka - {diet_name}",
        "diet_name": diet_name,
        "diet_color": "#F59E0B",
        "count": count,
        "col_grams": [components],
    }


def _standard_sub_row(count, grams):
    return {
        "type": "standard",
        "meal": "main_course",
        "variant": "A",
        "portion_name": "Škôlka",
        "label": "Škôlka - Obed Menu A",
        "count": count,
        "col_grams": [[grams]],
    }


_next_client_id = iter(range(1, 1000))


def _client_row(client, sub_rows):
    return {
        "client": client,
        "client_id": next(_next_client_id),
        "total_count": sum(sr.get("count") or 0 for sr in sub_rows),
        "standard_total_count": 0,
        "standard_col_grams": [[]],
        "diet_summary_rows": [],
        "sub_rows": sub_rows,
    }


def _payload(vydaje, diet_pack_state=None):
    return {
        "date": "2026-09-10",
        "col_groups": _col_groups(),
        "rows": [],
        "totals": [["0.00"]],
        "count_summary": [],
        # `vydaje_by_meal` (#dashboard-per-meal-routes) — tento payload má len
        # obedové stĺpce, takže patrí pod "lunch" (default `meal_type`).
        "vydaje_by_meal": {"lunch": vydaje},
        "diet_pack_state": diet_pack_state or {},
    }


def _pack_together_rows(spec):
    return [r for r in spec["rows"] if r["kind"] == "pack-together"]


def _one_route_payload(row, **kwargs):
    return _payload(
        [
            {
                "key": "A",
                "name": "Vydaj A",
                "routes": [{"id": 1, "name": "Trasa 1", "rows": [row]}],
            }
        ],
        **kwargs,
    )


def test_pack_together_row_sums_standard_and_default_spolu_diet_portions():
    row = _client_row(
        "MŠ Alfa", [_standard_sub_row(4, "1200.00"), _diet_sub_row(2, "600.00")]
    )
    spec = build_table_spec(_one_route_payload(row), include_summary_rows=False)

    [pack] = _pack_together_rows(spec)
    assert pack["cells"][0]["text"] == "Zabaliť spolu:"
    assert pack["cells"][0]["count"] == "6"
    assert pack["cells"][1]["text"] == "1800"


def test_pack_together_row_excludes_a_diet_marked_zvlast_on_the_board():
    row = _client_row(
        "MŠ Alfa", [_standard_sub_row(4, "1200.00"), _diet_sub_row(2, "600.00")]
    )
    payload = _one_route_payload(row, diet_pack_state={"main_course": {"No Milk": "Z"}})
    # Zdroj pravdy je per-zložka mapa (`gramage_dashboard` ju nastavuje vždy
    # spolu s hrubým `diet_pack_state` nad tými istými dátami) — táto diéta
    # má jedinú zložku (index 0), tá je "zvlášť".
    payload["diet_component_pack_state"] = {"main_course": {"No Milk": [0]}}

    spec = build_table_spec(payload, include_summary_rows=False)

    [pack] = _pack_together_rows(spec)
    # Len štandard (4 hlavy, 1200 g) — diéta je dnes "zvlášť", nejde do súčtu.
    assert pack["cells"][0]["count"] == "4"
    assert pack["cells"][1]["text"] == "1200"


def test_pack_together_row_includes_a_diet_explicitly_marked_spolu():
    row = _client_row(
        "MŠ Alfa", [_standard_sub_row(4, "1200.00"), _diet_sub_row(2, "600.00")]
    )
    payload = _one_route_payload(row, diet_pack_state={"main_course": {"No Milk": "S"}})

    spec = build_table_spec(payload, include_summary_rows=False)

    [pack] = _pack_together_rows(spec)
    assert pack["cells"][0]["count"] == "6"
    assert pack["cells"][1]["text"] == "1800"


def test_pack_together_row_collapses_together_with_this_clients_own_rows():
    """`group_id`/`collapsible` musia sedieť s tým, čo dostávajú ostatné
    detailné riadky tej istej prevádzky (`_client_rows`) — inak by na
    obrazovke pri zbalenom klientovi ostal viditeľný bez kontextu, kým jeho
    sub-riadky sú skryté."""
    row = _client_row(
        "MŠ Alfa", [_standard_sub_row(4, "1200.00"), _diet_sub_row(2, "600.00")]
    )
    spec = build_table_spec(_one_route_payload(row), include_summary_rows=False)

    client = next(r for r in spec["rows"] if r["kind"] == "client")
    diet_sub_row = next(
        r for r in spec["rows"] if r["kind"] == "sub-row" and "diet" in r["css"]
    )
    [pack] = _pack_together_rows(spec)
    assert pack["group_id"] == client["group_id"] == diet_sub_row["group_id"]
    assert pack["collapsible"] is True


def test_pack_together_row_excludes_client_requested_separate_packing():
    row = _client_row(
        "MŠ Alfa",
        [
            _standard_sub_row(4, "1200.00"),
            _diet_sub_row(2, "600.00"),
            {
                "type": "zvlast",
                "meal": "main_course",
                "variant": "A",
                "portion_name": "Škôlka",
                "label": "Škôlka - Obed Menu A - zvlášť",
                "count": 1,
                "col_grams": [["300.00"]],
            },
            {
                "type": "zvlast_gn",
                "meal": "main_course",
                "portion_name": "Škôlka",
                "diet_name": "No Milk",
                "label": "Škôlka - No Milk - zvlášť do GN",
                "count": 1,
                "col_grams": [["300.00"]],
            },
        ],
    )
    spec = build_table_spec(_one_route_payload(row), include_summary_rows=False)

    [pack] = _pack_together_rows(spec)
    # Štandard (4, 1200) + diéta default spolu (2, 600) = 6, 1800 — "zvlast"/
    # "zvlast_gn" (1+1, 300+300) majú vlastné riadky, do súčtu nejdú.
    assert pack["cells"][0]["count"] == "6"
    assert pack["cells"][1]["text"] == "1800"


def test_pack_together_row_absent_when_everything_is_packed_separately():
    """Klient bez štandardnej ani "spolu" diétnej porcie — všetko, čo má, je
    už "zvlášť" (packSeparately) — niet čo zabaliť spolu navyše."""
    row = _client_row(
        "MŠ Alfa",
        [
            {
                "type": "zvlast",
                "meal": "main_course",
                "variant": "A",
                "portion_name": "Škôlka",
                "label": "Škôlka - Obed Menu A - zvlášť",
                "count": 4,
                "col_grams": [["1200.00"]],
            }
        ],
    )
    spec = build_table_spec(_one_route_payload(row), include_summary_rows=False)

    assert _pack_together_rows(spec) == []


def test_pack_together_False_hides_the_row_even_when_there_is_something_to_pack():
    row = _client_row(
        "MŠ Alfa", [_standard_sub_row(4, "1200.00"), _diet_sub_row(2, "600.00")]
    )
    spec = build_table_spec(
        _one_route_payload(row), include_summary_rows=False, pack_together=False
    )

    assert _pack_together_rows(spec) == []


def test_pack_together_row_never_mixes_two_different_prevadzky_on_the_same_route():
    """Dve rôzne prevádzky na tej istej trase — nedá sa zabaliť spolu obsah
    dvoch rôznych škôl, každá dostane VLASTNÝ riadok s VLASTNÝM súčtom."""
    row_a = _client_row(
        "MŠ Alfa", [_standard_sub_row(4, "1200.00"), _diet_sub_row(2, "600.00")]
    )
    row_b = _client_row(
        "MŠ Beta", [_standard_sub_row(3, "900.00"), _diet_sub_row(5, "1500.00")]
    )
    payload = _payload(
        [
            {
                "key": "A",
                "name": "Vydaj A",
                "routes": [{"id": 1, "name": "Trasa 1", "rows": [row_a, row_b]}],
            }
        ]
    )

    spec = build_table_spec(payload, include_summary_rows=False)

    packs = _pack_together_rows(spec)
    assert len(packs) == 2
    assert [p["cells"][0]["count"] for p in packs] == ["6", "8"]


def test_pack_together_row_sits_right_after_this_clients_own_rows():
    row_a = _client_row(
        "MŠ Alfa", [_standard_sub_row(4, "1200.00"), _diet_sub_row(2, "600.00")]
    )
    row_b = _client_row("MŠ Beta", [_standard_sub_row(3, "900.00")])
    payload = _payload(
        [
            {
                "key": "A",
                "name": "Vydaj A",
                "routes": [{"id": 1, "name": "Trasa 1", "rows": [row_a, row_b]}],
            }
        ]
    )

    spec = build_table_spec(
        payload, include_summary_rows=False, show_cluster_summary=False
    )

    kinds = [r["kind"] for r in spec["rows"]]
    pack_index = kinds.index("pack-together")
    # Hneď pred "Zabaliť spolu:" je posledný riadok MŠ Alfa (jej diétny
    # sub-riadok), hneď za ním už začína MŠ Beta (ďalší "client" riadok) —
    # žiadny ďalší riadok MŠ Alfa medzi tým.
    assert kinds[pack_index - 1] == "sub-row"
    assert kinds[pack_index + 1] == "client"


def test_pack_together_row_appears_for_unassigned_prevadzky_too():
    row = _client_row(
        "MŠ Nepriradená",
        [_standard_sub_row(4, "1200.00"), _diet_sub_row(2, "600.00")],
    )
    # Nepriradený blok sa spracuje len keď existuje aspoň jeden reálny vydaj
    # (viď `build_table_spec` — inak sa spadne rovno do plochej vetvy).
    other = _client_row("MŠ Alfa", [_standard_sub_row(1, "300.00")])
    payload = _payload(
        [
            {
                "key": "A",
                "name": "Vydaj A",
                "routes": [{"id": 1, "name": "Trasa 1", "rows": [other]}],
            }
        ]
    )
    payload["unassigned_rows_by_meal"] = {"lunch": [row]}

    spec = build_table_spec(payload, include_summary_rows=False)

    # "other" (Alfa, na trase) aj "row" (Nepriradená) majú každá svoj vlastný
    # riadok — dva dokopy, obaja majú niečo na zabalenie.
    packs = _pack_together_rows(spec)
    assert len(packs) == 2
    assert [p["cells"][0]["count"] for p in packs] == ["1", "6"]


def test_pack_together_row_appears_in_the_flat_no_vydaje_table_too():
    row = _client_row(
        "MŠ Bez trasy", [_standard_sub_row(4, "1200.00"), _diet_sub_row(2, "600.00")]
    )
    payload = _payload([])
    payload["rows"] = [row]

    spec = build_table_spec(payload, include_summary_rows=False)

    assert len(_pack_together_rows(spec)) == 1


# Spolu/zvlášť je vlastnosťou KAŽDEJ zložky zvlášť (`diet_component_pack_state`,
# viď `test_gramage_table_spec_diet_pack_badge.py`) — hlavná časť môže byť
# "spolu", príloha "zvlášť" a šalát znova "spolu" pre tú istú diétu na tom
# istom jedle naraz. "Zabaliť spolu:" preto musí sčítavať gramáž PO ZLOŽKÁCH
# (stĺpcoch), nie podľa jedného hrubého stavu za celú diétu/jedlo.
_TWO_COMPONENTS = [
    {"label": "Mäso", "base_grams": "300", "unit": "g"},
    {"label": "Príloha", "base_grams": "150", "unit": "g"},
]


def _two_component_col_groups():
    return [
        {
            "key": "main_course_A",
            "meal": "main_course",
            "variant": "A",
            "label": "Obed",
            "template_name": "Kuracie",
            "components": _TWO_COMPONENTS,
        }
    ]


def test_pack_together_row_excludes_only_the_separated_component_not_the_whole_diet():
    row = _client_row(
        "MŠ Alfa",
        [
            {
                "type": "standard",
                "meal": "main_course",
                "variant": "A",
                "portion_name": "Škôlka",
                "label": "Škôlka - Obed Menu A",
                "count": 4,
                "col_grams": [["1200.00", "600.00"]],
            },
            _diet_sub_row(2, ["400.00", "200.00"]),
        ],
    )
    payload = _payload(
        [
            {
                "key": "A",
                "name": "Vydaj A",
                "routes": [{"id": 1, "name": "Trasa 1", "rows": [row]}],
            }
        ],
    )
    payload["col_groups"] = _two_component_col_groups()
    # Príloha (index 1) tejto diéty je dnes na doske označená zvlášť, hlavná
    # časť (index 0) ostáva spolu — `diet_pack_state` (hrubý stav za celé
    # jedlo) tu zámerne chýba, presne ako to posiela `gramage_dashboard`,
    # keď nie sú spolu VŠETKY zložky "spolu" (default).
    payload["diet_component_pack_state"] = {"main_course": {"No Milk": [1]}}

    spec = build_table_spec(payload, include_summary_rows=False)

    [pack] = _pack_together_rows(spec)
    # Headcount ostáva 6 (4 štandard + 2 diéta) — diéta má stále čo ísť do
    # spoločného balenia (hlavnú časť). Mäso: 1200 + 400 = 1600 (spolu).
    # Príloha: 600 + 0 = 600 (diétna príloha je dnes zvlášť, jej 200 g do
    # súčtu nejde).
    assert pack["cells"][0]["count"] == "6"
    assert [cell["text"] for cell in pack["cells"][1:]] == ["1600", "600"]


def test_pack_together_row_still_includes_the_together_component_when_meal_level_state_is_z():
    """`diet_pack_state` (per jedlo, nie per zložka) je "Z", hneď ako má
    diéta čo i len jednu zvlášť zložku (`meal_plan_service.resolve_diet_component_separations`)
    — to smie ovplyvniť odznak/legacy čítačky toho hrubého stavu, ale
    NESMIE spôsobiť, že sa vynechá aj zložka, ktorá je stále "spolu"."""
    row = _client_row(
        "MŠ Alfa",
        [
            {
                "type": "standard",
                "meal": "main_course",
                "variant": "A",
                "portion_name": "Škôlka",
                "label": "Škôlka - Obed Menu A",
                "count": 4,
                "col_grams": [["1200.00", "600.00"]],
            },
            _diet_sub_row(2, ["400.00", "200.00"]),
        ],
    )
    payload = _payload(
        [
            {
                "key": "A",
                "name": "Vydaj A",
                "routes": [{"id": 1, "name": "Trasa 1", "rows": [row]}],
            }
        ],
        # Hrubý (odvodený) stav za celé jedlo — "Z", lebo príloha je zvlášť.
        diet_pack_state={"main_course": {"No Milk": "Z"}},
    )
    payload["col_groups"] = _two_component_col_groups()
    payload["diet_component_pack_state"] = {"main_course": {"No Milk": [1]}}

    spec = build_table_spec(payload, include_summary_rows=False)

    [pack] = _pack_together_rows(spec)
    assert pack["cells"][0]["count"] == "6"
    assert [cell["text"] for cell in pack["cells"][1:]] == ["1600", "600"]

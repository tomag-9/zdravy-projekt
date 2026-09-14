"""S/Z patrí do bunky konkrétnej zložky diétneho riadku, nie k diéte."""

from api.exporters.gramage_table_spec import build_table_spec

GRAMS = {"label": "Mäso", "base_grams": "300", "unit": "g"}
SIDE = {"label": "Príloha", "base_grams": "150", "unit": "g"}


def _payload(diet_component_pack_state=None, **overrides):
    data = {
        "date": "2026-07-28",
        "col_groups": [
            {
                "key": "main_course_A",
                "meal": "main_course",
                "variant": "A",
                "label": "Obed",
                "template_name": "Kuracie",
                "components": [GRAMS, SIDE],
            },
        ],
        "rows": [
            {
                "client": "MŠ Testovacia",
                "client_id": 1,
                "total_count": 10,
                "standard_total_count": 8,
                "standard_col_grams": [["1600.00", "800.00"]],
                "diet_summary_rows": [
                    {
                        "name": "No Milk",
                        "count": 2,
                        "color": "#F59E0B",
                        "col_grams": [["400.00", "200.00"]],
                        "meal_counts": {"main_course": 2},
                    }
                ],
                "sub_rows": [
                    {
                        "type": "standard",
                        "meal": "main_course",
                        "variant": "A",
                        "portion_name": "Škôlka",
                        "label": "Škôlka - Obed Menu A",
                        "count": 8,
                        "col_grams": [["1600.00", "800.00"]],
                    },
                    {
                        "type": "diet",
                        "meal": "main_course",
                        "portion_name": "Škôlka",
                        "label": "No Milk",
                        "diet_name": "No Milk",
                        "diet_color": "#F59E0B",
                        "count": 2,
                        "col_grams": [["400.00", "200.00"]],
                    },
                ],
            }
        ],
        "totals": [["1600.00", "800.00"]],
        "count_summary": [],
        "diet_component_pack_state": diet_component_pack_state or {},
    }
    data.update(overrides)
    return data


def _sub_row_cell(spec):
    return next(
        r["cells"][0]
        for r in spec["rows"]
        if r["kind"] == "sub-row" and "diet" in r["css"]
    )


def _diet_component_cells(spec):
    return _sub_row_cell(spec), next(
        row["cells"][1:]
        for row in spec["rows"]
        if row["kind"] == "sub-row" and "diet" in row["css"]
    )


def test_each_diet_component_defaults_to_spolu_in_its_own_cell():
    label, cells = _diet_component_cells(build_table_spec(_payload()))

    assert label["text"] == "↳ No Milk"
    assert "pack_badge" not in label
    assert [cell["component_pack_badge"] for cell in cells] == ["S", "S"]


def test_only_the_separated_component_cell_shows_zvlast():
    label, cells = _diet_component_cells(
        build_table_spec(_payload({"main_course": {"No Milk": [1]}}))
    )

    assert label["text"] == "↳ No Milk"
    assert [cell["component_pack_badge"] for cell in cells] == ["S", "Z"]

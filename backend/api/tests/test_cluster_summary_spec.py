"""Independent print summaries stay anchored to the lunch delivery cluster."""

from decimal import Decimal

import pytest

from api.exporters.cluster_summary_spec import build_cluster_summary_spec


def _row(client, cluster="A", breakfast=0, lunch=0, olovrant=0):
    sub_rows = []
    for meal, count in (
        ("breakfast_snack", breakfast),
        ("main_course", lunch),
        ("afternoon_snack", olovrant),
    ):
        if count:
            sub_rows.append(
                {
                    "type": "standard",
                    "meal": meal,
                    "variant": "A" if meal == "main_course" else "",
                    "count": count,
                    "_heads": count,
                    "_ms_recalc": Decimal(count),
                    "col_grams": [[str(count * 100)]] * 3,
                }
            )
    return {
        "client": client,
        "sub_rows": sub_rows,
        "diet_summary_rows": [],
        "delivery_by_meal": {
            "lunch": {
                "delivery_route_id": 1 if cluster else None,
                "vydaj": cluster or "A",
            }
        },
    }


def _data():
    return {
        "date": "2026-09-12",
        "col_groups": [
            {"key": "breakfast", "meal": "breakfast_snack", "components": []},
            {"key": "lunch-a", "meal": "main_course", "variant": "A", "components": []},
            {"key": "olovrant", "meal": "afternoon_snack", "components": []},
        ],
        "rows": [
            _row("MŠ A", "A", breakfast=2, lunch=3, olovrant=4),
            _row("MŠ bez obeda", None, breakfast=5, olovrant=6),
        ],
        "vydaje_by_meal": {"lunch": [{"key": "A", "name": "Cluster A", "routes": []}]},
    }


def test_groups_every_selected_meal_by_the_lunch_cluster():
    spec = build_cluster_summary_spec(_data(), ["breakfast", "olovrant"])

    titles = [row["cells"][0].get("text", "") for row in spec["rows"]]
    meal_rows = [
        (cell.get("label", ""), cell.get("text", ""))
        for row in spec["rows"]
        for cell in row.get("cells", [])
    ]
    assert "SUMÁR CLUSTER A S DIÉTAMI MŠ" in titles
    assert ("Raňajky:", "2 ks / 2 MŠ") in meal_rows
    assert ("Olovrant:", "4 ks / 4 MŠ") in meal_rows
    assert "Nepriradené k obedu" in titles
    assert ("Raňajky:", "5 ks / 5 MŠ") in meal_rows
    assert ("Olovrant:", "6 ks / 6 MŠ") in meal_rows


def test_selected_meals_do_not_leak_unselected_lunch_into_summary():
    spec = build_cluster_summary_spec(_data(), ["breakfast"])

    text = " ".join(
        f"{cell.get('label', '')} {cell.get('text', '')}"
        for row in [*spec["rows"], *spec["footer"]]
        for cell in row.get("cells", [])
    )
    assert "Raňajky:" in text
    assert "Obed:" not in text
    assert "Olovrant:" not in text


@pytest.mark.parametrize(
    ("meals", "expected_labels"),
    [
        (["breakfast"], {"Raňajky:"}),
        (["lunch"], {"Obed:"}),
        (["olovrant"], {"Olovrant:"}),
        (["breakfast", "lunch"], {"Raňajky:", "Obed:"}),
        (["breakfast", "olovrant"], {"Raňajky:", "Olovrant:"}),
        (["lunch", "olovrant"], {"Obed:", "Olovrant:"}),
        (["breakfast", "lunch", "olovrant"], {"Raňajky:", "Obed:", "Olovrant:"}),
    ],
)
def test_every_nonempty_meal_combination_contains_exactly_its_selected_summaries(
    meals, expected_labels
):
    spec = build_cluster_summary_spec(_data(), meals)

    labels = {
        cell.get("label")
        for row in [*spec["rows"], *spec["footer"]]
        for cell in row.get("cells", [])
        if cell.get("label") in {"Raňajky:", "Obed:", "Olovrant:"}
    }

    assert labels == expected_labels


def test_filtered_summary_keeps_only_diets_from_selected_meals():
    data = _data()
    data["col_groups"] = [
        {"key": "breakfast", "meal": "breakfast_snack", "components": [{"name": "R"}]},
        {
            "key": "lunch-a",
            "meal": "main_course",
            "variant": "A",
            "components": [{"name": "O"}],
        },
        {"key": "olovrant", "meal": "afternoon_snack", "components": [{"name": "Ol"}]},
    ]
    data["rows"][0]["diet_summary_rows"] = [
        {
            "name": "BEZ LEPKU",
            "count": 3,
            "meal_counts": {"breakfast_snack": 1, "main_course": 2},
            "col_grams": [["11"], ["22"], []],
        }
    ]

    spec = build_cluster_summary_spec(data, ["breakfast"])
    diet = next(
        row
        for row in spec["rows"]
        if row["kind"] == "summary-diet" and row["cells"][0].get("text") == "BEZ LEPKU"
    )

    assert diet["cells"][0]["count"] == "1"
    assert [cell["text"] for cell in diet["cells"][1:]] == ["11"]


def test_british_summary_only_cluster_is_taken_once_from_lunch_payload():
    data = _data()
    data["vydaje_by_meal"]["lunch"].append(
        {
            "key": "C",
            "name": "Cluster C",
            "summary_only": True,
            "british_summary": [
                {"label": "Raňajky", "heads": Decimal("7"), "total": Decimal("7")}
            ],
        }
    )

    spec = build_cluster_summary_spec(data, ["breakfast"])

    text = " ".join(
        f"{cell.get('label', '')} {cell.get('text', '')}"
        for row in [*spec["rows"], *spec["footer"]]
        for cell in row.get("cells", [])
    )
    assert "Raňajky: 7 ks / 7 MŠ" in text  # Cluster C appears exactly once.
    assert "Raňajky: 14 ks / 14 MŠ" in text  # Final total includes every cluster.


def test_total_lunch_ms_includes_regular_rows_and_british_extra_items():
    data = _data()
    data["vydaje_by_meal"]["lunch"].append(
        {
            "key": "C",
            "name": "Cluster C",
            "summary_only": True,
            "british_summary": [
                {"label": "Obed", "heads": Decimal("7"), "total": Decimal("7")}
            ],
        }
    )

    spec = build_cluster_summary_spec(data, ["lunch"])

    total = next(row for row in spec["footer"] if row["kind"] == "total-ms-porcie")
    assert total["cells"][0]["text"] == "10"

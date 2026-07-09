import json
from pathlib import Path

FIXTURE_PATH = (
    Path(__file__).resolve().parents[1]
    / "api"
    / "fixtures"
    / "real_order_count_corrections_week_28_2026.json"
)


def test_week_28_real_order_count_corrections_fixture_is_valid():
    corrections = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))

    assert isinstance(corrections, list)
    assert corrections

    for correction in corrections:
        assert correction["date"].startswith("2026-07-")
        assert correction["company_name"]
        assert correction["meal"]

        has_counts = bool(correction.get("menuCounts")) or bool(correction.get("diets"))
        has_gram_corrections = bool(correction.get("gramCorrections"))
        assert has_counts or has_gram_corrections

        if has_counts:
            assert correction["portion"]

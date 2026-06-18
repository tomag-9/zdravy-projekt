"""Unit tests for the jedálniček DOCX parser."""

import datetime
from decimal import Decimal
from io import BytesIO
from pathlib import Path

import pytest

from api.jedalnicek_parser import (
    extract_diet_tag,
    is_standard_tag,
    parse_docx,
    resolve_diet,
)

# ── extract_diet_tag ─────────────────────────────────────────────────────────


class TestExtractDietTag:
    def test_simple_tag(self):
        assert extract_diet_tag("Week 222026_Klasik.docx") == "Klasik"

    def test_menu_b_variant(self):
        assert extract_diet_tag("Week 222026_Klasik_Menu B.docx") == "Klasik Menu B"

    def test_nogluten(self):
        assert extract_diet_tag("Week 222026_NoGluten.docx") == "NoGluten"

    def test_nomilk_nogluten(self):
        assert extract_diet_tag("Week 222026_NoMilkNoGluten.docx") == "NoMilkNoGluten"

    def test_ucitel(self):
        assert extract_diet_tag("Week 222026_Učiteľ.docx") == "Učiteľ"

    def test_klasik_monte(self):
        assert extract_diet_tag("Week 222026_Klasik_Monte.docx") == "Klasik Monte"

    def test_english_version(self):
        assert extract_diet_tag("Week 222026_Klasik_Eng.docx") == "Klasik Eng"


class TestIsStandardTag:
    def test_klasik_is_standard(self):
        assert is_standard_tag("Klasik") is True

    def test_klasik_menu_b_is_standard(self):
        assert is_standard_tag("Klasik Menu B") is True

    def test_nogluten_is_not_standard(self):
        assert is_standard_tag("NoGluten") is False

    def test_ucitel_is_not_standard(self):
        assert is_standard_tag("Učiteľ") is False


# ── resolve_diet ──────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestResolveDiet:
    def test_klasik_returns_none(self):
        diet, tag = resolve_diet("Week 222026_Klasik.docx")
        assert diet is None
        assert tag == "Klasik"

    def test_klasik_menu_b_returns_none(self):
        diet, tag = resolve_diet("Week 222026_Klasik_Menu B.docx")
        assert diet is None

    def test_unknown_tag_returns_none_with_warning(self):
        diet, tag = resolve_diet("Week 222026_Unknown.docx")
        assert diet is None
        assert tag == "Unknown"

    def test_matches_docx_tag(self):
        from api.models import Diet

        d = Diet.objects.create(name="Bez lepku", docx_tag="NoGluten")
        diet, tag = resolve_diet("Week 222026_NoGluten.docx")
        assert diet == d

    def test_matches_name_when_no_docx_tag(self):
        from api.models import Diet

        d = Diet.objects.create(name="Vegetariánske")
        diet, tag = resolve_diet("Week 222026_Vegetariánske.docx")
        assert diet == d


# ── parse_docx ────────────────────────────────────────────────────────────────


def _make_docx(paragraphs: list[str]) -> BytesIO:
    """Create a minimal DOCX file in memory from a list of paragraph texts."""
    import docx

    doc = docx.Document()
    for text in paragraphs:
        doc.add_paragraph(text)
    buf = BytesIO()
    doc.save(buf)
    buf.seek(0)
    return buf


WEEK_START = datetime.date(2026, 5, 25)  # Monday


class TestParseDocx:
    def test_simple_breakfast_and_lunch(self):
        buf = _make_docx(
            [
                "Nápoj týždňa: Čaj  25.5.2026 – 29.5.2026 Klasik WEEK 22/2026",
                "",
                "PONDELOK",
                "Raňajky-desiata: ",
                "120g Pšenová kaša so slivkami 7",
                "50g Banán",
                "Obed: 200ml Paradajková polievka 9",
                "225g Kuracie stehno, zemiaková kaša",
                "Olovrant: 75g Grahamové pečivo 1",
                "",
            ]
        )
        entries = parse_docx(buf, WEEK_START)
        assert len(entries) == 5

        breakfast_entries = [e for e in entries if e.category == "breakfast"]
        assert len(breakfast_entries) == 2
        assert breakfast_entries[0].name == "Pšenová kaša so slivkami"
        assert breakfast_entries[0].weight_grams == Decimal("120")
        assert breakfast_entries[1].name == "Banán"
        assert breakfast_entries[1].weight_grams == Decimal("50")

        lunch_entries = [e for e in entries if e.category == "lunch"]
        assert len(lunch_entries) == 2
        assert lunch_entries[0].name == "Paradajková polievka"
        assert lunch_entries[0].weight_grams == Decimal("200")

        snack_entries = [e for e in entries if e.category == "snack"]
        assert len(snack_entries) == 1
        assert snack_entries[0].name == "Grahamové pečivo"

    def test_dates_are_correct(self):
        buf = _make_docx(
            [
                "PONDELOK",
                "Raňajky-desiata: 120g Kaša 7",
                "",
                "UTOROK",
                "Raňajky-desiata: 100g Chlieb 1",
                "",
                "STREDA",
                "Raňajky-desiata: 80g Jogurt 7",
                "",
                "ŠTVRTOK",
                "Raňajky-desiata: 90g Müsli",
                "",
                "PIATOK",
                "Raňajky-desiata: 75g Ovocie",
            ]
        )
        entries = parse_docx(buf, WEEK_START)
        dates = [e.date for e in entries]
        assert datetime.date(2026, 5, 25) in dates  # Mon
        assert datetime.date(2026, 5, 26) in dates  # Tue
        assert datetime.date(2026, 5, 27) in dates  # Wed
        assert datetime.date(2026, 5, 28) in dates  # Thu
        assert datetime.date(2026, 5, 29) in dates  # Fri

    def test_menu_variant_b_prefix(self):
        buf = _make_docx(
            [
                "PONDELOK",
                "Obed: 200ml Polievka 9",
                "225g Menu A jedlo",
                "B: 275g Menu B jedlo 1",
            ]
        )
        entries = parse_docx(buf, WEEK_START)
        lunch_entries = [e for e in entries if e.category == "lunch"]
        variants = {e.menu_variant for e in lunch_entries}
        assert "B" in variants
        b_entry = next(e for e in lunch_entries if e.menu_variant == "B")
        assert b_entry.name == "Menu B jedlo"
        assert b_entry.weight_grams == Decimal("275")

    def test_allergen_numbers_stripped(self):
        buf = _make_docx(
            [
                "PONDELOK",
                "Raňajky-desiata: 120g Čučoriedkový tvaroháčik 7, sladké krutóny 1, 3",
            ]
        )
        entries = parse_docx(buf, WEEK_START)
        assert entries[0].name == "Čučoriedkový tvaroháčik 7, sladké krutóny"

    def test_no_weight_entry(self):
        buf = _make_docx(
            [
                "PONDELOK",
                "Raňajky-desiata: ",
                "Čerstvé ovocie a zelenina",
            ]
        )
        entries = parse_docx(buf, WEEK_START)
        assert len(entries) == 1
        assert entries[0].weight_grams is None
        assert entries[0].name == "Čerstvé ovocie a zelenina"

    def test_metadata_lines_skipped(self):
        buf = _make_docx(
            [
                "Nápoj týždňa: Ovocný čaj  25.5.2026 Klasik",
                "PONDELOK",
                "Raňajky-desiata: 100g Jedlo",
                "Zostavili: Ivana Kachútová MSc, Eva Blaho",
                "ALERGÉNY: 1-Obilniny, 2-Kôrovce",
            ]
        )
        entries = parse_docx(buf, WEEK_START)
        assert all(e.name != "Zostavili" for e in entries)
        assert len(entries) == 1

    def test_real_klasik_file(self):
        """Parse the actual Week 222026_Klasik.docx test fixture if present."""
        fixture = Path(
            "/home/tomas-magula/Documents/Projects/ZB/zdravy-projekt/test/jedalnicky/Week 222026_Klasik.docx"
        )
        if not fixture.exists():
            pytest.skip("test fixture not available in container")
        entries = parse_docx(str(fixture), WEEK_START)
        assert len(entries) > 10
        assert all(e.category in ("breakfast", "lunch", "snack") for e in entries)
        assert all(e.date >= WEEK_START for e in entries)
        assert all(e.date <= WEEK_START + datetime.timedelta(days=4) for e in entries)

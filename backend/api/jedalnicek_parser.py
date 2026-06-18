"""
Parser for weekly meal plan DOCX files.

Each file represents one diet/menu variant for a week.
Filename pattern: "Week WWYYYY_<DietTag>.docx"
  - "Klasik" (and Klasik_* variants) → diet=NULL (standard menu)
  - Other tags → matched against Diet.docx_tag, then Diet.name

File structure:
  - Day headers: PONDELOK / UTOROK / STREDA / ŠTVRTOK / PIATOK
  - Category labels: "Raňajky-desiata:" / "Obed:" / "Olovrant:"
  - Item lines: optional "B:" / "C:" variant prefix, weight spec, then meal name
"""

from __future__ import annotations

import datetime
import logging
import re
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import IO, Union

logger = logging.getLogger(__name__)

_DAY_OFFSETS: dict[str, int] = {
    "PONDELOK": 0,
    "UTOROK": 1,
    "STREDA": 2,
    "ŠTVRTOK": 3,
    "PIATOK": 4,
}

_CATEGORY_PREFIXES: dict[str, str] = {
    "raňajky": "breakfast",
    "obed": "lunch",
    "olovrant": "snack",
}

# Matches leading weight like "120g", "200ml", "120g (110g/10g)"
_WEIGHT_RE = re.compile(
    r"^(\d+(?:[.,]\d+)?)\s*(?:g|ml)\b(?:\s*\([^)]*\))?\s*",
    re.IGNORECASE,
)

_STANDARD_TAGS = {"klasik", "classic"}

_METADATA_KEYWORDS = ("zostavili:", "alergény:", "nápoj týždňa:", "nápoj tyzdna:")


@dataclass
class ParsedEntry:
    date: datetime.date
    category: str  # breakfast / lunch / snack
    menu_variant: str  # "" / "A" / "B" / "C"
    name: str
    weight_grams: Decimal | None


# ── Filename helpers ──────────────────────────────────────────────────────────


def extract_diet_tag(filename: str) -> str:
    """
    Extract diet tag from filename stem.
    "Week 222026_NoGluten.docx" → "NoGluten"
    "Week 222026_Klasik_Menu B.docx" → "Klasik Menu B"
    """
    stem = Path(filename).stem
    stem = re.sub(r"^Week\s+\d+\s*[-_]\s*", "", stem, flags=re.IGNORECASE).strip()
    stem = re.sub(r"\s+", " ", stem.replace("_", " ")).strip()
    return stem


def is_standard_tag(tag: str) -> bool:
    """True when the tag maps to the default (no restriction) menu."""
    if not tag:
        return False
    return tag.lower().split()[0] in _STANDARD_TAGS


def resolve_diet(filename: str):  # -> tuple[Diet | None, str]
    """Return (Diet | None, tag).  None means standard / no restriction."""
    from .models import Diet

    tag = extract_diet_tag(filename)
    if is_standard_tag(tag):
        return None, tag

    try:
        return Diet.objects.get(docx_tag__iexact=tag), tag
    except Diet.DoesNotExist:
        pass
    try:
        diet = Diet.objects.get(name__iexact=tag)
        logger.warning(
            "Diet matched by name %r (no docx_tag set) — consider setting Diet.docx_tag",
            tag,
        )
        return diet, tag
    except Diet.DoesNotExist:
        pass

    logger.warning(
        "No Diet found for docx tag %r — storing as standard (diet=NULL)", tag
    )
    return None, tag


# ── Text helpers ──────────────────────────────────────────────────────────────


def _parse_weight(text: str) -> tuple[Decimal | None, str]:
    """Strip leading weight, return (grams, remaining_name)."""
    m = _WEIGHT_RE.match(text)
    if not m:
        return None, text.strip()
    raw = m.group(1).replace(",", ".")
    try:
        weight = Decimal(raw)
    except InvalidOperation:
        weight = None
    return weight, text[m.end() :].strip()


def _strip_allergens(name: str) -> str:
    """Remove trailing allergen number list: '...Jedlo 1, 3, 7' → '...Jedlo'."""
    cleaned = re.sub(r"(\s+\d+(?:,\s*\d+)*)\s*$", "", name).strip()
    return cleaned


def _parse_variant_prefix(text: str) -> tuple[str, str]:
    """
    'B: 275g Jedlo' → ('B', '275g Jedlo')
    '275g Jedlo'    → ('',  '275g Jedlo')
    """
    m = re.match(r"^([A-Z])\s*:\s*", text.strip())
    if m:
        return m.group(1), text.strip()[m.end() :]
    return "", text.strip()


def _is_item_start(text: str) -> bool:
    """True if the line starts a new food item (has weight spec or variant prefix)."""
    if re.match(r"^[A-Z]\s*:", text.strip()):
        return True
    return bool(_WEIGHT_RE.match(text.strip()))


def _is_metadata(text: str) -> bool:
    low = text.lower()
    return any(k in low for k in _METADATA_KEYWORDS)


# ── Main parser ───────────────────────────────────────────────────────────────


def parse_docx(
    file: Union[str, IO[bytes]],
    week_start: datetime.date,
) -> list[ParsedEntry]:
    """
    Parse a jedálniček DOCX file and return structured ParsedEntry objects.
    `week_start` must be the Monday of the covered week.
    """
    import docx  # python-docx

    doc = docx.Document(file)
    entries: list[ParsedEntry] = []

    current_date: datetime.date | None = None
    current_category: str | None = None
    # Buffer for multi-line items
    buf_variant: str = ""
    buf_parts: list[str] = []

    def flush() -> None:
        nonlocal buf_variant, buf_parts
        if not buf_parts or current_date is None or current_category is None:
            buf_parts = []
            buf_variant = ""
            return
        full = " ".join(buf_parts)
        weight, name = _parse_weight(full)
        name = _strip_allergens(name)
        if name:
            entries.append(
                ParsedEntry(
                    date=current_date,
                    category=current_category,
                    menu_variant=buf_variant,
                    name=name,
                    weight_grams=weight,
                )
            )
        buf_parts = []
        buf_variant = ""

    for para in doc.paragraphs:
        raw = para.text.strip()
        if not raw or _is_metadata(raw):
            flush()
            continue

        # Day header?
        upper = raw.upper().rstrip(" :")
        day_offset = next(
            (off for day, off in _DAY_OFFSETS.items() if upper == day), None
        )
        if day_offset is not None:
            flush()
            current_date = week_start + datetime.timedelta(days=day_offset)
            current_category = None
            continue

        # Category label?
        raw_lower = raw.lower()
        matched_cat = next(
            (
                cat
                for pfx, cat in _CATEGORY_PREFIXES.items()
                if raw_lower.startswith(pfx)
            ),
            None,
        )
        if matched_cat is not None:
            flush()
            current_category = matched_cat
            # Inline item after colon: "Obed: 200ml Polievka"
            after_colon = re.sub(r"^[^:]+:\s*", "", raw).strip()
            if after_colon and current_date is not None:
                variant, rest = _parse_variant_prefix(after_colon)
                weight, name = _parse_weight(rest)
                name = _strip_allergens(name)
                if name:
                    entries.append(
                        ParsedEntry(
                            date=current_date,
                            category=current_category,
                            menu_variant=variant,
                            name=name,
                            weight_grams=weight,
                        )
                    )
            continue

        if current_date is None or current_category is None:
            continue

        variant, rest = _parse_variant_prefix(raw)
        if variant:
            flush()
            buf_variant = variant
            buf_parts = [rest]
        elif _is_item_start(raw):
            flush()
            buf_variant = ""
            buf_parts = [raw]
        else:
            # Continuation line (e.g. word-wrapped item)
            if buf_parts:
                buf_parts.append(raw)
            else:
                # Plain item with no weight (e.g. "Zelené jablko", "Mrkva")
                buf_parts = [raw]

    flush()
    return entries

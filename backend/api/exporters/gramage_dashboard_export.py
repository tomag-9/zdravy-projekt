"""Shared presentation model for dashboard PDF and XLSX exports.

The browser dashboard, PDF and workbook intentionally use the same labels,
meal palette, row order and summary calculations.  Keep presentation-only
logic here so the two downloadable formats cannot silently drift apart.
"""

from __future__ import annotations

from decimal import Decimal, InvalidOperation

BRAND = {
    "cream": "FBF7E4",
    "cream_soft": "F5F1CD",
    "cream_warm": "FEF9F1",
    "green_900": "173505",
    "green_800": "2A3315",
    "green_700": "425422",
    "green_600": "72884B",
    "green_500": "7C9853",
    "peach_400": "F7D09A",
    "honey_400": "FFC95C",
    "mustard_700": "C48116",
    "line": "D5DDCF",
    "white": "FFFFFF",
}

# Exact solid header colours from admin.css, plus print-friendly versions of
# the translucent dashboard cell backgrounds.
MEAL_PALETTE = {
    "break": ("A66A0F", "BD7C19", "F9F0E2"),
    "soup": ("007784", "048C9B", "E8F5F6"),
    "menuA": ("364718", "4C6026", "EEF1E9"),
    "menuB": ("D2551A", "E56A2A", "FDF0E9"),
    "menuC": ("A81F41", "C12E52", "F9EBEF"),
    "menuV": ("5F7639", "74893F", "F0F4EA"),
    "snack": ("7E3A55", "964A69", "F6EDF1"),
}


def meal_hue(meal: str, variant: str | None) -> str:
    """Mirror ``mealHue`` in AdminDashboard.tsx."""
    if meal == "breakfast_snack":
        return "break"
    if meal == "soup":
        return "soup"
    if meal == "main_course":
        normalized = (variant or "A").upper()
        return f"menu{normalized}" if normalized in {"B", "C", "V"} else "menuA"
    return "snack"


def group_label(group: dict) -> str:
    """Mirror ``colGroupDisplayLabel`` in AdminDashboard.tsx."""
    variant = str(group.get("variant") or "")
    if group.get("meal") != "main_course" or not variant:
        return str(group.get("label") or "")
    label = f"Menu {variant.upper()}"
    diet_name = group.get("diet_name")
    return f"{label} - {diet_name}" if diet_name else label


def component_subtitle(component: dict) -> str:
    if component.get("is_exception"):
        return f"podľa vekovej skupiny ({component.get('unit') or 'ks'})"
    raw = component.get("base_grams")
    try:
        value = Decimal(str(raw))
        base = (
            str(int(value))
            if value == value.to_integral_value()
            else format(value.normalize(), "f")
        )
    except (InvalidOperation, TypeError, ValueError):
        base = str(raw or "")
    return f"{base}{component.get('unit') or 'g'}"


def numeric_value(raw: object, component: dict) -> int | float | None:
    """Return the same visible value as the dashboard, but as an office number."""
    try:
        value = Decimal(str(raw))
    except (InvalidOperation, TypeError, ValueError):
        return None
    if value <= 0:
        return None
    if component.get("is_exception") or component.get("unit") == "ks":
        return int(value) if value == value.to_integral_value() else float(value)
    return int(value.quantize(Decimal("1")))


def empty_grid(col_groups: list[dict]) -> list[list[Decimal]]:
    return [[Decimal("0") for _ in group.get("components", [])] for group in col_groups]


def add_grid(target: list[list[Decimal]], source: list, group_index: int) -> None:
    if group_index >= len(source):
        return
    for component_index, raw in enumerate(source[group_index] or []):
        if component_index >= len(target[group_index]):
            break
        try:
            target[group_index][component_index] += Decimal(str(raw or "0"))
        except (InvalidOperation, TypeError, ValueError):
            continue


def portion_summary(data: dict, rows: list[dict] | None = None) -> list[dict]:
    """Build the per-meal portion band rendered by the dashboard.

    ``rows=None`` creates the global footer from count_summary and totals;
    passing rows creates the summary shown after each delivery block.
    """
    col_groups = data.get("col_groups") or []
    if rows is None:
        counts: dict[tuple[str, str, str], object] = {}
        for section in data.get("count_summary") or []:
            key = (
                str(section.get("meal") or ""),
                str(section.get("variant") or ""),
                str(section.get("diet_name") or ""),
            )
            counts[key] = sum(
                (row.get("count") or 0)
                for row in [
                    *(section.get("standard") or []),
                    *(section.get("diets") or []),
                ]
            )
        totals = data.get("totals") or []
        return [
            {
                "label": group_label(group),
                "count": counts.get(
                    (
                        str(group.get("meal") or ""),
                        str(group.get("variant") or ""),
                        str(group.get("diet_name") or ""),
                    ),
                    0,
                ),
                "col_grams": [
                    (
                        (totals[index] if index < len(totals) else [])
                        if index == group_index
                        else []
                    )
                    for index in range(len(col_groups))
                ],
            }
            for group_index, group in enumerate(col_groups)
        ]

    summary = [
        {"label": group_label(group), "count": 0, "col_grams": empty_grid(col_groups)}
        for group in col_groups
    ]
    for row in rows:
        for sub_row in row.get("sub_rows") or []:
            own_index = None
            for group_index, group in enumerate(col_groups):
                expected_diet = (
                    sub_row.get("label") if sub_row.get("type") == "diet" else ""
                )
                if (
                    group.get("meal") == sub_row.get("meal")
                    and str(group.get("variant") or "")
                    == str(sub_row.get("variant") or "")
                    and str(group.get("diet_name") or "") == str(expected_diet or "")
                ):
                    own_index = group_index
                    break
            if own_index is None:
                continue
            sub_row_grams = sub_row.get("col_grams") or []
            # Menu riadok nesie aj gramáž polievky, ktorá patrí do vlastnej
            # stĺpcovej skupiny (viď _merge_soup_into_main_course) — do súhrnu
            # preto ide každá skupina, v ktorej riadok reálne má čísla.
            for group_index, grams in enumerate(sub_row_grams):
                if group_index != own_index and not grams:
                    continue
                summary[group_index]["count"] += sub_row.get("count") or 0
                add_grid(summary[group_index]["col_grams"], sub_row_grams, group_index)
    return summary


def diet_color(data: dict, row: dict) -> str:
    value = row.get("diet_color") or row.get("color")
    if not value:
        value = (data.get("diet_colors") or {}).get(row.get("name") or row.get("label"))
    normalized = str(value or "FDE68A").lstrip("#").upper()
    return normalized if len(normalized) == 6 else "FDE68A"


def blend_with_white(hex_color: str, opacity: float = 0.14) -> str:
    """Convert a CSS translucent row colour to an opaque print colour."""
    value = hex_color.lstrip("#")
    if len(value) != 6:
        value = "FDE68A"
    rgb = [int(value[index : index + 2], 16) for index in (0, 2, 4)]
    mixed = [round(255 * (1 - opacity) + channel * opacity) for channel in rgb]
    return "".join(f"{channel:02X}" for channel in mixed)


def readable_text_color(hex_color: str) -> str:
    """Darken a diet colour until it is legible as text on a light background.

    Diet colours were picked as row *fills*, where a pale yellow reads fine.
    Since diets are now distinguished by font colour instead, the pale end of
    the palette has to be pulled down or it disappears on the cream table.
    """
    value = hex_color.lstrip("#").upper()
    if len(value) != 6:
        value = "FDE68A"
    rgb = [int(value[index : index + 2], 16) for index in (0, 2, 4)]

    def luminance(channels):
        r, g, b = (channel / 255 for channel in channels)
        return 0.2126 * r + 0.7152 * g + 0.0722 * b

    # Multiplicative darkening keeps the hue; ~10 steps is plenty to cross 0.40.
    for _ in range(10):
        if luminance(rgb) <= 0.40:
            break
        rgb = [round(channel * 0.85) for channel in rgb]
    return "".join(f"{channel:02X}" for channel in rgb)

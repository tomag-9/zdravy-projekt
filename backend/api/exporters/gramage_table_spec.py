"""Jediný zdroj pravdy o tom, ako vyzerá tabuľka „Gramáž jedál".

Tabuľka sa vykresľuje na dvoch miestach — na obrazovke (React) a v PDF (HTML →
WeasyPrint). Kým každé z nich rozhodovalo samo, výstupy sa rozišli v desiatkach
detailov (stĺpec navyše, `0` namiesto `—`, iné poradie poznámok, iné farby pásov).

Tento modul preto robí **všetky** rozhodnutia: ktoré riadky existujú, v akom
poradí, s akým textom, číslom a CSS triedou. Renderery už len prekladajú spec do
značiek a nemajú čo rozhodnúť, takže sa nemajú ako rozísť.

Referenciou je obrazovka — spec reprodukuje jej správanie, nie správanie starých
exportérov.
"""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal, InvalidOperation

from .gramage_dashboard_export import (
    component_subtitle,
    diet_color,
    group_label,
    meal_hue,
    portion_summary,
    readable_text_color,
)

EMPTY = "—"


def _decimal_text(value: Decimal) -> str:
    """Číslo do bunky: bez chvostových núl, s desatinnou čiarkou.

    Zámerne bez `normalize()` — tá zo `2000.00` spraví `2E+3`, čo je v tabuľke
    nezmysel (rovnaká pasca ako v `_tidy_count`). Celé hodnoty preto idú cez
    `int`, zvyšku sa chvostové nuly odrežú ručne.
    """
    rounded = value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    if rounded == rounded.to_integral_value():
        return str(int(rounded))
    return format(rounded, "f").rstrip("0").rstrip(".").replace(".", ",")


def format_gram(raw: object) -> str | None:
    """Gramáž do bunky — alebo None, keď sa má zobraziť „—".

    Desatiny sa zobrazujú (`2000,5`), lebo kuchyňa ich potrebuje vidieť; celé
    hodnoty zostávajú bez chvosta (`2000`). Nula a menej sa nezobrazuje vôbec —
    tabuľka má byť riedka, nie stena núl.
    """
    if raw is None or raw == "":
        return None
    try:
        value = Decimal(str(raw))
    except (InvalidOperation, TypeError, ValueError):
        return None
    if value <= 0:
        return None
    return _decimal_text(value)


def format_count(count: object) -> str:
    """Počet porcií do odznaku; „—" keď je nulový."""
    try:
        value = Decimal(str(count or 0))
    except (InvalidOperation, TypeError, ValueError):
        return EMPTY
    if value <= 0:
        return EMPTY
    return _decimal_text(value)


# Čo sa varí k obedu. Polievka patrí k menu (je z tej istej hlavy), raňajky
# a olovrant sú samostatné jedlá.
LUNCH_MEALS = {"soup", "main_course"}


def _filter_col_groups(col_groups: list[dict], variants: list[str] | None) -> list[int]:
    """Indexy stĺpcových skupín, ktoré sa majú vykresliť.

    `variants=None` znamená kompletnú tabuľku. Vybrať variant znamená vytlačiť
    podklad pre obed — teda polievku a zvolené menu, bez raňajok a olovrantu;
    tie sa pripravujú inde a na takomto výtlačku by len zavadzali.
    """
    if not variants:
        return list(range(len(col_groups)))
    wanted = {str(v).upper() for v in variants}
    keep = []
    for index, group in enumerate(col_groups):
        meal = group.get("meal")
        if meal not in LUNCH_MEALS:
            continue
        variant = str(group.get("variant") or "").upper()
        if meal == "main_course" and variant and variant not in wanted:
            continue
        keep.append(index)
    return keep


def _gram_cells(col_grams: list, groups: list[dict], hues: list[str]) -> list[dict]:
    """Bunky s gramážou pre jeden riadok, vrátane oddeľovača medzi jedlami."""
    cells = []
    for position, (group_index, group) in enumerate(groups):
        grams = []
        if group_index < len(col_grams):
            grams = col_grams[group_index] or []
        for component_index, component in enumerate(group.get("components") or []):
            raw = grams[component_index] if component_index < len(grams) else None
            text = format_gram(raw)
            separator = " meal-sep" if position > 0 and component_index == 0 else ""
            if text is None:
                cells.append({"text": EMPTY, "css": f"cell-empty{separator}"})
            else:
                cells.append(
                    {
                        "text": text,
                        "css": f"cell-num mh-{hues[position]}-cell{separator}",
                    }
                )
    return cells


def _label_cell(text: str, count: object, css: str = "lbl", **extra) -> dict:
    cell = {"text": text, "css": css, "count": format_count(count)}
    cell.update(extra)
    return cell


def build_table_spec(data: dict, variants: list[str] | None = None) -> dict:
    """Prevedie payload z `gramage_dashboard()` na hotový popis tabuľky."""
    all_groups = data.get("col_groups") or []
    keep = _filter_col_groups(all_groups, variants)
    groups = [(index, all_groups[index]) for index in keep]
    hues = [meal_hue(g.get("meal"), g.get("variant")) for _, g in groups]

    total_components = sum(len(g.get("components") or []) for _, g in groups)
    total_columns = 1 + total_components

    header = _build_header(groups, hues)
    rows: list[dict] = []

    blocks = data.get("blocks") or []
    if blocks:
        for block_index, block in enumerate(blocks):
            rows.append(_band("block-band", block.get("name") or "", total_columns))
            for route in block.get("routes") or []:
                route_rows = route.get("rows") or []
                # Prázdne trasy sa nevykresľujú — obrazovka ich tiež preskakuje.
                if not route_rows:
                    continue
                rows.append(_route_row(route, total_columns))
                for client_row in route_rows:
                    rows.extend(
                        _client_rows(client_row, data, groups, hues, total_columns)
                    )
            block_rows = [
                r
                for route in block.get("routes") or []
                for r in route.get("rows") or []
            ]
            rows.extend(
                _portion_summary_rows(
                    f"Súhrn porcií {block_index + 1}",
                    portion_summary(data, block_rows),
                    keep,
                    groups,
                    hues,
                    total_columns,
                )
            )
        unassigned = data.get("unassigned_rows") or []
        if unassigned:
            rows.append(_band("block-band", "Nepriradené prevádzky", total_columns))
            for client_row in unassigned:
                rows.extend(_client_rows(client_row, data, groups, hues, total_columns))
    else:
        for client_row in data.get("rows") or []:
            rows.extend(_client_rows(client_row, data, groups, hues, total_columns))

    footer = _portion_summary_rows(
        "Porcie celkom",
        portion_summary(data),
        keep,
        groups,
        hues,
        total_columns,
    )
    footer.append(_totals_row(data, keep, groups, hues))

    return {
        "date": data.get("date"),
        "total_columns": total_columns,
        "header": header,
        "rows": rows,
        "footer": footer,
    }


def _build_header(groups: list[dict], hues: list[str]) -> dict:
    group_cells = []
    component_cells = []
    for position, (_, group) in enumerate(groups):
        components = group.get("components") or []
        separator = " meal-sep" if position > 0 else ""
        group_cells.append(
            {
                "text": group_label(group),
                "sub": group.get("template_name") or "",
                "css": f"grp mh-{hues[position]}-1{separator}",
                "colspan": len(components),
            }
        )
        for component_index, component in enumerate(components):
            component_separator = (
                " meal-sep" if position > 0 and component_index == 0 else ""
            )
            component_cells.append(
                {
                    "text": component.get("label") or "",
                    "sub": component_subtitle(component),
                    "css": f"comp mh-{hues[position]}-2{component_separator}",
                }
            )
    return {
        "corner": "Prevádzka / Riadok",
        "groups": group_cells,
        "components": component_cells,
    }


def _band(kind: str, text: str, total_columns: int) -> dict:
    return {
        "kind": kind,
        "css": "band",
        "cells": [{"text": text, "colspan": total_columns}],
    }


def _route_row(route: dict, total_columns: int) -> dict:
    meta = [
        (route.get("departure_time") or "")[:5],
        route.get("driver") or "",
    ]
    return {
        "kind": "route",
        "css": "route-row",
        "cells": [
            {
                "text": route.get("name") or "",
                "sub": " / ".join(part for part in meta if part),
                "colspan": total_columns,
            }
        ],
    }


def _client_rows(
    row: dict, data: dict, groups: list[dict], hues: list[str], total_columns: int
) -> list[dict]:
    """Klientsky pás, jeho podriadky, poznámky a medzisúčty — v poradí obrazovky."""
    key = str(row.get("row_key") or row.get("client_id") or row.get("client") or "")
    diet_total = sum(
        (diet.get("count") or 0) for diet in row.get("diet_summary_rows") or []
    )
    meta = f"štandard {row.get('standard_total_count', 0)}"
    if diet_total:
        meta += f", diéty {diet_total}"

    out: list[dict] = [
        {
            "kind": "client",
            "css": "client-row",
            "group_id": key,
            "cells": [
                {
                    "text": row.get("client") or "",
                    "meta": meta,
                    "meta_right": f"spolu porcií {row.get('total_count', 0)}",
                    "colspan": total_columns,
                }
            ],
        }
    ]

    for sub_row in row.get("sub_rows") or []:
        gram_cells = _gram_cells(sub_row.get("col_grams") or [], groups, hues)
        # Riadok bez jediného čísla vo viditeľných stĺpcoch nemá čo povedať —
        # vzniká pri filtri variantov (olovrant a raňajky pri tlači obeda).
        if not any("cell-num" in cell["css"] for cell in gram_cells):
            continue
        is_diet = sub_row.get("type") == "diet"
        label = sub_row.get("label") or ""
        cell = _label_cell(
            f"↳ {label}" if is_diet else label,
            sub_row.get("count"),
        )
        if is_diet:
            cell["swatch"] = {
                "color": f"#{diet_color(data, sub_row)}",
                "base_colors": sub_row.get("diet_base_colors") or [],
            }
        out.append(
            {
                "kind": "sub-row",
                "css": "sub-row diet" if is_diet else "sub-row",
                "group_id": key,
                "collapsible": True,
                "color": (
                    f"#{readable_text_color(diet_color(data, sub_row))}"
                    if is_diet
                    else None
                ),
                "cells": [cell] + gram_cells,
            }
        )

    # Poznámky idú PRED medzisúčty — tak ich má obrazovka.
    for kind, label, note in (
        ("note-admin", "Poznámka k objednávke:", row.get("admin_order_note")),
        ("note-delivery", "Rozvoz:", row.get("delivery_note")),
    ):
        if note and str(note).strip():
            out.append(
                {
                    "kind": kind,
                    "css": kind,
                    "group_id": key,
                    "collapsible": True,
                    "cells": [
                        {
                            "text": str(note).strip(),
                            "label": label,
                            "colspan": total_columns,
                        }
                    ],
                }
            )

    out.append(
        {
            "kind": "summary-std",
            "css": "summ-std",
            "cells": [_label_cell("Súčet bez diét", row.get("standard_total_count"))]
            + _gram_cells(row.get("standard_col_grams") or [], groups, hues),
        }
    )
    for diet in row.get("diet_summary_rows") or []:
        hex_color = diet_color(data, diet)
        out.append(
            {
                "kind": "summary-diet",
                "css": "summ-diet",
                "color": f"#{readable_text_color(hex_color)}",
                "cells": [
                    _label_cell(
                        diet.get("name") or "",
                        diet.get("count"),
                        swatch={
                            "color": f"#{hex_color}",
                            "base_colors": diet.get("base_colors") or [],
                        },
                    )
                ]
                + _gram_cells(diet.get("col_grams") or [], groups, hues),
            }
        )
    return out


def _portion_summary_rows(
    title: str,
    summary: list[dict],
    keep: list[int],
    groups: list[dict],
    hues: list[str],
    total_columns: int,
) -> list[dict]:
    rows = [_band("portion-band", title, total_columns)]
    rows[0]["css"] = "portion-summary-band"
    for index, item in enumerate(summary):
        # Súhrn má jednu položku na stĺpcovú skupinu; odfiltrované varianty
        # (bod 7 — tlač len Menu A) sa nesmú objaviť ani tu.
        if index not in keep:
            continue
        rows.append(
            {
                "kind": "portion-row",
                "css": "portion-summary-row",
                "cells": [_label_cell(item.get("label") or "", item.get("count"))]
                + _gram_cells(item.get("col_grams") or [], groups, hues),
            }
        )
    return rows


def _totals_row(
    data: dict, keep: list[int], groups: list[dict], hues: list[str]
) -> dict:
    totals = data.get("totals") or []
    cells = []
    for position, (group_index, group) in enumerate(groups):
        values = totals[group_index] if group_index < len(totals) else []
        for component_index, component in enumerate(group.get("components") or []):
            raw = values[component_index] if component_index < len(values) else None
            text = format_gram(raw)
            separator = " meal-sep" if position > 0 and component_index == 0 else ""
            cells.append({"text": text or EMPTY, "css": separator.strip()})
    return {
        "kind": "total",
        "css": "total",
        "cells": [{"text": "CELKOM (g / ml)", "css": "corner"}] + cells,
    }

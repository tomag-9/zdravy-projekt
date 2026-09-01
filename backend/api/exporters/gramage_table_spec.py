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
    blend_with_white,
    component_subtitle,
    diet_color,
    group_label,
    meal_hue,
    portion_summary,
    readable_text_color,
)

EMPTY = "—"

# Podfarbenie riadku, keď je diéta zložená z 3+ diét naraz (#536) — v takom
# prípade podfarbenie podľa jednej konkrétnej zložky pôsobilo náhodne, tak má
# pevnú, na kombinácii nezávislú farbu. Text riadku ostáva farbou prvej diéty.
COMBO_DIET_FALLBACK_BACKGROUND = "F97316"

# Prázdny stĺpec na ručné poznámky pri tlači (požiadavka prevádzky 17. 8. 2026).
NOTE_COLUMN_LABEL = "Poznámka"

# Ktoré stĺpcové skupiny patria pod ktoré jedlo. Kuchyňa čítala tabuľku ako jeden
# pás stĺpcov a hľadala, kde končia raňajky a začína obed — hlavička preto nesie
# ešte jednu, nadradenú úroveň s názvom jedla.
_MEAL_BANDS: dict[str, str] = {
    "breakfast_snack": "Raňajky / desiata",
    "soup": "Obed",
    "main_course": "Obed",
    "afternoon_snack": "Olovrant",
}
_MEAL_BAND_CSS: dict[str, str] = {
    "Raňajky / desiata": "mb-break",
    "Obed": "mb-lunch",
    "Olovrant": "mb-snack",
}


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


def _filter_col_groups(col_groups: list[dict], sections: list[str] | None) -> list[int]:
    """Indexy stĺpcových skupín, ktoré sa majú vykresliť.

    Sekcia je kľúč stĺpcovej skupiny (`breakfast_snack`, `soup`,
    `main_course_A`, `afternoon_snack` …). `sections=None` znamená kompletnú
    tabuľku; inak sa vykreslí presne to, čo si používateľ vybral — polievka
    ani menu sa navzájom nedoťahujú, každý prepínač platí sám za seba.

    Neznáme kľúče sa ignorujú a prázdny výber padne späť na kompletnú tabuľku,
    aby sa preklep v URL neprejavil prázdnou stranou.
    """
    if not sections:
        return list(range(len(col_groups)))
    wanted = {str(section) for section in sections}
    keep = [
        index
        for index, group in enumerate(col_groups)
        if str(group.get("key") or "") in wanted
    ]
    return keep or list(range(len(col_groups)))


def _note_cell() -> dict:
    """Prázdna bunka posledného stĺpca — miesto na ručnú poznámku vo vytlačenej
    tabuľke. Nesie `meal-sep`, rovnako ako hlavička nad ňou (`grp-note`/`comp-note`)
    — inak by oddeľovacia čiara medzi posledným jedlom a Poznámkou chýbala, hoci
    medzi všetkými ostatnými jedlami je. Vracia sa nová inštancia, nie zdieľaný
    dict, nech si ju renderer nemôže omylom premutovať naprieč riadkami."""
    return {"text": "", "css": "cell-note meal-sep"}


def _gram_cells(
    col_grams: list,
    groups: list[dict],
    hues: list[str],
    snack_with_lunch: bool = False,
) -> list[dict]:
    """Bunky s gramážou pre jeden riadok, vrátane oddeľovača medzi jedlami.

    `snack_with_lunch` je `Prevadzka.olovrant_s_obedom` prevzatý z riadku
    klienta — olovrant tejto prevádzky nejde s popoludňajším rozvozom ako
    ostatné, takže namiesto bežného tónovania „Olovrant" dostane vlastnú
    (žltú) farbu, nech ho kuchyňa naloží spolu s obedom.
    """
    cells = []
    for position, (group_index, group) in enumerate(groups):
        grams = []
        if group_index < len(col_grams):
            grams = col_grams[group_index] or []
        hue = hues[position]
        if snack_with_lunch and group.get("meal") == "afternoon_snack":
            hue = "snacklunch"
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
                        "css": f"cell-num mh-{hue}-cell{separator}",
                    }
                )
    cells.append(_note_cell())
    return cells


def _as_decimal(value: object) -> Decimal:
    try:
        return Decimal(str(value or 0))
    except (InvalidOperation, TypeError, ValueError):
        return Decimal("0")


def _sum_counts(sub_rows) -> Decimal:
    return sum((_as_decimal(sr.get("count")) for sr in sub_rows), Decimal("0"))


def _label_cell(text: str, count: object, css: str = "lbl", **extra) -> dict:
    cell = {"text": text, "css": css, "count": format_count(count)}
    cell.update(extra)
    return cell


def _diet_text_and_background(data: dict, row_like: dict) -> tuple[str, str]:
    """Farba textu a podfarbenie riadku diéty (#536).

    Jedna diéta: obe farbou tej diéty. Kombinácia dvoch: text hlavnej
    (prvej), podfarbenie sekundárnej. Kombinácia troch a viac: text prvej,
    podfarbenie pevnou oranžovou — farba jednej z troch a viac zložiek by
    pôsobila náhodne, nič konkrétne by neoznačovala.
    """
    base_colors = [
        str(color).lstrip("#").upper()
        for color in (
            row_like.get("diet_base_colors") or row_like.get("base_colors") or []
        )
        if color
    ]
    if len(base_colors) >= 3:
        return base_colors[0], COMBO_DIET_FALLBACK_BACKGROUND
    if len(base_colors) == 2:
        return base_colors[0], base_colors[1]
    own = diet_color(data, row_like)
    return own, own


def _filter_vydaje(all_vydaje: list[dict], selected: list[str] | None) -> list[int]:
    """Indexy výdajných bodov, ktoré sa majú vykresliť.

    Výdaj sa vyberá kľúčom (`A`, `B` …), nie názvom — názov je len popiska a môže
    sa zmeniť. Prázdny výber aj neznámy kľúč padnú späť na celú tabuľku (rovnako
    ako filter sekcií), aby preklep v URL nevrátil prázdnu stranu.
    """
    if not selected:
        return list(range(len(all_vydaje)))
    wanted = {str(key) for key in selected}
    keep = [
        index
        for index, vydaj in enumerate(all_vydaje)
        if str(vydaj.get("key") or "") in wanted
    ]
    return keep or list(range(len(all_vydaje)))


def _totals_from_summary(summary: list[dict]) -> list[list]:
    """Riadok CELKOM z už spočítaného súhrnu porcií.

    `data["totals"]` platí pre celý deň. Keď sa tlačí len jeden výdajný bod, sedeli
    by v pätke gramáže druhého bodu — preto sa pri filtrovaní celkom počíta z tých
    istých riadkov, z ktorých sa počítal súhrn (`portion_summary(data, rows)`
    plní gramáž do stĺpca vlastnej skupiny, viď `portion_summary`).
    """
    return [
        (
            (item.get("col_grams") or [])[index]
            if index < len(item.get("col_grams") or [])
            else []
        )
        for index, item in enumerate(summary)
    ]


def build_table_spec(
    data: dict,
    sections: list[str] | None = None,
    vydaje: list[str] | None = None,
    include_summary_rows: bool = True,
) -> dict:
    """Prevedie payload z `gramage_dashboard()` na hotový popis tabuľky.

    `include_summary_rows=False` vynechá per-klientske "Súčet bez diét" a
    diétne súhrnné riadky (`summary-std`/`summary-diet`). Na obrazovke majú
    zmysel len pri zbalenom klientovi (#510) — v statickom PDF exporte sú
    sub-riadky vždy "rozbalené" a súhrny by len duplikovali čísla o riadok
    vyššie, takže PDF volajúci túto funkciu volajú s `False`.
    """
    all_groups = data.get("col_groups") or []
    keep = _filter_col_groups(all_groups, sections)
    groups = [(index, all_groups[index]) for index in keep]
    hues = [meal_hue(g.get("meal"), g.get("variant")) for _, g in groups]

    total_components = sum(len(g.get("components") or []) for _, g in groups)
    # 1 = názov prevádzky/riadku, +1 = prázdny stĺpec „Poznámka" na konci.
    total_columns = 1 + total_components + 1

    header = _build_header(groups, hues)
    rows: list[dict] = []
    # Sleduje presne tie client_row dicty, ktoré sa naozaj vykreslili (rešpektuje
    # filter podľa výdajného bodu/nepriradených), aby sa z nich dal na konci
    # spočítať fakturačný súčet „MŠ porcie" (#4 — billing_portion_coefficients).
    all_client_rows: list[dict] = []

    all_vydaje = data.get("vydaje") or []
    keep_vydaje = _filter_vydaje(all_vydaje, vydaje)
    shown_vydaje = [all_vydaje[index] for index in keep_vydaje]
    # Filter na konkrétny výdajný bod je „vytlač túto tabuľku" — nepriradené
    # prevádzky doň nepatria a v celej tabuľke sa aj tak ukážu.
    filtered = len(shown_vydaje) != len(all_vydaje)
    if shown_vydaje:
        # Klastre 1 a 2 (spravidla Vydaj A a B) chcú navyše spoločný medzisúčet
        # — kým klaster 3 (British School, #531) je nová, samostatná trasa.
        # Viazané na POZÍCIU v `shown_vydaje`, nie na Vydaj.key: pri filtrovanej
        # tlači je poradie stále "prvý zobrazený, druhý zobrazený", takže sa to
        # správa rozumne aj keď sa niekedy vynechá stredný klaster z výberu.
        first_two_rows: list[dict] = []
        for position, vydaj in enumerate(shown_vydaje):
            # Výdajný bod je najvyššia úroveň tabuľky — v tlači ide každý na
            # vlastný list, nech si ho jeho obsluha vezme celý.
            rows.append(
                _band(
                    "block-band",
                    vydaj.get("name") or "",
                    total_columns,
                    css="band block-band" + (" page-break" if position else ""),
                )
            )
            for route in vydaj.get("routes") or []:
                route_rows = route.get("rows") or []
                # Prázdne trasy sa nevykresľujú — obrazovka ich tiež preskakuje.
                if not route_rows:
                    continue
                rows.append(_route_row(route, total_columns))
                for client_row in route_rows:
                    all_client_rows.append(client_row)
                    rows.extend(
                        _client_rows(
                            client_row,
                            data,
                            groups,
                            hues,
                            total_columns,
                            include_summary_rows,
                        )
                    )
            vydaj_rows = [
                r
                for route in vydaj.get("routes") or []
                for r in route.get("rows") or []
            ]
            if position < 2:
                first_two_rows.extend(vydaj_rows)
            rows.extend(
                _portion_summary_rows(
                    f"Sumár {position + 1}",
                    portion_summary(data, vydaj_rows),
                    keep,
                    groups,
                    hues,
                    total_columns,
                )
            )
            # Presne 2 zobrazené klastre: "Sumár 1 a 2" by bol identický so
            # "Sumár dokopy" — zbytočná duplicita pre bežný prípad (Vydaj A/B
            # bez tretieho klastra). Zmysel má, až keď je aj tretí (British
            # School), voči ktorému sa medzisúčet prvých dvoch odlišuje.
            if position == 1 and len(shown_vydaje) > 2:
                rows.extend(
                    _portion_summary_rows(
                        "Sumár 1 a 2",
                        portion_summary(data, first_two_rows),
                        keep,
                        groups,
                        hues,
                        total_columns,
                    )
                )
        unassigned = [] if filtered else (data.get("unassigned_rows") or [])
        if unassigned:
            rows.append(
                _band(
                    "block-band",
                    "Nepriradené prevádzky",
                    total_columns,
                    css="band block-band page-break",
                )
            )
            for client_row in unassigned:
                all_client_rows.append(client_row)
                rows.extend(
                    _client_rows(
                        client_row,
                        data,
                        groups,
                        hues,
                        total_columns,
                        include_summary_rows,
                    )
                )
    else:
        for client_row in data.get("rows") or []:
            all_client_rows.append(client_row)
            rows.extend(
                _client_rows(
                    client_row, data, groups, hues, total_columns, include_summary_rows
                )
            )

    if filtered:
        visible_rows = [
            row
            for vydaj in shown_vydaje
            for route in vydaj.get("routes") or []
            for row in route.get("rows") or []
        ]
        footer_summary = portion_summary(data, visible_rows)
        footer_totals = _totals_from_summary(footer_summary)
    else:
        footer_summary = portion_summary(data)
        footer_totals = data.get("totals") or []

    footer = _portion_summary_rows(
        "Sumár dokopy",
        footer_summary,
        keep,
        groups,
        hues,
        total_columns,
    )
    footer.append(_totals_row(footer_totals, keep, groups, hues))
    # #4 — `Prevadzka.billing_portion_coefficients` už váži počty per riadok
    # (`_client_rows` sčítava `sub_row["count"]`, ktoré je v `MealPlanService`
    # `_billed_count`), takže `total_count` na klientovi je fakturačný
    # ekvivalent porcií. Tu sa len sčíta naprieč zobrazenými prevádzkami —
    # bez vlastného koeficientu (default 1.0) sa nič neprepočítava.
    ms_porcie_total = sum(
        (_as_decimal(r.get("total_count")) for r in all_client_rows), Decimal("0")
    )
    footer.append(
        {
            "kind": "total-ms-porcie",
            "css": "total-ms-porcie",
            "cells": [
                {
                    "label": "Spolu prepočítané na MŠ porcie",
                    "text": format_count(ms_porcie_total),
                    "colspan": total_columns,
                }
            ],
        }
    )

    return {
        "date": data.get("date"),
        "total_columns": total_columns,
        "header": header,
        "rows": rows,
        "footer": footer,
        # Prepínače pre UI — zo VŠETKÝCH skupín, nie z filtrovaných, inak by
        # sa odškrtnutá sekcia už nedala zapnúť späť.
        "sections": [
            {
                "key": str(group.get("key") or ""),
                "label": group_label(group),
                "selected": index in set(keep),
            }
            for index, group in enumerate(all_groups)
        ],
        # Prepínače výdajných bodov — tiež zo VŠETKÝCH, nech sa odfiltrovaný dá
        # zapnúť späť.
        "vydaje": [
            {
                "key": str(vydaj.get("key") or ""),
                "name": str(vydaj.get("name") or ""),
                "selected": index in set(keep_vydaje),
            }
            for index, vydaj in enumerate(all_vydaje)
        ],
    }


def _meal_band_cells(groups: list[dict]) -> list[dict]:
    """Nadradený pás hlavičky: Raňajky / Obed / Olovrant.

    Susedné stĺpcové skupiny toho istého jedla sa zlejú do jednej bunky (polievka
    a všetky menu tvoria jeden „Obed"), takže hranica medzi jedlami je vidieť ako
    jeden švík, nie ako séria malých nadpisov.
    """
    cells: list[dict] = []
    for _, group in groups:
        span = len(group.get("components") or [])
        if not span:
            continue
        label = _MEAL_BANDS.get(str(group.get("meal") or ""), "Ostatné")
        if cells and cells[-1]["text"] == label:
            cells[-1]["colspan"] += span
            continue
        css = _MEAL_BAND_CSS.get(label, "mb-other")
        separator = " meal-sep" if cells else ""
        cells.append(
            {"text": label, "css": f"mealband {css}{separator}", "colspan": span}
        )
    if cells:
        cells.append({"text": "", "css": "mealband mb-note meal-sep", "colspan": 1})
    return cells


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
    group_cells.append(
        {
            "text": NOTE_COLUMN_LABEL,
            "sub": "",
            "css": "grp grp-note meal-sep",
            "colspan": 1,
        }
    )
    component_cells.append({"text": "", "sub": "", "css": "comp comp-note meal-sep"})
    return {
        "corner": "Prevádzka / Riadok",
        "meals": _meal_band_cells(groups),
        "groups": group_cells,
        "components": component_cells,
    }


def _band(kind: str, text: str, total_columns: int, css: str = "band") -> dict:
    return {
        "kind": kind,
        "css": css,
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
    row: dict,
    data: dict,
    groups: list[dict],
    hues: list[str],
    total_columns: int,
    include_summary_rows: bool = True,
) -> list[dict]:
    """Klientsky pás, jeho podriadky, poznámky a medzisúčty — v poradí obrazovky.

    `include_summary_rows=False` (PDF, #510) vynecháva medzisúčty na konci —
    v statickom exporte sú sub-riadky vždy rozbalené, takže by len duplikovali
    čísla, ktoré sú už vypísané vyššie.
    """
    key = str(row.get("row_key") or row.get("client_id") or row.get("client") or "")
    snack_with_lunch = bool(row.get("snack_with_lunch"))

    # Počty sa sčítavajú z riadkov, ktoré filter naozaj nechal — inak by na
    # obedovom hárku svietil súčet vrátane raňajok a olovrantu.
    visible: list[tuple[dict, list[dict]]] = []
    for sub_row in row.get("sub_rows") or []:
        gram_cells = _gram_cells(
            sub_row.get("col_grams") or [], groups, hues, snack_with_lunch
        )
        # Riadok bez jediného čísla vo viditeľných stĺpcoch nemá čo povedať.
        if any("cell-num" in cell["css"] for cell in gram_cells):
            visible.append((sub_row, gram_cells))

    # "zvlast"/"zvlast_gn" riadky sú komplementárna podmnožina toho istého
    # "standard"/"diet" riadku (súčet je celkový počet - viď MealPlanService,
    # kde sa "zabaliť zvlášť" počty odpočítavajú z "čistého" riadku), preto sa
    # tu rátajú spolu s ním podľa toho, či majú `diet_name`, nie podľa `type`,
    # inak by "spolu porcií" nižšie ukazovalo menej ľudí, než reálne objednalo.
    standard_count = _sum_counts(
        sub_row for sub_row, _ in visible if not sub_row.get("diet_name")
    )
    diet_counts: dict[str, Decimal] = {}
    for sub_row, _ in visible:
        if not sub_row.get("diet_name"):
            continue
        name = str(sub_row.get("diet_name") or "")
        diet_counts[name] = diet_counts.get(name, Decimal("0")) + _as_decimal(
            sub_row.get("count")
        )
    diet_total = sum(diet_counts.values(), Decimal("0"))

    meta = f"štandard {format_count(standard_count)}"
    if diet_total:
        meta += f", diéty {format_count(diet_total)}"

    # #513 — poznámka prevádzky (nastavenie „Poznámka k objednávke") je vidno
    # hneď na zbalenom riadku klienta. Predtým žila len v `collapsible`
    # sub-riadku, takže kým sa klient nerozbalil, admin o nej nevedel; ten
    # sub-riadok už nie je, aby text nebol v tabuľke dvakrát. Pôvodne šla do
    # samostatného úzkeho stĺpca Poznámka — dlhší text tam ale zalamoval
    # a naťahoval riadok na viacero riadkov (klient hlásenie), preto ide
    # rovno za názov prevádzky; stĺpec Poznámka ostáva prázdny na rukou
    # písané poznámky kuchyne.
    admin_order_note = str(row.get("admin_order_note") or "").strip()
    # Poznámka k „Špeciálnej" diéte — kuchyňa inak nemá odkiaľ vedieť, čo pre
    # dieťa nabrať (samotný názov diéty „Špeciálna" nič nehovorí). Ide do tej
    # istej bunky ako admin_order_note, nech je vidno hneď na zbalenom riadku.
    special_diet_note = str(row.get("special_diet_note") or "").strip()
    note_parts = []
    if special_diet_note:
        note_parts.append(f"Špeciálna diéta: {special_diet_note}")
    if admin_order_note:
        note_parts.append(admin_order_note)
    combined_note = " · ".join(note_parts)

    out: list[dict] = [
        {
            "kind": "client",
            "css": "client-row",
            "group_id": key,
            # Kuchyňa vešia na klientsky riadok odklikávanie naloženia (#487),
            # a potrebuje k tomu prevádzku ako číslo — nie parsovanie `group_id`.
            "prevadzka_id": row.get("prevadzka_id"),
            "cells": [
                {
                    "text": row.get("client") or "",
                    "note": combined_note or None,
                    "meta": meta,
                    "meta_right": (
                        f"spolu porcií {format_count(standard_count + diet_total)}"
                    ),
                    "colspan": total_columns - 1,
                },
                _note_cell(),
            ],
        }
    ]

    # Každý druhý podriadok dostane pruh (`zebra`) — na papieri je tabuľka
    # široká a oko bez neho stráca riadok. Parita sa počíta v rámci jednej
    # prevádzky, aby pruhy nezáviseli od toho, koľko riadkov mala tá nad ňou.
    for position, (sub_row, gram_cells) in enumerate(visible):
        is_diet = sub_row.get("type") == "diet"
        zebra = " zebra" if position % 2 else ""
        label = sub_row.get("label") or ""
        cell = _label_cell(
            f"↳ {label}" if is_diet else label,
            sub_row.get("count"),
        )
        text_hex = background_hex = None
        if is_diet:
            text_hex, background_hex = _diet_text_and_background(data, sub_row)
            cell["swatch"] = {
                "color": f"#{diet_color(data, sub_row)}",
                "base_colors": sub_row.get("diet_base_colors") or [],
            }
            # #2 — poznámka ku konkrétnej diéte (Diet.description), nastavená
            # v Správe diét. Kuchyňa ju predtým videla len tam, teraz aj tu.
            cell["note"] = (data.get("diet_descriptions") or {}).get(
                sub_row.get("diet_name")
            )
        out.append(
            {
                "kind": "sub-row",
                "css": ("sub-row diet" if is_diet else "sub-row") + zebra,
                "group_id": key,
                "collapsible": True,
                "color": f"#{readable_text_color(text_hex)}" if is_diet else None,
                "background": (
                    f"#{blend_with_white(background_hex)}" if is_diet else None
                ),
                "cells": [cell] + gram_cells,
            }
        )

    # Poznámky idú PRED medzisúčty — tak ich má obrazovka. `note-admin` sa už
    # nevypisuje: odkedy má klientsky riadok vlastný stĺpec Poznámka (#513),
    # bol by ten istý text v tabuľke dvakrát.
    for kind, label, note in (("note-delivery", "Rozvoz:", row.get("delivery_note")),):
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

    if include_summary_rows and standard_count:
        out.append(
            {
                "kind": "summary-std",
                "css": "summ-std",
                "cells": [_label_cell("Súčet bez diét", standard_count)]
                + _gram_cells(
                    row.get("standard_col_grams") or [], groups, hues, snack_with_lunch
                ),
            }
        )
    diet_summary_rows = (
        row.get("diet_summary_rows") or [] if include_summary_rows else []
    )
    for diet in diet_summary_rows:
        name = str(diet.get("name") or "")
        # Diéta, ktorá vo viditeľných jedlách nie je, nemá čo sumarizovať.
        if name not in diet_counts:
            continue
        hex_color = diet_color(data, diet)
        text_hex, background_hex = _diet_text_and_background(data, diet)
        out.append(
            {
                "kind": "summary-diet",
                "css": "summ-diet",
                "color": f"#{readable_text_color(text_hex)}",
                "background": f"#{blend_with_white(background_hex)}",
                "cells": [
                    _label_cell(
                        name,
                        diet_counts[name],
                        swatch={
                            "color": f"#{hex_color}",
                            "base_colors": diet.get("base_colors") or [],
                        },
                        note=(data.get("diet_descriptions") or {}).get(name),
                    )
                ]
                + _gram_cells(
                    diet.get("col_grams") or [], groups, hues, snack_with_lunch
                ),
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
    totals: list, keep: list[int], groups: list[dict], hues: list[str]
) -> dict:
    cells = []
    for position, (group_index, group) in enumerate(groups):
        values = totals[group_index] if group_index < len(totals) else []
        for component_index, component in enumerate(group.get("components") or []):
            raw = values[component_index] if component_index < len(values) else None
            text = format_gram(raw)
            separator = " meal-sep" if position > 0 and component_index == 0 else ""
            cells.append({"text": text or EMPTY, "css": separator.strip()})
    cells.append(_note_cell())
    return {
        "kind": "total",
        "css": "total",
        "cells": [{"text": "CELKOM (g / ml)", "css": "corner"}] + cells,
    }

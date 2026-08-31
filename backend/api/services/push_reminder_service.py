"""Text pre push pripomienku uzávierky objednávky.

Vyňaté z `send_push_deadline_reminder_task`, aby si admin prehľad
„Nadchádzajúce" (upcoming_events_views.py) vedel presne predpočítať text,
ktorý sa pošle — bez toho, aby duplikoval formátovaciu logiku a časom sa s
tou v tasku rozišiel.
"""

from __future__ import annotations

import datetime

MEAL_LABELS = {
    "breakfast": "raňajky",
    "lunch": "obed",
    "olovrant": "olovrant",
}

REMINDER_TITLE = "Pripomienka objednávky"


def build_meal_str(meal_types: list[str]) -> str:
    labels = [MEAL_LABELS[m] for m in meal_types]
    if len(labels) == 1:
        return labels[0]
    return ", ".join(labels[:-1]) + f" a {labels[-1]}"


def build_reminder_body(meal_types: list[str], target_date: datetime.date) -> str:
    date_fmt = target_date.strftime("%d.%m.%Y")
    meal_str = build_meal_str(meal_types)
    return f"Nezabudnite objednať {meal_str} na {date_fmt}. Uzávierka je o chvíľu!"


def next_week_range(
    reference_date: datetime.date,
) -> tuple[datetime.date, datetime.date]:
    """Pondelok–piatok týždňa, ktorý nasleduje po `reference_date`.

    Zdieľané so `send_weekly_order_reminder_task` — ten volá s `today`
    (nedeľa, keď beží), preview s dátumom najbližšieho behu.
    """
    days_until_monday = (7 - reference_date.weekday()) % 7 or 7
    next_monday = reference_date + datetime.timedelta(days=days_until_monday)
    next_friday = next_monday + datetime.timedelta(days=4)
    return next_monday, next_friday


def build_weekly_reminder_body(reference_date: datetime.date) -> str:
    next_monday, next_friday = next_week_range(reference_date)
    week_label = next_monday.strftime("%d.%m.") + "–" + next_friday.strftime("%d.%m.%Y")
    return f"Nezabudnite vyplniť objednávku na budúci týždeň ({week_label})."

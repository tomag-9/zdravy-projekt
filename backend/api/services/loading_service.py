"""
Workflow nakladania pre kuchyňu (#487).

Očakávané položky sa NEUKLADAJÚ do DB — odvodzujú sa z gramážového prehľadu
toho istého dňa. Keď admin zmení jedálniček, checklist sa prispôsobí sám a
nemôže vzniknúť stav, keď kuchyňa odkliká položku, ktorá už v jedálničku nie je.
Do DB ide len to, čo sa z jedálnička odvodiť nedá: či to niekto odklikol a kto.
"""

from __future__ import annotations

import datetime
from typing import Any

from django.contrib.auth.models import User
from django.db import transaction

from ..models import LoadingStatus, Prevadzka, PrevadzkaLoadingConfirmation
from .meal_plan_service import MealPlanService


class UnknownLoadingItem(ValueError):
    """Kľúč položky, ktorý v jedálničku daného dňa neexistuje."""


class LoadingNotComplete(ValueError):
    """Potvrdenie prevádzky pri nenaložených položkách."""

    def __init__(self, missing: list[str]) -> None:
        self.missing = missing
        super().__init__("Prevádzka má ešte nenaložené položky.")


def _dashboard(date: datetime.date) -> dict[str, Any]:
    return MealPlanService.gramage_dashboard(date.isoformat())


def expected_items(date: datetime.date) -> list[dict[str, str]]:
    """Položky, ktoré sa v daný deň nakladajú — stĺpcové skupiny prehľadu."""
    return [
        {"key": str(group["key"]), "label": str(group["label"])}
        for group in _dashboard(date).get("col_groups") or []
    ]


def _rows_by_prevadzka(date: datetime.date) -> dict[int, dict[str, Any]]:
    out: dict[int, dict[str, Any]] = {}
    for row in _dashboard(date).get("rows") or []:
        prevadzka_id = row.get("prevadzka_id")
        if prevadzka_id is not None:
            out[int(prevadzka_id)] = row
    return out


def overview(date: datetime.date) -> dict[str, Any]:
    """Stav nakladania za celý deň — podklad pre kuchyňskú obrazovku."""
    items = expected_items(date)
    rows = _rows_by_prevadzka(date)

    marks: dict[tuple[int, str], LoadingStatus] = {
        (status.prevadzka_id, status.item_key): status
        for status in LoadingStatus.objects.filter(
            date=date, prevadzka_id__in=rows
        ).select_related("marked_by")
    }
    confirmations = {
        confirmation.prevadzka_id: confirmation
        for confirmation in PrevadzkaLoadingConfirmation.objects.filter(
            date=date, prevadzka_id__in=rows
        ).select_related("confirmed_by")
    }

    prevadzky: list[dict[str, Any]] = []
    for prevadzka_id, row in rows.items():
        item_states = []
        for item in items:
            mark = marks.get((prevadzka_id, item["key"]))
            item_states.append(
                {
                    **item,
                    "is_loaded": bool(mark and mark.is_loaded),
                    "marked_by": (
                        mark.marked_by.email if mark and mark.marked_by else None
                    ),
                    "marked_at": mark.marked_at.isoformat() if mark else None,
                }
            )
        confirmation = confirmations.get(prevadzka_id)
        prevadzky.append(
            {
                "prevadzka_id": prevadzka_id,
                "nazov": str(row.get("client") or ""),
                "portions": str(row.get("total_count") or ""),
                "items": item_states,
                "loaded_count": sum(1 for i in item_states if i["is_loaded"]),
                "items_count": len(item_states),
                "is_confirmed": confirmation is not None,
                "confirmed_by": (
                    confirmation.confirmed_by.email
                    if confirmation and confirmation.confirmed_by
                    else None
                ),
                "confirmed_at": (
                    confirmation.confirmed_at.isoformat() if confirmation else None
                ),
            }
        )

    prevadzky.sort(key=lambda p: str(p["nazov"]).casefold())
    return {
        "date": date.isoformat(),
        "items": items,
        "prevadzky": prevadzky,
        "confirmed_count": sum(1 for p in prevadzky if p["is_confirmed"]),
    }


@transaction.atomic
def set_item_loaded(
    *,
    date: datetime.date,
    prevadzka: Prevadzka,
    item_key: str,
    is_loaded: bool,
    actor: User | None,
) -> LoadingStatus:
    """Odklikne (alebo odškrtne) jednu položku."""
    valid_keys = {item["key"] for item in expected_items(date)}
    if item_key not in valid_keys:
        raise UnknownLoadingItem(item_key)

    status, _ = LoadingStatus.objects.update_or_create(
        date=date,
        prevadzka=prevadzka,
        item_key=item_key,
        defaults={"is_loaded": is_loaded, "marked_by": actor},
    )

    # Odškrtnutie ruší aj potvrdenie prevádzky — inak by ostala „naložená"
    # s dierou, čo je presne ten stav, ktorému má kontrolný krok brániť.
    if not is_loaded:
        PrevadzkaLoadingConfirmation.objects.filter(
            date=date, prevadzka=prevadzka
        ).delete()
    return status


def checklist(*, date: datetime.date, prevadzka: Prevadzka) -> dict[str, Any]:
    """Kontrolný súhrn pred potvrdením — čo sa naloží a čo ešte chýba."""
    data = overview(date)
    entry = next(
        (p for p in data["prevadzky"] if p["prevadzka_id"] == prevadzka.pk), None
    )
    if entry is None:
        return {
            "prevadzka_id": prevadzka.pk,
            "nazov": prevadzka.nazov,
            "items": [],
            "missing": [],
            "is_complete": False,
            "has_orders": False,
        }
    missing = [item["label"] for item in entry["items"] if not item["is_loaded"]]
    return {
        **entry,
        "missing": missing,
        "is_complete": not missing and bool(entry["items"]),
        "has_orders": True,
    }


@transaction.atomic
def confirm_prevadzka(
    *, date: datetime.date, prevadzka: Prevadzka, actor: User | None
) -> PrevadzkaLoadingConfirmation:
    """Potvrdí prevádzku ako naloženú; odmietne to, kým niečo chýba."""
    summary = checklist(date=date, prevadzka=prevadzka)
    if not summary["is_complete"]:
        raise LoadingNotComplete(summary["missing"])

    confirmation, _ = PrevadzkaLoadingConfirmation.objects.get_or_create(
        date=date, prevadzka=prevadzka, defaults={"confirmed_by": actor}
    )
    return confirmation

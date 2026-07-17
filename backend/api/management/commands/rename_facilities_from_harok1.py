"""Align app facility names with the Hárok1 roster.

The kitchen calls a facility what Hárok1 calls it; the app grew its own names
("MŠ Zdravé Bruško" for what the workbook calls "Deutsche schule"), and the gap has
been bridged by the ``compare-real`` alias map ever since. Renaming the app side to the
workbook removes the translation layer for every 1:1 facility.

Three names must move together, or reports and reconciliation drift apart:

* ``Celok.nazov`` — shown in admin, and used in the report label of a *multi*-prevádzka
  celok (``"Celok – Prevádzka"``).
* ``UserProfile.company_name`` — the report label of a *single*-prevádzka celok
  (`api.utils.order_row_label`), i.e. the name reconciliation actually matches on.
* ``Prevadzka.nazov`` — the key inside ``DailyOrder.data``.

Only 1:1 facilities are renamed. A celok the workbook bills on several rows (Rozmanitá =
Škôlka + Škola) or serves through several prevádzky (Jolly 1/2/3, Školička les/lúka) has
no single workbook name to take, so it keeps its own and stays in the alias map.

Idempotent: renaming to the name a row already has is a no-op.
"""

from __future__ import annotations

from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction

from api.models import Celok

from .reconcile_real import _load_alias_map, _normalize
from .seed_facilities_from_harok1 import ALIAS_MAP, _facility_rows, _split_app_label

# Explicit overrides where the workbook name is not what we want to carry into the app.
# The workbook is a kitchen worksheet, not a naming authority: it writes the school as
# "DOBRODRUŽSTVO Škola", but the app already names its sibling "MŠ Dobrodružstvo", so the
# school follows that convention instead. Confirmed with the client.
_NAME_OVERRIDES = {
    "dobrodruzstvo skola": "ZŠ Dobrodružstvo",
    # Fantastická runs a škôlka and a škola on separate EduPage instances. Hárok1 has a
    # single "Fantastická" row — the škôlka, because the school does not cook in July —
    # so the škola has no workbook name of its own to take.
    "szs fan": "Fantastická Škola",
}


def _harok1_name_by_normalized(workbook_path: Path | None) -> dict[str, str]:
    """{normalized Hárok1 label → the label as the workbook spells it}."""
    from glob import glob

    from openpyxl import load_workbook

    from .reconcile_real import REAL_DIR

    path = workbook_path or Path(
        sorted(glob(str(REAL_DIR / "*.xlsx")), key=lambda p: Path(p).stat().st_mtime)[
            -1
        ]
    )
    sheet = load_workbook(path, data_only=True)["Hárok1"]
    return {_normalize(e["name"]): e["name"] for e in _facility_rows(sheet)}


def _find_celok(key: str) -> Celok | None:
    return next((c for c in Celok.objects.all() if _normalize(c.nazov) == key), None)


def _profile_targets_prevadzka(profile, prevadzka) -> bool:
    selected = list(profile.prevadzky.all())
    return not selected or selected == [prevadzka]


def _rename_1to1_celok(celok: Celok, target: str, dry_run: bool) -> tuple[bool, str]:
    """Rename a one-prevádzka celok, its sole prevádzka and matching login labels."""
    if not target:
        return False, "chýba cieľový názov"
    if celok.nazov == target:
        return False, "už má cieľový názov"
    if Celok.objects.filter(nazov=target).exclude(pk=celok.pk).exists():
        return False, "cieľový názov už existuje"

    prevadzky = list(celok.prevadzky.all())
    if len(prevadzky) != 1:
        return False, "nie je 1:1 celok"

    if dry_run:
        return True, ""

    old_celok = celok.nazov
    prevadzka = prevadzky[0]
    old_prevadzka = prevadzka.nazov

    prevadzka.nazov = target
    prevadzka.save(update_fields=["nazov"])

    for profile in celok.profily.all():
        if not _profile_targets_prevadzka(profile, prevadzka):
            continue
        if profile.company_name in ("", old_celok, old_prevadzka):
            profile.company_name = target
            profile.save(update_fields=["company_name"])

    celok.nazov = target
    celok.save(update_fields=["nazov"])
    return True, ""


class Command(BaseCommand):
    help = "Rename celky/prevádzky/logins to their Hárok1 names (1:1 facilities only)."

    def add_arguments(self, parser):
        parser.add_argument("--workbook", help="Workbook path (default: newest).")
        parser.add_argument(
            "--dry-run", action="store_true", help="Report without writing."
        )

    def handle(self, *args, **options):
        workbook = Path(options["workbook"]) if options.get("workbook") else None
        harok1_names = _harok1_name_by_normalized(workbook)
        alias_map = _load_alias_map(str(ALIAS_MAP)) if ALIAS_MAP.exists() else {}

        renames: list[tuple[str, str]] = []
        skipped: list[tuple[str, str]] = []
        processed_celok_ids: set[int] = set()

        with transaction.atomic():
            for app_label, real_labels in alias_map.items():
                celok_key, prevadzka_suffix = _split_app_label(app_label)
                celok = _find_celok(celok_key)
                if celok is None:
                    continue
                if celok.pk in processed_celok_ids:
                    continue
                if prevadzka_suffix or len(real_labels) > 1:
                    skipped.append(
                        (celok.nazov, "viac prevádzok / viac riadkov v Hárok1")
                    )
                    continue

                target = _NAME_OVERRIDES.get(
                    real_labels[0], harok1_names.get(real_labels[0], "")
                )
                if not target or target == celok.nazov:
                    continue
                old_name = celok.nazov
                renamed, reason = _rename_1to1_celok(celok, target, options["dry_run"])
                if renamed:
                    renames.append((old_name, target))
                    processed_celok_ids.add(celok.pk)
                    continue
                if reason not in {"už má cieľový názov", "chýba cieľový názov"}:
                    skipped.append((old_name, reason))

            # Celky with no alias entry but an explicit override still need renaming.
            for key, target in _NAME_OVERRIDES.items():
                celok = _find_celok(key)
                if (
                    celok is None
                    or celok.nazov == target
                    or celok.pk in processed_celok_ids
                ):
                    continue
                old_name = celok.nazov
                renamed, reason = _rename_1to1_celok(celok, target, options["dry_run"])
                if renamed:
                    renames.append((old_name, target))
                    processed_celok_ids.add(celok.pk)
                    continue
                if reason not in {"už má cieľový názov", "chýba cieľový názov"}:
                    skipped.append((old_name, reason))

            if options["dry_run"]:
                transaction.set_rollback(True)

        prefix = "[dry-run] " if options["dry_run"] else ""
        self.stdout.write(f"{prefix}premenované: {len(renames)}")
        for old, new in renames:
            self.stdout.write(f"  {old} → {new}")
        for name, why in skipped:
            self.stdout.write(f"  = {name} ponechané ({why})")

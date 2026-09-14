"""Retire legacy duplicate diets without altering historical orders.

The approved EduPage mapping continues to canonicalize future imports.  This
command only sets ``Diet.is_active=False`` on its legacy sources, which removes
them from the catalogue, facility assignment and planning UI.  It never deletes
a diet, a component-merge exception, or JSON stored in ``DailyOrder.data``.
"""

from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from api.cache_service import clear_diet_list_cache
from api.management.commands import repoint_deduplicated_diets_2026_09
from api.models import Diet, MealPlanItem, MealTemplate


class Command(BaseCommand):
    help = "Deaktivuje potvrdené legacy duplicity diét bez zmeny objednávok."

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Vykoná deaktiváciu po čistom preflight-e.",
        )

    @staticmethod
    def _one(name: str) -> Diet:
        diets = list(Diet.objects.filter(name__iexact=name))
        if len(diets) != 1:
            raise CommandError(f"Diéta chýba alebo nie je jednoznačná: {name!r}")
        return diets[0]

    @staticmethod
    def _unsafe_references(diet: Diet) -> list[str]:
        """References that would make a retired diet selectable or configured."""
        references = []
        if diet.prevadzka_diets.exists():
            references.append("je priradená prevádzke")
        if MealTemplate.objects.filter(diet=diet).exists():
            references.append("je v šablóne jedla")
        if MealPlanItem.objects.filter(diet=diet).exists():
            references.append("je v dennom jedálničku")
        if diet.base_diets.exists() or diet.composite_of.exists():
            references.append("je súčasťou kombinovanej diéty")
        return references

    def handle(self, *args, **options):
        apply = options["apply"]
        if not apply:
            self.stdout.write(
                self.style.WARNING(
                    "DRY-RUN: nič sa nezapíše. Pre zápis pridaj --apply."
                )
            )

        with transaction.atomic():
            resolved = [
                (self._one(old), self._one(new))
                for old, new in repoint_deduplicated_diets_2026_09.MAPPINGS
            ]
            errors = []
            for old, new in resolved:
                if not new.is_active:
                    errors.append(
                        f"{new.name!r}: kanonická cieľová diéta nie je aktívna"
                    )
                for reason in self._unsafe_references(old):
                    errors.append(f"{old.name!r}: {reason}")
            if errors:
                raise CommandError(
                    "Preflight našiel nebezpečné väzby; nič sa nezmenilo:\n"
                    + "\n".join(errors)
                )

            for old, _new in resolved:
                status = "deaktivuje sa" if old.is_active else "už neaktívna"
                self.stdout.write(
                    f"{old.pk}:{old.name!r} ({status}; "
                    f"merge výnimky={old.component_merges.count()})"
                )

            if not apply:
                transaction.set_rollback(True)
                return

            for old, _new in resolved:
                if old.is_active:
                    old.is_active = False
                    old.save(update_fields=["is_active"])

        # The catalogue is cached independently from model-save signals in a few
        # deployment configurations; clear it explicitly before reporting success.
        clear_diet_list_cache()
        self.stdout.write(
            self.style.SUCCESS(
                f"Deaktivovaných {len(resolved)} legacy diét; objednávky ani merge výnimky sa nemenili."
            )
        )

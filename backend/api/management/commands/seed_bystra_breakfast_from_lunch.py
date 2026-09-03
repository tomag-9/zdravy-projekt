"""Nastav Bystrá škôlkam auto-order raňajky = predošlý obed (nie predošlé raňajky).

Bystrá rodina (BYSTRÁ 1/2 Slnečnice, BYSTRÁ Jasle, Bystrá Skypark, Bystrá
Krasňany) objednáva raňajky ako obed z predošlého dňa, nie ako samostatný
chod — klient potvrdil 3.9.2026. Štandardne `apply_auto_orders` kopíruje
raňajky→raňajky (viď `Prevadzka.auto_order_breakfast_source`, default
`"breakfast"`); tento seed prepne dotknuté prevádzky na `"lunch"`. Obed aj
olovrant ostávajú na defaultnom správaní (obed→obed).

Idempotentné: chýbajúcu prevádzku len ohlási a preskočí, existujúcu prepne
len ak ešte nemá `auto_order_breakfast_source == "lunch"`.

    python manage.py seed_bystra_breakfast_from_lunch
    python manage.py seed_bystra_breakfast_from_lunch --dry-run
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from api.models import Prevadzka

# Presné názvy prevádzok (nie celkov — Bystrá rodina je rozdelená do troch
# samostatných celkov, viď seed_merge_celky.MERGES["Bystrá"]).
PREVADZKY = [
    "BYSTRÁ 1 Slnečnice",
    "BYSTRÁ 2 Slnečnice",
    "BYSTRÁ Jasle",
    "Bystrá Skypark",
    "Bystrá Krasňany",
]


class Command(BaseCommand):
    help = (
        "Nastav auto_order_breakfast_source='lunch' pre Bystrá škôlky "
        "(raňajky sa preklápajú z predošlého obeda)."
    )

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")

    @transaction.atomic
    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        for nazov in PREVADZKY:
            prevadzka = Prevadzka.objects.filter(nazov=nazov).first()
            if prevadzka is None:
                self.stdout.write(
                    self.style.WARNING(f"  {nazov}: prevádzka neexistuje, preskakujem")
                )
                continue

            if prevadzka.auto_order_breakfast_source == "lunch":
                self.stdout.write(f"  {nazov}: už nastavené (lunch), preskakujem")
                continue

            prevadzka.auto_order_breakfast_source = "lunch"
            prevadzka.save(update_fields=["auto_order_breakfast_source"])
            self.stdout.write(
                self.style.SUCCESS(f"  {nazov}: auto_order_breakfast_source = 'lunch'")
            )

        if dry_run:
            self.stdout.write(self.style.WARNING("dry-run — rollback"))
            transaction.set_rollback(True)
        else:
            self.stdout.write(self.style.SUCCESS("Hotovo."))

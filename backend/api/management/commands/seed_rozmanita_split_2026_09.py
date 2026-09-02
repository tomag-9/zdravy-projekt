"""Rozdeľ Rozmanitú na MŠ a ZŠ pri EduPage scrape-i, dospelých priraď k ZŠ.

Doteraz mala EduPage pripojenú len prevádzka "MŠ Rozmanitá" (`seed_merge_celky`
komentár: "login smie scrapovať len škôlku") a keďže to bola jediná pripojená
prevádzka na connection, engine posielal VŠETKY riadky (aj `ZŠ Klasik`, `Dosp
Klasik`) do nej (viď `tasks.py`: "Jedna prevádzka → split nerobíme"). Overené
naživo 2.9.2026: platitelia sa čisto delia na `MŠ *` / `ZŠ *` / `Dosp *` prefixy
— rovnaká štruktúra ako Dobrodružstvo (`seed_new_edupage_2026_08._link_dobrodruzstvo`).
Klient potvrdil 2.9.2026, že dospelí (zamestnanci) sa majú počítať pod školou,
nie škôlkou — rovnaká konvencia ako pri Dobrodružstve.

    python manage.py seed_rozmanita_split_2026_09
    python manage.py seed_rozmanita_split_2026_09 --dry-run
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from api.models import Celok, Prevadzka

CELOK_NAZOV = "Rozmanitá"
MS_PREVADZKA = "MŠ Rozmanitá"
ZS_PREVADZKA = "Rozmanita Škola"


class Command(BaseCommand):
    help = "Napoj Rozmanita Škola na EduPage connection MŠ Rozmanitej, rozdeľ podľa MŠ/ZŠ/Dosp prefixov."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")

    @transaction.atomic
    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        celok = Celok.objects.filter(nazov=CELOK_NAZOV).first()
        if celok is None:
            self.stdout.write(
                self.style.WARNING(f"  {CELOK_NAZOV}: celok neexistuje, preskakujem")
            )
            if dry_run:
                transaction.set_rollback(True)
            return

        ms_prevadzka = Prevadzka.objects.filter(celok=celok, nazov=MS_PREVADZKA).first()
        if ms_prevadzka is None or ms_prevadzka.edupage_connection_id is None:
            self.stdout.write(
                self.style.WARNING(
                    f"  {MS_PREVADZKA}: prevádzka alebo EduPage spojenie chýba, "
                    "preskakujem"
                )
            )
            if dry_run:
                transaction.set_rollback(True)
            return

        connection = ms_prevadzka.edupage_connection

        if ms_prevadzka.edupage_match != "MŠ":
            ms_prevadzka.edupage_match = "MŠ"
            ms_prevadzka.save(update_fields=["edupage_match"])
        self.stdout.write(f"  {MS_PREVADZKA}: edupage_match = 'MŠ'")

        zs_prevadzka = Prevadzka.objects.filter(celok=celok, nazov=ZS_PREVADZKA).first()
        if zs_prevadzka is None:
            self.stdout.write(
                self.style.WARNING(
                    f"  {ZS_PREVADZKA}: prevádzka neexistuje, preskakujem"
                )
            )
        else:
            update_fields = []
            if zs_prevadzka.edupage_connection_id != connection.pk:
                zs_prevadzka.edupage_connection = connection
                update_fields.append("edupage_connection")
            if zs_prevadzka.edupage_match != "ZŠ; Dosp":
                zs_prevadzka.edupage_match = "ZŠ; Dosp"
                update_fields.append("edupage_match")
            if update_fields:
                zs_prevadzka.save(update_fields=update_fields)
            self.stdout.write(f"  {ZS_PREVADZKA}: pripojené na EduPage (ZŠ; Dosp)")

        if dry_run:
            self.stdout.write(self.style.WARNING("dry-run — rollback"))
            transaction.set_rollback(True)
        else:
            self.stdout.write(self.style.SUCCESS("Hotovo."))

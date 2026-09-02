"""Napoj EduPage feed pre Školičku (ZŠ) — dodal Stano 2.9.2026.

Guest URL overený naživo: platitelia sú `1.stupeň - klasik/BM/BM,BG/vege/histamín`
a `2.stupeň - klasik/BM/BMBG/vege/histamín`, prefix pred pomlčkou teda jednoznačne
určuje prevádzku (`1.stupeň` vs. `2.stupeň`). Platitelia `učiteľ *` (porcia=3) na
žiadny z dvoch prefixov nesadnú — Školička v appke učiteľskú prevádzku nemá. Klient
potvrdil 2.9.2026, že učitelia/dospelí sa majú počítať pod 2. stupňom, takže
`Školička 2. stupeň` dostáva druhý prefix `učiteľ` (rovnaká konvencia ako
`Dospelý` pri Dobrodružstve).

    python manage.py seed_skolicka_zs_2026_09
    python manage.py seed_skolicka_zs_2026_09 --dry-run
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from api.models import Celok, EdupageConnection, Prevadzka

SKOLICKA_URL = "https://skolicka.edupage.org/menu/mealsGuest?id=u6r7uz8"

CELOK_NAZOV = "Školička ZŠ"
PREVADZKY_MATCH = [
    ("Školička 1.stupeň", "1.stupeň"),
    ("Školička 2. stupeň", "2.stupeň; učiteľ"),
]


class Command(BaseCommand):
    help = "Naseeduje EduPage prepojenie pre Školičku ZŠ (potvrdené 2.9.2026)."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")

    @transaction.atomic
    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        connection, created = EdupageConnection.objects.get_or_create(
            mealsguest_url=SKOLICKA_URL,
            defaults={"name": CELOK_NAZOV},
        )
        self.stdout.write(
            f"  {CELOK_NAZOV}: EduPage spojenie {'vytvorené' if created else 'už existuje'}"
        )

        celok = Celok.objects.filter(nazov=CELOK_NAZOV).first()
        if celok is None:
            self.stdout.write(
                self.style.WARNING(
                    f"  {CELOK_NAZOV}: celok neexistuje, prepojenie preskakujem"
                )
            )
        else:
            if celok.zdroj_objednavok != Celok.ZdrojObjednavok.EDUPAGE:
                celok.zdroj_objednavok = Celok.ZdrojObjednavok.EDUPAGE
                celok.save(update_fields=["zdroj_objednavok"])

            for prevadzka_nazov, match in PREVADZKY_MATCH:
                prevadzka = Prevadzka.objects.filter(
                    celok=celok, nazov=prevadzka_nazov
                ).first()
                if prevadzka is None:
                    self.stdout.write(
                        self.style.WARNING(
                            f"  {prevadzka_nazov}: prevádzka neexistuje, "
                            "prepojenie preskakujem"
                        )
                    )
                    continue

                update_fields = []
                if prevadzka.edupage_connection_id != connection.pk:
                    prevadzka.edupage_connection = connection
                    update_fields.append("edupage_connection")
                if prevadzka.edupage_match != match:
                    prevadzka.edupage_match = match
                    update_fields.append("edupage_match")
                if update_fields:
                    prevadzka.save(update_fields=update_fields)
                self.stdout.write(
                    f"  {prevadzka_nazov}: pripojené na EduPage ({match})"
                )

        if dry_run:
            self.stdout.write(self.style.WARNING("dry-run — rollback"))
            transaction.set_rollback(True)
        else:
            self.stdout.write(self.style.SUCCESS("Hotovo."))

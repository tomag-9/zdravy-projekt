"""Prepoj CMŠ Pezinok na EduPage (onboarding koniec augusta 2026).

Celok aj prevádzka boli založené ručne cez admin; mealsGuest URL skončila
(omylom) v `Prevadzka.edupage_match` namiesto `EdupageConnection.mealsguest_url`.
Tento seed vytvorí chýbajúce `EdupageConnection` a prepojí naň prevádzku — jedna
prevádzka na celok, takže `edupage_match` ostáva prázdny (berie sa celý objem).

    python manage.py seed_cms_pezinok_2026_08
    python manage.py seed_cms_pezinok_2026_08 --dry-run
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from api.models import Celok, EdupageConnection, Prevadzka

CMS_PEZINOK_URL = "https://cmspezinok.edupage.org/menu/mealsGuest?id=4iUyibk"


class Command(BaseCommand):
    help = "Naseeduje prepojenie CMŠ Pezinok na EduPage (august 2026)."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")

    @transaction.atomic
    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        celok = Celok.objects.filter(nazov="CMŠ Pezinok").first()
        if celok is None:
            self.stdout.write(
                self.style.WARNING("  CMŠ Pezinok: celok neexistuje, preskakujem")
            )
            return

        prevadzka = Prevadzka.objects.filter(celok=celok, nazov="CMŠ Pezinok").first()
        if prevadzka is None:
            self.stdout.write(
                self.style.WARNING("  CMŠ Pezinok: prevádzka neexistuje, preskakujem")
            )
            return

        connection, created = EdupageConnection.objects.get_or_create(
            mealsguest_url=CMS_PEZINOK_URL,
            defaults={"name": "CMŠ Pezinok"},
        )
        self.stdout.write(
            f"  CMŠ Pezinok: EduPage spojenie {'vytvorené' if created else 'už existuje'}"
        )

        update_fields = []
        if prevadzka.edupage_connection_id != connection.pk:
            prevadzka.edupage_connection = connection
            update_fields.append("edupage_connection")
        if prevadzka.edupage_match != "":
            prevadzka.edupage_match = ""
            update_fields.append("edupage_match")
        if update_fields:
            prevadzka.save(update_fields=update_fields)

        if celok.zdroj_objednavok != Celok.ZdrojObjednavok.EDUPAGE:
            celok.zdroj_objednavok = Celok.ZdrojObjednavok.EDUPAGE
            celok.save(update_fields=["zdroj_objednavok"])

        stav = "prepojené" if update_fields else "už prepojené"
        self.stdout.write(f"  CMŠ Pezinok: {stav} na EduPage")

        if dry_run:
            self.stdout.write(self.style.WARNING("dry-run — rollback"))
            transaction.set_rollback(True)
        else:
            self.stdout.write(self.style.SUCCESS("Hotovo."))

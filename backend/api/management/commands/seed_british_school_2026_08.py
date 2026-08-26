"""Naseeduj onboarding British School na EduPage (GH #531).

Na rozdiel od `seed_new_edupage_2026_08` celok a prevádzka British School ešte
neexistujú — tento seed ich vytvorí a rovno prepojí na EduPage guest link
dodaný priamo v zadaní issue. Rozvozová trasa (Cluster C — prvé reálne použitie
`Vydaj.C`) sa nastavuje ručne cez admin Rozvoz, nie tu: v čase písania seedu nie
je jasné, na akú fyzickú trasu British School reálne patrí, tak nechávame
prevádzku bez `delivery_route` a upozorníme na stdout.

    python manage.py seed_british_school_2026_08
    python manage.py seed_british_school_2026_08 --dry-run
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from api.models import Celok, EdupageConnection, Prevadzka

BRITISH_SCHOOL_URL = "https://zdravyprojekt.edupage.org/menu/mealsGuest?id=Dr8kS45"
BRITISH_SCHOOL_NAME = "British School"


class Command(BaseCommand):
    help = "Naseeduje onboarding British School na EduPage (GH #531)."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")

    @transaction.atomic
    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        connection, connection_created = EdupageConnection.objects.get_or_create(
            mealsguest_url=BRITISH_SCHOOL_URL,
            defaults={"name": BRITISH_SCHOOL_NAME},
        )
        self.stdout.write(
            "  British School: EduPage spojenie "
            f"{'vytvorené' if connection_created else 'už existuje'}"
        )

        celok, celok_created = Celok.objects.get_or_create(
            nazov=BRITISH_SCHOOL_NAME,
            defaults={"zdroj_objednavok": Celok.ZdrojObjednavok.EDUPAGE},
        )
        if celok.zdroj_objednavok != Celok.ZdrojObjednavok.EDUPAGE:
            celok.zdroj_objednavok = Celok.ZdrojObjednavok.EDUPAGE
            celok.save(update_fields=["zdroj_objednavok"])

        prevadzka, prevadzka_created = Prevadzka.objects.get_or_create(
            celok=celok, nazov=BRITISH_SCHOOL_NAME
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

        self.stdout.write(
            "  British School: celok "
            f"{'vytvorený' if celok_created else 'už existuje'}, prevádzka "
            f"{'vytvorená' if prevadzka_created else 'už existuje'}, "
            "pripojené na EduPage"
        )
        self.stdout.write(
            self.style.WARNING(
                "  British School: rozvozová trasa (Cluster/Vydaj C) sa musí "
                "nastaviť ručne cez admin Rozvoz. Po prvom live scrape over "
                "edupage_match a potvrď počty s kontaktnou osobou."
            )
        )

        if dry_run:
            self.stdout.write(self.style.WARNING("dry-run — rollback"))
            transaction.set_rollback(True)
        else:
            self.stdout.write(self.style.SUCCESS("Hotovo."))

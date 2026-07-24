"""Zlúč samostatné celky, ktoré patria pod jednu školu, do jedného celku s N prevádzkami.

Niektoré školy vznikli (najmä cez `seed_real_delivery_layout`) ako viacero samostatných
celkov 1:1 s prevádzkou (napr. Bystrá 1/2/Jasle/Krasňany/Skypark). Patria však pod jednu
školu → jeden fakturačný celok s viacerými prevádzkami. Tento príkaz to idempotentne
konsoliduje: prevádzky presunie pod cieľový celok a celok access loginov zmení
na konkrétne prevádzka access záznamy, aby sa rozsah nezmenil (dôležité
pri Rozmanitej — edupage škôlka + app škola pod jedným celkom; login smie scrapovať len
škôlku). Prázdne zdrojové celky zmaže.

Beží po `seed_real_delivery_layout` (ktorý app-celky vytvára). Vďaka opravenému
`_upsert_prevadzka` (nájdenú prevádzku len doplní, nepresúva) sa po zlúčení zdrojové celky
pri ďalšom behu už nevytvárajú, takže konsolidácia prežije reštart.

    python manage.py seed_merge_celky
    python manage.py seed_merge_celky --dry-run
"""

from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db import transaction

from api.models import Celok, Prevadzka, ProfilePrevadzkaAccess

# cieľový názov celku -> zoznam názvov zdrojových celkov (== názvy ich prevádzok)
MERGES: dict[str, list[str]] = {
    "Bystrá": [
        "BYSTRÁ 1 Slnečnice",
        "BYSTRÁ 2 Slnečnice",
        "BYSTRÁ JASLE",
        "Bystrá Krasňany",
        "Bystrá Skypark",
    ],
    # Pozn.: klient spomínal „1,2,4", v dátach však existujú Dubáčik 1/3/4 (žiadny 2).
    "Dubáčik": ["Dubáčik 1", "Dubáčik 3", "Dubáčik 4"],
    "Kidsparadise": ["KIDSPARADISE", "Kidsparadise 1", "Kidsparadise 2"],
    "Múdre": [
        "Múdre Hlavičky Nová",
        "Múdre Hlavičky Stará",
        "Múdre Hranie Škola",
        "Múdre Hranie Škôlka",
        "Múdre Včielky",
        "Múdre hranie JASLE",
    ],
    "Naša škola poznania": [
        "Naša škola poznania A",
        "Naša škola poznania B",
    ],
    # Edupage škôlka (MŠ Rozmanitá, má login + objednávky) + app škola pod jeden celok.
    "Rozmanitá": ["MŠ Rozmanitá", "Rozmanita Škola"],
    "Benjamín": ["benjamín pezinok", "benjamín senec"],
    "Pohodička": ["pohodička 1", "pohodička 2"],
    "Školička": ["Školička 1.stupeň", "Školička 2. stupeň"],
    "Škôlkáreň": ["Škôlkáreň - Kvetoslavov", "Škôlkáreň - Mokrohájska"],
    "Štvorlístok": ["Štvorlístok škola", "Štvorlístok škôlka"],
}


class Command(BaseCommand):
    help = (
        "Zlúči samostatné celky jednej školy do jedného celku s viacerými prevádzkami."
    )

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")

    @transaction.atomic
    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        for target_nazov, members in MERGES.items():
            target, created = Celok.objects.get_or_create(nazov=target_nazov)
            if created:
                self.stdout.write(f"Cieľový celok vytvorený: {target_nazov}")

            for member in members:
                source = Celok.objects.filter(nazov=member).first()
                if source is None or source.id == target.id:
                    continue

                # Zdroj celku prenesieme na cieľ (edupage prevažuje).
                if (
                    source.zdroj_objednavok == Celok.ZdrojObjednavok.EDUPAGE
                    and target.zdroj_objednavok != Celok.ZdrojObjednavok.EDUPAGE
                ):
                    if not dry_run:
                        target.zdroj_objednavok = Celok.ZdrojObjednavok.EDUPAGE
                        target.save(update_fields=["zdroj_objednavok"])

                # Ak cieľ vznikol ako nový/prázdny, nenecháme pri zmazaní zdroja
                # zmiznúť fakturačné údaje.
                copy_fields = [
                    "billing_name",
                    "adresa",
                    "ico",
                    "dic",
                ]
                changed_fields = []
                for field in copy_fields:
                    if not getattr(target, field, "") and getattr(source, field, ""):
                        setattr(target, field, getattr(source, field))
                        changed_fields.append(field)
                if changed_fields and not dry_run:
                    target.save(update_fields=changed_fields)

                source_prevadzka_ids = list(
                    source.prevadzky.values_list("id", flat=True)
                )
                celok_accesses = list(source.profile_accesses.all())

                self.stdout.write(
                    f"  {target_nazov} ← {member}: "
                    f"{len(source_prevadzka_ids)} prevádzok"
                    + (f", {len(celok_accesses)} loginov" if celok_accesses else "")
                )

                if dry_run:
                    continue

                for access in celok_accesses:
                    ProfilePrevadzkaAccess.objects.bulk_create(
                        [
                            ProfilePrevadzkaAccess(
                                profile_id=access.profile_id,
                                prevadzka_id=prevadzka_id,
                            )
                            for prevadzka_id in source_prevadzka_ids
                        ],
                        ignore_conflicts=True,
                    )
                    access.delete()

                # Prevádzky presunieme pod cieľový celok. Názvy sú unikátne v rámci
                # skupiny, takže unique(celok, nazov) nekoliduje.
                Prevadzka.objects.filter(id__in=source_prevadzka_ids).update(
                    celok=target
                )

                # Zdrojový celok je teraz prázdny — zmažeme.
                source.delete()

        if dry_run:
            self.stdout.write(self.style.WARNING("dry-run — rollback"))
            transaction.set_rollback(True)
        else:
            self.stdout.write(self.style.SUCCESS("Hotovo."))

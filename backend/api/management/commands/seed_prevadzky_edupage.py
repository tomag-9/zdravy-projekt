"""Naseeduj sub-prevádzky pre celky, ktoré EduPage posiela v jednom balíku.

Seedujeme IBA celky, kde `edupage_match` pokryje *všetky* EduPage riadky. Overené
proti živým dátam (10.7.2026 a 17.6.2026):

    Jolly Homeschool  → J1/J2/J3          0 nezaradených ✓
    MŠ Edulienka      → Palisády/Stupava  0 nezaradených ✓

Zámerne NEseedujeme:
    MŠ Rozmanitá    — payerov `Dosp Klasik`/`Dosp Diéta` nechytí ani `MŠ`, ani `ZŠ`.
    MŠ Zdravé Bruško — `MŠ Klasik` a `SŠV *` nepatria pod Lamač/Malý/Heyrovského.
    Škôlka MS        — `Hosť` nepatrí pod Lúku ani Les; navyše význam `sd` je neznámy.

Split takého celku by scrape zhodil (nezaradený riadok = neúplný scrape), čo je
správne, ale znamená to, že najprv treba doplniť pravidlo pre tie riadky.

    python manage.py seed_prevadzky_edupage
    python manage.py seed_prevadzky_edupage --dry-run
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from api.models import Celok, DailyOrder, Prevadzka

# celok.nazov -> [(nazov prevádzky, edupage_match)]
SPLITS: dict[str, list[tuple[str, str]]] = {
    "Jolly Homeschool": [
        ("Jolly 1", "J1"),
        ("Jolly 2", "J2"),
        ("Jolly 3", "J3"),
    ],
    # Názvy sú krátke, lebo v reportoch sa prefixujú celkom:
    # "MŠ Edulienka – Palisády".
    "MŠ Edulienka": [
        ("Palisády", "Palisády"),
        ("Stupava", "Stupava"),
    ],
}


class Command(BaseCommand):
    help = "Vytvorí sub-prevádzky s edupage_match pre viac-prevádzkové celky."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")

    @transaction.atomic
    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        for celok_nazov, prevadzky in SPLITS.items():
            celok = Celok.objects.filter(nazov=celok_nazov).first()
            if celok is None:
                self.stderr.write(f"✗ celok neexistuje: {celok_nazov}")
                continue

            for sort_order, (nazov, match) in enumerate(prevadzky, start=1):
                obj, created = Prevadzka.objects.update_or_create(
                    celok=celok,
                    nazov=nazov,
                    defaults={
                        "edupage_match": match,
                        "sort_order": sort_order,
                        "is_active": True,
                    },
                )
                verb = "vytvorená" if created else "aktualizovaná"
                self.stdout.write(f"  {celok_nazov}: {nazov} ({match}) — {verb}")

            # Default prevádzka (rovnaké meno ako celok) nemá edupage_match, takže by
            # scrape zablokovala. Deaktivujeme ju, nemažeme — visia na nej historické
            # objednávky spred rozdelenia.
            # Retirujeme každú prevádzku celku, ktorá nie je v zozname vyššie: nielen
            # pôvodnú default, ale aj tie z predošlého (napr. inak pomenovaného) behu.
            # Bez filtra na is_active, aby bol príkaz idempotentný a upratal duplicitné
            # objednávky aj pri opakovanom spustení.
            deaktivovane = Prevadzka.objects.filter(celok=celok).exclude(
                nazov__in=[n for n, _ in prevadzky]
            )
            dnes = timezone.localdate()
            for stara in deaktivovane:
                self.stdout.write(f"  {celok_nazov}: retirujem default '{stara}'")

                # Objednávky od dnešného dňa vyššie sú duplikáty: ten istý objem
                # sub-prevádzky prescrapujú znova a report by ho počítal dvakrát.
                # Staršie dátumy sú legitímna história — tie nechávame.
                duplicitne = DailyOrder.objects.filter(prevadzka=stara, date__gte=dnes)
                pocet = duplicitne.count()
                if pocet:
                    self.stdout.write(
                        self.style.WARNING(
                            f"    mažem {pocet} objednávok od {dnes} "
                            f"(duplikáty, sub-prevádzky ich prescrapujú)"
                        )
                    )
                    if not dry_run:
                        duplicitne.delete()

                if not dry_run:
                    stara.is_active = False
                    stara.save(update_fields=["is_active"])

        if dry_run:
            self.stdout.write(self.style.WARNING("dry-run — rollback"))
            transaction.set_rollback(True)
        else:
            self.stdout.write(self.style.SUCCESS("Hotovo."))

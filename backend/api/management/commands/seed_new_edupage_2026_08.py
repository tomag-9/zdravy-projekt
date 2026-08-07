"""Naseeduj EduPage zmeny potvrdené v auguste 2026.

Zdrojom názvov je WhatsApp komunikácia s majiteľom škôl Stanom: „SZŠ FAN" je
„Fantastická - škola" a správny názov „MŠ Prameň" je „Pramienok". EduPage guest
linky pre Cverničku a Montessori boli dodané spolu s onboardingom. Montessori feed
bol overený naživo 4.8.2026 proti `montessorisk.edupage.org`.

    python manage.py seed_new_edupage_2026_08
    python manage.py seed_new_edupage_2026_08 --dry-run
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from api.models import Celok, EdupageConnection, Prevadzka

CVERNICKA_URL = "https://skolkacvernicka.edupage.org/menu/mealsGuest?id=YY5dAQ6"
MONTESSORI_URL = "https://montessorisk.edupage.org/menu/mealsGuest?id=7Y5HzB9"

RENAMES = [
    ("SZŠ FAN", "Fantastická Škola"),
    ("MŠ Prameň", "Pramienok"),
]


class Command(BaseCommand):
    help = "Naseeduje EduPage onboarding a premenovania potvrdené v auguste 2026."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")

    def _rename(self, model, field: str, old: str, new: str, label: str) -> None:
        old_rows = model.objects.filter(**{field: old})
        if not old_rows.exists():
            stav = (
                "už premenované"
                if model.objects.filter(**{field: new}).exists()
                else "chýba"
            )
            self.stdout.write(
                self.style.WARNING(f"  {label} '{old}': {stav}, preskakujem")
            )
            return

        # Pri čiastočne vykonanom manuálnom premenovaní nechceme naraziť na unique
        # constraint ani vytvoriť dve rovnako pomenované prevádzky/spojenia.
        if model.objects.filter(**{field: new}).exists():
            self.stdout.write(
                self.style.WARNING(
                    f"  {label} '{old}': cieľ '{new}' už existuje, preskakujem"
                )
            )
            return

        pocet = old_rows.update(**{field: new})
        self.stdout.write(f"  {label}: '{old}' → '{new}' ({pocet})")

    def _link_single_facility(
        self, celok_nazov: str, connection: EdupageConnection
    ) -> None:
        celok = Celok.objects.filter(nazov=celok_nazov).first()
        if celok is None:
            self.stdout.write(
                self.style.WARNING(
                    f"  {celok_nazov}: celok neexistuje, prepojenie preskakujem"
                )
            )
            return

        prevadzka = Prevadzka.objects.filter(celok=celok, nazov=celok_nazov).first()
        if prevadzka is None:
            self.stdout.write(
                self.style.WARNING(
                    f"  {celok_nazov}: prevádzka neexistuje, prepojenie preskakujem"
                )
            )
            return

        celok.zdroj_objednavok = Celok.ZdrojObjednavok.EDUPAGE
        celok.save(update_fields=["zdroj_objednavok"])
        prevadzka.edupage_connection = connection
        prevadzka.edupage_match = ""
        prevadzka.save(update_fields=["edupage_connection", "edupage_match"])
        self.stdout.write(f"  {celok_nazov}: pripojené na EduPage")

    def _link_dobrodruzstvo(self) -> None:
        ms_celok = Celok.objects.filter(nazov="MŠ Dobrodružstvo").first()
        if ms_celok is None:
            self.stdout.write(
                self.style.WARNING(
                    "  MŠ Dobrodružstvo: celok neexistuje, prepojenie preskakujem"
                )
            )
            return

        ms_prevadzka = Prevadzka.objects.filter(
            celok=ms_celok, nazov="MŠ Dobrodružstvo"
        ).first()
        if ms_prevadzka is None:
            self.stdout.write(
                self.style.WARNING(
                    "  MŠ Dobrodružstvo: prevádzka neexistuje, prepojenie preskakujem"
                )
            )
            return

        connection = ms_prevadzka.edupage_connection
        if connection is None:
            self.stdout.write(
                self.style.WARNING(
                    "  MŠ Dobrodružstvo: EduPage spojenie neexistuje, "
                    "prepojenie preskakujem"
                )
            )
            return

        changed = False
        if ms_prevadzka.edupage_match != "MŠ":
            ms_prevadzka.edupage_match = "MŠ"
            ms_prevadzka.save(update_fields=["edupage_match"])
            changed = True

        zs_celok = Celok.objects.filter(nazov="ZŠ Dobrodružstvo").first()
        if zs_celok is None:
            self.stdout.write(
                self.style.WARNING(
                    "  ZŠ Dobrodružstvo: celok neexistuje, prepojenie preskakujem"
                )
            )
            return

        zs_prevadzka = Prevadzka.objects.filter(
            celok=zs_celok, nazov="ZŠ Dobrodružstvo"
        ).first()
        if zs_prevadzka is None:
            self.stdout.write(
                self.style.WARNING(
                    "  ZŠ Dobrodružstvo: prevádzka neexistuje, prepojenie preskakujem"
                )
            )
            return

        zs_update_fields = []
        if zs_prevadzka.edupage_connection_id != connection.pk:
            zs_prevadzka.edupage_connection = connection
            zs_update_fields.append("edupage_connection")
        if zs_prevadzka.edupage_match != "1.st; 2.st; Dospelý":
            zs_prevadzka.edupage_match = "1.st; 2.st; Dospelý"
            zs_update_fields.append("edupage_match")
        if zs_update_fields:
            zs_prevadzka.save(update_fields=zs_update_fields)
            changed = True

        if zs_celok.zdroj_objednavok != Celok.ZdrojObjednavok.EDUPAGE:
            zs_celok.zdroj_objednavok = Celok.ZdrojObjednavok.EDUPAGE
            zs_celok.save(update_fields=["zdroj_objednavok"])
            changed = True

        stav = "prepojené" if changed else "už prepojené"
        self.stdout.write(
            f"  Dobrodružstvo: MŠ (MŠ) a ZŠ (1.st; 2.st; Dospelý) {stav} na EduPage"
        )

    @transaction.atomic
    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        for old, new in RENAMES:
            self._rename(Celok, "nazov", old, new, "celok")
            self._rename(Prevadzka, "nazov", old, new, "prevádzka")
            self._rename(EdupageConnection, "name", old, new, "EduPage spojenie")

        cvernicka_connection, cvernicka_created = (
            EdupageConnection.objects.get_or_create(
                mealsguest_url=CVERNICKA_URL,
                defaults={"name": "Cvernička"},
            )
        )
        cvernicka_verb = "vytvorené" if cvernicka_created else "už existuje"
        self.stdout.write(f"  Cvernička: EduPage spojenie {cvernicka_verb}")
        self._link_single_facility("Cvernička", cvernicka_connection)

        # Overené naživo 2026-08-04 proti dobrodruzstvo.edupage.org: všetkých 14
        # payer riadkov sa po normalizácii medzier/interpunkcie v match_prevadzka čisto
        # zaradí pod MŠ alebo tri ZŠ prefixy.
        self._link_dobrodruzstvo()

        montessori_connection, montessori_created = (
            EdupageConnection.objects.get_or_create(
                mealsguest_url=MONTESSORI_URL,
                defaults={"name": "Montessori"},
            )
        )
        montessori_verb = "vytvorené" if montessori_created else "už existuje"
        self.stdout.write(f"  Montessori: EduPage spojenie {montessori_verb}")

        # Overené naživo 4.8.2026: skratka/názov sú A="Iná"/"MŠ/ZŠ Iná",
        # B="MŠ"/"MŠ Bežná", C="ZŠ"/"ZŠ Bežná", D="Iná NmNo"/
        # "Iná NOmilk,NOgluten", E=".."/"...", F="ZŠ 1."/".ZS 1 stupeň",
        # G="ZŠ FK 2."/"ZŠ FoodKut 2.", H="ZŠ zam."/"Zamestnanec Bežná",
        # I="FK zam."/"Zamestnanec FoofKut" a J="FK MŠ bezl."/
        # "MŠ FoodKut bezlepková". `match_prevadzka` skúša prefix skratky ako prvý,
        # potom názov, preto väčšina riadkov správne sadne cez fallback názvu (napr.
        # názov J začína na „MŠ"). A je skutočne zmiešaná MŠ/ZŠ skupina a cez názov
        # potichu skončí pod MŠ. Je to známe obmedzenie, nie bug; človek musí po prvom
        # reálnom scrape potvrdiť počty so Stanom. D a E nesadnú na žiadny prefix a
        # správne sa ukážu v `unmatched_prevadzka` (očakávaný safe fail, kým ich Stano
        # nevysvetlí).
        for celok_nazov, match in [
            ("Montesori škôlka", "MŠ"),
            ("montesori škola", "ZŠ"),
        ]:
            celok = Celok.objects.filter(nazov=celok_nazov).first()
            if celok is None:
                self.stdout.write(
                    self.style.WARNING(
                        f"  {celok_nazov}: celok neexistuje, prepojenie preskakujem"
                    )
                )
                continue

            prevadzka = Prevadzka.objects.filter(celok=celok, nazov=celok_nazov).first()
            if prevadzka is None:
                self.stdout.write(
                    self.style.WARNING(
                        f"  {celok_nazov}: prevádzka neexistuje, prepojenie preskakujem"
                    )
                )
                continue

            celok.zdroj_objednavok = Celok.ZdrojObjednavok.EDUPAGE
            celok.save(update_fields=["zdroj_objednavok"])
            prevadzka.edupage_connection = montessori_connection
            prevadzka.edupage_match = match
            prevadzka.save(update_fields=["edupage_connection", "edupage_match"])
            self.stdout.write(f"  {celok_nazov}: pripojené na EduPage ({match})")

        # Stano poslal iba login URL, nie mealsGuest guest-link:
        # https://slobodakvychove.edupage.org/login/index.php?out=1. Admin sa ešte
        # musí prihlásiť a z nastavení jedál získať guest-link id; dovtedy zámerne
        # nevytvárame EdupageConnection a Walldom ostáva na objednávkach cez appku.
        walldom, walldom_created = Celok.objects.get_or_create(
            nazov="Walldom",
            defaults={"zdroj_objednavok": Celok.ZdrojObjednavok.APP},
        )
        _, prevadzka_created = Prevadzka.objects.get_or_create(
            nazov="Walldom", celok=walldom
        )
        self.stdout.write(
            "  Walldom: celok "
            f"{'vytvorený' if walldom_created else 'už existuje'}, prevádzka "
            f"{'vytvorená' if prevadzka_created else 'už existuje'} (bez EduPage spojenia)"
        )

        if dry_run:
            self.stdout.write(self.style.WARNING("dry-run — rollback"))
            transaction.set_rollback(True)
        else:
            self.stdout.write(self.style.SUCCESS("Hotovo."))

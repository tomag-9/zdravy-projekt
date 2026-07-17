"""Rozdeľ EduPage `zdravebrusko` na päť samostatných celkov.

`zdravebrusko.edupage.org` nie je škola — je to len EduPage, do ktorého objednáva päť
navzájom nesúvisiacich subjektov. Každý z nich fakturuje sám za seba, takže to nie je
jeden celok s piatimi prevádzkami: spoločný EduPage nie je príznak celku. Preto tu
vzniká päť celkov a jeden login (`profil.prevadzky` M2M) siahajúci naprieč nimi.

Mapovanie prefixov je odčítané z EduPage konfigu „Menu – Názov" a overené proti
`prevadzky.md` rosteru (Hárok1):

    dsb    → Deutsche schule                (Bárdošova 33)
    sšv    → SŠ VETERINÁRNA                 (Pod brehmi 6)
    zšla   → ZŠ Malokarpatská               (Malokarpatské námestie 2, Lamač)
    mšHey  → MŠ Heyrovského 4
    mšMal  → MŠ Malokarpatké námestie 6

`mšMal` a `zšla` sú dve rôzne školy na dvoch adresách (námestie 6 vs. 2) — nie je to
tá istá inštitúcia a nesmú sa zlúčiť. Prefixy sú case-sensitive a `match_prevadzka`
ich berie ako prefix, nie substring, takže `mšMal` nechytí `mšHey`.

    python manage.py seed_zdrave_brusko
    python manage.py seed_zdrave_brusko --dry-run
"""

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from api.models import Celok, DailyOrder, Prevadzka, UserProfile

EMAIL = "zdravebrusko@edupage.local"
MEALSGUEST_URL = "https://zdravebrusko.edupage.org/menu/mealsGuest?id=LFpbpn1"

# Celok, ktorý tu pôvodne zastrešoval všetkých päť škôl. Nie je to reálny subjekt,
# len artefakt toho, že seed mapoval jeden EduPage login na jeden celok.
STARY_CELOK = "MŠ Zdravé Bruško"

# (názov celku, adresa prevádzky, edupage_match)
SKOLY: list[tuple[str, str, str]] = [
    ("Deutsche schule", "Bárdošova 33, Bratislava", "dsb"),
    ("SŠ VETERINÁRNA", "Pod brehmi 6, Bratislava", "sšv"),
    ("ZŠ Malokarpatská", "Malokarpatské námestie 2, Lamač", "zšla"),
    # Desiata a olovrant majú jedinú spoločnú skratku `mšMal,Hey` — EduPage tie dve
    # škôlky pri týchto chodoch nerozlišuje. Deklarujú ju obe, takže počet padne
    # naplno každej z nich (viď feedback.md: dočasné, nadhodnocuje fakturáciu oboch).
    # Pri obede sú rozlíšené (`mšHey. NM/NG` vs `mšMal. NM/NG`).
    ("MŠ Heyrovského 4", "Heyrovského 4, Bratislava", "mšHey; mšMal,Hey"),
    (
        "MŠ Malokarpatké námestie 6",
        "Malokarpatské námestie 6, Bratislava",
        "mšMal; mšMal,Hey",
    ),
]


class Command(BaseCommand):
    help = "Rozdelí EduPage zdravebrusko na päť samostatných celkov."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")

    @transaction.atomic
    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        user = User.objects.filter(username=EMAIL).first()
        if user is None:
            self.stderr.write(f"✗ login neexistuje: {EMAIL}")
            return
        profil = UserProfile.objects.filter(user=user).first()
        if profil is None:
            self.stderr.write(f"✗ profil neexistuje pre {EMAIL}")
            return

        prevadzky: list[Prevadzka] = []
        for sort_order, (nazov, adresa, match) in enumerate(SKOLY, start=1):
            celok, celok_created = Celok.objects.get_or_create(
                nazov=nazov,
                defaults={"billing_name": nazov, "zdroj_objednavok": "edupage"},
            )
            if not celok_created and celok.zdroj_objednavok != "edupage":
                # Roster ich vedie ako `app`, lebo si dosiaľ objednávali priamo.
                celok.zdroj_objednavok = "edupage"
                celok.save(update_fields=["zdroj_objednavok"])

            prevadzka, _ = Prevadzka.objects.update_or_create(
                celok=celok,
                nazov=nazov,
                defaults={
                    "adresa": adresa,
                    "edupage_match": match,
                    "sort_order": sort_order,
                    "is_active": True,
                },
            )
            prevadzky.append(prevadzka)
            verb = "vytvorený" if celok_created else "aktualizovaný"
            self.stdout.write(f"  {nazov} ({match}) — celok {verb}")

            # Prevádzky, ktoré celku ostali z čias, keď si objednával v appke, by
            # scrape zhodil: bez `edupage_match` nemá viac-prevádzkový celok čo
            # priradiť. Deaktivujeme, nemažeme — visí na nich história.
            for stara in Prevadzka.objects.filter(celok=celok).exclude(pk=prevadzka.pk):
                self.stdout.write(f"    retirujem prevádzku '{stara.nazov}'")
                if not dry_run:
                    stara.is_active = False
                    stara.save(update_fields=["is_active"])

        # Login plní všetkých päť škôl naraz. `celok` mu necháme prázdny: ukázať
        # ním na jednu z piatich by klamalo — nepatrí ani pod jednu.
        if not dry_run:
            profil.mealsguest_url = MEALSGUEST_URL
            profil.is_edupage = True
            profil.celok = None
            profil.save(update_fields=["mealsguest_url", "is_edupage", "celok"])
            profil.prevadzky.set(prevadzky)
        self.stdout.write(
            f"  login {EMAIL} → {len(prevadzky)} prevádzok naprieč celkami"
        )

        # Starý zberný celok nechávame kvôli histórii. Od dneška vyššie sú jeho
        # objednávky duplicitné: nové samostatné celky ich prescrapujú za seba.
        stary = Celok.objects.filter(nazov=STARY_CELOK).first()
        if stary is not None:
            dnes = timezone.localdate()
            duplicitne = DailyOrder.objects.filter(
                prevadzka__celok=stary, date__gte=dnes
            )
            pocet = duplicitne.count()
            if pocet:
                self.stdout.write(
                    self.style.WARNING(
                        f"  '{STARY_CELOK}': mažem {pocet} objednávok od {dnes} "
                        "(duplikáty, nové celky ich prescrapujú)"
                    )
                )
                if not dry_run:
                    duplicitne.delete()

            for stara in Prevadzka.objects.filter(celok=stary):
                self.stdout.write(
                    f"  '{STARY_CELOK}': retirujem historickú prevádzku '{stara.nazov}'"
                )
                if not dry_run:
                    stara.is_active = False
                    stara.save(update_fields=["is_active"])

        if dry_run:
            self.stdout.write(self.style.WARNING("\n--dry-run: rollback"))
            transaction.set_rollback(True)

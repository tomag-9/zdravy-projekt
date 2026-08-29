"""
One-off command: notify all client logins about the switch to the new app
from 1.9.2026. See issue discussion / user request 2026-08-28.

Usage:
    python manage.py send_migration_notice_email --test-to you@example.com
    python manage.py send_migration_notice_email --live
"""

from django.conf import settings
from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.core.management.base import BaseCommand

SUBJECT = "Prechod na novú aplikáciu od 1.9.2026"

BODY = """\
Dobrý deň,

Od 1.9.2026 v Zdravom Projekte prechádzame pri nahlasovaní počtov stravníkov na našu novú webovú aplikáciu. Na Váš email ste dostali pozvánku s inštrukciami ako nastaviť vlastné heslo a ako používať túto našu novú aplikáciu.

Ak ste email nedostali, nedarí sa Vám prihlásiť alebo sa neviete prihlásiť, dajte prosím vedieť čím-skôr telefonicky na 0903186328.

Aplikáciu odporúčame pridať ako aplikáciu na plochu, výborne to funguje v Google Chrome alebo v Safari. Takto Vám budú chodiť aj všetky upozornenia a pripomienky na vytvorenie objednávok.

V priebehu augusta sme aplikáciu testovali a naraz používali na kontrolu aplikáciu a zároveň aj starý spôsob nahlasovania. Od 1.9.2026 (Utorok) budeme používať už len aplikáciu. Týmto pripomíname, že počty treba vypĺňať už len do aplikácie a časy na nahlasovanie sú nasledovné – pre raňajky/desiatu treba počty nahlásiť do 21:00 predchádzajúceho dňa. Pre obedy a olovranty treba počty nahlásiť do 7:35 daného dňa. Po týchto časoch už aplikácia neprijíma objednávky a akákoľvek neuložená objednávka nebude spracovaná. Aplikácia sama skopíruje počty z poslednej objednávky. To znamená, že ak aj nechcete odoberať stravu je potrebné do aplikácie nahlásiť počty 0 prosím.

Prosím, skúste si do pondelka pozrieť aplikáciu či Vám všetko funguje. Zároveň veľmi prosím o nahlásenie akýchkoľvek nových diétnych stravníkov a akékoľvek navyšovanie počtov.

Veríme, že táto zmena nám všetkým pomôže a posunieme sa zase o krok ďalej v službách pre Vás.

Za Zdravý Projekt pozdravuje Stano Šulc
"""


class Command(BaseCommand):
    help = (
        "Pošle oznam o prechode na novú aplikáciu všetkým loginom s rolou "
        "'klient'. Bez --live alebo --test-to iba vypíše počet a zoznam "
        "príjemcov (dry-run)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--test-to",
            help="Namiesto ostrého behu pošle jeden test email na túto adresu.",
        )
        parser.add_argument(
            "--live",
            action="store_true",
            help="Ostro pošle email všetkým klient loginom s vyplneným emailom.",
        )

    def handle(self, *args, **options):
        from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@example.com")

        if options["test_to"]:
            send_mail(
                subject=SUBJECT,
                message=BODY,
                from_email=from_email,
                recipient_list=[options["test_to"]],
                fail_silently=False,
            )
            self.stdout.write(
                self.style.SUCCESS(f"Test email odoslaný na {options['test_to']}.")
            )
            return

        qs = (
            User.objects.filter(profile__role="klient")
            .exclude(email="")
            .exclude(email__isnull=True)
            .order_by("email")
        )
        placeholder_suffixes = ("@edupage.local", "@example.com", "@system.local")
        emails = sorted(
            {u.email for u in qs if not u.email.lower().endswith(placeholder_suffixes)}
        )

        if not options["live"]:
            self.stdout.write(f"[DRY RUN] {len(emails)} unikátnych príjemcov:")
            for e in emails:
                self.stdout.write(f"  {e}")
            self.stdout.write(
                self.style.WARNING(
                    "Nič nebolo odoslané. Spusti s --live pre ostré odoslanie."
                )
            )
            return

        sent, failed = 0, []
        for e in emails:
            try:
                send_mail(
                    subject=SUBJECT,
                    message=BODY,
                    from_email=from_email,
                    recipient_list=[e],
                    fail_silently=False,
                )
                sent += 1
            except Exception as exc:  # noqa: BLE001
                failed.append((e, str(exc)))

        self.stdout.write(self.style.SUCCESS(f"Odoslané: {sent}/{len(emails)}"))
        if failed:
            self.stdout.write(self.style.ERROR(f"Zlyhalo ({len(failed)}):"))
            for e, err in failed:
                self.stdout.write(f"  {e}: {err}")

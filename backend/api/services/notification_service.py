"""Notification service – centralised transactional email sending."""

import logging
from pathlib import Path

from django.conf import settings
from django.contrib.auth.models import User
from django.core.mail import EmailMessage, send_mail

from ..utils import user_operation_name

logger = logging.getLogger(__name__)

#: Návod pre prevádzky, priložený k prvému (set-password) e-mailu — issue #475.
#: Žije v backende, nie v `docs/`, lebo backend image sa buildí z `backend/`
#: ako kontextu (viď docs/manualy/README.md).
OPERATIONS_MANUAL_PATH = (
    Path(__file__).resolve().parent.parent
    / "assets"
    / "manualy"
    / "navodpreprevadzky_zb.pdf"
)
OPERATIONS_MANUAL_FILENAME = "Navod-pre-prevadzky.pdf"

#: Úvod prvého e-mailu (text klienta, aktualizovaný 26. 8. 2026 — pôvodná verzia
#: bola z 18. 8. 2026). Prevádzka dostane pri založení loginu jediný e-mail, takže
#: vysvetlenie, PREČO má odteraz objednávať cez aplikáciu, patrí pred odkaz na
#: nastavenie hesla — nie do samostatnej správy, ktorú nikto nepošle (rovnaká
#: úvaha ako pri návode v prílohe). Text je klientov, meniť ho len po dohode s ním.
#: Dve miesta prevzaté doslovne z dodaného textu aj s tým, čo vyzerá ako preklep
#: (issue #530) — nemenené, kým to klient nepotvrdí:
#: - "kontaktuje" namiesto "kontaktujte" v poslednej vete,
#: - zdvojené "pre nich" v odseku o nových diétach.
ACCOUNT_SETUP_INTRO = """v Zdravom Projekte testujeme našu novú webovú aplikáciu \
na nahlasovanie stravy. V momente kedy budeme zabezpečovať stravu pre viac ako \
4000 stravníkov to už bude nevyhnutnosť. Od začiatku, kedy sme začali variť \
stravu pre Vaše deti používame excelovskú tabuľku pretkanú vzorcami, rôznymi \
farbami na rozoznanie škôlok a diét, súčtami a ešte inými poznámkami. Tabuľka \
mala prvé roky iba pár strán no v Júni tohto roka to už bolo vyše 17 strán a 100 \
subjektov. Na prípravu tejto tabuľky sú potrební dvaja ľudia, ktorí počas 1,5 \
hodiny nepretržite zapisujú Vaše nahlásené počty z emailov, starej aplikácie, \
whatsappu a sms, popríprade telefonátov. Kvôli neskoršiemu nahláseniu stravy nám \
potom mešká aj tabuľka a to sa samozrejme môže odzrkadliť na meškaní stravy pri \
dodaní u Vás. Preto potrebujeme všetky objednávky zlúčiť do jednej aplikácie.

Nová aplikácia má Vám aj nám uľahčiť nahlasovanie stravy, zamedziť chybovosti a \
ešte k tomu zrýchliť celý proces. Stále platí, že sa chceme zlepšovať vo všetkom \
čo robíme.

V tejto fáze testovania by sme Vás chceli poprosiť o pomoc. Nižšie si nájdete \
prihlasovacie údaje do aplikácie plus základné informácie s popisom a návodom.

Aplikácia je jednoduchá a všetky potrebné informácie na jej ovládanie sú aj priamo \
v aplikácii. Funguje na Windows počítači / Macbooku aj na smartfónoch a tabletoch.

Týmto by som Vás chcel poprosiť o nahlasovanie počtov tak ako nahlasujete doteraz, \
ale od zajtra Vás k tomu poprosím tie isté počty vyplniť aj do aplikácie. Je to \
kvôli našej internej kontrole a testovaniu. Stále platia časy uzatvorenia \
objednávok (raňajky/desiata do 21:00 predchádzajúceho dňa, obedy/olovranty do \
7:30 daného dňa).

Od 1.Septembra (1.9.2026) budeme na Vaše počty používať už len našu novú webovú \
aplikáciu, prosím zoznámte sa s aplikáciou a začnite ju používať. Je veľmi \
potrebné dodržiavať časy nahlasovania lebo aplikácia sa po tomto čase uzamkne a \
Vaše objednávky už nepošle a automaticky nakopíruje počty z predchádzajúceho dňa.

Zároveň Vás chcem poprosiť pred začiatkom roka nahlásiť všetky nové typy a \
kombinácie diét, nakoľko potrebujeme tieto diéty doplniť do aplikácie. Bez tohto \
kroku pre nich nebudete vedieť pre nich stravu objednať.

Zároveň odporúčam pridať si webovú appku ako záložku na plochu, ideálne pod \
Safari alebo Google Chrome.

Pre akékoľvek otázky nás prosím kontaktuje na 0903186328"""

#: Podpis pod prvým e-mailom — text je klientov, tak sa aj podpíše.
ACCOUNT_SETUP_SIGNATURE = (
    "Vopred ďakujem a verím, že touto cestou zlepšíme kvalitu našich služieb.\n\n"
    "Stanislav Šulc\nZdravý projekt"
)


class NotificationService:
    """Send transactional notification emails."""

    @staticmethod
    def send_account_setup_email(user: User, setup_url: str) -> None:
        """
        Send a new App user an email with a link to set their password.

        The návod pre prevádzky PDF rides along as an attachment (issue #475) —
        this is the first and often only email a new operation gets, so the
        instructions belong here rather than in a separate follow-up nobody
        sends. If the file is missing the email still goes out, just without
        the attachment and without the sentence announcing it.

        Failures are logged but not re-raised so the caller's transaction
        is not rolled back when the mail server is temporarily unavailable.
        """
        try:
            manual_available = OPERATIONS_MANUAL_PATH.is_file()
            if not manual_available:
                logger.warning(
                    "Operations manual not found at %s – sending setup email "
                    "without the attachment.",
                    OPERATIONS_MANUAL_PATH,
                )

            subject = "Vitajte – nastavte si heslo"
            manual_paragraph = (
                "V prílohe nájdete návod pre prevádzky — riaďte sa ním pri "
                "objednávaní a vydávaní jedál.\n\n"
                if manual_available
                else ""
            )
            message = (
                f"Dobrý deň {user_operation_name(user)},\n\n"
                f"{ACCOUNT_SETUP_INTRO}\n\n"
                "Bol vám vytvorený účet v systéme Zdravý projekt.\n\n"
                "Pre aktiváciu účtu si prosím nastavte heslo kliknutím na odkaz nižšie:\n"
                f"{setup_url}\n\n"
                "Odkaz je platný 7 dní.\n\n"
                f"{manual_paragraph}"
                "Ak ste o tento účet nežiadali, tento e-mail ignorujte.\n\n"
                f"{ACCOUNT_SETUP_SIGNATURE}"
            )
            from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@example.com")

            if manual_available:
                # send_mail() cannot carry attachments — go one level down.
                email = EmailMessage(
                    subject=subject,
                    body=message,
                    from_email=from_email,
                    to=[user.email],
                )
                email.attach(
                    OPERATIONS_MANUAL_FILENAME,
                    OPERATIONS_MANUAL_PATH.read_bytes(),
                    "application/pdf",
                )
                email.send(fail_silently=False)
            else:
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=from_email,
                    recipient_list=[user.email],
                    fail_silently=False,
                )

            logger.info("Account setup email sent to %s", user.email)
        except Exception as exc:  # noqa: BLE001
            logger.error(
                "Failed to send account setup email to %s: %s", user.email, exc
            )

    @staticmethod
    def send_api_user_registered_email(user: User) -> None:
        """
        Notify an API user that their account has been registered.

        Failures are logged but not re-raised.
        """
        try:
            subject = "Registrácia účtu – Zdravý projekt"
            message = (
                f"Dobrý deň {user_operation_name(user)},\n\n"
                "Bol vám zaregistrovaný API účet v systéme Zdravý projekt.\n\n"
                "V prípade otázok nás kontaktujte.\n\n"
                "S pozdravom, Tím Zdravý projekt"
            )

            send_mail(
                subject=subject,
                message=message,
                from_email=getattr(
                    settings, "DEFAULT_FROM_EMAIL", "noreply@example.com"
                ),
                recipient_list=[user.email],
                fail_silently=False,
            )

            logger.info("API user registered email sent to %s", user.email)
        except Exception as exc:  # noqa: BLE001
            logger.error(
                "Failed to send API user registered email to %s: %s", user.email, exc
            )

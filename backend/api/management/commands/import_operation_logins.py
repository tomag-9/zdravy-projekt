"""Import app logins from the private ``prevadzky.csv`` credentials file.

The CSV is intentionally not committed or copied into the application image.  Run this
command manually after the delivery-layout and merge seeds.  One login is created per
Celok; when several CSV rows belong to that Celok, the first row in delivery order is
the canonical credential and the login gets the normal multi-prevádzka picker.

EduPage rows are read only for validation and are never assigned a new login.  A row is
considered EduPage-managed when its CSV password is ``existujúci`` or its production
Prevádzka has an EduPage connection.
"""

from __future__ import annotations

import csv
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path

from django.contrib.auth.models import Group, User
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.core.validators import validate_email
from django.db import transaction
from django.db.models import Q

from api.models import Celok, Prevadzka, ProfilePrevadzkaAccess, UserProfile

from .reconcile_real import _normalize
from .seed_real_delivery_layout import DELIVERY_ROWS, DeliverySeedRow

CSV_NAME = "meno prevadzky"
CSV_EMAIL = "email"
CSV_PASSWORD = "heslo"
CSV_COLUMNS = {CSV_NAME, CSV_EMAIL, CSV_PASSWORD}


@dataclass(frozen=True)
class CredentialRow:
    line: int
    name: str
    email: str
    password: str
    prevadzka: Prevadzka


def _credential_keys(row: DeliverySeedRow) -> set[str]:
    return {
        key
        for value in (
            row.name,
            row.prevadzka_name,
            row.login_name,
            row.alias,
            *row.match_names,
        )
        if (key := _normalize(value))
    }


def _delivery_rows_by_login_name() -> dict[str, list[DeliverySeedRow]]:
    result: dict[str, list[DeliverySeedRow]] = defaultdict(list)
    for row in DELIVERY_ROWS:
        for key in _credential_keys(row):
            if row not in result[key]:
                result[key].append(row)
    return result


def _read_csv(path: Path) -> list[dict[str, str]]:
    if not path.is_file():
        raise CommandError(f"{path}: súbor neexistuje")
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        columns = set(reader.fieldnames or [])
        if not CSV_COLUMNS.issubset(columns):
            missing = ", ".join(sorted(CSV_COLUMNS - columns))
            raise CommandError(f"{path}: chýbajú CSV stĺpce: {missing}")
        return [
            {key: str(value or "").strip() for key, value in raw.items()}
            for raw in reader
        ]


def _resolve_prevadzka(row: DeliverySeedRow, *, line: int) -> Prevadzka:
    query = Q()
    for name in (
        row.prevadzka_name,
        row.name,
        row.alias,
        *row.match_names,
    ):
        if name.strip():
            query |= Q(nazov__iexact=name.strip())
    matches = list(Prevadzka.objects.filter(query).distinct())
    if not matches:
        raise CommandError(
            f"riadok {line}: prevádzka {row.prevadzka_name!r} neexistuje; "
            "najprv spusti seed_real_delivery_layout a seed_merge_celky"
        )
    if len(matches) > 1:
        raise CommandError(
            f"riadok {line}: názov prevádzky {row.prevadzka_name!r} nie je jednoznačný"
        )
    return matches[0]


def _is_existing_password(value: str) -> bool:
    return _normalize(value) == "existujuci"


def _validate_email(value: str, *, line: int) -> str:
    email = value.casefold()
    try:
        validate_email(email)
    except ValidationError as exc:
        raise CommandError(f"riadok {line}: neplatný e-mail {value!r}") from exc
    return email


def _accessible_ids(profile: UserProfile) -> set[int]:
    return set(profile.dostupne_prevadzky().values_list("id", flat=True))


class Command(BaseCommand):
    help = "Vytvorí jeden app login na Celok z privátneho prevadzky.csv."

    def add_arguments(self, parser):
        parser.add_argument("csv_path", help="Cesta k privátnemu prevadzky.csv")
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Skontroluje celý import a na konci vráti transakciu späť.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        path = Path(options["csv_path"])
        raw_rows = _read_csv(path)
        delivery_by_name = _delivery_rows_by_login_name()
        occurrence: dict[str, int] = defaultdict(int)
        grouped: dict[int, list[CredentialRow]] = defaultdict(list)
        skipped_existing = 0
        skipped_edupage = 0

        for line, raw in enumerate(raw_rows, start=2):
            name = raw[CSV_NAME]
            key = _normalize(name)
            candidates = delivery_by_name.get(key, [])
            index = occurrence[key]
            occurrence[key] += 1
            if not candidates:
                raise CommandError(
                    f"riadok {line}: prevádzka {name!r} nie je v delivery seede"
                )
            if index >= len(candidates):
                raise CommandError(
                    f"riadok {line}: priveľa CSV výskytov prevádzky {name!r}"
                )

            prevadzka = _resolve_prevadzka(candidates[index], line=line)
            if _is_existing_password(raw[CSV_PASSWORD]):
                skipped_existing += 1
                continue
            if prevadzka.edupage_connection_id is not None:
                skipped_edupage += 1
                continue
            if not raw[CSV_PASSWORD]:
                raise CommandError(f"riadok {line}: prázdne heslo pre {name!r}")

            email = _validate_email(raw[CSV_EMAIL], line=line)
            if email.endswith("@edupage.local"):
                raise CommandError(
                    f"riadok {line}: nový app login nesmie používať @edupage.local"
                )
            grouped[prevadzka.celok_id].append(
                CredentialRow(
                    line=line,
                    name=name,
                    email=email,
                    password=raw[CSV_PASSWORD],
                    prevadzka=prevadzka,
                )
            )

        created = 0
        existing = 0
        ignored_alternate_emails = 0
        email_to_celok: dict[str, int] = {}

        for celok_id, credentials in grouped.items():
            celok = Celok.objects.get(pk=celok_id)
            canonical = credentials[0]
            prior_celok = email_to_celok.setdefault(canonical.email, celok_id)
            if prior_celok != celok_id:
                raise CommandError(
                    f"e-mail {canonical.email!r} je priradený viacerým celkom"
                )

            alternate_emails = {row.email for row in credentials[1:]}
            alternate_emails.discard(canonical.email)
            ignored_alternate_emails += len(alternate_emails)
            alternate_query = Q()
            for email in alternate_emails:
                alternate_query |= Q(username__iexact=email) | Q(email__iexact=email)
            conflicting_alternate = (
                User.objects.filter(alternate_query).first()
                if alternate_emails
                else None
            )
            if conflicting_alternate is not None:
                raise CommandError(
                    f"alternatívny e-mail {conflicting_alternate.email!r} už existuje; "
                    "import ho nemôže bezpečne zlúčiť"
                )

            app_prevadzky = list(
                celok.prevadzky.filter(
                    is_active=True,
                    edupage_connection__isnull=True,
                ).order_by("sort_order", "id")
            )
            expected_ids = {prevadzka.id for prevadzka in app_prevadzky}
            if not expected_ids:
                raise CommandError(f"celok {celok.nazov!r} nemá app prevádzku")

            user = User.objects.filter(
                Q(username__iexact=canonical.email) | Q(email__iexact=canonical.email)
            ).first()
            user_created = user is None
            if user is None:
                user = User.objects.create_user(
                    username=canonical.email,
                    email=canonical.email,
                    password=canonical.password,
                )
                profile = UserProfile(user=user, company_name=celok.nazov)
                profile._skip_default_facility = True
                profile.save()
                # Vždy explicitný scope: ak sa celok alebo jeho nová prevádzka neskôr
                # prepne na EduPage, tento app login ju nesmie automaticky zdediť.
                ProfilePrevadzkaAccess.objects.bulk_create(
                    [
                        ProfilePrevadzkaAccess(
                            profile=profile,
                            prevadzka=prevadzka,
                        )
                        for prevadzka in app_prevadzky
                    ]
                )
                created += 1
            else:
                if user.is_staff or user.is_superuser:
                    raise CommandError(
                        f"e-mail {canonical.email!r} patrí administrátorskému účtu"
                    )
                try:
                    profile = user.profile
                except UserProfile.DoesNotExist as exc:
                    raise CommandError(
                        f"existujúci účet {canonical.email!r} nemá profil"
                    ) from exc
                if _accessible_ids(profile) != expected_ids:
                    raise CommandError(
                        f"existujúci účet {canonical.email!r} má iný rozsah prevádzok"
                    )
                existing += 1

            client_group, _ = Group.objects.get_or_create(name="Client")
            user.groups.add(client_group)
            self.stdout.write(
                f"  {'+' if user_created else '='} {canonical.email} → "
                f"{celok.nazov} ({len(expected_ids)} prevádzok)"
            )

        prefix = "[dry-run] " if options["dry_run"] else ""
        self.stdout.write(
            self.style.SUCCESS(
                f"{prefix}{len(raw_rows)} CSV riadkov → {created} nových, "
                f"{existing} existujúcich app loginov; "
                f"preskočené: {skipped_existing} existujúcich hesiel, "
                f"{skipped_edupage} EduPage prevádzok; "
                f"{ignored_alternate_emails} alternatívnych e-mailov zlúčených celkov"
            )
        )
        if options["dry_run"]:
            transaction.set_rollback(True)

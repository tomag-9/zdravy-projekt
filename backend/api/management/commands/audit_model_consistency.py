"""Read-only consistency audit for legacy and canonical domain models."""

from decimal import Decimal, InvalidOperation

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError
from django.db.models import Count
from django.db.models.functions import Lower, Trim

from api.models import Celok, DailyOrder, PortionType, Prevadzka, UserProfile


class Command(BaseCommand):
    help = "Skontroluje modelove nekonzistencie bez akejkolvek zmeny dat."

    def add_arguments(self, parser):
        parser.add_argument(
            "--fail-on-issues",
            action="store_true",
            help="Vrati nenulovy exit code, ak audit najde aspon jeden problem.",
        )

    def handle(self, *args, **options):
        checks = [
            (
                "duplicate_user_emails",
                self._duplicate_user_emails(),
                "case-insensitive duplicitne prihlasovacie emaily",
            ),
            (
                "duplicate_celok_names",
                self._duplicate_celok_names(),
                "case-insensitive duplicitne nazvy celkov",
            ),
            (
                "duplicate_prevadzka_names",
                self._duplicate_prevadzka_names(),
                "case-insensitive duplicitne nazvy prevadzok v jednom celku",
            ),
        ]
        checks.extend(self._profile_checks())
        checks.extend(
            [
                (
                    "edupage_prevadzky_without_connection",
                    Prevadzka.objects.filter(
                        celok__zdroj_objednavok=Celok.ZdrojObjednavok.EDUPAGE,
                        edupage_connection__isnull=True,
                    ).count(),
                    "EduPage prevadzky bez pripojenia",
                ),
                (
                    "app_prevadzky_with_edupage_connection",
                    Prevadzka.objects.filter(
                        celok__zdroj_objednavok=Celok.ZdrojObjednavok.APP,
                        edupage_connection__isnull=False,
                    ).count(),
                    "app prevadzky s EduPage pripojenim",
                ),
                (
                    "orphan_celky",
                    Celok.objects.filter(prevadzky__isnull=True).count(),
                    "celky bez prevadzky",
                ),
                (
                    "invalid_billing_coefficients",
                    self._invalid_billing_coefficients(),
                    "prevadzky s neplatnym alebo neznamym billing koeficientom",
                ),
            ]
        )

        issue_total = 0
        self.stdout.write("Model consistency audit")
        for key, count, description in checks:
            issue_total += count
            status = "OK" if count == 0 else "ISSUE"
            self.stdout.write(f"{status:5} {key}: {count} ({description})")

        orders_without_actor = DailyOrder.objects.filter(user__isnull=True).count()
        self.stdout.write(
            "INFO  orders_without_actor: "
            f"{orders_without_actor} (zachovana historia po zmazani loginu)"
        )
        self.stdout.write(f"TOTAL issues: {issue_total}")

        if options["fail_on_issues"] and issue_total:
            raise CommandError(f"Model consistency audit found {issue_total} issues.")

    @staticmethod
    def _duplicate_user_emails() -> int:
        return (
            User.objects.exclude(email="")
            .values(normalized=Lower(Trim("email")))
            .annotate(total=Count("pk"))
            .filter(total__gt=1)
            .count()
        )

    @staticmethod
    def _duplicate_celok_names() -> int:
        return (
            Celok.objects.values(normalized=Lower(Trim("nazov")))
            .annotate(total=Count("pk"))
            .filter(total__gt=1)
            .count()
        )

    @staticmethod
    def _duplicate_prevadzka_names() -> int:
        return (
            Prevadzka.objects.values("celok_id", normalized=Lower(Trim("nazov")))
            .annotate(total=Count("pk"))
            .filter(total__gt=1)
            .count()
        )

    @staticmethod
    def _profile_checks():
        counters = {
            "profiles_without_active_prevadzka": 0,
            "profiles_with_mixed_access_scope": 0,
        }
        profiles = (
            UserProfile.objects.all()
            .prefetch_related(
                "celok_accesses__celok__prevadzky",
                "prevadzka_accesses__prevadzka",
            )
            .iterator(chunk_size=200)
        )

        for profile in profiles:
            celok_accesses = list(profile.celok_accesses.all())
            prevadzka_accesses = list(profile.prevadzka_accesses.all())
            available_prevadzky = {
                prevadzka.pk
                for access in celok_accesses
                for prevadzka in access.celok.prevadzky.all()
                if prevadzka.is_active
            }
            available_prevadzky.update(
                access.prevadzka_id
                for access in prevadzka_accesses
                if access.prevadzka.is_active
            )

            if not available_prevadzky:
                counters["profiles_without_active_prevadzka"] += 1
            if celok_accesses and prevadzka_accesses:
                counters["profiles_with_mixed_access_scope"] += 1

        labels = {
            "profiles_without_active_prevadzka": (
                "profily bez dostupnej aktivnej prevadzky"
            ),
            "profiles_with_mixed_access_scope": (
                "profily s celok aj prevadzka access zaznamami"
            ),
        }
        return [(key, count, labels[key]) for key, count in counters.items()]

    @staticmethod
    def _invalid_billing_coefficients() -> int:
        portion_names = set(PortionType.objects.values_list("name", flat=True))
        invalid = 0
        for prevadzka in Prevadzka.objects.only("billing_portion_coefficients"):
            coefficients = prevadzka.billing_portion_coefficients
            if not isinstance(coefficients, dict):
                invalid += 1
                continue
            if set(coefficients) - portion_names:
                invalid += 1
                continue
            try:
                for value in coefficients.values():
                    Decimal(str(value))
            except (InvalidOperation, TypeError, ValueError):
                invalid += 1
        return invalid

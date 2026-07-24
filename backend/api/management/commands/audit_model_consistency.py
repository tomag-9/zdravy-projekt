"""Read-only consistency audit for legacy and canonical domain models."""

from decimal import Decimal, InvalidOperation

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError
from django.db.models import Count
from django.db.models.functions import Lower, Trim

from api.models import (
    Celok,
    ClientSettings,
    DailyOrder,
    PortionType,
    Prevadzka,
    UserProfile,
)


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
                    "edupage_celky_without_url",
                    Celok.objects.filter(
                        zdroj_objednavok=Celok.ZdrojObjednavok.EDUPAGE,
                        mealsguest_url="",
                    ).count(),
                    "EduPage celky bez mealsGuest URL",
                ),
                (
                    "app_celky_with_edupage_config",
                    Celok.objects.filter(zdroj_objednavok=Celok.ZdrojObjednavok.APP)
                    .exclude(mealsguest_url="", edupage_api_identifier="")
                    .count(),
                    "app celky s vyplnenou EduPage konfiguraciou",
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
            "profile_celok_metadata_mismatches": 0,
            "profile_edupage_config_mismatches": 0,
            "client_settings_prevadzka_mismatches": 0,
        }
        profiles = (
            UserProfile.objects.select_related("celok", "user__settings")
            .prefetch_related(
                "prevadzky__celok",
                "celok__prevadzky",
                "user__settings__visible_diets",
            )
            .iterator(chunk_size=200)
        )

        for profile in profiles:
            explicit_prevadzky = [
                prevadzka
                for prevadzka in profile.prevadzky.all()
                if prevadzka.is_active
            ]
            if explicit_prevadzky:
                available_prevadzky = explicit_prevadzky
            elif profile.celok_id:
                available_prevadzky = [
                    prevadzka
                    for prevadzka in profile.celok.prevadzky.all()
                    if prevadzka.is_active
                ]
            else:
                available_prevadzky = []

            if not available_prevadzky:
                counters["profiles_without_active_prevadzka"] += 1

            if profile.celok_id:
                for field in ("billing_name", "ico", "dic"):
                    legacy_value = (getattr(profile, field, "") or "").strip()
                    canonical_value = (getattr(profile.celok, field, "") or "").strip()
                    if legacy_value and legacy_value != canonical_value:
                        counters["profile_celok_metadata_mismatches"] += 1

            configured_as_edupage = bool(
                profile.is_edupage or profile.mealsguest_url or profile.api_identifier
            )
            if configured_as_edupage:
                celky = {}
                if profile.celok_id:
                    celky[profile.celok_id] = profile.celok
                for prevadzka in explicit_prevadzky:
                    celky[prevadzka.celok_id] = prevadzka.celok
                if not celky:
                    counters["profile_edupage_config_mismatches"] += 1
                for celok in celky.values():
                    if (
                        profile.is_edupage
                        and celok.zdroj_objednavok != Celok.ZdrojObjednavok.EDUPAGE
                    ):
                        counters["profile_edupage_config_mismatches"] += 1
                    if (
                        profile.mealsguest_url
                        and profile.mealsguest_url != celok.mealsguest_url
                    ):
                        counters["profile_edupage_config_mismatches"] += 1
                    if (
                        profile.api_identifier
                        and profile.api_identifier != celok.edupage_api_identifier
                    ):
                        counters["profile_edupage_config_mismatches"] += 1

            try:
                settings = profile.user.settings
            except ClientSettings.DoesNotExist:
                settings = None
            if settings is not None:
                settings_diets = {diet.pk for diet in settings.visible_diets.all()}
                for prevadzka in available_prevadzky:
                    mismatch = (
                        settings.visible_menus != prevadzka.visible_menus
                        or settings.visible_meals != prevadzka.visible_meals
                        or settings.admin_order_note != prevadzka.admin_order_note
                        or settings_diets
                        != set(prevadzka.visible_diets.values_list("pk", flat=True))
                    )
                    if mismatch:
                        counters["client_settings_prevadzka_mismatches"] += 1

        labels = {
            "profiles_without_active_prevadzka": (
                "profily bez dostupnej aktivnej prevadzky"
            ),
            "profile_celok_metadata_mismatches": (
                "rozdielne legacy a kanonicke fakturacne polia"
            ),
            "profile_edupage_config_mismatches": (
                "rozdiely EduPage konfiguracie medzi profilom a celkom"
            ),
            "client_settings_prevadzka_mismatches": (
                "rozdiely nastaveni medzi loginom a prevadzkou"
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

"""
Create or remove deterministic throwaway users for production-safe load tests.

The users are intentionally boring and predictable so k6 can derive credentials
without storing a generated secrets file in the repository.
"""

from __future__ import annotations

from dataclasses import dataclass

from django.conf import settings
from django.contrib.auth.models import Group, User
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from api.models import ClientSettings, DailyOrder, UserProfile

PROD_CONFIRMATION = "LOAD_TEST_PROD"
CLEANUP_CONFIRMATION = "DELETE_LOAD_TEST_USERS"


@dataclass(frozen=True)
class LoadTestUserSpec:
    index: int
    email_prefix: str
    email_domain: str

    @property
    def email(self) -> str:
        return f"{self.email_prefix}{self.index:03d}@{self.email_domain}".lower()

    @property
    def company_name(self) -> str:
        return f"Load test prevadzka {self.index:03d}"


class Command(BaseCommand):
    help = "Create or remove throwaway client users for controlled load testing"

    def add_arguments(self, parser):
        parser.add_argument("--count", type=int, default=150)
        parser.add_argument("--start-index", type=int, default=1)
        parser.add_argument("--email-prefix", default="zp-loadtest-")
        parser.add_argument("--email-domain", default="loadtest.local")
        parser.add_argument("--password", default="")
        parser.add_argument("--visible-menus", default="A,B,V")
        parser.add_argument("--visible-meals", default="breakfast,lunch,olovrant")
        parser.add_argument(
            "--cleanup",
            action="store_true",
            help="Delete matching load-test users instead of creating them.",
        )
        parser.add_argument(
            "--confirm-cleanup",
            default="",
            help=f"Required with --cleanup. Must be exactly {CLEANUP_CONFIRMATION}.",
        )
        parser.add_argument(
            "--allow-production",
            action="store_true",
            help="Allow this command to run when DEBUG=False.",
        )
        parser.add_argument(
            "--confirm-production",
            default="",
            help=f"Required with --allow-production. Must be exactly {PROD_CONFIRMATION}.",
        )

    def handle(self, *args, **options):
        count = options["count"]
        start_index = options["start_index"]
        cleanup = options["cleanup"]
        email_prefix = options["email_prefix"].strip().lower()
        email_domain = options["email_domain"].strip().lower()

        if count < 1:
            raise CommandError("--count must be at least 1.")
        if start_index < 1:
            raise CommandError("--start-index must be at least 1.")
        if not email_prefix:
            raise CommandError("--email-prefix cannot be empty.")
        if not email_domain or "@" in email_domain:
            raise CommandError("--email-domain must be a domain, e.g. loadtest.local.")

        self._guard_environment(options)

        specs = [
            LoadTestUserSpec(
                index=i,
                email_prefix=email_prefix,
                email_domain=email_domain,
            )
            for i in range(start_index, start_index + count)
        ]

        if cleanup:
            self._cleanup_users(specs, options)
            return

        password = options["password"]
        if not password:
            raise CommandError("--password is required when creating users.")
        if len(password) < 12:
            raise CommandError("--password must be at least 12 characters.")

        visible_menus = self._parse_csv(options["visible_menus"])
        visible_meals = self._parse_csv(options["visible_meals"])
        if not visible_menus:
            raise CommandError("--visible-menus must include at least one menu.")
        if not visible_meals:
            raise CommandError("--visible-meals must include at least one meal.")

        self._create_users(specs, password, visible_menus, visible_meals)

    def _guard_environment(self, options) -> None:
        if settings.DEBUG:
            return

        if not options["allow_production"]:
            raise CommandError(
                "Refusing to run with DEBUG=False. Pass --allow-production "
                f"--confirm-production {PROD_CONFIRMATION} for a deliberate prod run."
            )
        if options["confirm_production"] != PROD_CONFIRMATION:
            raise CommandError(
                f"--confirm-production must be exactly {PROD_CONFIRMATION}."
            )

    @staticmethod
    def _parse_csv(value: str) -> list[str]:
        return [part.strip() for part in value.split(",") if part.strip()]

    @transaction.atomic
    def _create_users(
        self,
        specs: list[LoadTestUserSpec],
        password: str,
        visible_menus: list[str],
        visible_meals: list[str],
    ) -> None:
        client_group, _ = Group.objects.get_or_create(name="Client")

        created = 0
        updated = 0
        for spec in specs:
            user, was_created = User.objects.get_or_create(
                username=spec.email,
                defaults={
                    "email": spec.email,
                    "first_name": "Load",
                    "last_name": f"Test {spec.index:03d}",
                    "is_active": True,
                },
            )
            user.email = spec.email
            user.first_name = "Load"
            user.last_name = f"Test {spec.index:03d}"
            user.is_active = True
            user.is_staff = False
            user.is_superuser = False
            user.set_password(password)
            user.save()
            user.groups.add(client_group)

            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.company_name = spec.company_name
            profile.billing_name = spec.company_name
            profile.save(update_fields=["company_name", "billing_name"])

            client_settings, _ = ClientSettings.objects.get_or_create(user=user)
            client_settings.visible_menus = visible_menus
            client_settings.visible_meals = visible_meals
            client_settings.save()

            if was_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Load-test users ready: created={created}, updated={updated}, "
                f"range={specs[0].email}..{specs[-1].email}"
            )
        )

    @transaction.atomic
    def _cleanup_users(self, specs: list[LoadTestUserSpec], options) -> None:
        if options["confirm_cleanup"] != CLEANUP_CONFIRMATION:
            raise CommandError(
                f"--confirm-cleanup must be exactly {CLEANUP_CONFIRMATION}."
            )

        emails = [spec.email for spec in specs]
        queryset = User.objects.filter(username__in=emails, email__in=emails)
        count = queryset.count()
        deleted_orders, _ = DailyOrder.objects.filter(user__in=queryset).delete()
        queryset.delete()
        self.stdout.write(
            self.style.WARNING(
                f"Deleted {count} load-test users and {deleted_orders} generated "
                "order rows."
            )
        )

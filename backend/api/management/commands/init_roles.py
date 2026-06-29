import os

from django.contrib.auth.models import Group, User
from django.core.management.base import BaseCommand

from api.models import ClientSettings, UserProfile

DEMO_ADMIN_EMAIL = "admin@example.com"
DEMO_ADMIN_PASSWORD = "admin"
DEMO_OPERATION_EMAIL = "prevadzka@example.com"
DEMO_OPERATION_PASSWORD = "prevadzka"


class Command(BaseCommand):
    help = "Initialize roles and, outside production, optional demo users"

    def add_arguments(self, parser):
        parser.add_argument(
            "--create-default-users",
            action="store_true",
            help=(
                "Create the legacy demo admin/prevadzka users. This is refused "
                "when DJANGO_SETTINGS_MODULE points to production."
            ),
        )

    def handle(self, *args, **options):
        roles = ["Client", "Admin", "Staff"]
        for role_name in roles:
            group, created = Group.objects.get_or_create(name=role_name)
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created group "{role_name}"'))
            else:
                self.stdout.write(f'Group "{role_name}" already exists')

        settings_module = os.environ.get("DJANGO_SETTINGS_MODULE", "")
        is_production = settings_module.endswith(".prod")
        create_default_users = options["create_default_users"] or not is_production

        if not create_default_users:
            self.stdout.write(
                self.style.SUCCESS(
                    "Production mode detected: roles initialized; default demo users skipped."
                )
            )
            return

        if is_production:
            raise RuntimeError(
                "Refusing to create default users with weak passwords in production."
            )

        admin_user, created = self._get_or_create_demo_user(
            email=DEMO_ADMIN_EMAIL,
            legacy_username="admin",
            is_staff=True,
            is_superuser=True,
        )
        admin_user.is_staff = True
        admin_user.is_superuser = True
        admin_user.set_password(DEMO_ADMIN_PASSWORD)
        admin_user.save()
        admin_group = Group.objects.get(name="Admin")
        admin_user.groups.add(admin_group)

        if created:
            self.stdout.write(
                self.style.SUCCESS(f'Created superuser "{DEMO_ADMIN_EMAIL}"')
            )
            self.stdout.write(
                self.style.WARNING(
                    "SECURITY WARNING: Created default admin user with weak password. CHANGE IN PRODUCTION!"
                )
            )
        else:
            self.stdout.write(f'Superuser "{DEMO_ADMIN_EMAIL}" already exists')

        operation_user, created = self._get_or_create_demo_user(
            email=DEMO_OPERATION_EMAIL,
            legacy_username="prevadzka",
            is_staff=False,
            is_superuser=False,
        )
        operation_user.is_staff = False
        operation_user.is_superuser = False
        operation_user.set_password(DEMO_OPERATION_PASSWORD)
        operation_user.save()
        client_group = Group.objects.get(name="Client")
        operation_user.groups.add(client_group)
        profile, _ = UserProfile.objects.get_or_create(user=operation_user)
        if not profile.company_name:
            profile.company_name = "Demo prevádzka"
        if not profile.billing_name:
            profile.billing_name = "Demo prevádzka, s.r.o."
        profile.save()
        ClientSettings.objects.get_or_create(user=operation_user)

        if created:
            self.stdout.write(self.style.SUCCESS('Created operation user "prevadzka"'))
            self.stdout.write(
                self.style.WARNING(
                    "SECURITY WARNING: Created default prevádzka user with weak password. CHANGE IN PRODUCTION!"
                )
            )
        else:
            self.stdout.write(f'Operation user "{DEMO_OPERATION_EMAIL}" already exists')

    def _get_or_create_demo_user(
        self,
        *,
        email: str,
        legacy_username: str,
        is_staff: bool,
        is_superuser: bool,
    ) -> tuple[User, bool]:
        user = User.objects.filter(email__iexact=email).first()
        if user:
            return user, False

        legacy_user = User.objects.filter(username=legacy_username).first()
        if legacy_user:
            legacy_user.username = email
            legacy_user.email = email
            legacy_user.save(update_fields=["username", "email"])
            return legacy_user, False

        user = User.objects.create_user(
            username=email,
            email=email,
            is_staff=is_staff,
            is_superuser=is_superuser,
        )
        return user, True

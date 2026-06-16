from django.contrib.auth.models import Group, User
from django.core.management.base import BaseCommand

from api.models import ClientSettings, UserProfile


class Command(BaseCommand):
    help = "Initialize roles (groups) and test users"

    def handle(self, *args, **options):
        roles = ["Client", "Admin", "Staff"]
        for role_name in roles:
            group, created = Group.objects.get_or_create(name=role_name)
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created group "{role_name}"'))
            else:
                self.stdout.write(f'Group "{role_name}" already exists')

        # Create Admin User
        admin_user, created = User.objects.get_or_create(
            username="admin",
            defaults={
                "email": "admin@example.com",
                "is_staff": True,
                "is_superuser": True,
            },
        )
        if created:
            admin_user.set_password("admin")
            admin_user.save()
            admin_group = Group.objects.get(name="Admin")
            admin_user.groups.add(admin_group)
            self.stdout.write(self.style.SUCCESS('Created superuser "admin"'))
            self.stdout.write(
                self.style.WARNING(
                    "SECURITY WARNING: Created default 'admin' user with weak password. CHANGE IN PRODUCTION!"
                )
            )
        else:
            self.stdout.write('Superuser "admin" already exists')

        # Create default operation user
        operation_user, created = User.objects.get_or_create(
            username="prevadzka",
            defaults={"email": "prevadzka@example.com"},
        )
        if created:
            operation_user.set_password("prevadzka")
            operation_user.save()
            client_group = Group.objects.get(name="Client")
            operation_user.groups.add(client_group)
            UserProfile.objects.get_or_create(
                user=operation_user,
                defaults={
                    "company_name": "Demo prevádzka",
                    "billing_name": "Demo prevádzka, s.r.o.",
                },
            )
            ClientSettings.objects.get_or_create(user=operation_user)
            self.stdout.write(self.style.SUCCESS('Created operation user "prevadzka"'))
            self.stdout.write(
                self.style.WARNING(
                    "SECURITY WARNING: Created default 'prevadzka' user with weak password. CHANGE IN PRODUCTION!"
                )
            )
        else:
            self.stdout.write('Operation user "prevadzka" already exists')

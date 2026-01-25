from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group, User
from django.db.utils import IntegrityError

class Command(BaseCommand):
    help = 'Initialize roles (groups) and test users'

    def handle(self, *args, **options):
        roles = ['Client', 'Admin', 'Staff']
        for role_name in roles:
            group, created = Group.objects.get_or_create(name=role_name)
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created group "{role_name}"'))
            else:
                self.stdout.write(f'Group "{role_name}" already exists')

        # Create Admin User
        try:
            admin_user = User.objects.create_superuser('admin', 'admin@example.com', 'admin')
            admin_group = Group.objects.get(name='Admin')
            admin_user.groups.add(admin_group)
            self.stdout.write(self.style.SUCCESS('Created superuser "admin"'))
        except IntegrityError:
            self.stdout.write('Superuser "admin" already exists')
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'Could not create superuser: {e}'))

        # Create Client User
        try:
            client_user = User.objects.create_user('client', 'client@example.com', 'client')
            client_group = Group.objects.get(name='Client')
            client_user.groups.add(client_group)
            self.stdout.write(self.style.SUCCESS('Created user "client"'))
        except IntegrityError:
            self.stdout.write('User "client" already exists')
        except Exception as e:
           self.stdout.write(self.style.WARNING(f'Could not create client user: {e}'))

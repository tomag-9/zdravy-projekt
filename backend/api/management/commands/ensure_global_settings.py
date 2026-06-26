from django.core.management.base import BaseCommand

from api.models import GlobalSettings


class Command(BaseCommand):
    help = "Ensure the singleton GlobalSettings row exists."

    def handle(self, *args, **options):
        settings, created = GlobalSettings.objects.get_or_create(pk=1)

        if created:
            self.stdout.write(
                self.style.SUCCESS(
                    "Created GlobalSettings with default deadline settings."
                )
            )
            return

        self.stdout.write("GlobalSettings already exists.")

from contextlib import contextmanager

from django.core import management
from django.core.management.base import BaseCommand
from django.db import connection

BOOTSTRAP_LOCK_ID = 761_420_337


@contextmanager
def deploy_bootstrap_lock():
    if connection.vendor != "postgresql":
        yield
        return

    with connection.cursor() as cursor:
        cursor.execute("SELECT pg_advisory_lock(%s)", [BOOTSTRAP_LOCK_ID])

    try:
        yield
    finally:
        with connection.cursor() as cursor:
            cursor.execute("SELECT pg_advisory_unlock(%s)", [BOOTSTRAP_LOCK_ID])


class Command(BaseCommand):
    help = "Run the idempotent deploy bootstrap steps under a database lock."

    def add_arguments(self, parser):
        parser.add_argument(
            "--skip-migrate",
            action="store_true",
            help="Skip migrations. Intended for tests only.",
        )

    def handle(self, *args, **options):
        with deploy_bootstrap_lock():
            if not options["skip_migrate"]:
                management.call_command(
                    "migrate", verbosity=options.get("verbosity", 1)
                )

            management.call_command("init_roles", verbosity=options.get("verbosity", 1))
            management.call_command(
                "init_reference_data", verbosity=options.get("verbosity", 1)
            )
            management.call_command(
                "ensure_global_settings", verbosity=options.get("verbosity", 1)
            )
            management.call_command(
                "real_initial_seed_prevadzky",
                "--allow-prod",
                verbosity=options.get("verbosity", 1),
            )
            management.call_command(
                "sync_periodic_tasks", "--fix", verbosity=options.get("verbosity", 1)
            )

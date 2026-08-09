import os
from contextlib import contextmanager

from django.core import management
from django.core.management.base import BaseCommand
from django.db import connection

BOOTSTRAP_LOCK_ID = 761_420_337

# Set by compose/prod.yml from the same tag GitHub Actions builds and pushes
# images under (prod-<git sha>) — see .github/workflows/production.yml.
APP_VERSION_ENV_VAR = "APP_VERSION"


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
                "sync_periodic_tasks", "--fix", verbosity=options.get("verbosity", 1)
            )

        # Only reached once every step above completed without raising — a
        # failed bootstrap (start-backend.sh runs under `set -eu`) must never
        # log a "new version" entry (#446).
        self._log_new_version_if_changed()

    def _log_new_version_if_changed(self) -> None:
        version = os.environ.get(APP_VERSION_ENV_VAR, "").strip()
        if not version:
            # No version identifier available (e.g. local dev) — nothing
            # meaningful to log.
            return

        from api.models import EventLog
        from api.services.event_log_service import log_event

        last_version = (
            EventLog.objects.filter(event_type=EventLog.EventType.DEPLOY_VERSION)
            .order_by("-created_at")
            .values_list("payload__version", flat=True)
            .first()
        )
        if last_version == version:
            # Same version already logged (e.g. a container restart, or a
            # second replica coming up) — not a new deploy.
            return

        log_event(
            EventLog.EventType.DEPLOY_VERSION,
            actor_label="deploy",
            summary=f"Nasadená nová verzia: {version}.",
            payload={"version": version},
        )

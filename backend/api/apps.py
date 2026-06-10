import logging

from django.apps import AppConfig
from django.db.utils import OperationalError, ProgrammingError

logger = logging.getLogger(__name__)


class ApiConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "api"

    def ready(self):
        import api.signals  # noqa: F401  registers post_save on GlobalSettings

        # Self-heal startup path:
        # if tasks are missing (e.g., settings existed before signal deployment),
        # resync them automatically when backend boots.
        try:
            from api.models import GlobalSettings
            from api.signals import (
                _sync_auto_order_schedule,
                _sync_daily_report_schedule,
                _sync_push_reminder_schedule,
                _sync_weekly_reminder_schedule,
            )

            global_settings = GlobalSettings.objects.filter(pk=1).first()
            if global_settings is None:
                return

            _sync_auto_order_schedule(global_settings)
            _sync_daily_report_schedule(global_settings)
            _sync_push_reminder_schedule(global_settings)
            _sync_weekly_reminder_schedule()
            logger.info("Startup periodic-task sync completed.")
        except (OperationalError, ProgrammingError):
            # DB not ready yet (common during migrate/startup); skip silently.
            return
        except Exception:
            logger.exception("Startup periodic-task sync failed.")

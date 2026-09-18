from django.apps import AppConfig


class ApiConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "api"

    def ready(self):
        import api.signals  # noqa: F401  registers post_save on GlobalSettings
        from api.dev_clock import install as install_dev_clock

        install_dev_clock()

import os

from celery import Celery
from celery.signals import worker_process_init

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "app.settings.dev")

app = Celery("zdravy_projekt")

# Load config from Django settings, using CELERY_ prefix
app.config_from_object("django.conf:settings", namespace="CELERY")

# Auto-discover tasks from all installed apps
app.autodiscover_tasks()


# Prometheus metrics setup for Celery workers
@worker_process_init.connect
def setup_prometheus_multiprocess(*args, **kwargs):
    """
    Initialize Prometheus metrics collection for Celery worker processes.
    This ensures each worker process properly registers its metrics.
    """
    pass  # django-prometheus handles this automatically


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    """Debug task for testing Celery setup."""
    print(f"Request: {self.request!r}")

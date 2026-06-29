import logging

import pytest
from django.contrib.auth.models import User

from api.logging_buffer import clear_log_records

pytestmark = pytest.mark.integration


@pytest.fixture(autouse=True)
def clear_logs():
    clear_log_records()
    yield
    clear_log_records()


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        username="admin-logs@example.com",
        email="admin-logs@example.com",
        password="password",
        is_staff=True,
    )


@pytest.fixture
def client_user(db):
    return User.objects.create_user(
        username="client-logs@example.com",
        email="client-logs@example.com",
        password="password",
        is_staff=False,
    )


def test_admin_can_read_filtered_logs(api_client, admin_user):
    app_logger = logging.getLogger("api.tests.admin_logs")
    app_logger.info("ordinary sync complete")
    app_logger.warning("edupage import missing school code")
    app_logger.error("daily report failed")

    api_client.force_authenticate(user=admin_user)
    response = api_client.get(
        "/api/admin/logs/?level=ERROR,WARNING&search=edupage&limit=20"
    )

    assert response.status_code == 200
    data = response.json()
    assert data["count"] == 1
    assert data["results"][0]["level"] == "WARNING"
    assert data["results"][0]["message"] == "edupage import missing school code"
    assert "api.tests.admin_logs" in data["available_loggers"]


def test_client_cannot_read_logs(api_client, client_user):
    logging.getLogger("api.tests.admin_logs").error("private admin log")

    api_client.force_authenticate(user=client_user)
    response = api_client.get("/api/admin/logs/")

    assert response.status_code == 403

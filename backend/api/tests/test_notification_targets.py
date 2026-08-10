import pytest

from api.notification_targets import (
    DEFAULT_NOTIFICATION_TARGET,
    NOTIFICATION_TARGETS,
    resolve_notification_target,
)


def test_default_target_is_inbox():
    assert DEFAULT_NOTIFICATION_TARGET == "/inbox"
    assert DEFAULT_NOTIFICATION_TARGET in NOTIFICATION_TARGETS


@pytest.mark.parametrize("target", list(NOTIFICATION_TARGETS))
def test_resolve_accepts_every_supported_target(target):
    assert resolve_notification_target(target) == target


@pytest.mark.parametrize(
    "value",
    [None, "", "  ", "/admin/facilities", "https://evil.example/", "/inbox/../../"],
)
def test_resolve_falls_back_to_inbox_for_unsupported_values(value):
    assert resolve_notification_target(value) == "/inbox"

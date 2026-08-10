"""Supported internal target pages for manually-sent notifications (#443).

Kept as an explicit allowlist — never a free-text URL — so a chosen target
can never point the recipient somewhere they lack permission to open: every
entry here is a route reachable by any authenticated client (see the
ClientLayout routes in frontend/src/App.tsx). Mirrored in
frontend/src/lib/notificationTargets.ts; keep both in sync.
"""

from __future__ import annotations

DEFAULT_NOTIFICATION_TARGET = "/inbox"

NOTIFICATION_TARGETS: dict[str, str] = {
    "/inbox": "Inbox",
    "/home": "Domov",
    "/order": "Objednávka",
    "/menu": "Jedálny lístok",
    "/profile": "Profil",
    "/settings": "Nastavenia",
    "/about": "O aplikácii",
}


def resolve_notification_target(value: str | None) -> str:
    """Return `value` if it's a supported target page, otherwise the safe
    Inbox fallback. Never returns an unsupported/arbitrary URL."""
    value = (value or "").strip()
    return value if value in NOTIFICATION_TARGETS else DEFAULT_NOTIFICATION_TARGET

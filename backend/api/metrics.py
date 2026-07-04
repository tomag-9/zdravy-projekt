"""Custom Prometheus metrics not covered by django_prometheus's HTTP/DB defaults."""

from prometheus_client import Counter

login_attempts_total = Counter(
    "auth_login_attempts_total",
    "JWT login attempts by outcome",
    ["result"],  # "success" or "failure"
)

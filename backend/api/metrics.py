"""Custom Prometheus metrics not covered by django_prometheus's HTTP/DB defaults."""

from prometheus_client import Counter

login_attempts_total = Counter(
    "auth_login_attempts_total",
    "JWT login attempts by outcome",
    ["result", "reason"],
    # result: "success" or "failure"
    # reason: "success", "invalid_credentials", "throttled", or "validation_error"
    #   (any other BaseAPIException error_code falls through to "validation_error").
    #   Lets alerts tell "people mistyping passwords" (invalid_credentials, expected
    #   background noise) apart from "the global login rate cap is being hit"
    #   (throttled, load/possible-scripted-attack signal).
)

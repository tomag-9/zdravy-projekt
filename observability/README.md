# Observability

This directory holds the Grafana Alloy config and the Grafana dashboards for
the app. See `compose/observability.yml` and `compose/README.md` for how the
Alloy stack itself is run.

## What ships where

| Signal   | Path                                                            | Backend               |
|----------|------------------------------------------------------------------|------------------------|
| Errors   | `sentry_sdk` in `backend/app/settings/{prod,staging}.py`         | Sentry (`SENTRY_DSN`)  |
| Metrics  | `/metrics/` (django_prometheus) → Alloy `prometheus.scrape` → `prometheus.remote_write` | Grafana Cloud Prometheus/Mimir |
| Logs     | Docker container stdout → Alloy `loki.source.docker`             | Grafana Cloud Loki     |

Custom business metric: `auth_login_attempts_total{result="success"|"failure"}`
(`backend/api/metrics.py`, incremented in `EmailTokenObtainPairView.post`).

## One-time production setup

1. **Grafana Cloud**: create (or reuse) a free/pro Grafana Cloud stack. From
   the stack's "Connections → Data sources" or the onboarding page, grab:
   - Loki push URL + Loki basic-auth user/API key (a Cloud Access Policy
     token scoped to `logs:write` is enough).
   - Prometheus/Mimir remote-write URL + user/API key (scoped to
     `metrics:write`).
2. **Set env vars in Dokploy** for the `observability` stack, based on
   `env/observability.example`:
   - `GRAFANA_LOKI_URL`, `GRAFANA_LOKI_USER`, `GRAFANA_LOKI_API_KEY`
   - `GRAFANA_PROM_URL`, `GRAFANA_PROM_USER`, `GRAFANA_PROM_API_KEY`
   - `ALLOY_ENVIRONMENT` (`production` / `staging`)
   - `ALLOY_METRICS_TARGET` — the backend's address on `dokploy-network`
     (e.g. `zdravy-prod-backend:8000`; check the actual Dokploy service DNS
     name, it's not always just `backend`)
   - `DOKPLOY_NETWORK` if it differs from `dokploy-network`
3. **Deploy the Alloy stack** (once per host, not per app stack):
   ```bash
   docker compose --env-file <your prod env file> -f compose/observability.yml up -d
   ```
   Do this for staging too with its own `ALLOY_ENVIRONMENT=staging` and its
   own metrics target, either as a second Alloy container or a second stack —
   they can push to the same Grafana Cloud stack since every series is
   labelled `environment`.
4. **Set `SENTRY_DSN`** (and optionally `SENTRY_TRACES_SAMPLE_RATE`) in the
   `prod`/`staging` env vars in Dokploy — this is already wired in
   `backend/app/settings/prod.py` / `staging.py`, it just needs the value.
5. **Verify data is flowing** (wait ~1 min after deploy):
   - Grafana Cloud → Explore → Prometheus → run `up` → should show the
     `django` and `alloy` jobs as `1`.
   - Grafana Cloud → Explore → Loki → `{compose_service="backend"}` → should
     show live log lines.
   - Trigger a real error (or use Sentry's test event) → confirm it lands in
     the Sentry project tied to `SENTRY_DSN`.
6. **Import the dashboard**: Grafana Cloud → Dashboards → New → Import →
   upload `observability/grafana/dashboards/backend-overview.json` → pick
   your Prometheus data source when prompted. Repeat whenever the JSON file
   changes (re-import overwrites by UID, `zdravy-backend-overview`).

## Dashboard: `backend-overview.json`

One dashboard, templated by an `environment` variable (so the same dashboard
covers prod and staging — filter or compare with the variable dropdown), with
rows:

- **Golden Signals** — request rate, 5xx error rate, p50/p90/p95/p99 latency
  (stat tiles) + time series of status codes and latency percentiles.
- **Slowest & Busiest Endpoints** — top 15 views by p95 latency, top 15 views
  by request rate. This is where you find "which pages are slow" without
  needing new instrumentation — django_prometheus already labels every
  request by `view`.
- **Auth & Logins** — logins/failed logins in the last 24h, failure rate,
  and a time series of login attempts per hour (this is the practical way to
  see "peak login times" — read it as a graph rather than a single number,
  Prometheus doesn't have a native "peak hour" aggregate). A parallel panel
  shows overall request-rate over time for general peak-usage inspection.
- **Database & Cache** — query rate by vendor, DB query p95 latency, DB
  connection errors, cache hit rate, cache gets/hits/misses.
- **Exceptions & Infra Health** — unhandled exceptions by type/view (last
  1h), and whether the `django`/`alloy` scrape targets are up (catches "Alloy
  can't reach the backend" before you notice missing dashboards).

## Alerts to create in Grafana Cloud (Alerting → Alert rules)

There's no infra-as-code alert provisioning in this repo (Grafana Cloud
alerting is normally managed via its UI or Terraform, and this repo has
neither a Terraform setup nor an API key configured) — create these by hand
under the Grafana Cloud stack's **Alerting** section, evaluating against the
same Prometheus data source as the dashboard. Suggested starting set:

| Alert                     | Expression                                                                                                   | For   | Severity |
|---------------------------|-----------------------------------------------------------------------------------------------------------------|-------|----------|
| High 5xx error rate       | `100 * sum(rate(django_http_responses_total_by_status{status=~"5.."}[5m])) / sum(rate(django_http_responses_total_by_status[5m])) > 5` | 5m    | critical |
| Elevated 5xx error rate   | same expression `> 1`                                                                                          | 10m   | warning  |
| High p95 latency          | `histogram_quantile(0.95, sum by (le) (rate(django_http_requests_latency_seconds_by_view_method_bucket[5m]))) > 3` | 5m    | warning  |
| Backend scrape down       | `up{job="django"} == 0`                                                                                        | 2m    | critical |
| Alloy itself down         | `up{job="alloy"} == 0`                                                                                         | 5m    | warning  |
| DB connection errors      | `increase(django_db_new_connection_errors_total[5m]) > 0`                                                       | 1m    | critical |
| Possible brute-force login| `sum(increase(auth_login_attempts_total{result="failure"}[10m])) > 30`                                          | 0m    | warning  |
| Login failure rate spike  | `100 * sum(increase(auth_login_attempts_total{result="failure"}[15m])) / sum(increase(auth_login_attempts_total[15m])) > 50` | 5m    | warning  |
| Cache hit rate collapse   | `100 * sum(rate(django_cache_hits_total[10m])) / sum(rate(django_cache_get_total[10m])) < 50`                   | 10m   | warning  |

Route them to whatever contact point you set up (email/Slack/etc. under
Grafana Cloud → Alerting → Contact points). Sentry has its own, separate
alerting (Settings → Alerts on the Sentry project) for error-spike/new-issue
notifications — worth turning on there too since Prometheus alerts above
only see HTTP-level symptoms, not exception details.

## Known gaps / optional next steps

- **Host/container resource metrics** (CPU, memory, disk per container) are
  not collected — `compose/observability.yml` only scrapes the Django
  `/metrics/` endpoint, no `cadvisor`/`node_exporter`. Add them to that
  compose file and a `prometheus.scrape` block in `config.alloy` if you want
  infra-level dashboards/alerts (e.g. "container getting OOM-killed").
- **Celery** has no Prometheus metrics wired (no `django_prometheus` Celery
  signal hooks, no `celery-exporter`). Worker health today is only visible
  via Sentry (task exceptions) and container logs in Loki.
- **Peak-time analysis** is visual (read the time series), not a computed
  metric — Prometheus doesn't do "which hour of day is busiest" natively;
  that would need a recording rule + `avg by (hour)`-style bucketing, or
  exporting to Loki/BigQuery for a proper day-of-week heatmap. Flag if you
  want this built out.

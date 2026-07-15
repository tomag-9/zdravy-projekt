# Observability

This directory holds the Grafana Alloy config and the Grafana dashboards for
the app. See `compose/observability.yml` and `compose/README.md` for how the
Alloy stack itself is run.

## What ships where

| Signal   | Path                                                            | Backend               |
|----------|------------------------------------------------------------------|------------------------|
| Errors   | `sentry_sdk` in `backend/app/settings/{prod,staging}.py`         | Sentry (`SENTRY_DSN`)  |
| Metrics  | Django `/metrics/` + Alloy cAdvisor exporter → `prometheus.remote_write` | Grafana Cloud Prometheus/Mimir |
| Logs     | Docker container stdout → Alloy `loki.source.docker`             | Grafana Cloud Loki     |

Custom business metric: `auth_login_attempts_total{result="success"|"failure"}`
(`backend/api/metrics.py`, incremented in `EmailTokenObtainPairView.post`).

## Django metrics under Gunicorn

Production and staging run Django behind Gunicorn with multiple sync workers.
The backend image starts through `backend/start-backend.sh`, which:

1. runs `python manage.py deploy_bootstrap` without Prometheus multiprocess mode,
2. prepares a fresh `PROMETHEUS_MULTIPROC_DIR`,
3. exports that variable only for Gunicorn and its workers.

`backend/gunicorn.conf.py` also calls
`prometheus_client.multiprocess.mark_process_dead(...)` when a worker exits, so
live-gauge files do not accumulate for dead workers.

This makes Django HTTP/DB/cache counters and histograms aggregate across all
Gunicorn workers instead of whichever worker happened to serve `/metrics/`.
Do not build alerts from Django `process_*` metrics such as
`process_cpu_seconds_total` in this setup: the Prometheus Python client does
not expose process collectors through multiprocess aggregation. Use the
cAdvisor container metrics from Alloy for real CPU/memory/restart/OOM alerting.

The Alloy container runs with cAdvisor enabled through
`prometheus.exporter.cadvisor`. Docker deployments need the host mounts in
`compose/observability.yml` plus `privileged: true`; without those, cAdvisor may
only see the Alloy container itself. The relabel config keeps only containers
whose Docker name contains `zdravy-projekt` before remote-writing to Grafana
Cloud, which limits cardinality/cost while still covering backend, celery,
frontend, Postgres, Redis, and the observability container.

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
   - `ALLOY_METRICS_TARGET` — use **`backend:8000`**. Don't use the
     Swarm-generated task/service name Dokploy shows in `docker ps` (e.g.
     `zdravy-projekt-appstack-<id>_backend`) — it contains underscores, and
     Django's Host-header validation rejects any Host value that fails
     RFC 1034/1035 (`400 DisallowedHost`, silently swallowed as scrape
     failures with no metrics in Grafana).
     `backend` is the alias Compose implicitly assigns from the service name
     in `compose/prod.yml`/`compose/staging.yml` (no config needed — it's
     automatic), and it's allow-listed in `ALLOWED_HOSTS` in both settings
     files for exactly this reason. A custom, more descriptive alias
     (`zdravy-prod-backend`) was tried first but abandoned: this service is
     attached to 3 networks (`app`, `dokploy-network`, plus the implicit
     compose default) and Swarm's embedded DNS did not reliably register a
     custom `TaskTemplate` alias for it — only the implicit service-name
     alias (`backend`) resolved. Verified by exec-ing into a throwaway
     container on `dokploy-network` and running `getent hosts backend` vs.
     `getent hosts zdravy-prod-backend`.
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
- **Traffic Diagnostics** — HTTP/HTTPS split and view-vs-middleware latency,
  using Django metrics that are safe under Gunicorn multiprocess aggregation.
- **Container Runtime** — backend CPU/memory from cAdvisor, backend OOM events,
  and backend uptime based on `container_start_time_seconds`.

## Grafana Cloud alerting

Grafana alert rules live in Terraform under
`observability/terraform/grafana-alerts`. They evaluate against the same
Prometheus/Mimir data source as the dashboard. To let GitHub Actions validate
and plan changes, create these repository secrets:

- `GRAFANA_URL`
- `GRAFANA_AUTH`
- `GRAFANA_PROMETHEUS_DS_UID`

Optionally set repository variable `GRAFANA_ENVIRONMENT` if the target
environment label is not `production`.

The Terraform rule group currently manages this starting set:

| Alert                     | Expression                                                                                                   | For   | Severity |
|---------------------------|-----------------------------------------------------------------------------------------------------------------|-------|----------|
| High 5xx error rate       | `100 * sum(rate(django_http_responses_total_by_status_view_method_total{status=~"5..",view!~"health_check|prometheus-django-metrics"}[5m])) / sum(rate(django_http_responses_total_by_status_view_method_total{view!~"health_check|prometheus-django-metrics"}[5m])) > 5` | 5m    | critical |
| Elevated 5xx error rate   | same expression `> 1`                                                                                          | 10m   | warning  |
| High p95 latency          | `histogram_quantile(0.95, sum by (le) (rate(django_http_requests_latency_seconds_by_view_method_bucket{view!~"health_check|prometheus-django-metrics"}[5m]))) > 3` | 5m    | warning  |
| Backend scrape down       | `up{job="django"} == 0`                                                                                        | 2m    | critical |
| Alloy itself down         | `up{job="alloy"} == 0`                                                                                         | 5m    | warning  |
| DB connection errors      | `increase(django_db_new_connection_errors_total[5m]) > 0`                                                       | 1m    | critical |
| Backend OOM killed        | `sum(increase(container_oom_events_total{job="cadvisor",name=~".*backend.*"}[5m])) > 0`                         | 0m    | critical |
| Backend recently restarted| `time() - max(container_start_time_seconds{job="cadvisor",name=~".*backend.*",image!=""}) < 600`                | 0m    | warning  |
| Possible brute-force login| `sum(increase(auth_login_attempts_total{result="failure"}[10m])) > 30`                                          | 0m    | warning  |
| Login failure rate spike  | `100 * sum(increase(auth_login_attempts_total{result="failure"}[15m])) / sum(increase(auth_login_attempts_total[15m])) > 50` | 5m    | warning  |
| Cache hit rate collapse   | `100 * sum(rate(django_cache_hits_total[10m])) / sum(rate(django_cache_get_total[10m])) < 50`                   | 10m   | warning  |

Notification contact points and notification policies are still managed in the
Grafana UI. Terraform deliberately does not touch the notification policy tree
yet, because Grafana treats it as one shared resource and an incomplete import
can overwrite existing routing.

Sentry has its own, separate alerting (Settings → Alerts on the Sentry project)
for error-spike/new-issue notifications — worth turning on there too since
Prometheus alerts above only see HTTP-level symptoms, not exception details.

Avoid alerts on `process_cpu_seconds_total`, `process_resident_memory_bytes`,
or other Django `process_*` series while Gunicorn multiprocess mode is enabled;
they are not reliable app-level signals in this topology. The restart alert
will also fire after intentional deploys because a fresh container start is the
same signal as an unexpected replacement; mute it during planned releases.

## Known gaps / optional next steps

- **Host-level node metrics** (disk pressure, host CPU, host OOM killer totals)
  are still not collected. cAdvisor covers Docker/container CPU, memory,
  restarts, and `container_oom_events_total`; add `node_exporter` later if you
  want host-level alerts such as filesystem pressure or kernel-wide OOM kills.
- **Celery** has no Prometheus metrics wired (no `django_prometheus` Celery
  signal hooks, no `celery-exporter`). Worker health today is only visible
  via Sentry (task exceptions) and container logs in Loki.
- **Peak-time analysis** is visual (read the time series), not a computed
  metric — Prometheus doesn't do "which hour of day is busiest" natively;
  that would need a recording rule + `avg by (hour)`-style bucketing, or
  exporting to Loki/BigQuery for a proper day-of-week heatmap. Flag if you
  want this built out.

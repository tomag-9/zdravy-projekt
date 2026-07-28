# Compose Stacks

Compose files live here so Dokploy and local development use one predictable place.

- `dev.yml` runs the local development stack.
- `staging.yml` runs the Dokploy app stack for staging.
- `prod.yml` runs the Dokploy app stack for production.
- `observability.yml` runs a standalone Grafana Alloy stack.

Staging and production expect Postgres and Redis to be provided by
Dokploy-managed services, with connection strings injected through Dokploy
environment variables.

Production intentionally does not define Traefik routes; Dokploy owns the public
route configuration for that stack.

Monitoring is intentionally not embedded in the app stack. Django still exposes
Prometheus metrics at `/metrics/`; any future Alloy/Grafana setup should run as a
separate compose stack and scrape the app over the Dokploy network.

The observability stack expects Grafana Loki and Prometheus/Mimir remote-write
credentials through environment variables. Alloy discovers backend containers
itself over the Docker socket (see `observability/alloy/config.alloy`), scraping
one target per replica — no backend address needs to be configured.

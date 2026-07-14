# Grafana Alerts Terraform

This directory manages the Zdravy Projekt backend alert rules in Grafana Cloud.
The alerts use the same Prometheus/Mimir data source as
`observability/grafana/dashboards/backend-overview.json`.

## Values you need from Grafana

1. `GRAFANA_URL`
   - Your Grafana Cloud stack URL, for example `https://example.grafana.net`.
2. `GRAFANA_AUTH`
   - A Grafana service-account token.
   - Create it in Grafana Cloud under **Administration -> Users and access ->
     Service accounts**.
   - Use an Admin token first while wiring this up, then narrow permissions
     later if needed.
3. `GRAFANA_PROMETHEUS_DS_UID`
   - The UID of the Prometheus/Mimir data source used by the dashboard.
   - Find it in **Connections -> Data sources -> Prometheus/Mimir -> Settings**.
   - It also appears in the data-source edit URL.

Store these as GitHub repository secrets, not in this repo:

- `GRAFANA_URL`
- `GRAFANA_AUTH`
- `GRAFANA_PROMETHEUS_DS_UID`

Optional GitHub repository variable:

- `GRAFANA_ENVIRONMENT` (defaults to `production`)

## Local commands

```bash
cd observability/terraform/grafana-alerts

export TF_VAR_grafana_url="https://example.grafana.net"
export TF_VAR_grafana_auth="<service-account-token>"
export TF_VAR_prometheus_datasource_uid="<prometheus-datasource-uid>"
export TF_VAR_environment="production"

terraform init
terraform fmt -check -recursive
terraform validate
terraform plan
```

Apply intentionally remains a manual step until this repo has a remote
Terraform state backend. Running apply from ephemeral GitHub Actions state would
make future plans unreliable.

```bash
terraform apply
```

## Alerts

The rule group creates these alerts:

- High 5xx error rate
- Elevated 5xx error rate
- High p95 latency
- Backend scrape down
- Alloy scrape down
- DB connection errors
- Backend OOM killed
- Backend recently restarted
- Possible brute-force login
- Login failure rate spike
- Cache hit rate collapse

Notification contact points and notification policies are not managed here yet.
Those are intentionally left in the Grafana UI for now so this first Terraform
step cannot overwrite the existing notification tree.

terraform {
  required_version = ">= 1.6.0"

  # State is persisted on the self-hosted runner (see .github/workflows/
  # grafana-alerts.yml, which mounts a host dir to /state and passes
  # -backend-config=path=/state/terraform.tfstate on apply). PR jobs still run
  # `terraform init -backend=false`, so this block does not affect them.
  backend "local" {}

  required_providers {
    grafana = {
      source  = "grafana/grafana"
      version = ">= 2.9.0, < 5.0.0"
    }
  }
}

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    grafana = {
      source  = "grafana/grafana"
      version = ">= 2.9.0, < 5.0.0"
    }
  }
}

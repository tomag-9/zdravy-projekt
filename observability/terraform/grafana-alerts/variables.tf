variable "grafana_url" {
  description = "Grafana Cloud stack URL, for example https://example.grafana.net."
  type        = string
}

variable "grafana_auth" {
  description = "Grafana service-account token with permissions to manage alerting resources."
  type        = string
  sensitive   = true
}

variable "prometheus_datasource_uid" {
  description = "UID of the Grafana Cloud Prometheus/Mimir data source used by the backend dashboard."
  type        = string
}

variable "environment" {
  description = "Environment label value used by Alloy when remote-writing metrics."
  type        = string
  default     = "production"
}

variable "folder_title" {
  description = "Grafana folder where Terraform-managed alert rules are stored."
  type        = string
  default     = "Zdravy Projekt"
}

variable "alert_group_name" {
  description = "Grafana alert rule group name."
  type        = string
  default     = "Zdravy Projekt Backend"
}

variable "high_5xx_error_rate_percent" {
  description = "Critical 5xx error-rate threshold over the last 5 minutes."
  type        = number
  default     = 5
}

variable "elevated_5xx_error_rate_percent" {
  description = "Warning 5xx error-rate threshold over the last 10 minutes."
  type        = number
  default     = 1
}

variable "high_p95_latency_seconds" {
  description = "Warning threshold for backend p95 latency."
  type        = number
  default     = 3
}

variable "backend_recent_restart_seconds" {
  description = "How long after a backend container start to alert about a recent restart."
  type        = number
  default     = 600
}

variable "login_failure_count_threshold" {
  description = "Warning threshold for failed login attempts over 10 minutes."
  type        = number
  default     = 30
}

variable "login_failure_rate_percent" {
  description = "Warning threshold for failed login percentage over 15 minutes."
  type        = number
  default     = 50
}

variable "cache_hit_rate_percent" {
  description = "Warning threshold for cache hit rate over 10 minutes."
  type        = number
  default     = 50
}

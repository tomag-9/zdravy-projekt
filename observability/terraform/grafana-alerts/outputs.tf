output "grafana_folder_uid" {
  description = "UID of the Grafana folder containing Terraform-managed alerts."
  value       = grafana_folder.zdravy_project.uid
}

output "grafana_alert_group_name" {
  description = "Grafana alert rule group name."
  value       = grafana_rule_group.backend.name
}

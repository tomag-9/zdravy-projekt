locals {
  excluded_django_views = "health_check|prometheus-django-metrics"

  django_5xx_rate_percent = "100 * sum(rate(django_http_responses_total_by_status_view_method_total{environment=\"${var.environment}\",status=~\"5..\",view!~\"${local.excluded_django_views}\"}[5m])) / clamp_min(sum(rate(django_http_responses_total_by_status_view_method_total{environment=\"${var.environment}\",view!~\"${local.excluded_django_views}\"}[5m])), 0.001)"

  alert_rules = {
    high_5xx_error_rate = {
      name            = "High 5xx error rate"
      expr            = local.django_5xx_rate_percent
      math_expression = "$B > ${var.high_5xx_error_rate_percent}"
      for             = "5m"
      severity        = "critical"
      summary         = "Backend 5xx error rate is above ${var.high_5xx_error_rate_percent}%"
      description     = "Django is returning too many 5xx responses in ${var.environment}. Check Sentry, backend logs, DB health, and the busiest endpoints panel."
    }

    elevated_5xx_error_rate = {
      name            = "Elevated 5xx error rate"
      expr            = local.django_5xx_rate_percent
      math_expression = "$B > ${var.elevated_5xx_error_rate_percent}"
      for             = "10m"
      severity        = "warning"
      summary         = "Backend 5xx error rate is above ${var.elevated_5xx_error_rate_percent}%"
      description     = "Django is returning more 5xx responses than expected in ${var.environment}. Check whether this is a deploy, integration, or database issue."
    }

    high_p95_latency = {
      name            = "High p95 latency"
      expr            = "histogram_quantile(0.95, sum by (le) (rate(django_http_requests_latency_seconds_by_view_method_bucket{environment=\"${var.environment}\",view!~\"${local.excluded_django_views}\"}[5m])))"
      math_expression = "$B > ${var.high_p95_latency_seconds}"
      for             = "5m"
      severity        = "warning"
      summary         = "Backend p95 latency is above ${var.high_p95_latency_seconds}s"
      description     = "Request latency is high in ${var.environment}. Check slowest endpoints, DB p95 latency, and container CPU/memory."
    }

    backend_scrape_down = {
      name            = "Backend scrape down"
      expr            = "min(up{environment=\"${var.environment}\",job=\"django\"})"
      math_expression = "$B < 1"
      for             = "2m"
      no_data_state   = "Alerting"
      severity        = "critical"
      summary         = "Alloy cannot scrape the Django backend"
      description     = "The django scrape target is down in ${var.environment}. Check the Alloy stack, ALLOY_METRICS_TARGET, container networking, and backend health."
    }

    alloy_scrape_down = {
      name            = "Alloy scrape down"
      expr            = "min(up{environment=\"${var.environment}\",job=\"alloy\"})"
      math_expression = "$B < 1"
      for             = "5m"
      no_data_state   = "Alerting"
      severity        = "warning"
      summary         = "Alloy self-scrape is down"
      description     = "Alloy is not reporting its own scrape health in ${var.environment}. Metrics and logs may stop arriving in Grafana Cloud."
    }

    db_connection_errors = {
      name            = "DB connection errors"
      expr            = "sum(increase(django_db_new_connection_errors_total{environment=\"${var.environment}\"}[5m]))"
      math_expression = "$B > 0"
      for             = "1m"
      severity        = "critical"
      summary         = "Django is seeing database connection errors"
      description     = "Database connection errors appeared in ${var.environment}. Check Postgres availability, max connections, and backend logs."
    }

    backend_oom_killed = {
      name            = "Backend OOM killed"
      expr            = "sum(increase(container_oom_events_total{environment=\"${var.environment}\",job=\"cadvisor\",name=~\".*backend.*\"}[5m]))"
      math_expression = "$B > 0"
      for             = "0s"
      severity        = "critical"
      summary         = "Backend container had an OOM event"
      description     = "cAdvisor reported an OOM event for a backend container in ${var.environment}. Check memory usage, container limits, and recent traffic/jobs."
    }

    backend_recently_restarted = {
      name            = "Backend recently restarted"
      expr            = "time() - max(container_start_time_seconds{environment=\"${var.environment}\",job=\"cadvisor\",name=~\".*backend.*\",image!=\"\"})"
      math_expression = "$B < ${var.backend_recent_restart_seconds}"
      for             = "0s"
      severity        = "warning"
      summary         = "Backend container restarted recently"
      description     = "The backend container start time is fresh in ${var.environment}. This also fires after intentional deploys, so mute it during planned releases."
    }

    possible_bruteforce_login = {
      name            = "Possible brute-force login"
      expr            = "sum(increase(auth_login_attempts_total{environment=\"${var.environment}\",result=\"failure\"}[10m]))"
      math_expression = "$B > ${var.login_failure_count_threshold}"
      for             = "0s"
      severity        = "warning"
      summary         = "Failed login attempts are elevated"
      description     = "There were more than ${var.login_failure_count_threshold} failed login attempts in 10 minutes in ${var.environment}."
    }

    login_failure_rate_spike = {
      name            = "Login failure rate spike"
      expr            = "100 * sum(increase(auth_login_attempts_total{environment=\"${var.environment}\",result=\"failure\"}[15m])) / clamp_min(sum(increase(auth_login_attempts_total{environment=\"${var.environment}\"}[15m])), 1)"
      math_expression = "$B > ${var.login_failure_rate_percent}"
      for             = "5m"
      severity        = "warning"
      summary         = "Login failure rate is above ${var.login_failure_rate_percent}%"
      description     = "A high share of login attempts are failing in ${var.environment}. Check whether users are affected or someone is probing login."
    }

    cache_hit_rate_collapse = {
      name            = "Cache hit rate collapse"
      expr            = "100 * sum(rate(django_cache_hits_total{environment=\"${var.environment}\"}[10m])) / clamp_min(sum(rate(django_cache_get_total{environment=\"${var.environment}\"}[10m])), 0.001)"
      math_expression = "$B < ${var.cache_hit_rate_percent}"
      for             = "10m"
      severity        = "warning"
      summary         = "Cache hit rate is below ${var.cache_hit_rate_percent}%"
      description     = "Cache hit rate dropped in ${var.environment}. Check Redis availability and whether a deploy or batch job invalidated many keys."
    }
  }
}

resource "grafana_folder" "zdravy_project" {
  title = var.folder_title
}

resource "grafana_rule_group" "backend" {
  name             = var.alert_group_name
  folder_uid       = grafana_folder.zdravy_project.uid
  interval_seconds = 60
  org_id           = 1

  dynamic "rule" {
    for_each = local.alert_rules

    content {
      name      = rule.value.name
      condition = "C"
      for       = rule.value.for

      no_data_state  = lookup(rule.value, "no_data_state", "OK")
      exec_err_state = "Error"
      is_paused      = false

      labels = {
        environment = var.environment
        managed_by  = "terraform"
        service     = "backend"
        severity    = rule.value.severity
      }

      annotations = {
        summary     = rule.value.summary
        description = rule.value.description
      }

      data {
        ref_id         = "A"
        datasource_uid = var.prometheus_datasource_uid
        relative_time_range {
          from = 600
          to   = 0
        }
        model = jsonencode({
          datasource = {
            type = "prometheus"
            uid  = var.prometheus_datasource_uid
          }
          editorMode    = "code"
          expr          = rule.value.expr
          instant       = true
          intervalMs    = 1000
          legendFormat  = "__auto"
          maxDataPoints = 43200
          range         = false
          refId         = "A"
        })
      }

      data {
        ref_id         = "B"
        datasource_uid = "__expr__"
        relative_time_range {
          from = 600
          to   = 0
        }
        model = jsonencode({
          conditions = [
            {
              evaluator = {
                params = []
                type   = "gt"
              }
              operator = {
                type = "and"
              }
              query = {
                params = ["B"]
              }
              reducer = {
                params = []
                type   = "last"
              }
              type = "query"
            }
          ]
          datasource = {
            type = "__expr__"
            uid  = "__expr__"
          }
          expression    = "A"
          intervalMs    = 1000
          maxDataPoints = 43200
          reducer       = "last"
          refId         = "B"
          type          = "reduce"
        })
      }

      data {
        ref_id         = "C"
        datasource_uid = "__expr__"
        relative_time_range {
          from = 600
          to   = 0
        }
        model = jsonencode({
          conditions = [
            {
              evaluator = {
                params = [0]
                type   = "gt"
              }
              operator = {
                type = "and"
              }
              query = {
                params = ["C"]
              }
              reducer = {
                params = []
                type   = "last"
              }
              type = "query"
            }
          ]
          datasource = {
            type = "__expr__"
            uid  = "__expr__"
          }
          expression    = rule.value.math_expression
          intervalMs    = 1000
          maxDataPoints = 43200
          refId         = "C"
          type          = "math"
        })
      }
    }
  }
}

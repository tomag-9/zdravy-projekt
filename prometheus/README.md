# Prometheus Metrics for Zdravy Projekt

This directory contains Prometheus configuration for monitoring the Zdravy Projekt application.

## Overview

Prometheus is configured to collect comprehensive metrics from:
- Django application (HTTP requests, database queries, cache operations)
- Celery workers (task execution, failures, queue length)
- Prometheus itself (self-monitoring)

## Files

- `prometheus.yml` - Development environment configuration
- `prometheus.staging.yml` - Staging environment configuration
- `prometheus.prod.yml` - Production environment configuration
- `rules/alerts.yml` - Alerting rules for all environments

## Metrics Collected

### HTTP Metrics
- **Request rate**: Total requests per second by endpoint
- **Response times**: P50, P95, P99 latencies by endpoint
- **Status codes**: Distribution of 2xx, 4xx, 5xx responses
- **In-progress requests**: Current number of active requests

### Database Metrics
- **Query execution time**: P95, P99 query duration
- **Connection pool usage**: Active connections vs. limit
- **Query rate**: Database queries per second
- **Connection errors**: Database connection failures

### Cache Metrics
- **Hit rate**: Cache hit vs. miss ratio
- **Operations**: Cache get/set/delete operations per second
- **Operation latency**: Cache operation duration

### Celery Metrics
- **Task execution rate**: Tasks executed per second by type
- **Task duration**: P95, P99 task execution time
- **Task status**: Success/failure/retry counts
- **Queue length**: Number of pending tasks
- **Active workers**: Number of running Celery workers

### Business Metrics
- **Order creation rate**: Orders created per time period
- **Report generation**: Reports generated per time period
- **User registrations**: New user registrations per time period

## Accessing Prometheus

### Development
```bash
docker compose -f docker-compose.dev.yml up -d
# Access at http://localhost:9090
```

### Staging
```bash
docker compose -f docker-compose.staging.yml up -d
# Access through Cloudflare tunnel at:
# https://<staging-host>/prometheus/
```

### Production
```bash
docker compose -f docker-compose.prod.yml up -d
# Access at http://<production-host>:9090
# Recommendation: Secure with nginx auth or VPN
```

## Prometheus Web UI

### Viewing Metrics
1. Navigate to http://localhost:9090
2. Go to Graph
3. Enter a PromQL query (examples below)
4. Click Execute

### Useful PromQL Queries

#### Request Rate
```promql
rate(django_http_requests_total_by_view_transport_method_total[5m])
```

#### P95 Response Time
```promql
histogram_quantile(0.95, rate(django_http_requests_latency_seconds_by_view_method_bucket[5m]))
```

#### Error Rate Percentage
```promql
rate(django_http_responses_total_by_status_view_method_total{status=~"5.."}[5m]) 
/ 
rate(django_http_responses_total_by_status_view_method_total[5m]) * 100
```

#### Database Connection Usage
```promql
django_db_connections_total
```

#### Cache Hit Rate
```promql
rate(django_cache_get_hits_total[5m]) 
/ 
(rate(django_cache_get_hits_total[5m]) + rate(django_cache_get_misses_total[5m]))
```

#### Celery Task Rate
```promql
rate(django_celery_task_status_total[5m])
```

### Viewing Alerts
1. Navigate to http://localhost:9090/alerts
2. See active alerts and their status
3. Click an alert to see details

### Viewing Targets
1. Navigate to http://localhost:9090/targets
2. See all scrape targets and their health
3. Troubleshoot scrape failures

## Alerting Rules

Alerts are configured in `rules/alerts.yml` and include:

### Critical Alerts
- **CriticalErrorRate**: Error rate > 20% for 2+ minutes
- **VerySlowResponseTime**: P95 response time > 5s for 5+ minutes
- **DjangoApplicationDown**: Backend not responding to health checks
- **CeleryWorkerDown**: No active Celery workers

### Warning Alerts
- **HighErrorRate**: Error rate > 5% for 5+ minutes
- **SlowResponseTime**: P95 response time > 2s for 10+ minutes
- **DatabaseConnectionPoolExhausted**: Using > 45 connections (limit: 50)
- **CeleryTaskFailureRate**: Task failure rate > 10% for 5+ minutes
- **CeleryQueueBacklog**: > 100 pending tasks for 10+ minutes
- **LowCacheHitRate**: Cache hit rate < 70% for 15+ minutes

## Connecting External Grafana

See [GRAFANA_SETUP.md](../docs/GRAFANA_SETUP.md) for detailed instructions on:
- Connecting Grafana Cloud or self-hosted Grafana to Prometheus
- Creating comprehensive dashboards
- Setting up alerting
- Pre-built dashboard imports

## Configuration Updates

### Reload Configuration
To reload Prometheus configuration without restarting:
```bash
# Send SIGHUP to Prometheus container
docker compose kill -s SIGHUP prometheus

# Or use the reload API (if --web.enable-lifecycle is set)
curl -X POST http://localhost:9090/-/reload
```

### Adding New Scrape Targets
Edit the appropriate `prometheus.*.yml` file and add to `scrape_configs`:
```yaml
- job_name: 'new-service'
  static_configs:
    - targets: ['service:port']
      labels:
        service: 'service-name'
```

Then reload the configuration.

### Adding New Alert Rules
1. Edit `rules/alerts.yml`
2. Add new rules under appropriate group
3. Reload configuration
4. Verify at http://localhost:9090/alerts

## Data Retention

Prometheus is configured to retain metrics for **30 days** (`--storage.tsdb.retention.time=30d`).

To change retention:
1. Edit the `prometheus` service in docker-compose files
2. Update the `--storage.tsdb.retention.time` flag
3. Restart Prometheus

## Backup and Restore

### Backup Prometheus Data
```bash
# Stop Prometheus
docker compose stop prometheus

# Backup the volume
docker run --rm -v zdravy-projekt_prometheus_data_dev:/data -v $(pwd)/backup:/backup alpine tar czf /backup/prometheus-backup-$(date +%Y%m%d).tar.gz -C /data .

# Start Prometheus
docker compose start prometheus
```

### Restore Prometheus Data
```bash
# Stop Prometheus
docker compose stop prometheus

# Restore from backup
docker run --rm -v zdravy-projekt_prometheus_data_dev:/data -v $(pwd)/backup:/backup alpine sh -c "cd /data && tar xzf /backup/prometheus-backup-YYYYMMDD.tar.gz"

# Start Prometheus
docker compose start prometheus
```

## Security Considerations

### Production Security
1. **Do not expose port 9090 publicly** - Use VPN, SSH tunnel, or authenticated proxy
2. **Use nginx with basic auth**:
   ```nginx
   location /prometheus/ {
       auth_basic "Prometheus";
       auth_basic_user_file /etc/nginx/.htpasswd;
       proxy_pass http://prometheus:9090/;
   }
   ```
3. **Limit network access** - Use firewall rules to restrict access
4. **Use HTTPS** - Terminate SSL at nginx or load balancer

### Authentication Options
- **Basic Auth**: Simple username/password via nginx
- **OAuth**: Use oauth2-proxy for Google/GitHub/etc auth
- **VPN**: Only allow access through VPN
- **SSH Tunnel**: `ssh -L 9090:localhost:9090 user@server`

## Troubleshooting

### Metrics Not Appearing
1. Check if Django is exposing metrics:
   ```bash
   curl http://localhost:8000/metrics
   ```
2. Check Prometheus targets: http://localhost:9090/targets
3. Check for scrape errors in Prometheus logs:
   ```bash
   docker compose logs prometheus
   ```

### High Memory Usage
Prometheus memory usage scales with:
- Number of metrics
- Cardinality (unique label combinations)
- Retention period

Solutions:
- Reduce retention time
- Drop unused metrics using relabel_configs
- Increase memory limit in docker-compose

### Slow Queries
1. Use query analysis: http://localhost:9090/graph
2. Check for high cardinality metrics
3. Use recording rules for frequently-used complex queries

## Advanced Features

### Recording Rules
For frequently-used expensive queries, create recording rules that pre-compute results:

```yaml
groups:
  - name: example_recording_rules
    interval: 30s
    rules:
      - record: job:api_request_rate:5m
        expr: rate(django_http_requests_total[5m])
```

### Federation
To aggregate metrics from multiple Prometheus instances:

```yaml
scrape_configs:
  - job_name: 'federate'
    scrape_interval: 15s
    honor_labels: true
    metrics_path: '/federate'
    params:
      'match[]':
        - '{job="django"}'
    static_configs:
      - targets:
        - 'prometheus-staging:9090'
        - 'prometheus-prod:9090'
```

## Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [PromQL Basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [django-prometheus GitHub](https://github.com/korfuri/django-prometheus)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/)
- [Grafana Setup Guide](../docs/GRAFANA_SETUP.md)

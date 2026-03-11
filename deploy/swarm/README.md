# Docker Swarm Deployment

Compact reference for the production/staging Swarm stack in `deploy/swarm/`.

## What Runs Here

- `docker-api-rewrite`: manager-only nginx proxy in front of the Docker socket.
- `traefik`: ingress and routing, published on host ports `80` and `8080`.
- `frontend`: SPA served on port `80` inside the cluster.
- `backend`: Django API and admin on port `8000`.
- `redis`: cache and Celery broker.
- `celery`: background workers, `2` replicas.
- `celery-beat`: scheduled jobs, `1` replica.
- `prometheus`: metrics collection.
- `loki`: log storage.
- `promtail`: log shipping, global on all nodes.
- External dependencies: PostgreSQL, SMTP, container registry, optional Sentry.

## Networks

- `app`: app-to-app traffic.
- `observability`: metrics and logging traffic.
- `docker_proxy`: Traefik -> docker API rewrite sidecar.

## Request Flow

```mermaid
flowchart LR
  User[User Browser] --> Traefik[Traefik\nports 80 and 8080]
  Traefik -->|PathPrefix /| Frontend[frontend\nnginx port 80]
  Traefik -->|PathPrefix /api and /admin| Backend[backend\nDjango port 8000]
  Traefik -->|PathPrefix /static and /media| Backend
```

## Control Plane And Routing

```mermaid
flowchart LR
  Traefik[traefik] -->|Swarm provider| DockerAPI[docker-api-rewrite]
  DockerAPI -->|read-only socket proxy| DockerSock[/docker.sock/]
  Traefik -->|routes public HTTP| Frontend[frontend]
  Traefik -->|routes api and admin| Backend[backend]
```

## Internal Service Dependencies

```mermaid
flowchart LR
  Backend[backend] --> Postgres[(external PostgreSQL)]
  Backend --> Redis[(redis)]
  Celery[celery x2] --> Redis
  Celery --> Postgres
  CeleryBeat[celery-beat] --> Redis
  CeleryBeat --> Postgres
  Prometheus[prometheus] -->|scrapes /metrics/| Backend
  Prometheus -->|self-scrape| Prometheus
  Promtail[promtail] -->|docker_sd via socket| DockerSock[/docker.sock/]
  Promtail --> Loki[(loki)]
```

## Swarm Placement

```mermaid
flowchart TB
  subgraph Manager_Node[manager node]
    DockerAPI[docker-api-rewrite]
    Traefik[traefik]
  end

  subgraph Any_Node_A[swarm node A]
    Frontend[frontend]
    Backend[backend]
    Redis[redis]
    Prometheus[prometheus]
    Loki[loki]
    PromtailA[promtail]
  end

  subgraph Any_Node_B[swarm node B]
    Celery1[celery]
    Celery2[celery]
    CeleryBeat[celery-beat]
    PromtailB[promtail]
  end

  Traefik --- DockerAPI
  Backend --- Redis
  Backend --- Prometheus
  Celery1 --- Redis
  Celery2 --- Redis
  CeleryBeat --- Redis
```

## Secrets And Configs

Secrets expected by `stack.yml`:

- `django_secret_key`
- `postgres_password`
- `email_host_password`
- `sentry_dsn`

Versioned configs created from this directory:

- `traefik_nginx_main`
- `traefik_nginx_proxy`
- `traefik_config`
- `prometheus_config`
- `loki_config`
- `promtail_config`

`STACK_CONFIG_VERSION` is used to generate new config object names during deploys.

## Required Environment

Main variables are shown in `deploy/swarm/swarm.env.example`:

- `REGISTRY_URL`
- `APP_IMAGE_TAG`
- `APP_HOST`
- `APP_HOST_WWW`
- `LETSENCRYPT_EMAIL`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_HOST`
- `POSTGRES_PORT`
- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_HOST_USER`
- `DEFAULT_FROM_EMAIL`

## Deploy

```bash
cd deploy/swarm
./validate-stack.sh

docker stack deploy -c stack.yml zdravy
```

## Verify

```bash
docker stack services zdravy
docker service ps zdravy_backend
docker service logs --tail 100 zdravy_backend
```

## Health Checks

- Backend container health: `http://localhost:8000/api/health/`
- Prometheus health: `http://prometheus:9090/-/healthy`
- Traefik is published on host ports `80` and `8080`

## Notes

- `traefik` and `docker-api-rewrite` are pinned to manager nodes.
- `promtail` runs in `global` mode, one task per node.
- `backend`, `celery`, and `celery-beat` join both `app` and `observability` networks.
- Prometheus currently scrapes `backend:8000/metrics/` and itself.
- Traefik uses the Swarm provider through `docker-api-rewrite` with provider network `zdravy_app`.

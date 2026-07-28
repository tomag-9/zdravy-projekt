# Load Tests

These tests exercise the real authenticated order flow:

1. login through `/api/token/`
2. optionally read `/api/orders/planned/`
3. submit to `/api/orders/`
4. clean up throwaway users and their orders

The default scenario submits exactly 150 client orders over 5 minutes
(`30/min`). CI uses the same path with a tiny smoke profile.

## Safety Rules

- Use only throwaway users created by `seed_load_test_users`.
- Use a future weekday `ORDER_DATE`; avoid holidays and dates whose ordering
  deadline has already passed.
- Run full production tests outside peak usage.
- Watch Grafana while any staging or production run is active.
- Always run cleanup after a manual staging/production test.

Abort a run if 5xx rises above 1%, p95 stays above 3 seconds, DB connection
errors appear, or backend health checks start flapping.

## Local Dev / CI Smoke

The wrapper starts the dev Docker stack, seeds users, runs dockerized k6, and
cleans up automatically:

```bash
scripts/run-order-load-test.sh
```

For the same profile used by CI:

```bash
USER_COUNT=3 MAX_SUBMITS=3 RATE=6 DURATION=30s PRE_ALLOCATED_VUS=2 MAX_VUS=6 \
USER_EMAIL_DOMAIN=ci.loadtest.local \
scripts/run-order-load-test.sh
```

CI runs this smoke profile on PRs to `main`/`develop`, pushes to `main`, and
manual workflow dispatch.

## Staging

Staging is the preferred place for repeated load-test tuning. The documented
staging host is `zp.tomag.xyz`; override it if Dokploy uses a different
`STAGING_HOST`.

Generate one password and keep it for both seed and k6:

```bash
export LOAD_TEST_PASSWORD="$(openssl rand -base64 24)"
export STAGING_HOST="zp.tomag.xyz"
export LOAD_TEST_DOMAIN="staging-loadtest.zdravyprojekt.local"
export ORDER_DATE="2026-07-16"
```

Run this inside the staging backend container or Dokploy backend shell:

```bash
python manage.py seed_load_test_users \
  --allow-production \
  --confirm-production LOAD_TEST_PROD \
  --count 150 \
  --email-domain "$LOAD_TEST_DOMAIN" \
  --password "$LOAD_TEST_PASSWORD"
```

Run the full 150-submit scenario from your machine:

```bash
BASE_URL="https://${STAGING_HOST}" \
PASSWORD="$LOAD_TEST_PASSWORD" \
USER_EMAIL_DOMAIN="$LOAD_TEST_DOMAIN" \
USER_COUNT=150 \
MAX_SUBMITS=150 \
RATE=30 \
DURATION=5m \
PRE_ALLOCATED_VUS=30 \
MAX_VUS=150 \
ORDER_DATE="$ORDER_DATE" \
k6 run load-tests/k6/order-submit-150-in-5m.js
```

For a smaller staging smoke:

```bash
BASE_URL="https://${STAGING_HOST}" \
PASSWORD="$LOAD_TEST_PASSWORD" \
USER_EMAIL_DOMAIN="$LOAD_TEST_DOMAIN" \
USER_COUNT=10 \
MAX_SUBMITS=10 \
RATE=10 \
DURATION=1m \
PRE_ALLOCATED_VUS=5 \
MAX_VUS=20 \
ORDER_DATE="$ORDER_DATE" \
k6 run load-tests/k6/order-submit-150-in-5m.js
```

Cleanup from the staging backend shell:

```bash
python manage.py seed_load_test_users \
  --cleanup \
  --confirm-cleanup DELETE_LOAD_TEST_USERS \
  --allow-production \
  --confirm-production LOAD_TEST_PROD \
  --count 150 \
  --email-domain "$LOAD_TEST_DOMAIN"
```

## Production

Production uses the same commands as staging, but should be run rarely and only
with active monitoring. Set `PROD_HOST` to the real public production host from
Dokploy, not the placeholder in `env/prod.example`.

```bash
export LOAD_TEST_PASSWORD="$(openssl rand -base64 24)"
export PROD_HOST="YOUR_PROD_HOST"
export LOAD_TEST_DOMAIN="prod-loadtest.zdravyprojekt.local"
export ORDER_DATE="2026-07-16"
```

Seed from the production backend container or Dokploy backend shell:

```bash
python manage.py seed_load_test_users \
  --allow-production \
  --confirm-production LOAD_TEST_PROD \
  --count 150 \
  --email-domain "$LOAD_TEST_DOMAIN" \
  --password "$LOAD_TEST_PASSWORD"
```

Run the full production scenario from your machine:

```bash
BASE_URL="https://${PROD_HOST}" \
PASSWORD="$LOAD_TEST_PASSWORD" \
USER_EMAIL_DOMAIN="$LOAD_TEST_DOMAIN" \
USER_COUNT=150 \
MAX_SUBMITS=150 \
RATE=30 \
DURATION=5m \
PRE_ALLOCATED_VUS=30 \
MAX_VUS=150 \
ORDER_DATE="$ORDER_DATE" \
k6 run load-tests/k6/order-submit-150-in-5m.js
```

Cleanup from the production backend shell:

```bash
python manage.py seed_load_test_users \
  --cleanup \
  --confirm-cleanup DELETE_LOAD_TEST_USERS \
  --allow-production \
  --confirm-production LOAD_TEST_PROD \
  --count 150 \
  --email-domain "$LOAD_TEST_DOMAIN"
```

## Measured Capacity (2026-07-28)

Ran locally against a backend container built and started exactly like prod
(`start-backend.sh` → gunicorn, `app.settings.staging`, real PBKDF2 password
hashing — not the dev MD5 hasher). Prod is a **single** backend replica (no
autoscaling), so a resource-capped local container is a faithful proxy for
its ceiling. Prod's actual host: 2 CPU cores, 3.82 GB RAM (Dokploy).

**1 CPU (initial, before the host spec was confirmed):**

| Rate (iterations/min) | Iterations/sec | Result |
|---|---|---|
| 30 (documented CI/staging profile) | 0.5 | 100% success, p95=383ms |
| 100 | 1.67 | 100% success, p95=385ms |
| 120 | 2.0 | **45% failed**, login p95=57s |
| 180 | 3.0 | 100% failed, all requests hang to the 60s client timeout |
| 1200 | 20 | 76% failed, 1559 iterations dropped entirely |

**2 CPU, `GUNICORN_WORKERS=5` (`2*cores+1`) — the real prod spec:**

| Rate (iterations/min) | Iterations/sec | Result |
|---|---|---|
| 180 | 3.0 | 100% success, p95=386ms (collapsed at 1 CPU) |
| 360 | 6.0 | 100% success, **but p95≈11s** — queueing, not failing |

Root cause: every login runs Django's default PBKDF2 password hasher, which
is CPU-bound. With sync gunicorn workers pinned to N cores, concurrent
logins fully occupy those cores, and past that point gunicorn's `backlog`
(2048) queues everything else behind them instead of rejecting it — so
without a throttle in front, requests don't fail fast, they hang until the
client's own timeout fires (60s in this test). This scaled roughly linearly
with CPU (1→2 cores roughly doubled the healthy ceiling), and going from 1
CPU to 2 CPU also changed *how* it fails past the ceiling: at 1 CPU it was
outright request failures; at 2 CPU it degrades to very bad latency before
failing, which is a meaningfully safer failure mode.

30/min in production is comfortably under the 2-CPU ceiling (~6x margin to
180/min). The real risk isn't sustained daily volume, it's **simultaneity**:
a burst where many different users hit the API in the same short window
(e.g. everyone opening the app right after a push reminder). See Overload
Plan below for what's now in place for that.

## Overload Plan

**Phase 1 — implemented (2026-07-28):**
- **Global throttles** on `/api/token/` (login) and `/api/orders/` create
  (`api/throttles.py`, `LOGIN_GLOBAL_THROTTLE_RATE` /
  `ORDER_SUBMIT_GLOBAL_THROTTLE_RATE` env vars, default 150/min each — under
  the measured-healthy 180/min on the real 2-CPU host, with margin). These
  are deliberately **global**, not per-user/per-IP like DRF's built-in
  throttles: the overload risk here is many *different* legitimate users
  arriving at once, which a per-user limit does nothing to catch. Past the
  limit, callers get a fast `429` with `Retry-After` (in the project's
  standard `error.details.retry_after_seconds` shape) instead of a request
  that hangs until it times out.
- **Push-reminder delivery staggering** (`api/tasks.py`,
  `PUSH_REMINDER_BATCH_STAGGER_SECONDS`, default 15s in staging/prod, 0 in
  dev/test): the 09:45 deadline reminder and the Sunday weekly reminder used
  to push to every subscriber in one tight loop, which tends to make
  everyone open the app within the same few seconds — exactly the
  simultaneity risk above. Sends are now batched (batch count capped so
  total spread stays well under the weekly task's 290s soft time limit
  regardless of subscriber count) and spaced out.
- **Per-replica Prometheus scraping** (`observability/alloy/config.alloy`):
  the old static `backend:8000` scrape target round-robins across replicas
  via Swarm's service DNS, so with more than one replica each scrape sampled
  a random container and per-container multiprocess counters looked like
  they kept resetting. Alloy now discovers each backend container
  individually (`prometheus.io/scrape=true` label, same pattern already
  used for log shipping) and scrapes it directly, keeping each replica's
  series continuous. **Not yet verified against a live multi-replica Swarm
  deployment** — see the checklist in `observability/README.md`.
- Migrations/seeds already handle multiple replicas starting concurrently:
  `deploy_bootstrap` (run by every container on startup) wraps them in a
  Postgres advisory lock, so a second replica starting mid-deploy blocks
  until the first finishes rather than racing it; since seeds are
  idempotent, its own run afterwards is a no-op. Health checks are already
  per-container and need no cross-replica coordination. JWT auth is
  stateless and Redis-backed cache/celery state is already shared across
  replicas, so neither needed changes for going to >1 replica.

**Phase 1 addendum (2026-07-28):**
- `BACKEND_CPU_LIMIT=1.50` / `GUNICORN_WORKERS=3` applied on the real Dokploy
  prod host (confirmed 2 CPU / 3.82GB), matching this document's
  recommendation. Re-run this load test against the live host when
  convenient to confirm the ceiling matches the 2-CPU numbers measured here.
- `PUSH_REMINDER_OFFSET_MINUTES` widened from 15 to 30 min
  (`api/signals.py`) — more lead time before the deadline for arrivals to
  spread out, on top of the send-side batching above.
- **A Grafana alert rule set already existed** in
  `observability/terraform/grafana-alerts/` (Terraform-managed, incl. "High
  p95 latency" at 3s and 5xx-rate alerts) — this doc previously and
  incorrectly said no alerting existed. It was missed on the first pass;
  now corrected. `high_backend_cpu_cores` (was 0.9, tuned for the old 1.00
  CPU limit) has been bumped to 1.2 to match the new 1.50 limit. The 3s p95
  threshold sits comfortably between the measured-healthy p95 (~386ms) and
  the measured-degraded p95 (~11s at 2x over ceiling), so no change needed
  there.

**Still open (not done in this pass):**
- **No fast-fail / queueing for order writes.** They run synchronously in
  the request/response cycle. Not a priority right now — order submit
  itself was never the bottleneck in testing (~130ms), login was. Worth
  revisiting only if DB write contention shows up as the limit at higher
  scale.
- Adding a **second backend replica** was considered and deliberately not
  done: this is a single 2-CPU host, so a second replica doesn't add
  physical capacity — it only helps if it's on separate hardware, or purely
  for restart-resilience. Revisit if/when a second node is available.

## What To Watch

In Grafana, watch:

- request rate and p95/p99 latency
- 4xx/5xx rate
- slowest endpoints
- DB query rate and DB p95 latency
- cache gets/hits/misses
- container logs in Loki for deadline, auth, Redis, or DB errors

Expected request count for the default full run:

- `150` login requests
- `150` planned-order reads, unless `INCLUDE_PLANNED_READ=false`
- `150` order submit requests
- `450` HTTP requests total with planned reads enabled

## Notes

- The k6 script logs in each throwaway user and submits one order for
  `ORDER_DATE`.
- `MAX_SUBMITS` caps actual order submissions, so the default full run submits
  exactly `150` orders even if k6 schedules a boundary iteration.
- Re-running against the same users and date exercises order upsert/update
  behavior, not fresh inserts. Cleanup first if you want another fresh-insert
  run.
- The app currently has targeted auth/email rate limits, not a global API rate
  limiter. This scenario is intentionally controlled and authenticated.

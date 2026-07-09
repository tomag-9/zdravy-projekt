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

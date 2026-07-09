# Load Tests

Production load tests must use throwaway users and a future non-holiday order
date. The default scenario submits 150 client orders over 5 minutes: 30 arrivals
per minute against `/api/orders/`.

## 1. Seed throwaway users

Generate one password and keep it for both the seed command and the k6 run:

```bash
export LOAD_TEST_PASSWORD="$(openssl rand -base64 24)"
```

Then run inside the production backend container, or through Dokploy's backend
shell, passing that same value as `LOAD_TEST_PASSWORD`:

```bash
python manage.py seed_load_test_users \
  --allow-production \
  --confirm-production LOAD_TEST_PROD \
  --count 150 \
  --email-domain loadtest.zdravyprojekt.local \
  --password "$LOAD_TEST_PASSWORD"
```

The command creates users:

```text
zp-loadtest-001@loadtest.zdravyprojekt.local
...
zp-loadtest-150@loadtest.zdravyprojekt.local
```

Use a future weekday for `ORDER_DATE`; avoid holidays and days whose ordering
deadline has already passed.

## 2. Run the 150-submit scenario

Run from your machine where `k6` is installed:

```bash
BASE_URL="https://YOUR_PROD_HOST" \
PASSWORD="$LOAD_TEST_PASSWORD" \
USER_EMAIL_DOMAIN="loadtest.zdravyprojekt.local" \
ORDER_DATE="2026-07-16" \
k6 run load-tests/k6/order-submit-150-in-5m.js
```

Useful overrides:

```bash
USER_COUNT=150
MAX_SUBMITS=150
USER_START_INDEX=1
USER_EMAIL_PREFIX="zp-loadtest-"
INCLUDE_PLANNED_READ=true
```

The same scenario can be run against the local Docker dev stack without a local
k6 install:

```bash
scripts/run-order-load-test.sh
```

For a tiny CI-style smoke run:

```bash
USER_COUNT=3 MAX_SUBMITS=3 RATE=6 DURATION=30s PRE_ALLOCATED_VUS=2 MAX_VUS=6 \
scripts/run-order-load-test.sh
```

Watch Grafana while it runs:

- request rate and p95/p99 latency
- 4xx/5xx rate
- slowest endpoints
- DB query rate and DB p95 latency
- cache gets/hits/misses
- container logs in Loki for deadline, auth, Redis, or DB errors

Abort the run if 5xx rises above 1%, p95 stays above 3 seconds, DB connection
errors appear, or backend health checks start flapping.

## 3. Cleanup

After the run, delete the throwaway users. Their orders are removed by cascade:

```bash
python manage.py seed_load_test_users \
  --cleanup \
  --confirm-cleanup DELETE_LOAD_TEST_USERS \
  --allow-production \
  --confirm-production LOAD_TEST_PROD \
  --count 150 \
  --email-domain loadtest.zdravyprojekt.local
```

## Notes

- The k6 script logs in each throwaway user and submits one order for
  `ORDER_DATE`.
- Re-running against the same users and date exercises order upsert/update
  behavior, not fresh inserts. Cleanup first if you want another fresh-insert run.
- The app currently has targeted auth/email rate limits, not a global API rate
  limiter. This scenario is intentionally controlled and authenticated.

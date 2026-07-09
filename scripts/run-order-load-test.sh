#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-compose/dev.yml}"
K6_IMAGE="${K6_IMAGE:-grafana/k6:latest}"

BASE_URL="${BASE_URL:-http://127.0.0.1:8000}"
USER_COUNT="${USER_COUNT:-150}"
MAX_SUBMITS="${MAX_SUBMITS:-$USER_COUNT}"
USER_START_INDEX="${USER_START_INDEX:-1}"
USER_EMAIL_PREFIX="${USER_EMAIL_PREFIX:-zp-loadtest-}"
USER_EMAIL_DOMAIN="${USER_EMAIL_DOMAIN:-loadtest.local}"
PASSWORD="${PASSWORD:-LoadTestPassword123!}"
ORDER_DATE="${ORDER_DATE:-}"
RATE="${RATE:-30}"
DURATION="${DURATION:-5m}"
PRE_ALLOCATED_VUS="${PRE_ALLOCATED_VUS:-30}"
MAX_VUS="${MAX_VUS:-150}"
INCLUDE_PLANNED_READ="${INCLUDE_PLANNED_READ:-true}"
START_STACK="${START_STACK:-true}"
CLEANUP_AFTER="${CLEANUP_AFTER:-true}"

cd "$ROOT_DIR"

if [ "$START_STACK" = "true" ]; then
  docker compose -f "$COMPOSE_FILE" up -d db redis mailhog backend
fi

echo "Waiting for backend health at $BASE_URL/api/health/ ..."
for _ in $(seq 1 90); do
  if curl -fsS "$BASE_URL/api/health/" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done
curl -fsS "$BASE_URL/api/health/" >/dev/null

cleanup() {
  if [ "$CLEANUP_AFTER" = "true" ]; then
    docker compose -f "$COMPOSE_FILE" exec -T backend \
      python manage.py seed_load_test_users \
        --cleanup \
        --confirm-cleanup DELETE_LOAD_TEST_USERS \
        --count "$USER_COUNT" \
        --start-index "$USER_START_INDEX" \
        --email-prefix "$USER_EMAIL_PREFIX" \
        --email-domain "$USER_EMAIL_DOMAIN" >/dev/null || true
  fi
}
trap cleanup EXIT

docker compose -f "$COMPOSE_FILE" exec -T backend \
  python manage.py seed_load_test_users \
    --count "$USER_COUNT" \
    --start-index "$USER_START_INDEX" \
    --email-prefix "$USER_EMAIL_PREFIX" \
    --email-domain "$USER_EMAIL_DOMAIN" \
    --password "$PASSWORD"

docker run --rm --network host \
  -e BASE_URL="$BASE_URL" \
  -e PASSWORD="$PASSWORD" \
  -e USER_COUNT="$USER_COUNT" \
  -e MAX_SUBMITS="$MAX_SUBMITS" \
  -e USER_START_INDEX="$USER_START_INDEX" \
  -e USER_EMAIL_PREFIX="$USER_EMAIL_PREFIX" \
  -e USER_EMAIL_DOMAIN="$USER_EMAIL_DOMAIN" \
  -e ORDER_DATE="$ORDER_DATE" \
  -e RATE="$RATE" \
  -e DURATION="$DURATION" \
  -e PRE_ALLOCATED_VUS="$PRE_ALLOCATED_VUS" \
  -e MAX_VUS="$MAX_VUS" \
  -e INCLUDE_PLANNED_READ="$INCLUDE_PLANNED_READ" \
  -v "$ROOT_DIR/load-tests/k6:/scripts:ro" \
  "$K6_IMAGE" run /scripts/order-submit-150-in-5m.js

#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
container_name="zdravy-nginx-security-test-$$"

cleanup() {
  docker rm -f "$container_name" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker run -d --name "$container_name" \
  -v "$repo_root/frontend/nginx.conf:/etc/nginx/conf.d/default.conf:ro" \
  nginx:alpine >/dev/null

docker exec "$container_name" sh -c 'mkdir -p /usr/share/nginx/html && printf "%s" "spa" > /usr/share/nginx/html/index.html'
docker exec "$container_name" nginx -t >/dev/null

assert_status() {
  local path="$1"
  local expected="$2"
  local status

  status="$(
    docker exec "$container_name" sh -c "wget -qO- -S 'http://127.0.0.1${path}' 2>&1 || true" \
      | sed -n 's/^  HTTP\/[^ ]* \([0-9][0-9][0-9]\).*/\1/p' \
      | tail -n 1
  )"

  if [[ "$status" != "$expected" ]]; then
    echo "Expected ${path} to return ${expected}, got ${status:-no status}" >&2
    exit 1
  fi
}

assert_status "/" "200"
assert_status "/backend/.env" "403"
assert_status "/.aws/credentials" "403"
assert_status "/.git/HEAD" "403"
assert_status "/.env.development" "403"
assert_status "/.env.local" "403"
assert_status "/.env.production" "403"
assert_status "/config.json" "403"
assert_status "/js/config.js" "403"

echo "Frontend Nginx scanner-probe rules passed."

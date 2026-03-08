#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
STACK_FILE="${1:-$REPO_ROOT/deploy/swarm/stack.yml}"

if [[ "$STACK_FILE" != /* ]]; then
  STACK_FILE="$REPO_ROOT/$STACK_FILE"
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker CLI is required" >&2
  exit 1
fi

if [ ! -f "$STACK_FILE" ]; then
  echo "Stack file not found: $STACK_FILE" >&2
  exit 1
fi

echo "Validating Swarm stack: $STACK_FILE"
cd "$REPO_ROOT"
docker stack config -c "$STACK_FILE" >/dev/null

echo "Stack manifest is valid."

#!/usr/bin/env bash
set -euo pipefail

STACK_FILE="${1:-deploy/swarm/stack.yml}"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker CLI is required" >&2
  exit 1
fi

if [ ! -f "$STACK_FILE" ]; then
  echo "Stack file not found: $STACK_FILE" >&2
  exit 1
fi

echo "Validating Swarm stack: $STACK_FILE"
docker stack config -c "$STACK_FILE" >/dev/null

echo "Stack manifest is valid."

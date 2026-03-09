#!/bin/bash
# wait-for-redis.sh
# Wait for Redis to be available before proceeding with Celery startup

set -e

REDIS_URL="${CELERY_BROKER_URL:-redis://localhost:6379/0}"

# Extract host and port from REDIS_URL
# Format: redis://host:port/db
HOST=$(echo "$REDIS_URL" | sed -E 's|redis://([^:/]+).*|\1|')
PORT=$(echo "$REDIS_URL" | sed -E 's|.*:([0-9]+).*|\1|')

echo "⏳ Waiting for Redis at $HOST:$PORT..."

MAX_ATTEMPTS=60
ATTEMPT=1

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
  if timeout 2 bash -c "echo PING | nc -w 1 $HOST $PORT" > /dev/null 2>&1; then
    echo "✅ Redis is up at $HOST:$PORT"
    exit 0
  fi
  
  echo "  Attempt $ATTEMPT/$MAX_ATTEMPTS: Redis not ready, retrying in 2s..."
  sleep 2
  ATTEMPT=$((ATTEMPT + 1))
done

echo "❌ Redis did not become available after $(($MAX_ATTEMPTS * 2))s"
exit 1

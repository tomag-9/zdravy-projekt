#!/bin/sh
set -eu

python manage.py deploy_bootstrap

PROMETHEUS_MULTIPROC_DIR="${PROMETHEUS_MULTIPROC_DIR:-/tmp/prometheus-multiproc}"

case "$PROMETHEUS_MULTIPROC_DIR" in
  ""|"/")
    echo "Refusing unsafe PROMETHEUS_MULTIPROC_DIR: '$PROMETHEUS_MULTIPROC_DIR'" >&2
    exit 1
    ;;
esac

mkdir -p "$PROMETHEUS_MULTIPROC_DIR"
find "$PROMETHEUS_MULTIPROC_DIR" -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +
export PROMETHEUS_MULTIPROC_DIR

exec gunicorn -c gunicorn.conf.py app.wsgi:application

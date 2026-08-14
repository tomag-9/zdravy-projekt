#!/usr/bin/env bash
# Dump production's gramage dashboard for one day to stdout as JSON.
#
# The app side of a reconciliation is exactly what `MealPlanService.gramage_dashboard`
# returns, so pulling that one read-only call over SSH is the whole prod integration:
# no DB dump, no port forward, nothing written on the server.
#
# Usage: fetch_prod_dashboard.sh 2026-08-14 [ssh-host]   # host defaults to `zp`
set -euo pipefail

DATE="${1:?usage: fetch_prod_dashboard.sh YYYY-MM-DD [ssh-host]}"
HOST="${2:-zp}"

ssh "$HOST" "C=\$(docker ps -q -f name=appstack.*backend | head -1); \
  [ -n \"\$C\" ] || { echo 'no backend container on $HOST' >&2; exit 1; }; \
  docker exec \$C python -c \"
import django, json
django.setup()
from api.services.meal_plan_service import MealPlanService
print(json.dumps(MealPlanService.gramage_dashboard('$DATE'), default=str))
\""

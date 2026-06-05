#!/bin/bash
# Fix script for daily report email not sending issue
# Run this on your production server to verify and fix the periodic task configuration
# Usage: bash fix-daily-report.sh

set -e

echo "=========================================="
echo "Daily Report Email - Fix & Verification"
echo "=========================================="
echo ""

BACKEND_CONTAINER="zdravy-projekt-backend-1"

# Step 1: Check if container exists and is running
echo "✓ Step 1: Checking backend container..."
if ! docker ps --format '{{.Names}}' | grep -q "^${BACKEND_CONTAINER}$"; then
    echo "✗ Container ${BACKEND_CONTAINER} not found or not running"
    exit 1
fi
echo "  ✓ Container is running"
echo ""

# Step 2: Re-save GlobalSettings to trigger signal
echo "✓ Step 2: Re-saving GlobalSettings to trigger signal..."
docker exec ${BACKEND_CONTAINER} python manage.py shell << 'EOF'
from api.models import GlobalSettings
from django_celery_beat.models import PeriodicTask

# Get the existing instance
gs = GlobalSettings.objects.first()
if not gs:
    print("✗ ERROR: GlobalSettings not found!")
    exit(1)

print(f"  Recipients configured: {gs.report_email_recipients or '(none)'}")

if not gs.report_email_recipients:
    print("  ⚠ WARNING: No recipients configured!")
    print("  → Configure recipients in admin panel first: /api/admin/global-settings/")
else:
    # Re-save to trigger post_save signal
    gs.save()
    print("  ✓ GlobalSettings re-saved - signal triggered")
EOF
echo ""

# Step 3: Run the sync command to verify/fix tasks
echo "✓ Step 3: Running sync_periodic_tasks management command..."
docker exec ${BACKEND_CONTAINER} python manage.py sync_periodic_tasks --fix
echo ""

# Step 4: Verify tasks exist
echo "✓ Step 4: Verifying tasks were created..."
docker exec ${BACKEND_CONTAINER} python manage.py sync_periodic_tasks --verify
echo ""

# Step 5: Test email sending manually
echo "✓ Step 5: Testing manual email send (yesterday's data)..."
echo "  Running: python manage.py send_order_report --days=1"
docker exec ${BACKEND_CONTAINER} python manage.py send_order_report --days=1
echo ""

# Step 6: Check Celery Beat logs
echo "✓ Step 6: Checking Celery Beat scheduler status..."
echo "  Last 10 lines of celery-beat logs:"
docker logs zdravy-projekt-celery-beat-1 2>&1 | tail -10 || true
echo ""

# Step 7: Check Celery Worker logs for task execution
echo "✓ Step 7: Checking Celery Worker logs..."
echo "  Last 5 lines of celery-worker logs:"
docker logs zdravy-projekt-celery-1 2>&1 | tail -5 || true
echo ""

echo "=========================================="
echo "✓ Fix Complete!"
echo "=========================================="
echo ""
echo "What happened:"
echo "1. GlobalSettings was re-saved to trigger the post_save signal"
echo "2. The signal creates PeriodicTasks for daily reports (breakfast @ 10:00, all meals @ 10:00)"
echo "3. Tasks were synced and verified to exist in the database"
echo "4. Manual test was run to verify email backend is working"
echo ""
echo "Next steps:"
echo "- Wait for the next scheduled deadline time (10:00 AM by default)"
echo "- Check your email to verify the report arrives"
echo "- If still not received, check:"
echo "  - docker logs zdravy-projekt-celery-beat-1  (scheduler logs)"
echo "  - docker logs zdravy-projekt-celery-1        (worker logs)"
echo "  - docker logs zdravy-projekt-backend-1       (application logs)"
echo ""
echo "To verify tasks are scheduled:"
echo "  docker exec zdravy-projekt-backend-1 python manage.py sync_periodic_tasks --verify"
echo ""

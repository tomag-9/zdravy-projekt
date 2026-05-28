#!/bin/bash
# Cron job script to send daily order reports
# Add to crontab with: crontab -e
# Example: Run every day at 8 AM
# 0 8 * * * /path/to/zdravy-projekt/scripts/send-daily-report.sh

# Change to project directory
cd "$(dirname "$0")/.." || exit 1

# Activate virtual environment if it exists
if [ -d ".venv" ]; then
    source .venv/bin/activate
fi

# Change to backend directory
cd backend || exit 1

# Set Django settings module based on environment
export DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-app.settings.staging}"

# Log file
LOG_FILE="../logs/order-reports.log"
mkdir -p "$(dirname "$LOG_FILE")"

# Run the management command
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting daily order report..." >> "$LOG_FILE"

python manage.py send_order_report --days 1 >> "$LOG_FILE" 2>&1

if [ $? -eq 0 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Report sent successfully" >> "$LOG_FILE"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: Report failed to send" >> "$LOG_FILE"
fi

echo "" >> "$LOG_FILE"

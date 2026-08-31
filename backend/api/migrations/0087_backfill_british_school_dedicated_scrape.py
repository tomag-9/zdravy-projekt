from django.db import migrations

# Code review follow-up (2026-08-31): British School's scrape crontab was
# hardcoded by connection name in api.signals; generalized into
# EdupageConnection.dedicated_scrape_hour/minute (see migration 0086). This
# backfills the existing connection row so its schedule doesn't silently
# stop the moment this migration deploys - seed_british_school_2026_08 also
# sets it going forward, but that seed only reruns manually (CLAUDE.md), not
# on every deploy, so prod can't rely on it alone here.
BRITISH_SCHOOL_URL = "https://zdravyprojekt.edupage.org/menu/mealsGuest?id=Dr8kS45"
BRITISH_SCHOOL_SCRAPE_HOUR = 12
BRITISH_SCHOOL_SCRAPE_MINUTE = 15


def backfill_dedicated_scrape(apps, schema_editor):
    EdupageConnection = apps.get_model("api", "EdupageConnection")
    EdupageConnection.objects.filter(mealsguest_url=BRITISH_SCHOOL_URL).update(
        dedicated_scrape_hour=BRITISH_SCHOOL_SCRAPE_HOUR,
        dedicated_scrape_minute=BRITISH_SCHOOL_SCRAPE_MINUTE,
    )


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0086_edupageconnection_dedicated_scrape_hour_and_more"),
    ]

    operations = [
        migrations.RunPython(backfill_dedicated_scrape, migrations.RunPython.noop),
    ]

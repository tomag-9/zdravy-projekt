import datetime

from django.db import migrations

# Rozpojenie uzávierky a EduPage scrapu (#527/#528 follow-up): scrape sa už
# nemusí kryť s uzávierkou objednávok. Deadline raňajok ostáva 21:00 večer
# predtým (deadline_breakfast_is_day_before=True), ale scrape sa oneskorí až
# na 01:35 v samotný deň raňajok — is_day_before=False, lebo v tom čase je
# "dnes" už deň, na ktorý sa raňajky objednávali. Obed a olovrant scrapujú
# ďalej pri (existujúcom) 07:35 deadline — override sem pridávame len
# explicitne, nech je nezávislý od prípadnej budúcej zmeny deadlinu.
BREAKFAST_TIME = datetime.time(1, 35)
LUNCH_OLOVRANT_TIME = datetime.time(7, 35)


def set_default_scrape_times(apps, schema_editor):
    GlobalSettings = apps.get_model("api", "GlobalSettings")
    GlobalSettings.objects.update_or_create(
        pk=1,
        defaults={
            "edupage_scrape_time_breakfast": BREAKFAST_TIME,
            "edupage_scrape_time_breakfast_is_day_before": False,
            "edupage_scrape_time_lunch": LUNCH_OLOVRANT_TIME,
            "edupage_scrape_time_lunch_is_day_before": False,
            "edupage_scrape_time_olovrant": LUNCH_OLOVRANT_TIME,
            "edupage_scrape_time_olovrant_is_day_before": False,
        },
    )


class Migration(migrations.Migration):
    dependencies = [
        (
            "api",
            "0084_globalsettings_edupage_scrape_time_breakfast_and_more",
        ),
    ]

    operations = [
        migrations.RunPython(set_default_scrape_times, migrations.RunPython.noop),
    ]

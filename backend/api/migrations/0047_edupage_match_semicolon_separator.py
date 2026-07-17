"""Prepni oddeľovač viacerých `edupage_match` prefixov z čiarky na bodkočiarku.

Čiarka oddeľovač byť nemôže: EduPage skratky ju samy obsahujú (`mšMal,Hey` je JEDNA
skratka zdieľaná dvoma škôlkami Zdravého Brúska), takže čiarkový oddeľovač by ju
rozsekol na dva neplatné prefixy a riadok by ostal nezaradený.

Migrujeme len presne známe legacy hodnoty, ktoré používali čiarku ako oddeľovač.
Neštiepime všetky čiarky plošne: `mšMal,Hey` je legitímny jeden prefix s čiarkou.
"""

from django.db import migrations

LEGACY_TO_SEMICOLON = {
    "1.st, 2.st, Dospelý": "1.st; 2.st; Dospelý",
}
SEMICOLON_TO_LEGACY = {value: key for key, value in LEGACY_TO_SEMICOLON.items()}


def na_bodkociarku(apps, schema_editor):
    Prevadzka = apps.get_model("api", "Prevadzka")
    for prevadzka in Prevadzka.objects.filter(
        edupage_match__in=LEGACY_TO_SEMICOLON.keys()
    ):
        prevadzka.edupage_match = LEGACY_TO_SEMICOLON[prevadzka.edupage_match]
        prevadzka.save(update_fields=["edupage_match"])


def na_ciarku(apps, schema_editor):
    Prevadzka = apps.get_model("api", "Prevadzka")
    for prevadzka in Prevadzka.objects.filter(
        edupage_match__in=SEMICOLON_TO_LEGACY.keys()
    ):
        prevadzka.edupage_match = SEMICOLON_TO_LEGACY[prevadzka.edupage_match]
        prevadzka.save(update_fields=["edupage_match"])


class Migration(migrations.Migration):
    dependencies = [("api", "0046_prevadzka_edupage_match_multi")]

    operations = [migrations.RunPython(na_bodkociarku, na_ciarku)]

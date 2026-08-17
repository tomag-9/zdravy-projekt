from django.db import migrations, models


def rozdel_prevadzky_do_vydajov(apps, schema_editor):
    """Prevádzky z extra blokov presuň do výdaja B, zvyšok ostáva v A.

    Rozdelenie na dva výdajné body dnes reálne existuje ako blok „Trasa extra"
    (`include_in_extra_summary`), len je zamknuté v rozvozovej štruktúre. Tento
    krok ho prepíše do vlastnosti prevádzky, aby nastavenie prežilo aj zmeny
    trás. Blokový príznak je spoľahlivejší než názov — ten si prevádzka
    premenúva.
    """
    Prevadzka = apps.get_model("api", "Prevadzka")
    Prevadzka.objects.filter(
        delivery_route__block__include_in_extra_summary=True
    ).update(vydaj="B")


def vsetko_spat_do_a(apps, schema_editor):
    Prevadzka = apps.get_model("api", "Prevadzka")
    Prevadzka.objects.update(vydaj="A")


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0068_alter_eventlog_event_type"),
    ]

    operations = [
        migrations.AddField(
            model_name="prevadzka",
            name="vydaj",
            field=models.CharField(
                choices=[("A", "Výdaj A"), ("B", "Výdaj B"), ("C", "Výdaj C")],
                db_index=True,
                default="A",
                help_text=(
                    "Výdajný bod kuchyne, z ktorého sa prevádzka vydáva. Podľa "
                    "neho sa delí gramážová tabuľka aj tlač; trasa ostáva "
                    "nezávislá."
                ),
                max_length=1,
            ),
        ),
        migrations.RunPython(rozdel_prevadzky_do_vydajov, vsetko_spat_do_a),
    ]

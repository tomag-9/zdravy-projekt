from django.db import migrations, models


def prenes_vydaj_z_prevadzok_na_trasy(apps, schema_editor):
    """Výdaj sa presúva z prevádzky na trasu — jedno miesto namiesto dvoch.

    Hodnota sa berie z prevádzok, ktoré v trase stoja (stačí jedna mimo výdaja A,
    lebo tak ich tam dala predošlá migrácia z extra blokov). Trasa bez prevádzok
    padne späť na príznak bloku, aby prázdna extra trasa neskončila v A.
    """
    DeliveryRoute = apps.get_model("api", "DeliveryRoute")
    for route in DeliveryRoute.objects.select_related("block").all():
        vydaje = set(route.prevadzky.values_list("vydaj", flat=True))
        vydaje.discard("A")
        if vydaje:
            route.vydaj = sorted(vydaje)[0]
        elif route.block.include_in_extra_summary:
            route.vydaj = "B"
        else:
            continue
        route.save(update_fields=["vydaj"])


def prenes_vydaj_z_tras_na_prevadzky(apps, schema_editor):
    Prevadzka = apps.get_model("api", "Prevadzka")
    for vydaj in ("B", "C"):
        Prevadzka.objects.filter(delivery_route__vydaj=vydaj).update(vydaj=vydaj)


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0070_alter_dailyorder_scrape_flags"),
    ]

    operations = [
        migrations.AddField(
            model_name="deliveryroute",
            name="vydaj",
            field=models.CharField(
                choices=[("A", "Výdaj A"), ("B", "Výdaj B"), ("C", "Výdaj C")],
                db_index=True,
                default="A",
                help_text=(
                    "Výdajný bod kuchyne, ktorý túto trasu obsluhuje. Gramážová "
                    "tabuľka sa delí podľa neho — trasy výdaja A tvoria tabuľku "
                    "A, trasy výdaja B tabuľku B."
                ),
                max_length=1,
            ),
        ),
        migrations.RunPython(
            prenes_vydaj_z_prevadzok_na_trasy, prenes_vydaj_z_tras_na_prevadzky
        ),
        migrations.RemoveField(model_name="prevadzka", name="vydaj"),
    ]

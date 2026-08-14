"""Zápis administrátorských zmien do Udalostí pre bežné ModelViewSet-y.

Vzor pochádza z `facility_views._log_settings_change` (celky a prevádzky). Tam
bol napísaný ručne pre jeden modul, kým ostatné administrátorské zoznamy —
používatelia, jedálniček, sviatky, diéty, rozvoz — sa dali meniť úplne potichu:
kto zmenil rolu, prehodil menu dňa alebo vypol pracovný deň sa spätne zistiť
nedalo.

Zapisuje sa `SETTINGS_CHANGE` s diffom `from`/`to`, aby mal záznam rovnaký tvar
naprieč modelmi a tabuľka Udalostí ho vedela vykresliť jedným spôsobom.
"""

from __future__ import annotations

from ..models import EventLog
from ..services.event_log_service import build_model_diff, log_event

# Audit je čitateľný komukoľvek s admin právami, takže sa doň nesmie dostať nič,
# čo je samo o sebe prístupom. Mixin je generický a nasadí sa aj na viewsety,
# ktoré dnes neexistujú — filter je preto na hodnote mena poľa, nie na zozname
# konkrétnych serializerov.
_SENSITIVE_FIELD_FRAGMENTS = ("password", "token", "secret", "api_key")


def _redact(changes: dict) -> dict:
    def is_sensitive(field: str) -> bool:
        lowered = field.lower()
        return any(fragment in lowered for fragment in _SENSITIVE_FIELD_FRAGMENTS)

    return {
        field: ({"from": "***", "to": "***"} if is_sensitive(field) else value)
        for field, value in changes.items()
    }


def log_admin_change(request, instance, changes: dict, action: str) -> None:
    """Zapíš jednu zmenu modelu. Prázdny diff sa nezapisuje.

    Uloženie, ktoré nič nezmenilo, je šum — v tabuľke by sa tvárilo ako zásah.
    """
    if not changes:
        return
    changes = _redact(changes)
    log_event(
        EventLog.EventType.SETTINGS_CHANGE,
        actor=getattr(request, "user", None),
        summary=f"Admin {action} {instance._meta.verbose_name}: {instance}.",
        payload={
            "model": instance._meta.label_lower,
            "object_id": instance.pk,
            "changes": changes,
        },
    )


class AuditedModelViewSetMixin:
    """Zapíše create/update/delete daného ModelViewSet-u do Udalostí.

    Mixin, nie dekorátor na serializeri: diff sa musí zobrať PRED uložením a
    aktor je v requeste, takže `perform_*` je jediné miesto, kde je oboje po
    ruke. Podtriedy, ktoré si `perform_*` prepisujú kvôli vlastnej logike (napr.
    odoslanie setup e-mailu), volajú `super()` a zápis dostanú zadarmo.
    """

    def perform_create(self, serializer) -> None:
        super().perform_create(serializer)  # type: ignore[misc]
        log_admin_change(
            self.request,  # type: ignore[attr-defined]
            serializer.instance,
            # `from: null` pre každé pole — pri vzniku je zaujímavé, s čím
            # záznam vznikol, a tvar `from`/`to` drží payload jednotný.
            build_model_diff(None, serializer.validated_data),
            "vytvoril",
        )

    def perform_update(self, serializer) -> None:
        # Diff proti inštancii ešte pred zápisom — po `save()` sú staré hodnoty
        # preč a zostal by prázdny záznam „niečo sa zmenilo".
        changes = build_model_diff(serializer.instance, serializer.validated_data)
        super().perform_update(serializer)  # type: ignore[misc]
        log_admin_change(
            self.request,  # type: ignore[attr-defined]
            serializer.instance,
            changes,
            "upravil",
        )

    def perform_destroy(self, instance) -> None:
        # Popis a pk sa čítajú pred zmazaním; potom je `instance.pk` None.
        snapshot = {
            "object_id": instance.pk,
            "label": str(instance),
            "model": instance._meta.label_lower,
        }
        super().perform_destroy(instance)  # type: ignore[misc]
        log_event(
            EventLog.EventType.SETTINGS_CHANGE,
            actor=getattr(self.request, "user", None),  # type: ignore[attr-defined]
            summary=(
                f"Admin vymazal {snapshot['model'].split('.')[-1]}: "
                f"{snapshot['label']}."
            ),
            payload={**snapshot, "deleted": True},
        )

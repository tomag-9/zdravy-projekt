/** Zobrazovacie pravidlá pre tabuľku Udalostí (audit).
 *
 * Vlastný modul, nie súčasť `AdminLogs.tsx`: sú to čisté funkcie bez JSX, dajú
 * sa testovať priamo a v komponentovom súbore by ich export rozbil fast refresh.
 */

export type BadgeTone = 'green' | 'peach' | 'teal' | 'honey' | 'coral' | 'gray' | 'orange';

/** Farba podľa DRUHU úkonu, nie podľa jednotlivého typu.
 *
 * Predtým mala každá udalosť rovnaký tyrkysový odznak, takže sa tabuľka dala
 * čítať len po slovách. Kategórie sú tu preto, aby sa v nej dalo skenovať očami:
 * cron je jedna farba nech robí čokoľvek, objednávky druhá, nastavenia tretia.
 * Deštruktívne a zlyhané zdieľajú červenú zámerne — obe volajú po pozornosti.
 */
export const EVENT_TONES: Record<string, BadgeTone> = {
    // automatika
    cron_run: 'teal',
    auto_order_run: 'teal',
    cron_skipped: 'gray',
    cron_failed: 'coral',
    // objednávky
    order_admin_create: 'green',
    order_admin_update: 'green',
    order_admin_delete: 'coral',
    // ostatné úkony
    settings_change: 'orange',
    push_broadcast: 'honey',
    deploy_version: 'peach',
};

export function eventTone(eventType: string): BadgeTone {
    return EVENT_TONES[eventType] ?? 'gray';
}

interface ActorFields {
    actor: number | null;
    actor_name?: string;
    actor_email?: string;
    actor_label: string;
}

interface TargetFields {
    target_user: number | null;
    target_user_name?: string;
    target_user_email?: string;
}

/** Kto úkon spravil: meno, keď ho poznáme, inak e-mail.
 *
 * `actor_label` je snímka e-mailu z času zápisu, takže pre človeka s menom je
 * horší údaj než meno z profilu — ale pre systémových aktorov (`cron`, `system`)
 * je to jediné, čo máme, lebo login k nim neexistuje.
 */
export function actorDisplay(entry: ActorFields): string {
    if (entry.actor_name) return entry.actor_name;
    if (entry.actor) return entry.actor_email || entry.actor_label || `#${entry.actor}`;
    return entry.actor_label || 'systém';
}

export function targetDisplay(entry: TargetFields): string {
    if (entry.target_user_name) return entry.target_user_name;
    if (entry.target_user_email) return entry.target_user_email;
    return entry.target_user ? `#${entry.target_user}` : '—';
}

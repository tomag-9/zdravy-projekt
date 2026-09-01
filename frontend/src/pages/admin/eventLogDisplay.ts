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
    // objednávky — vytvorenie zelené, úprava oranžová, zmazanie červené (#548),
    // nech sa dá skenovať očami aj bez čítania textu odznaku.
    order_admin_create: 'green',
    order_admin_update: 'orange',
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

/** Typ objednávkovej udalosti podľa `EventLog.EventType` — slúži karte "Objednávky". */
export const ORDER_EVENT_TYPES = [
    'order_admin_create',
    'order_admin_update',
    'order_admin_delete',
] as const;

export function isOrderEvent(eventType: string): boolean {
    return (ORDER_EVENT_TYPES as readonly string[]).includes(eventType);
}

const ORDER_ACTION_LABELS: Record<string, string> = {
    order_admin_create: 'Vytvorená',
    order_admin_update: 'Upravená',
    order_admin_delete: 'Vymazaná',
};

export function orderActionLabel(eventType: string): string {
    return ORDER_ACTION_LABELS[eventType] ?? eventType;
}

const MEAL_LABELS_SK: Record<string, string> = {
    breakfast: 'raňajky',
    lunch: 'obed',
    olovrant: 'olovrant',
};

/** Súčet všetkých číselných hodnôt v podstrome — bez ohľadu na to, či ide o
 * `menuCounts`, `diets` alebo inú vrstvu, ráta sa každý list objednaných kusov. */
function sumCounts(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (value && typeof value === 'object') {
        return Object.values(value as Record<string, unknown>).reduce(
            (total: number, item) => total + sumCounts(item),
            0,
        );
    }
    return 0;
}

/** "Koľko čoho" jedným pohľadom: `raňajky ×3 · obed ×5` pre zmenené jedlá.
 *
 * Číta `payload.meals` (stav PO zmene — pri mazaní je teda prázdny, preto sa
 * tam berie `payload.changes` cez `changed_meals`, aby aj zmazaná objednávka
 * ukázala, koľko sa mazalo, nie "—").
 */
export function summarizeOrderMeals(payload: Record<string, unknown>): string {
    const changedMeals = Array.isArray(payload.changed_meals)
        ? (payload.changed_meals as string[])
        : [];
    if (changedMeals.length === 0) return '—';
    const meals = (payload.meals as Record<string, unknown>) || {};
    const changes = (payload.changes as Record<string, { from?: unknown; to?: unknown }>) || {};
    const parts = changedMeals.map((meal) => {
        const label = MEAL_LABELS_SK[meal] ?? meal;
        let count = sumCounts(meals[meal]);
        if (count === 0) {
            // Zmazanie: `meals` je po zmene prázdne, spočítaj z `changes.*.from`.
            count = Object.entries(changes)
                .filter(([path]) => path === meal || path.startsWith(`${meal}.`))
                .reduce((total, [, change]) => total + sumCounts(change?.from), 0);
        }
        return count > 0 ? `${label} ×${count}` : label;
    });
    return parts.join(' · ');
}

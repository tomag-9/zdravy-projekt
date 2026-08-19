/**
 * Úrovne prístupu k sekciám (#484) — zrkadlo `backend/api/sections.py`.
 *
 * Toto je len gejtovanie UI. Skutočná zábrana je `SectionAccess` na
 * endpointoch; keby sa tieto dve rozišli, používateľ uvidí tlačidlo, ktoré
 * mu server odmietne — nie naopak.
 */

export type Level = 'none' | 'read' | 'edit';

/** Kľúče sekcií. Musia sedieť s konštantami v `backend/api/sections.py`. */
export const SECTION = {
    dashboard: 'dashboard',
    podklady: 'podklady',
    trasy: 'trasy',
    jedalnicek: 'jedalnicek',
    katalog: 'katalog',
    prevadzky: 'prevadzky',
    diety: 'diety',
    volneDni: 'volne_dni',
    notifikacie: 'notifikacie',
    objednavky: 'objednavky',
    nakladanie: 'nakladanie',
    nastavenia: 'nastavenia',
    udalosti: 'udalosti',
    logy: 'logy',
    pristupy: 'pristupy',
} as const;

export type SectionKey = (typeof SECTION)[keyof typeof SECTION];

const ORDER: Record<Level, number> = { none: 0, read: 1, edit: 2 };

export type SectionMap = Partial<Record<string, Level>>;

/**
 * Úroveň pre sekciu. Chýbajúca mapa (starší backend) sa číta ako `edit` —
 * fallback musí byť smerom hore, inak by nasadenie zamklo celé UI adminom,
 * ktorým ho server ešte neposiela.
 */
export function levelOf(map: SectionMap | undefined, section: string): Level {
    if (!map) return 'edit';
    return map[section] ?? 'none';
}

export function canRead(map: SectionMap | undefined, section: string): boolean {
    return ORDER[levelOf(map, section)] >= ORDER.read;
}

export function canEdit(map: SectionMap | undefined, section: string): boolean {
    return ORDER[levelOf(map, section)] >= ORDER.edit;
}

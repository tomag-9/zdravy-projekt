/**
 * Definícia admin menu a jeho filtrovanie podľa role (#483).
 *
 * Vlastný súbor (nie `AdminLayout.tsx`), aby sa nemiešali exporty komponentov
 * a pomocných funkcií — react-refresh na to má pravidlo a repo beží na 0 warnings.
 */

import type { LucideIcon } from 'lucide-react';

export interface NavItem {
    kind: 'item';
    to: string;
    label: string;
    icon: LucideIcon;
    /** Len pre superadmina (#483). Adminovi sa položka nezobrazí a API vráti 403. */
    superadminOnly?: boolean;
}

export interface NavSection {
    kind: 'section';
    label: string;
    icon: LucideIcon;
}

export type NavEntry = NavItem | NavSection;

/**
 * Odfiltruje superadmin položky a s nimi aj nadpisy sekcií, ktoré by ostali
 * prázdne — inak by adminovi v menu visel osamotený nadpis „Oprávnenia".
 */
export function visibleNav(nav: NavEntry[], superadmin: boolean): NavEntry[] {
    const allowed = nav.filter(
        (e) => e.kind !== 'item' || !e.superadminOnly || superadmin,
    );
    return allowed.filter((entry, i) => {
        if (entry.kind !== 'section') return true;
        const next = allowed[i + 1];
        return next !== undefined && next.kind === 'item';
    });
}

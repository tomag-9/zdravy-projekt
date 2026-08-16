/**
 * Kam po prihlásení patrí ktorá rola (#486).
 *
 * Presmerovanie je na troch miestach (LoginPage, ProtectedRoute, AdminRoute,
 * KuchynaRoute) a musí byť všade rovnaké — inak sa redirect zacyklí. Tento
 * test drží to pravidlo na jednom mieste.
 */

import { describe, it, expect } from 'vitest';
import { isAdminOrAbove, isKuchyna, type Role } from '../../lib/roles';

/** Rovnaká logika, akú používa LoginPage. */
function homeFor(user: { role?: Role; is_staff?: boolean }): string {
    if (isAdminOrAbove(user)) return '/admin';
    if (isKuchyna(user)) return '/kuchyna';
    return '/home';
}

describe('domovská cesta podľa role', () => {
    it.each([
        ['klient', '/home'],
        ['kuchyna', '/kuchyna'],
        ['admin', '/admin'],
        ['superadmin', '/admin'],
    ] as const)('%s → %s', (role, expected) => {
        expect(homeFor({ role })).toBe(expected);
    });

    it('login bez roly zo staršieho backendu skončí podľa is_staff', () => {
        expect(homeFor({ is_staff: true })).toBe('/admin');
        expect(homeFor({ is_staff: false })).toBe('/home');
    });

    // Admin je v rebríku nad kuchyňou, ale patrí do admin konzoly — inak by sa
    // `AdminRoute` a `KuchynaRoute` presmerovávali dokola.
    it('admin nekončí na kuchyňskej ceste', () => {
        expect(homeFor({ role: 'admin' })).not.toBe('/kuchyna');
        expect(isKuchyna({ role: 'admin' })).toBe(false);
    });
});

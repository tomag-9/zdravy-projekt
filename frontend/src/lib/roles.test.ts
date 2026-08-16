import { describe, it, expect } from 'vitest';
import { roleOf, isAdminOrAbove, isSuperadmin, isKuchyna, isKuchynaOrAbove, isKlient } from './roles';

describe('roleOf', () => {
  it('uprednostní rolu z backendu', () => {
    expect(roleOf({ role: 'kuchyna', is_staff: false })).toBe('kuchyna');
    expect(roleOf({ role: 'superadmin', is_staff: true })).toBe('superadmin');
  });

  // Bez fallbacku by admin so starým tokenom skončil na klientskej ceste.
  it('padne späť na is_staff, keď rola chýba', () => {
    expect(roleOf({ is_staff: true })).toBe('admin');
    expect(roleOf({ is_staff: false })).toBe('klient');
    expect(roleOf({})).toBe('klient');
  });

  it('neprihlásený je klient', () => {
    expect(roleOf(null)).toBe('klient');
    expect(roleOf(undefined)).toBe('klient');
  });
});

describe('predikáty rolí', () => {
  // Rebrík kuchyňa < admin < superadmin; klient stojí mimo neho.
  it.each([
    ['klient', false, false, false, true],
    ['kuchyna', true, false, false, false],
    ['admin', true, true, false, false],
    ['superadmin', true, true, true, false],
  ] as const)('%s', (role, kuchynaUp, admin, sadmin, klient) => {
    const user = { role };
    expect(isKuchynaOrAbove(user)).toBe(kuchynaUp);
    expect(isAdminOrAbove(user)).toBe(admin);
    expect(isSuperadmin(user)).toBe(sadmin);
    expect(isKlient(user)).toBe(klient);
  });

  it('admin je nad kuchyňou, ale nie je to kuchyňa', () => {
    expect(isKuchynaOrAbove({ role: 'admin' })).toBe(true);
    expect(isKuchyna({ role: 'admin' })).toBe(false);
  });

  it('is_staff bez role sa počíta ako admin', () => {
    expect(isAdminOrAbove({ is_staff: true })).toBe(true);
    expect(isSuperadmin({ is_staff: true })).toBe(false);
  });
});

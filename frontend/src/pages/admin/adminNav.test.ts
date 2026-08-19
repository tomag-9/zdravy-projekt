import { describe, it, expect } from 'vitest';
import { visibleNav } from './adminNav';

type Entry = Parameters<typeof visibleNav>[0][number];

const nav: Entry[] = [
  { kind: 'item', to: '/admin/dashboard', label: 'Prehľad', icon: (() => null) as never },
  { kind: 'section', label: 'Nastavenia', icon: (() => null) as never },
  { kind: 'item', to: '/admin/settings', label: 'Systémové', icon: (() => null) as never, superadminOnly: true },
  { kind: 'section', label: 'Oprávnenia', icon: (() => null) as never },
  { kind: 'item', to: '/admin/roles', label: 'Správa adminov', icon: (() => null) as never, superadminOnly: true },
];

const labels = (entries: Entry[]) => entries.map((e) => e.label);

describe('visibleNav', () => {
  it('superadmin vidí všetko', () => {
    expect(labels(visibleNav(nav, true))).toEqual([
      'Prehľad',
      'Nastavenia',
      'Systémové',
      'Oprávnenia',
      'Správa adminov',
    ]);
  });

  it('admin nevidí superadmin položky', () => {
    expect(labels(visibleNav(nav, false))).toEqual(['Prehľad']);
  });

  // Bez tohto by adminovi v menu ostal visieť prázdny nadpis sekcie.
  it('zahodí nadpis sekcie, ktorá ostala prázdna', () => {
    expect(labels(visibleNav(nav, false))).not.toContain('Oprávnenia');
    expect(labels(visibleNav(nav, false))).not.toContain('Nastavenia');
  });
});

describe('visibleNav so sekciami', () => {
  const withSections: Entry[] = [
    { kind: 'item', to: '/admin/dashboard', label: 'Prehľad', icon: (() => null) as never, section: 'dashboard' },
    { kind: 'item', to: '/admin/diets', label: 'Diéty', icon: (() => null) as never, section: 'diety' },
  ];

  it('skryje sekciu bez prístupu', () => {
    const out = visibleNav(withSections, true, (s) => s !== 'diety');
    expect(out.map((e) => e.label)).toEqual(['Prehľad']);
  });

  it('bez predikátu ostane menu nedotknuté', () => {
    expect(visibleNav(withSections, true)).toHaveLength(2);
  });
});

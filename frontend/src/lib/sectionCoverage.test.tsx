/**
 * Že je rolové gejtovanie zapojené na KAŽDEJ admin obrazovke (#484).
 *
 * Režim „len na čítanie" drží kontext, ktorý sa mountuje pri route. Keby sa
 * na novú obrazovku zabudlo, polia by ostali editovateľné a chybu by
 * používateľ videl až pri uložení. Namiesto klikania cez štrnásť obrazoviek
 * to overuje jedno pravidlo nad zdrojákom: každá admin routa má sekciu.
 */

import { describe, it, expect } from 'vitest';
import { SECTION } from './sections';
// `?raw` je Vite import zdrojáku ako reťazca — netreba naň typy Node.
import appSource from '../App.tsx?raw';
import navSource from '../pages/admin/AdminLayout.tsx?raw';

/** Riadky s admin routami — `<Route path="…"` vnútri /admin bloku. */
function adminRouteLines(): string[] {
  const start = appSource.indexOf('{/* Admin Routes */}');
  const end = appSource.indexOf('{/* Kuchyňa Routes */}');
  expect(start, 'blok admin rout sa nenašiel').toBeGreaterThan(-1);
  expect(end, 'blok kuchyňa rout sa nenašiel').toBeGreaterThan(start);
  return appSource
    .slice(start, end)
    .split('\n')
    .filter((line) => line.includes('<Route path='));
}

describe('gejtovanie admin obrazoviek', () => {
  it('každá admin routa je obalená sekciou', () => {
    const missing = adminRouteLines().filter(
      (line) =>
        !line.includes('<Section section=') &&
        // Rodičovská routa nesie layout a guard, nie obsah — sekciu mať nemá.
        !line.includes('<AdminRoute />') &&
        !line.includes('index'),
    );
    expect(missing, `routy bez sekcie:\n${missing.join('\n')}`).toEqual([]);
  });

  it('sekcie použité v routách existujú v registri', () => {
    const known = new Set(Object.values(SECTION));
    const used = [...appSource.matchAll(/SECTION\.(\w+)/g)].map((m) => m[1]);
    expect(used.length).toBeGreaterThan(10);
    for (const key of used) {
      expect(known.has(SECTION[key as keyof typeof SECTION]), key).toBe(true);
    }
  });

  it('menu a routy používajú tie isté sekcie', () => {
    const inNav = new Set([...navSource.matchAll(/SECTION\.(\w+)/g)].map((m) => m[1]));
    const inRoutes = new Set([...appSource.matchAll(/SECTION\.(\w+)/g)].map((m) => m[1]));

    // Položka menu bez routy by viedla nikam; routa bez položky by bola
    // nedosiahnuteľná inak než ručne napísanou URL.
    const onlyInNav = [...inNav].filter((k) => !inRoutes.has(k));
    expect(onlyInNav, `v menu, ale bez routy: ${onlyInNav}`).toEqual([]);
  });
});

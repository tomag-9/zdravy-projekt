/**
 * Slovenské skloňovanie počítaných podstatných mien.
 *
 * Slovenčina má tri tvary: 1 (jednotné číslo), 2–4 (množné), 5+ a 0 (genitív).
 * Bez toho vznikajú texty ako „1 porcií" alebo „Ešte 1 položiek".
 */
export function plural(count: number, one: string, few: string, many: string): string {
  const n = Math.abs(Math.trunc(count));
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return few;
  return many;
}

/** Napr. `countable(3, 'porcia', 'porcie', 'porcií')` → „3 porcie". */
export function countable(count: number, one: string, few: string, many: string): string {
  return `${count} ${plural(count, one, few, many)}`;
}

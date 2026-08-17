/**
 * Weekend-skipping date helpers for the "termín dodania podkladov" default
 * (see PrevadzkaOverview.tsx / #447). Mirrors the weekend check in
 * backend/api/scheduling.py — frontend-only concern (an initial useState
 * default), so kept as a small standalone util rather than shared code.
 */

const isWeekend = (date: Date): boolean => {
  const day = date.getDay(); // 0=Sunday, 6=Saturday
  return day === 0 || day === 6;
};

/** Pracovný deň (pondelok–piatok). */
export function isWeekday(date: Date): boolean {
  return !isWeekend(date);
}

/** Lokálny YYYY-MM-DD (nie ISO/UTC — to by pri večerných hodinách posunulo deň). */
export function toDateString(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

/** Poludnie zámerne — vyhne sa posunom cez letný/zimný čas. */
const parseDay = (s: string): Date => new Date(s + 'T12:00:00');

export function prevWeekday(s: string): string {
  const d = parseDay(s);
  do { d.setDate(d.getDate() - 1); } while (isWeekend(d));
  return toDateString(d);
}

export function nextWeekday(s: string): string {
  const d = parseDay(s);
  do { d.setDate(d.getDate() + 1); } while (isWeekend(d));
  return toDateString(d);
}

/** Dnešok, alebo posledný pracovný deň, ak je víkend. */
export function lastWeekdayToday(): string {
  return toDateString(previousBusinessDay(new Date()));
}

export function formatDay(s: string): string {
  return parseDay(s).toLocaleDateString('sk-SK', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

/** Return `date` unchanged if it's a weekday, otherwise the most recent
 * preceding weekday (Saturday -> Friday, Sunday -> Friday). */
export function previousBusinessDay(date: Date): Date {
  const result = new Date(date);
  while (isWeekend(result)) {
    result.setDate(result.getDate() - 1);
  }
  return result;
}

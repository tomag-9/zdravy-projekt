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

/** Return `date` unchanged if it's a weekday, otherwise the most recent
 * preceding weekday (Saturday -> Friday, Sunday -> Friday). */
export function previousBusinessDay(date: Date): Date {
  const result = new Date(date);
  while (isWeekend(result)) {
    result.setDate(result.getDate() - 1);
  }
  return result;
}

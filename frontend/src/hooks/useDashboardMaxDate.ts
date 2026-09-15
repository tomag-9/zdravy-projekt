import { useEffect, useState } from "react";
import { dashboardMaxDate, toDateKey } from "../lib/businessDay";

/**
 * Živý horný limit prevádzkových pohľadov. Stránka môže zostať otvorená cez
 * polnoc, preto samotné `useMemo(..., [])` zanechá starý limit až do refreshu.
 */
function useLiveDateValue(getValue: () => string): string {
  const [value, setValue] = useState(getValue);

  useEffect(() => {
    const refresh = () => setValue(getValue());
    let timeoutId: number;

    const scheduleMidnightRefresh = () => {
      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 0, 0);
      timeoutId = window.setTimeout(() => {
        refresh();
        scheduleMidnightRefresh();
      }, Math.max(1, nextMidnight.getTime() - now.getTime()));
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") refresh();
    };

    scheduleMidnightRefresh();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [getValue]);

  return value;
}

const getDashboardMaxDate = () => dashboardMaxDate();
const getTodayKey = () => toDateKey(new Date());

export function useDashboardMaxDate(): string {
  return useLiveDateValue(getDashboardMaxDate);
}

/** Dnešný lokálny dátum pre živé farebné stavy kalendára. */
export function useTodayKey(): string {
  return useLiveDateValue(getTodayKey);
}

import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Scrollne a krátko zvýrazní riadok/kartu podľa URL hash (napr.
 * `#prevadzka-row-42`) — používa sa pri prechode z detailu prevádzky do
 * tabuľky gramáže a do dodania podkladov (#527).
 *
 * `ready` treba nastaviť na true až keď sú dáta reálne v DOM (napr. po
 * dokončení fetchu), inak cieľový element ešte neexistuje.
 */
export function useScrollToHashRow(ready: boolean): void {
  const location = useLocation();

  useEffect(() => {
    if (!ready) return;
    const hash = location.hash;
    if (!hash || hash.length < 2) return;
    const el = document.getElementById(hash.slice(1));
    if (!el) return;

    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("zpa-row-highlight");
    const timer = window.setTimeout(() => el.classList.remove("zpa-row-highlight"), 2000);
    return () => window.clearTimeout(timer);
  }, [location.hash, ready]);
}

import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Scrollne a krátko zvýrazní riadok/kartu podľa jeho DOM id (napr.
 * `prevadzka-row-42`) — bez `#`. Zdieľané medzi `useScrollToHashRow`
 * (prechod z detailu prevádzky) a priamym vyhľadávaním v gramážnej
 * tabuľke (Enter v search poli, #573 nadväzne). Vracia id timera na
 * odstránenie zvýraznenia (na prípadný cleanup), alebo `undefined`,
 * keď cieľový element neexistuje.
 */
export function scrollToRowAndHighlight(id: string): number | undefined {
  const el = document.getElementById(id);
  if (!el) return undefined;

  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.add("zpa-row-highlight");
  return window.setTimeout(() => el.classList.remove("zpa-row-highlight"), 2000);
}

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
    const timer = scrollToRowAndHighlight(hash.slice(1));
    if (timer === undefined) return;
    return () => window.clearTimeout(timer);
  }, [location.hash, ready]);
}

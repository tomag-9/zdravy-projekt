import { useEffect } from "react";

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const el = document.querySelector<HTMLElement>(".zp-route-body");
    if (!el) return;
    const prev = el.style.overflow;
    el.style.overflow = "hidden";
    return () => {
      el.style.overflow = prev;
    };
  }, [active]);
}

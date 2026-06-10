import { useEffect } from "react";

const APP_HEIGHT_VAR = "--zp-app-height";

function getViewportHeight() {
  return window.visualViewport?.height ?? window.innerHeight;
}

function setStableViewportHeight() {
  document.documentElement.style.setProperty(
    APP_HEIGHT_VAR,
    `${getViewportHeight()}px`,
  );
}

export function useStableViewportHeight() {
  useEffect(() => {
    setStableViewportHeight();

    const frame = window.requestAnimationFrame(setStableViewportHeight);

    window.addEventListener("resize", setStableViewportHeight);
    window.addEventListener("orientationchange", setStableViewportHeight);
    document.addEventListener("visibilitychange", setStableViewportHeight);
    window.visualViewport?.addEventListener("resize", setStableViewportHeight);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", setStableViewportHeight);
      window.removeEventListener("orientationchange", setStableViewportHeight);
      document.removeEventListener("visibilitychange", setStableViewportHeight);
      window.visualViewport?.removeEventListener("resize", setStableViewportHeight);
    };
  }, []);
}

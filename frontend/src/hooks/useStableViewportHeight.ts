import { useEffect } from "react";

const APP_HEIGHT_VAR = "--zp-app-height";

function getViewportHeight() {
  const heights = [
    window.innerHeight,
    window.visualViewport?.height,
    document.documentElement.clientHeight,
  ].filter(
    (height): height is number =>
      typeof height === "number" && Number.isFinite(height) && height > 0,
  );

  return Math.floor(Math.min(...heights));
}

function setStableViewportHeight() {
  document.documentElement.style.setProperty(
    APP_HEIGHT_VAR,
    `${getViewportHeight()}px`,
  );
}

export function useStableViewportHeight() {
  useEffect(() => {
    let frame = 0;
    let timeout = 0;

    const scheduleStableViewportHeight = () => {
      setStableViewportHeight();
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
      frame = window.requestAnimationFrame(setStableViewportHeight);
      timeout = window.setTimeout(setStableViewportHeight, 250);
    };

    scheduleStableViewportHeight();

    window.addEventListener("resize", scheduleStableViewportHeight);
    window.addEventListener("orientationchange", scheduleStableViewportHeight);
    window.addEventListener("pageshow", scheduleStableViewportHeight);
    document.addEventListener("visibilitychange", scheduleStableViewportHeight);
    window.visualViewport?.addEventListener("resize", scheduleStableViewportHeight);
    window.visualViewport?.addEventListener("scroll", scheduleStableViewportHeight);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
      window.removeEventListener("resize", scheduleStableViewportHeight);
      window.removeEventListener("orientationchange", scheduleStableViewportHeight);
      window.removeEventListener("pageshow", scheduleStableViewportHeight);
      document.removeEventListener("visibilitychange", scheduleStableViewportHeight);
      window.visualViewport?.removeEventListener("resize", scheduleStableViewportHeight);
      window.visualViewport?.removeEventListener("scroll", scheduleStableViewportHeight);
    };
  }, []);
}

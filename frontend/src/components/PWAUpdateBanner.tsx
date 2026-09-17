/**
 * PWAUpdateBanner
 *
 * Purely informational: PWAProvider applies a waiting SW update immediately
 * on its own (forced reload, no click needed — a stale open tab must never
 * keep running pre-fix JS after a deploy). This just shows a brief notice
 * for the short window before that reload happens.
 */

import { usePWA } from '../hooks/usePWA';

export default function PWAUpdateBanner() {
  const { updateAvailable, isStandalone } = usePWA();

  // Standalone (installed PWA, e.g. kitchen tablet) reloads silently.
  if (!updateAvailable || isStandalone) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-blue-600 text-white px-4 py-3 text-center shadow-md">
      <p className="text-sm font-medium">
        Aktualizujem na novú verziu…
      </p>
    </div>
  );
}

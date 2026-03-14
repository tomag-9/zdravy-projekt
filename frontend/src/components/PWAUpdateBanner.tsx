/**
 * PWAUpdateBanner
 *
 * Shown when a new version of the Service Worker is waiting.
 * Clicking "Aktualizovať" triggers skipWaiting and reloads the page.
 */

import { usePWA } from '../context/PWAContext';

export default function PWAUpdateBanner() {
  const { updateAvailable, applyUpdate } = usePWA();

  if (!updateAvailable) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-blue-600 text-white px-4 py-3 flex items-center justify-between gap-3 shadow-md">
      <p className="text-sm font-medium">
        Dostupná nová verzia aplikácie.
      </p>
      <button
        onClick={applyUpdate}
        className="shrink-0 px-3 py-1 bg-white text-blue-700 text-sm font-semibold rounded-lg hover:bg-blue-50 transition-colors"
      >
        Aktualizovať
      </button>
    </div>
  );
}

/**
 * PWAInstallBanner
 *
 * Shows a dismissible bottom bar prompting the user to install the PWA.
 *
 * - Android/Chrome: uses the beforeinstallprompt API (canInstall === true)
 * - iOS Safari: shows static instructions (add to home screen)
 * - Dismissed state is persisted in localStorage
 */

import { useEffect, useState } from 'react';
import { usePWA } from '../context/PWAContext';

const DISMISS_KEY = 'zdravy-install-banner-dismissed';

export default function PWAInstallBanner() {
  const { isStandalone, isIOS, canInstall, installPrompt } = usePWA();
  const [dismissed, setDismissed] = useState(true); // start hidden until checked

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === 'true');
  }, []);

  // Don't show if already installed, not installable, or dismissed
  if (isStandalone) return null;
  if (!canInstall && !isIOS) return null;
  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, 'true');
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4 bg-white border-t border-slate-200 shadow-lg flex items-center gap-3">
      <div className="flex-1 min-w-0">
        {isIOS ? (
          <p className="text-sm text-slate-700">
            <span className="font-semibold">Nainštalovať aplikáciu:</span> Klepnite na{' '}
            <strong>Zdieľať ↑</strong> → „<strong>Pridať na plochu</strong>"
          </p>
        ) : (
          <p className="text-sm text-slate-700">
            <span className="font-semibold">Zdravý Projekt</span> — pridajte aplikáciu
            na plochu pre rýchly prístup.
          </p>
        )}
      </div>

      {canInstall && (
        <button
          onClick={installPrompt}
          className="shrink-0 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Inštalovať
        </button>
      )}

      <button
        onClick={handleDismiss}
        aria-label="Zavrieť"
        className="shrink-0 p-1 text-slate-400 hover:text-slate-600 transition-colors"
      >
        ✕
      </button>
    </div>
  );
}

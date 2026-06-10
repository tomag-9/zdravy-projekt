/**
 * PWAInstallBanner
 *
 * Shows a dismissible mobile-only prompt after client login.
 *
 * - Android/Chrome: uses the beforeinstallprompt API (canInstall === true)
 * - iOS Safari: shows static instructions (add to home screen)
 * - Dismissed state is persisted in localStorage
 */

import { useEffect, useState } from 'react';
import { usePWA } from '../hooks/usePWA';
import { useScrollLock } from '../hooks/useScrollLock';

const DISMISS_KEY = 'zdravy-install-banner-dismissed-until-v2';
const DISMISS_DAYS = 7;

function isDismissed(): boolean {
  const until = localStorage.getItem(DISMISS_KEY);
  if (!until) return false;
  return Date.now() < parseInt(until, 10);
}

export default function PWAInstallBanner() {
  const { isStandalone, isIOS, isAndroid, isMobile, canInstall, installPrompt } = usePWA();
  const [dismissed, setDismissed] = useState(true); // start hidden until checked

  useEffect(() => {
    setDismissed(isDismissed());
  }, []);

  const showPrompt = !isStandalone && isMobile && !dismissed;
  useScrollLock(showPrompt);

  // Don't show if already installed, desktop, or dismissed
  if (isStandalone) return null;
  if (!isMobile) return null;
  if (dismissed) return null;

  const handleDismiss = () => {
    const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISS_KEY, String(until));
    setDismissed(true);
  };

  return (
    <div className="zp-centered-modal z-50 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 space-y-5" style={{ fontFamily: 'var(--font-display)' }}>
          <div className="text-center space-y-2">
            <div className="text-4xl">📱</div>
            <h2 className="text-xl font-bold text-slate-800">
              Nainštalovať aplikáciu
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Pre najspoľahlivejšie notifikácie a pohodlné používanie si
              pridajte Zdravý Projekt na plochu telefónu.
            </p>
          </div>

          {isIOS ? (
            <div className="bg-slate-50 rounded-xl p-4 text-left text-sm text-slate-600 space-y-1">
              <p className="font-medium">Najlepšie cez Safari:</p>
              <p>1. Otvorte aplikáciu v Safari</p>
              <p>2. Klepnite na Zdieľať</p>
              <p>3. Vyberte Pridať na plochu</p>
            </div>
          ) : isAndroid ? (
            <div className="bg-slate-50 rounded-xl p-4 text-left text-sm text-slate-600 space-y-1">
              <p className="font-medium">Najlepšie cez Chrome:</p>
              <p>1. Otvorte aplikáciu v Chrome</p>
              <p>2. V menu vyberte Inštalovať aplikáciu</p>
              <p>3. Potvrďte pridanie na plochu</p>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-xl p-4 text-left text-sm text-slate-600">
              Otvorte stránku v mobilnom prehliadači Chrome alebo Safari a
              pridajte si ju na plochu.
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleDismiss}
              className="zp-btn zp-btn--ghost flex-1"
            >
              Teraz nie
            </button>
            {canInstall ? (
              <button
                onClick={installPrompt}
                className="zp-btn zp-btn--primary flex-1"
              >
                Inštalovať
              </button>
            ) : (
              <button
                onClick={handleDismiss}
                className="zp-btn zp-btn--primary flex-1"
              >
                Rozumiem
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

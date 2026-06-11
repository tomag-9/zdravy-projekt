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
    <div className="zp-centered-modal" style={{ zIndex: 50, background: 'rgba(23,53,5,0.42)', backdropFilter: 'blur(3px)' }}>
      <div style={{
        background: 'var(--bg-cream)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-lg)',
        width: '100%',
        maxWidth: 380,
        overflow: 'hidden',
        fontFamily: 'var(--font-display)',
      }}>
        <div style={{ padding: '28px 28px 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📱</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--green-900)', margin: '0 0 8px' }}>
              Nainštalovať aplikáciu
            </h2>
            <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.5, margin: 0 }}>
              Pre najspoľahlivejšie notifikácie a pohodlné používanie si pridajte Zdravý Projekt na plochu telefónu.
            </p>
          </div>

          {isIOS ? (
            <div style={{
              background: 'var(--bg-cream-soft)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 16px',
              fontSize: 13,
              color: 'var(--ink-2)',
              marginBottom: 20,
            }}>
              <p style={{ fontWeight: 600, margin: '0 0 6px' }}>Najlepšie cez Safari:</p>
              <p style={{ margin: '0 0 3px' }}>1. Otvorte aplikáciu v Safari</p>
              <p style={{ margin: '0 0 3px' }}>2. Klepnite na Zdieľať</p>
              <p style={{ margin: 0 }}>3. Vyberte Pridať na plochu</p>
            </div>
          ) : isAndroid ? (
            <div style={{
              background: 'var(--bg-cream-soft)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 16px',
              fontSize: 13,
              color: 'var(--ink-2)',
              marginBottom: 20,
            }}>
              <p style={{ fontWeight: 600, margin: '0 0 6px' }}>Najlepšie cez Chrome:</p>
              <p style={{ margin: '0 0 3px' }}>1. Otvorte aplikáciu v Chrome</p>
              <p style={{ margin: '0 0 3px' }}>2. V menu vyberte Inštalovať aplikáciu</p>
              <p style={{ margin: 0 }}>3. Potvrďte pridanie na plochu</p>
            </div>
          ) : (
            <div style={{
              background: 'var(--bg-cream-soft)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 16px',
              fontSize: 13,
              color: 'var(--ink-2)',
              marginBottom: 20,
            }}>
              Otvorte stránku v mobilnom prehliadači Chrome alebo Safari a pridajte si ju na plochu.
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleDismiss} className="zp-btn zp-btn--ghost" style={{ flex: 1 }}>Teraz nie</button>
            {canInstall ? (
              <button onClick={installPrompt} className="zp-btn zp-btn--primary" style={{ flex: 1 }}>Inštalovať</button>
            ) : (
              <button onClick={handleDismiss} className="zp-btn zp-btn--primary" style={{ flex: 1 }}>Rozumiem</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

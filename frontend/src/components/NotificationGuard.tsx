/**
 * NotificationGuard
 *
 * Only active in mobile PWA standalone mode. In a regular browser window or
 * desktop PWA this component is transparent and renders children immediately.
 *
 * States (standalone mode only):
 *  1. 'unsupported'  → render children (graceful degrade)
 *  2. 'granted'      → render children normally
 *  3. 'denied'       → blocking screen with instructions to reset permission
 *  4. 'default'      → blocking screen with "Allow notifications" button
 */

import React, { useState } from 'react';
import { usePWA } from '../hooks/usePWA';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useScrollLock } from '../hooks/useScrollLock';

interface NotificationGuardProps {
  children: React.ReactNode;
}

export default function NotificationGuard({ children }: NotificationGuardProps) {
  const { isStandalone, isMobile } = usePWA();

  if (isStandalone && isMobile) {
    return <StandaloneNotificationGuard>{children}</StandaloneNotificationGuard>;
  }

  return <>{children}</>;
}

function StandaloneNotificationGuard({ children }: NotificationGuardProps) {
  const { permission, subscribe, error } = usePushNotifications();
  const [requesting, setRequesting] = useState(false);

  // API not supported – degrade gracefully
  if (permission === 'unsupported') {
    return <>{children}</>;
  }

  // Notifications granted – all good
  if (permission === 'granted') {
    return (
      <>
        {children}
        <BackgroundReliabilityNotice />
      </>
    );
  }

  // Permission denied: user needs to reset it in browser settings
  if (permission === 'denied') {
    return <PermissionDeniedScreen />;
  }

  // Default: prompt the user to allow notifications
  const handleAllow = async () => {
    setRequesting(true);
    await subscribe();
    setRequesting(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-cream)',
      padding: 24,
      textAlign: 'center',
    }}>
      <div style={{
        maxWidth: 380,
        width: '100%',
        background: 'var(--bg-cream-warm)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-md)',
        padding: 32,
        fontFamily: 'var(--font-display)',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔔</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--green-900)', margin: '0 0 8px' }}>
          Povolenie notifikácií
        </h1>
        <p style={{ color: 'var(--ink-3)', fontSize: 14, lineHeight: 1.5, margin: '0 0 20px' }}>
          Na správne fungovanie aplikácie potrebujeme vaše povolenie na
          zasielanie push notifikácií. Budeme vás upozorňovať na blížiace
          sa uzávierky objednávok.
        </p>

        {error && (
          <p style={{ fontSize: 13, color: 'var(--coral-600)', background: 'rgba(201,46,82,0.08)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 16 }}>{error}</p>
        )}

        <button
          onClick={handleAllow}
          disabled={requesting}
          className="zp-btn zp-btn--primary zp-btn--block"
          style={{ marginBottom: 12 }}
        >
          {requesting ? 'Čakajte...' : 'Povoliť notifikácie'}
        </button>

        <p style={{ fontSize: 11, color: 'var(--ink-3)', margin: 0 }}>
          Notifikácie môžete kedykoľvek vypnúť v nastaveniach zariadenia.
        </p>
      </div>
    </div>
  );
}

const BACKGROUND_NOTICE_DISMISSED_KEY = 'zdravy-background-notice-dismissed-v1';

function BackgroundReliabilityNotice() {
  const { isIOS, isAndroid } = usePWA();
  const [dismissed, setDismissed] = useState(() => (
    localStorage.getItem(BACKGROUND_NOTICE_DISMISSED_KEY) === '1'
  ));

  const showNotice = !dismissed && (isIOS || isAndroid);
  useScrollLock(showNotice);

  if (!showNotice) return null;

  const handleDismiss = () => {
    localStorage.setItem(BACKGROUND_NOTICE_DISMISSED_KEY, '1');
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
          <div style={{ fontSize: 40, textAlign: 'center', marginBottom: 12 }}>🔋</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--green-900)', margin: '0 0 8px' }}>
            Spoľahlivé notifikácie
          </h2>
          <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.5, margin: '0 0 16px' }}>
            Aby pripomienky dorazili čo najspoľahlivejšie, nechajte aplikácii povolené notifikácie a beh na pozadí.
          </p>

          {isAndroid ? (
            <div style={{
              background: 'var(--bg-cream-soft)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 16px',
              fontSize: 13,
              color: 'var(--ink-2)',
              marginBottom: 20,
            }}>
              <p style={{ fontWeight: 600, margin: '0 0 6px' }}>Android:</p>
              <p style={{ margin: '0 0 3px' }}>1. Otvorte Nastavenia zariadenia</p>
              <p style={{ margin: '0 0 3px' }}>2. Prejdite na Aplikácie → Zdravý Projekt → Batéria</p>
              <p style={{ margin: 0 }}>3. Vypnite šetrenie batérie alebo povoľte neobmedzený beh</p>
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
              <p style={{ fontWeight: 600, margin: '0 0 6px' }}>iPhone:</p>
              <p style={{ margin: '0 0 3px' }}>1. Aplikácia musí byť pridaná na plochu zo Safari</p>
              <p style={{ margin: '0 0 3px' }}>2. V Nastaveniach povoľte notifikácie pre Zdravý Projekt</p>
              <p style={{ margin: 0 }}>3. Nevypínajte notifikácie ani režim sústredenia pre aplikáciu</p>
            </div>
          )}

          <button
            onClick={handleDismiss}
            className="zp-btn zp-btn--primary zp-btn--block"
          >
            Rozumiem
          </button>
        </div>
      </div>
    </div>
  );
}

function PermissionDeniedScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-cream)',
      padding: 24,
      textAlign: 'center',
    }}>
      <div style={{
        maxWidth: 380,
        width: '100%',
        background: 'var(--bg-cream-warm)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-md)',
        padding: 32,
        fontFamily: 'var(--font-display)',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🚫</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--green-900)', margin: '0 0 8px' }}>
          Notifikácie sú zablokované
        </h1>
        <p style={{ color: 'var(--ink-3)', fontSize: 14, lineHeight: 1.5, margin: '0 0 16px' }}>
          Aby ste mohli používať aplikáciu, je potrebné povoliť notifikácie.
          Otvorte nastavenia prehliadača alebo zariadenia a povolte notifikácie
          pre túto stránku.
        </p>
        <div style={{
          background: 'var(--bg-cream-soft)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 16px',
          fontSize: 13,
          color: 'var(--ink-2)',
          textAlign: 'left',
        }}>
          <p style={{ fontWeight: 600, margin: '0 0 6px' }}>Ako to napraviť:</p>
          <p style={{ margin: '0 0 3px' }}>1. Otvorte Nastavenia zariadenia</p>
          <p style={{ margin: '0 0 3px' }}>2. Prejdite na Oznámenia</p>
          <p style={{ margin: 0 }}>3. Nájdite „Zdravý Projekt" a povolte</p>
        </div>
      </div>
    </div>
  );
}

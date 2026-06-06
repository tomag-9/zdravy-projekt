/**
 * NotificationGuard
 *
 * Only active in PWA standalone mode. In a regular browser window this
 * component is transparent and renders children immediately.
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
  const { isStandalone } = usePWA();

  if (isStandalone) {
    return <StandaloneNotificationGuard>{children}</StandaloneNotificationGuard>;
  }

  return <BrowserNotificationPrompt>{children}</BrowserNotificationPrompt>;
}

function BrowserNotificationPrompt({ children }: NotificationGuardProps) {
  const { permission, subscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const showPrompt = !dismissed && permission === 'default';
  useScrollLock(showPrompt);

  const handleAllow = async () => {
    setRequesting(true);
    await subscribe();
    setRequesting(false);
    setDismissed(true);
  };

  return (
    <>
      {children}
      {showPrompt && (
        <div className="zp-centered-modal z-50 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6" style={{ fontFamily: 'var(--font-display)' }}>
              <div style={{ fontSize: 40, marginBottom: 16, textAlign: 'center' }}>🔔</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink-1)', marginBottom: 8 }}>
                Povolenie notifikácií
              </h3>
              <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.5, marginBottom: 24 }}>
                Budeme vás upozorňovať na blížiace sa uzávierky objednávok. Notifikácie môžete kedykoľvek vypnúť v nastaveniach zariadenia.
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setDismissed(true)}
                  className="zp-btn zp-btn--ghost"
                  style={{ flex: 1 }}
                >
                  Teraz nie
                </button>
                <button
                  onClick={handleAllow}
                  disabled={requesting}
                  className="zp-btn zp-btn--primary"
                  style={{ flex: 1 }}
                >
                  {requesting ? 'Čakajte...' : 'Povoliť'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
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
    return <>{children}</>;
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
      <div className="max-w-sm w-full bg-white rounded-2xl shadow-lg p-8 space-y-6">
        <div className="text-5xl">🔔</div>
        <div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">
            Povolenie notifikácií
          </h1>
          <p className="text-slate-500 text-sm">
            Na správne fungovanie aplikácie potrebujeme vaše povolenie na
            zasielanie push notifikácií. Budeme vás upozorňovať na blížiace
            sa uzávierky objednávok.
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>
        )}

        <button
          onClick={handleAllow}
          disabled={requesting}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl transition-colors"
        >
          {requesting ? 'Čakajte...' : 'Povoliť notifikácie'}
        </button>

        <p className="text-xs text-slate-400">
          Notifikácie môžete kedykoľvek vypnúť v nastaveniach zariadenia.
        </p>
      </div>
    </div>
  );
}

function PermissionDeniedScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
      <div className="max-w-sm w-full bg-white rounded-2xl shadow-lg p-8 space-y-4">
        <div className="text-5xl">🚫</div>
        <h1 className="text-xl font-bold text-slate-800">
          Notifikácie sú zablokované
        </h1>
        <p className="text-slate-500 text-sm">
          Aby ste mohli používať aplikáciu, je potrebné povoliť notifikácie.
          Otvorte nastavenia prehliadača alebo zariadenia a povolte notifikácie
          pre túto stránku.
        </p>
        <div className="bg-slate-50 rounded-xl p-4 text-left text-sm text-slate-600 space-y-1">
          <p className="font-medium">Ako to napraviť:</p>
          <p>1. Otvorte Nastavenia zariadenia</p>
          <p>2. Prejdite na Oznámenia</p>
          <p>3. Nájdite „Zdravý Projekt" a povolte</p>
        </div>
      </div>
    </div>
  );
}


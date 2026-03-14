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
 *  5. iOS in browser → blocking screen with "Add to Home Screen" instructions
 */

import React, { useState } from 'react';
import { usePWA } from '../context/PWAContext';
import { usePushNotifications } from '../hooks/usePushNotifications';

interface NotificationGuardProps {
  children: React.ReactNode;
}

export default function NotificationGuard({ children }: NotificationGuardProps) {
  const { isStandalone, isIOS } = usePWA();
  const { permission, subscribe, error } = usePushNotifications();
  const [requesting, setRequesting] = useState(false);

  // In browser mode (not standalone), skip the guard entirely
  if (!isStandalone) {
    return <>{children}</>;
  }

  // API not supported – degrade gracefully
  if (permission === 'unsupported') {
    return <>{children}</>;
  }

  // Notifications granted – all good
  if (permission === 'granted') {
    return <>{children}</>;
  }

  // iOS in browser mode: can't request permission, must add to home screen first
  if (isIOS && !isStandalone) {
    return <IOSInstallScreen />;
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

function IOSInstallScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
      <div className="max-w-sm w-full bg-white rounded-2xl shadow-lg p-8 space-y-4">
        <div className="text-5xl">📱</div>
        <h1 className="text-xl font-bold text-slate-800">
          Pridajte aplikáciu na plochu
        </h1>
        <p className="text-slate-500 text-sm">
          Na iOS je potrebné pridať aplikáciu na plochu, aby bolo možné
          používať push notifikácie (vyžaduje iOS 16.4+).
        </p>
        <div className="bg-slate-50 rounded-xl p-4 text-left text-sm text-slate-600 space-y-1">
          <p>1. Klepnite na ikonu <strong>Zdieľať</strong> ↑ v Safari</p>
          <p>2. Vyberte „<strong>Pridať na plochu</strong>"</p>
          <p>3. Potvrďte tlačidlom „<strong>Pridať</strong>"</p>
          <p>4. Otvorte aplikáciu z plochy</p>
        </div>
      </div>
    </div>
  );
}

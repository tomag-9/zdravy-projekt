/**
 * PWA Context
 *
 * Provides:
 *  - isStandalone  – true when running as installed PWA (display-mode: standalone)
 *  - isIOS         – true on iPhone/iPad (affects install instructions)
 *  - canInstall    – true when beforeinstallprompt event fired (Android/Chrome)
 *  - installPrompt – call to show the OS install dialog
 *  - swRegistration
 *  - updateAvailable – a new SW version is waiting
 *  - applyUpdate   – activates the waiting SW and reloads
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  applyUpdate,
  registerServiceWorker,
  setUpdateCallback,
} from '../lib/registerSW';
import { PWAContext } from './pwa-context';

function detectIOS(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as Window & { MSStream?: unknown }).MSStream
  );
}

function detectAndroid(): boolean {
  return /Android/i.test(navigator.userAgent);
}

function detectStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [isStandalone] = useState(detectStandalone);
  const [isIOS] = useState(detectIOS);
  const [isAndroid] = useState(detectAndroid);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [swRegistration, setSwRegistration] =
    useState<ServiceWorkerRegistration | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  // Keep a stable ref to registration for applyUpdate
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  registrationRef.current = swRegistration;

  useEffect(() => {
    // Observe installability signal (Android/Chrome). We do not call
    // preventDefault here so browser-native install UI remains available.
    const handleBeforeInstall = (e: Event) => {
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Wire up SW update detection
    setUpdateCallback(() => setUpdateAvailable(true));
    registerServiceWorker().then((reg) => {
      setSwRegistration(reg);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const installPrompt = useCallback(() => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(() => setDeferredPrompt(null));
  }, [deferredPrompt]);

  const handleApplyUpdate = useCallback(() => {
    if (registrationRef.current) {
      applyUpdate(registrationRef.current);
    }
  }, []);

  return (
    <PWAContext.Provider
      value={{
        isStandalone,
        isIOS,
        isAndroid,
        canInstall: !!deferredPrompt,
        installPrompt,
        swRegistration,
        updateAvailable,
        applyUpdate: handleApplyUpdate,
      }}
    >
      {children}
    </PWAContext.Provider>
  );
}

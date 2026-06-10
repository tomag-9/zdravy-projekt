/**
 * usePushNotifications
 *
 * Manages the full Web Push subscription lifecycle:
 *   1. Checks Notification API support
 *   2. Fetches the VAPID public key from the backend
 *   3. subscribe() – requests permission + subscribes + saves to backend
 *   4. unsubscribe() – unsubscribes browser + removes from backend
 *
 * Note:
 *   Subscription is considered successful only after backend registration.
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/auth';

const API_URL = import.meta.env.VITE_API_URL || '/api';

type PermissionState = NotificationPermission | 'unsupported';

interface UsePushNotificationsReturn {
  permission: PermissionState;
  isSubscribed: boolean;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  ensureSubscriptionRegistration: () => Promise<boolean>;
  error: string | null;
}

function buildApiUrl(path: string): string {
  if (/^https?:\/\//i.test(API_URL)) {
    return `${API_URL}${path}`;
  }
  return new URL(`${API_URL}${path}`, window.location.origin).toString();
}

/** Convert a base64url VAPID public key to a Uint8Array for pushManager. */
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const bytes = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    bytes[i] = rawData.charCodeAt(i);
  }
  return bytes.buffer;
}

function arrayBufferEquals(a: ArrayBuffer | null, b: ArrayBuffer): boolean {
  if (!a || a.byteLength !== b.byteLength) return false;
  const aBytes = new Uint8Array(a);
  const bBytes = new Uint8Array(b);
  return aBytes.every((value, index) => value === bBytes[index]);
}

/** Extract the serialisable parts of a PushSubscription for sending to the API. */
function serializeSubscription(sub: PushSubscription): {
  endpoint: string;
  p256dh: string;
  auth: string;
} {
  const json = sub.toJSON();
  return {
    endpoint: json.endpoint ?? sub.endpoint,
    p256dh: json.keys?.p256dh ?? '',
    auth: json.keys?.auth ?? '',
  };
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const { apiFetch } = useAuth();

  const [permission, setPermission] = useState<PermissionState>(() => {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
  });
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch VAPID public key once
  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;

    fetch(buildApiUrl('/push/vapid-public-key/'))
      .then((r) => r.json())
      .then((data) => setVapidPublicKey(data.vapid_public_key ?? null))
      .catch(() => setError('Nepodarilo sa načítať VAPID kľúč.'));
  }, []);

  // Check if already subscribed in this browser
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setIsSubscribed(!!sub))
      .catch(() => { });
  }, []);

  const registerWithBackend = useCallback(async (pushSub: PushSubscription): Promise<boolean> => {
    try {
      const serialized = serializeSubscription(pushSub);
      const response = await apiFetch(`${API_URL}/push/subscribe/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serialized),
      });

      if (!response.ok) {
        let message = 'Nepodarilo sa aktivovať notifikácie. Skúste to znova online.';
        try {
          const data = await response.json();
          if (typeof data?.detail === 'string' && data.detail) {
            message = data.detail;
          }
        } catch {
          // Ignore invalid/non-JSON error responses.
        }

        setIsSubscribed(false);
        setError(message);
        return false;
      }

      setIsSubscribed(true);
      return true;
    } catch {
      setIsSubscribed(false);
      setError('Nepodarilo sa aktivovať notifikácie. Skúste to znova online.');
      return false;
    }
  }, [apiFetch]);

  const getOrCreateBrowserSubscription = useCallback(async (): Promise<PushSubscription | null> => {
    if (!vapidPublicKey) {
      setError('VAPID kľúč nie je dostupný. Skúste to neskôr.');
      return null;
    }

    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    const existingKey = existing?.options.applicationServerKey ?? null;

    if (existing && arrayBufferEquals(existingKey, applicationServerKey)) {
      return existing;
    }

    if (existing) {
      await existing.unsubscribe().catch(() => { });
    }

    return reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
  }, [vapidPublicKey]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    setError(null);

    if (!('Notification' in window)) {
      setError('Váš prehliadač nepodporuje notifikácie.');
      return false;
    }

    if (!('serviceWorker' in navigator)) {
      setError('Váš prehliadač nepodporuje service worker notifikácie.');
      return false;
    }

    // Request permission
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result !== 'granted') return false;

    try {
      const pushSub = await getOrCreateBrowserSubscription();
      if (!pushSub) return false;

      const registered = await registerWithBackend(pushSub);
      if (!registered) {
        await pushSub.unsubscribe().catch(() => { });
      }
      return registered;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Chyba pri prihlasovaní na notifikácie: ${msg}`);
      return false;
    }
  }, [getOrCreateBrowserSubscription, registerWithBackend]);

  const ensureSubscriptionRegistration = useCallback(async (): Promise<boolean> => {
    setError(null);

    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      return false;
    }

    const currentPermission = Notification.permission;
    setPermission(currentPermission);
    if (currentPermission !== 'granted') return false;

    try {
      const pushSub = await getOrCreateBrowserSubscription();
      if (!pushSub) return false;
      return registerWithBackend(pushSub);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Chyba pri obnove notifikácií: ${msg}`);
      return false;
    }
  }, [getOrCreateBrowserSubscription, registerWithBackend]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const pushSub = await reg.pushManager.getSubscription();
      if (!pushSub) return true;

      const { endpoint } = pushSub;
      await pushSub.unsubscribe();

      await apiFetch(`${API_URL}/push/subscribe/`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint }),
      }).catch(() => { }); // Best-effort

      setIsSubscribed(false);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Chyba pri odhlasovaní z notifikácií: ${msg}`);
      return false;
    }
  }, [apiFetch]);

  return {
    permission,
    isSubscribed,
    subscribe,
    unsubscribe,
    ensureSubscriptionRegistration,
    error,
  };
}

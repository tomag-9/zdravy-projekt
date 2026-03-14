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
  unsubscribe: () => Promise<void>;
  error: string | null;
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
    fetch(`${API_URL}/push/vapid-public-key/`)
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

  const subscribe = useCallback(async (): Promise<boolean> => {
    setError(null);

    if (!('Notification' in window)) {
      setError('Váš prehliadač nepodporuje notifikácie.');
      return false;
    }

    if (!vapidPublicKey) {
      setError('VAPID kľúč nie je dostupný. Skúste to neskôr.');
      return false;
    }

    // Request permission
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result !== 'granted') return false;

    try {
      const reg = await navigator.serviceWorker.ready;
      const pushSub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const serialized = serializeSubscription(pushSub);

      try {
        await apiFetch(`${API_URL}/push/subscribe/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(serialized),
        });
        setIsSubscribed(true);
        return true;
      } catch (fetchErr) {
        // Keep browser and server subscription state consistent.
        await pushSub.unsubscribe().catch(() => { });
        setIsSubscribed(false);
        setError('Nepodarilo sa aktivovať notifikácie. Skúste to znova online.');
        return false;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Chyba pri prihlasovaní na notifikácie: ${msg}`);
      return false;
    }
  }, [vapidPublicKey, apiFetch]);

  const unsubscribe = useCallback(async (): Promise<void> => {
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const pushSub = await reg.pushManager.getSubscription();
      if (!pushSub) return;

      const { endpoint } = pushSub;
      await pushSub.unsubscribe();

      await apiFetch(`${API_URL}/push/subscribe/`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint }),
      }).catch(() => { }); // Best-effort

      setIsSubscribed(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Chyba pri odhlasovaní z notifikácií: ${msg}`);
    }
  }, [apiFetch]);

  return { permission, isSubscribed, subscribe, unsubscribe, error };
}

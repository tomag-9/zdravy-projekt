/**
 * Service Worker registration and update management.
 *
 * - Registers /sw.js on app startup
 * - Detects when a new SW version is waiting and fires the updateCallback
 * - applyUpdate() posts SKIP_WAITING and reloads once the new SW takes control
 */

type UpdateCallback = () => void;

let _updateCallback: UpdateCallback | null = null;

/** Set the function to call when a new SW version is waiting. */
export function setUpdateCallback(cb: UpdateCallback): void {
  _updateCallback = cb;
}

/** Register the service worker and wire up update detection. */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    // A new SW found during this session
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (
          newWorker.state === 'installed' &&
          navigator.serviceWorker.controller
        ) {
          // A new version installed, old one still controlling – notify app
          _updateCallback?.();
        }
      });
    });

    // A new SW was already waiting when the page loaded (e.g. tab refreshed)
    if (registration.waiting && navigator.serviceWorker.controller) {
      _updateCallback?.();
    }

    return registration;
  } catch (err) {
    console.error('[SW] Registration failed:', err);
    return null;
  }
}

/**
 * Trigger the waiting SW to skip waiting and reload the page once it
 * takes control.
 */
export function applyUpdate(registration: ServiceWorkerRegistration): void {
  if (!registration.waiting) return;

  // Listen for controllerchange once – then reload
  navigator.serviceWorker.addEventListener(
    'controllerchange',
    () => window.location.reload(),
    { once: true }
  );

  registration.waiting.postMessage({ type: 'SKIP_WAITING' });
}

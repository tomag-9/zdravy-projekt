import { createContext } from 'react';

export interface PWAContextType {
  isStandalone: boolean;
  isIOS: boolean;
  canInstall: boolean;
  installPrompt: () => void;
  swRegistration: ServiceWorkerRegistration | null;
  updateAvailable: boolean;
  applyUpdate: () => void;
}

export const PWAContext = createContext<PWAContextType>({
  isStandalone: false,
  isIOS: false,
  canInstall: false,
  installPrompt: () => {},
  swRegistration: null,
  updateAvailable: false,
  applyUpdate: () => {},
});

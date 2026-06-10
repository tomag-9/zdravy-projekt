import { createContext } from 'react';

export interface PWAContextType {
    isStandalone: boolean;
    isIOS: boolean;
    isAndroid: boolean;
    isMobile: boolean;
    isDesktop: boolean;
    canInstall: boolean;
    installPrompt: () => void;
    swRegistration: ServiceWorkerRegistration | null;
    updateAvailable: boolean;
    applyUpdate: () => void;
}

export const PWAContext = createContext<PWAContextType>({
    isStandalone: false,
    isIOS: false,
    isAndroid: false,
    isMobile: false,
    isDesktop: true,
    canInstall: false,
    installPrompt: () => { },
    swRegistration: null,
    updateAvailable: false,
    applyUpdate: () => { },
});

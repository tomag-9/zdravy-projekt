import { useContext } from 'react';
import { PWAContext, type PWAContextType } from '../context/pwa-context';

export function usePWA(): PWAContextType {
    return useContext(PWAContext);
}

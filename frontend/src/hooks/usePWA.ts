import { useContext } from 'react';
import { PWAContext, type PWAContextType } from '../context/pwaContext';

export function usePWA(): PWAContextType {
  return useContext(PWAContext);
}

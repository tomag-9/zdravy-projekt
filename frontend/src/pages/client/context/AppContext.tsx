/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, ReactNode, useState, useCallback } from 'react';
import { useOrder } from '../hooks/useOrder';
import usePrevadzky, { Prevadzka } from '../hooks/usePrevadzky';
import { CATEGORIES, DIETS, GROUP_CONFIG } from '../config/constants';

import { useAuth } from "../../../context/auth"
// Define the type for the context value based on what useOrder returns
type OrderContextType = ReturnType<typeof useOrder> &
    ReturnType<typeof usePrevadzky> & {
        activePrevadzka: Prevadzka | null;
        chosenPrevadzka: Prevadzka | null;
        setChosenPrevadzka: (prevadzka: Prevadzka | null) => void;
        logout: () => void;
    };

const AppContext = createContext<OrderContextType | null>(null);

export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error('useApp must be used within AppProvider');
    return context;
};

// Re-export constants for backward compatibility or direct import usage
export { CATEGORIES, DIETS, GROUP_CONFIG };

const CHOSEN_PREVADZKA_KEY = 'chosenPrevadzkaId';

const readStoredPrevadzkaId = (): number | null => {
    try {
        const raw = sessionStorage.getItem(CHOSEN_PREVADZKA_KEY);
        if (raw === null) return null;
        const id = Number(raw);
        return Number.isFinite(id) ? id : null;
    } catch {
        return null;
    }
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
    const prevadzkaState = usePrevadzky();
    // Držíme len id: výber tak prežije refresh (sessionStorage) a zároveň sa
    // sám zneplatní, keď login o prístup na prevádzku príde.
    const [chosenPrevadzkaId, setChosenPrevadzkaId] = useState<number | null>(readStoredPrevadzkaId);
    const chosenPrevadzka =
        prevadzkaState.prevadzky.find((p) => p.id === chosenPrevadzkaId) ?? null;

    const setChosenPrevadzka = useCallback((prevadzka: Prevadzka | null) => {
        setChosenPrevadzkaId(prevadzka?.id ?? null);
        try {
            if (prevadzka) sessionStorage.setItem(CHOSEN_PREVADZKA_KEY, String(prevadzka.id));
            else sessionStorage.removeItem(CHOSEN_PREVADZKA_KEY);
        } catch {
            // Súkromný režim / zakázané úložisko — výber ostane len v pamäti.
        }
    }, []);

    const activePrevadzka = prevadzkaState.single ?? chosenPrevadzka;
    const orderState = useOrder(
        activePrevadzka?.id,
        prevadzkaState.needsChoice && !chosenPrevadzka,
        prevadzkaState.prevadzky
    );
    const { logout } = useAuth();

    return (
        <AppContext.Provider
            value={{
                ...orderState,
                ...prevadzkaState,
                activePrevadzka,
                chosenPrevadzka,
                setChosenPrevadzka,
                logout,
            }}
        >
            {children}
        </AppContext.Provider>
    );
};

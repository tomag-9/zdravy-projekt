/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, ReactNode, useState, Dispatch, SetStateAction } from 'react';
import { useOrder } from '../hooks/useOrder';
import usePrevadzky, { Prevadzka } from '../hooks/usePrevadzky';
import { CATEGORIES, DIETS, GROUP_CONFIG } from '../config/constants';

import { useAuth } from "../../../context/auth"
// Define the type for the context value based on what useOrder returns
type OrderContextType = ReturnType<typeof useOrder> &
    ReturnType<typeof usePrevadzky> & {
        activePrevadzka: Prevadzka | null;
        chosenPrevadzka: Prevadzka | null;
        setChosenPrevadzka: Dispatch<SetStateAction<Prevadzka | null>>;
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

export const AppProvider = ({ children }: { children: ReactNode }) => {
    const prevadzkaState = usePrevadzky();
    const [chosenPrevadzka, setChosenPrevadzka] = useState<Prevadzka | null>(null);
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

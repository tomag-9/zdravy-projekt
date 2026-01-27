/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, ReactNode } from 'react';
import { useOrder } from '../hooks/useOrder';
import { CATEGORIES, DIETS, GROUP_CONFIG } from '../config/constants';

import { useAuth } from "../../../context/auth"
// Define the type for the context value based on what useOrder returns
type OrderContextType = ReturnType<typeof useOrder> & { logout: () => void };

const AppContext = createContext<OrderContextType | null>(null);

export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error('useApp must be used within AppProvider');
    return context;
};

// Re-export constants for backward compatibility or direct import usage
export { CATEGORIES, DIETS, GROUP_CONFIG };

export const AppProvider = ({ children }: { children: ReactNode }) => {
    const orderState = useOrder();
    const { logout } = useAuth();

    return (
        <AppContext.Provider value={{ ...orderState, logout }}>
            {children}
        </AppContext.Provider>
    );
};

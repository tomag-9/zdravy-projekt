import { createContext, useContext, ReactNode } from 'react';
import { useOrder } from '../hooks/useOrder';
import { CATEGORIES, DIETS, GROUP_CONFIG } from '../config/constants';

// Define the type for the context value based on what useOrder returns
type OrderContextType = ReturnType<typeof useOrder>;

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

    return (
        <AppContext.Provider value={orderState}>
            {children}
        </AppContext.Provider>
    );
};

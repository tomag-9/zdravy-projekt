import { useState, useEffect } from 'react';
import OrderService, { DailyOrder } from '../services/OrderService';
import { CATEGORIES, DIETS } from '../config/constants';
import { useAuth } from '../../../context/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Helper for safe localStorage parsing
// Now using OrderService.enforceStructure
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const safeParse = (key: string, fallback: any) => {
    try {
        const saved = localStorage.getItem(key);
        if (!saved) return fallback;
        const parsed = JSON.parse(saved);
        return OrderService.enforceStructure(parsed, fallback);
    } catch {
        return fallback;
    }
};

export const useOrder = () => {
    const { apiFetch } = useAuth();
    // Settings
    const [enabledDiets, setEnabledDiets] = useState<string[]>(() => safeParse('enabledDiets', [...DIETS]));
    const [enabledCategories, setEnabledCategories] = useState<string[]>(() => safeParse('enabledCategories', [...CATEGORIES]));

    const [settings, setSettings] = useState(() => safeParse('appSettings', {
        copyBreakfastFromPrevLunch: true,
        copyOlovrantFromLunch: true,
        applyDefaultLunch: false
    }));

    // State
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [prevDayLunches, setPrevDayLunches] = useState(0);

    const [activeMeals, setActiveMeals] = useState<Record<string, boolean>>(() => safeParse(`activeMeals_${selectedDate}`, { breakfast: false, lunch: true, olovrant: false }));

    const [currentOrder, setCurrentOrder] = useState<DailyOrder>(() => {
        // Use Factory for initial state
        const initial: DailyOrder = {
            status: 'draft',
            breakfast: OrderService.createEmptyMeal(),
            lunch: OrderService.createEmptyMeal(),
            olovrant: OrderService.createEmptyMeal()
        };
        return safeParse(`order_${selectedDate}`, initial);
    });

    // Load prev day lunches
    useEffect(() => {
        const prevDate = new Date(selectedDate);
        prevDate.setDate(prevDate.getDate() - 1);
        const prevDateStr = prevDate.toISOString().split('T')[0];
        const prevOrderSaved = localStorage.getItem(`order_${prevDateStr}`);
        if (prevOrderSaved) {
            try {
                const prevOrder = JSON.parse(prevOrderSaved);
                setPrevDayLunches(OrderService.calculatePrevDayLunches(prevOrder));
            } catch { setPrevDayLunches(0); }
        } else {
            setPrevDayLunches(0);
        }
    }, [selectedDate]);

    // Persistence
    useEffect(() => { localStorage.setItem('enabledDiets', JSON.stringify(enabledDiets)); }, [enabledDiets]);
    useEffect(() => { localStorage.setItem('enabledCategories', JSON.stringify(enabledCategories)); }, [enabledCategories]);
    useEffect(() => { localStorage.setItem('appSettings', JSON.stringify(settings)); }, [settings]);
    useEffect(() => { localStorage.setItem(`order_${selectedDate}`, JSON.stringify(currentOrder)); }, [currentOrder, selectedDate]);
    useEffect(() => { localStorage.setItem(`activeMeals_${selectedDate}`, JSON.stringify(activeMeals)); }, [activeMeals, selectedDate]);

    // Reset/Re-init on Date Change
    useEffect(() => {
        const emptyOrder = {
            breakfast: OrderService.createEmptyMeal(),
            lunch: OrderService.createEmptyMeal(),
            olovrant: OrderService.createEmptyMeal()
        };

        const newActive = safeParse(`activeMeals_${selectedDate}`, { breakfast: false, lunch: true, olovrant: false });
        const newOrder = safeParse(`order_${selectedDate}`, emptyOrder) as DailyOrder;

        setActiveMeals(newActive);
        setCurrentOrder(newOrder);
    }, [selectedDate, settings.copyBreakfastFromPrevLunch]);

    // Copy Logic - Olovrant from Lunch
    useEffect(() => {
        if (settings.copyOlovrantFromLunch && activeMeals.olovrant) {
            setCurrentOrder((prev) => ({
                ...prev,
                olovrant: JSON.parse(JSON.stringify(prev.lunch))
            }));
        }
    }, [currentOrder.lunch, settings.copyOlovrantFromLunch, activeMeals.olovrant]);

    // Copy Logic - Breakfast from Prev Lunch
    useEffect(() => {
        if (settings.copyBreakfastFromPrevLunch && activeMeals.breakfast) {
            const prevDate = new Date(selectedDate);
            prevDate.setDate(prevDate.getDate() - 1);
            const prevDateStr = prevDate.toISOString().split('T')[0];
            const prevOrderSaved = localStorage.getItem(`order_${prevDateStr}`);
            if (prevOrderSaved) {
                const prevOrder = JSON.parse(prevOrderSaved);
                if (prevOrder.lunch) {
                    setCurrentOrder((prev) => ({
                        ...prev,
                        breakfast: JSON.parse(JSON.stringify(prevOrder.lunch))
                    }));
                }
            }
        }
    }, [settings.copyBreakfastFromPrevLunch, activeMeals.breakfast, selectedDate]);

    // Actions
    const toggleDiet = (diet: string) => {
        setEnabledDiets(prev => prev.includes(diet) ? prev.filter(d => d !== diet) : [...prev, diet]);
    };

    const toggleCategory = (category: string) => {
        setEnabledCategories(prev => prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]);
    };

    const toggleMeal = (mealKey: string) => {
        setActiveMeals(prev => ({ ...prev, [mealKey]: !prev[mealKey] }));
    };

    const updateMenuCount = (mealKey: 'breakfast' | 'lunch' | 'olovrant', category: string, menuType: string, count: number) => {
        setCurrentOrder((prev) => OrderService.updateMenuCount(prev, mealKey, category, menuType, count));
    };

    const updateDiet = (mealKey: 'breakfast' | 'lunch' | 'olovrant', category: string, diet: string, count: number) => {
        setCurrentOrder((prev) => OrderService.updateDiet(prev, mealKey, category, diet, count));
    };

    const updateSettings = (key: string, value: boolean) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setSettings((prev: any) => ({ ...prev, [key]: value }));
    };

    const clearMeal = (mealKey: 'breakfast' | 'lunch' | 'olovrant') => {
        setCurrentOrder((prev) => ({
            ...prev,
            [mealKey]: OrderService.createEmptyMeal()
        }));
    };

    const getAvailableDiets = (categoryName: string) => OrderService.getAvailableDiets(categoryName, enabledDiets);

    const submitOrder = async (date: string) => {
        // Prepare payload - only active meals
        const payload = {
            breakfast: activeMeals.breakfast ? currentOrder.breakfast : OrderService.createEmptyMeal(),
            lunch: activeMeals.lunch ? currentOrder.lunch : OrderService.createEmptyMeal(),
            olovrant: activeMeals.olovrant ? currentOrder.olovrant : OrderService.createEmptyMeal(),
        };

        const orderWithStatus: DailyOrder = {
            ...currentOrder,
            ...payload,
            status: 'submitted'
        };

        // Update local state first
        setCurrentOrder(orderWithStatus);

        try {
            const response = await apiFetch(`${API_URL}/orders/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ date, status: 'submitted', data: payload })
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(text);
            }
            console.log('Order submitted to API');
            return true;
        } catch (e) {
            console.error('Failed to submit order to API', e);
            throw e;
        }
    };

    const deleteOrder = async (date: string) => {
        // Clear local state
        const empty: DailyOrder = {
            status: 'draft',
            breakfast: OrderService.createEmptyMeal(),
            lunch: OrderService.createEmptyMeal(),
            olovrant: OrderService.createEmptyMeal()
        };
        setCurrentOrder(empty);
        setActiveMeals({ breakfast: false, lunch: false, olovrant: false });

        try {
            // Soft delete by setting status to draft and empty data
            await apiFetch(`${API_URL}/orders/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ date, status: 'draft', data: empty })
            });
            console.log('Order deleted/reset on API');
        } catch (e) {
            console.error('Failed to delete order on API', e);
        }
    };

    return {
        enabledDiets, toggleDiet,
        enabledCategories, toggleCategory,
        settings, updateSettings,
        selectedDate, setSelectedDate,
        currentOrder, activeMeals, toggleMeal,
        updateMenuCount, updateDiet,
        getAvailableDiets,
        prevDayLunches,
        clearMeal,
        submitOrder, deleteOrder
    };
};

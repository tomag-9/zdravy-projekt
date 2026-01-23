import { useState, useEffect } from 'react';
import OrderService from '../services/OrderService';
import { CATEGORIES, DIETS } from '../config/constants';

// Helper for safe localStorage parsing
// Now using OrderService.enforceStructure
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
    // Settings
    const [enabledDiets, setEnabledDiets] = useState<string[]>(() => safeParse('enabledDiets', [...DIETS]));
    const [enabledCategories, setEnabledCategories] = useState<string[]>(() => safeParse('enabledCategories', [...CATEGORIES]));

    const [settings, setSettings] = useState(() => safeParse('appSettings', {
        copyBreakfastFromPrevLunch: false,
        copyOlovrantFromLunch: false,
        applyDefaultLunch: false
    }));

    // State
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [prevDayLunches, setPrevDayLunches] = useState(0);

    const [activeMeals, setActiveMeals] = useState(() => safeParse(`activeMeals_${selectedDate}`, { breakfast: false, lunch: true, olovrant: false }));

    const [currentOrder, setCurrentOrder] = useState<any>(() => {
        // Use Factory for initial state
        const initial = {
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
        // @ts-ignore
        let newOrder = safeParse(`order_${selectedDate}`, emptyOrder);

        setActiveMeals(newActive);
        setCurrentOrder(newOrder);
    }, [selectedDate, settings.copyBreakfastFromPrevLunch]);

    // Copy Logic - Olovrant from Lunch
    useEffect(() => {
        if (settings.copyOlovrantFromLunch && activeMeals.olovrant) {
            setCurrentOrder((prev: any) => ({
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
                    setCurrentOrder((prev: any) => ({
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
        // @ts-ignore
        setActiveMeals(prev => ({ ...prev, [mealKey]: !prev[mealKey] }));
    };

    const updateMenuCount = (mealKey: string, category: string, menuType: string, count: number) => {
        setCurrentOrder((prev: any) => OrderService.updateMenuCount(prev, mealKey, category, menuType, count));
    };

    const updateDiet = (mealKey: string, category: string, diet: string, count: number) => {
        setCurrentOrder((prev: any) => OrderService.updateDiet(prev, mealKey, category, diet, count));
    };

    const updateSettings = (key: string, value: any) => {
        setSettings((prev: any) => ({ ...prev, [key]: value }));
    };

    const clearMeal = (mealKey: string) => {
        setCurrentOrder((prev: any) => ({
            ...prev,
            [mealKey]: OrderService.createEmptyMeal()
        }));
    };

    const getAvailableDiets = (categoryName: string) => OrderService.getAvailableDiets(categoryName, enabledDiets);

    return {
        enabledDiets, toggleDiet,
        enabledCategories, toggleCategory,
        settings, updateSettings,
        selectedDate, setSelectedDate,
        currentOrder, activeMeals, toggleMeal,
        updateMenuCount, updateDiet,
        getAvailableDiets,
        prevDayLunches,
        clearMeal
    };
};

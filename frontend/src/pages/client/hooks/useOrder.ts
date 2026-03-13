import { useState, useEffect, useRef } from 'react';
import OrderService, { DailyOrder, MealData } from '../services/OrderService';
import { CATEGORIES } from '../config/constants';
import { useAuth } from '../../../context/auth';

const API_URL = import.meta.env.VITE_API_URL || '/api';

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
    const { apiFetch, user } = useAuth();
    // Settings

    const [enabledCategories, setEnabledCategories] = useState<string[]>(() => safeParse('enabledCategories', [...CATEGORIES]));

    const [settings] = useState(() => {
        const defaultSettings = {
            copyBreakfastFromPrevLunch: false,
            copyOlovrantFromLunch: false,
            applyDefaultLunch: false
        };
        const loaded = safeParse('appSettings', defaultSettings);
        // Migrate legacy auto-copy flags: no longer user-configurable, force to false.
        const migrated = {
            ...loaded,
            copyBreakfastFromPrevLunch: false,
            copyOlovrantFromLunch: false
        };
        if (loaded.copyBreakfastFromPrevLunch || loaded.copyOlovrantFromLunch) {
            try {
                localStorage.setItem('appSettings', JSON.stringify(migrated));
            } catch {
                // Ignore persistence errors; settings will still be correct in memory.
            }
        }
        return migrated;
    });

    const [touchedMeals, setTouchedMeals] = useState<Set<string>>(new Set());

    // State
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    // Ref mirrors selectedDate synchronously so persistence effects never write
    // the previous day's currentOrder under the new date key (race condition fix)
    const selectedDateRef = useRef(selectedDate);
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

    // Keep ref in sync — runs before other effects that depend on selectedDate
    useEffect(() => {
        selectedDateRef.current = selectedDate;
    }, [selectedDate]);

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
    // NOTE: order/activeMeals persistence intentionally does NOT include selectedDate
    // as a dependency — only currentOrder/activeMeals changes trigger a write.
    // selectedDateRef ensures we always write under the correct (new) date key
    // without the race condition where the new selectedDate fires the effect with
    // the old currentOrder value (which would corrupt the new date's localStorage entry).
    useEffect(() => { localStorage.setItem('enabledCategories', JSON.stringify(enabledCategories)); }, [enabledCategories]);
    useEffect(() => { localStorage.setItem('appSettings', JSON.stringify(settings)); }, [settings]);
    useEffect(() => { localStorage.setItem(`order_${selectedDateRef.current}`, JSON.stringify(currentOrder)); }, [currentOrder]);
    useEffect(() => { localStorage.setItem(`activeMeals_${selectedDateRef.current}`, JSON.stringify(activeMeals)); }, [activeMeals]);

    // Reset/Re-init on Date Change
    useEffect(() => {
        const emptyOrder = {
            breakfast: OrderService.createEmptyMeal(),
            lunch: OrderService.createEmptyMeal(),
            olovrant: OrderService.createEmptyMeal()
        };

        // On new date, if no local storage, default to all closed
        const defaultActive = { breakfast: false, lunch: false, olovrant: false };
        let newActive = safeParse(`activeMeals_${selectedDate}`, defaultActive);
        if (!newActive) {
            newActive = defaultActive;
        }

        const newOrder = safeParse(`order_${selectedDate}`, emptyOrder) as DailyOrder;

        setTouchedMeals(new Set());
        setActiveMeals(newActive);
        setCurrentOrder(newOrder);
    }, [selectedDate]);

    // Fetch Order from API (server authority; merges into local state)
    useEffect(() => {
        let isMounted = true;

        const loadOrder = async () => {
            try {
                const response = await apiFetch(`${API_URL}/orders/by-date/${selectedDate}/`);
                if (response.ok) {
                    // API returns { id, status, data: { breakfast... } }
                    const serverOrder = await response.json() as { id: number, status: 'draft' | 'submitted', data: DailyOrder };

                    if (serverOrder && serverOrder.data && Object.keys(serverOrder.data).length > 0) {
                        // Server has data
                        if (isMounted) {
                            // Merge mechanism could be complex, for now Server Authority wins
                            const merged = OrderService.enforceStructure(serverOrder.data, OrderService.createEmptyOrder());
                            merged.status = serverOrder.status; // Ensure status is synced
                            setCurrentOrder(merged);

                            // Update active meals based on content
                            setActiveMeals(prevActive => {
                                const newActive = { ...prevActive };
                                if (!OrderService.isMealEmpty(merged.breakfast)) newActive.breakfast = true;
                                if (!OrderService.isMealEmpty(merged.lunch)) newActive.lunch = true;
                                if (!OrderService.isMealEmpty(merged.olovrant)) newActive.olovrant = true;
                                return newActive;
                            });
                        }
                    }
                }
            } catch (e) {
                console.error("Failed to fetch order", e);
            }
        };

        if (user) {
            loadOrder();
        }

        return () => { isMounted = false; };
    }, [selectedDate, apiFetch, user]); // Depend on selectedDate

    const [globalDeadlines, setGlobalDeadlines] = useState({ breakfast: '10:00', breakfast_day_before: false, lunch: '10:00', lunch_day_before: false, olovrant: '10:00', olovrant_day_before: false });

    // Fetch Global Settings
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await apiFetch(`${API_URL}/admin/global-settings/`);
                if (res.ok) {
                    const data = await res.json();
                    // Map backend fields (deadline_*) to expected state structure
                    const mapped = {
                        breakfast: data.deadline_breakfast || '10:00',
                        breakfast_day_before: !!data.deadline_breakfast_is_day_before,
                        lunch: data.deadline_lunch || '10:00',
                        lunch_day_before: !!data.deadline_lunch_is_day_before,
                        olovrant: data.deadline_olovrant || '10:00',
                        olovrant_day_before: !!data.deadline_olovrant_is_day_before,
                    };
                    setGlobalDeadlines(mapped);
                }
            } catch (e) {
                console.error("Failed to fetch global settings", e);
            }
        };
        if (user) fetchSettings();
    }, [apiFetch, user]);

    // Order persistence: no autosave/debounce writes draft orders to the backend.
    // Draft state is kept only in localStorage (see safeParse logic above) to survive page refreshes.


    // Lazy Copy Logic: Trigger when a meal is OPENED (active becomes true)
    useEffect(() => {
        if (!currentOrder) return;

        // Check for specific meals that need copying
        // We do this check first to avoid expensive history lookup if not needed
        const mealsToCopy: (keyof DailyOrder)[] = [];
        (['breakfast', 'lunch', 'olovrant'] as const).forEach(mealKey => {
            if (activeMeals[mealKey] && !touchedMeals.has(mealKey)) {
                if (OrderService.isMealEmpty(currentOrder[mealKey])) {
                    if (currentOrder.status !== 'submitted') {
                        mealsToCopy.push(mealKey);
                    }
                }
            }
        });

        if (mealsToCopy.length === 0) return;

        // Perform History Lookup (Optimized - outside loop)
        const history: (DailyOrder & { date: string })[] = [];
        // Use loop to avoid mutation of single Date object
        for (let i = 1; i <= 30; i++) {
            const curr = new Date(selectedDate);
            curr.setDate(curr.getDate() - i);
            const dStr = curr.toISOString().split('T')[0];
            const raw = localStorage.getItem(`order_${dStr}`);
            if (raw) {
                try {
                    const p = JSON.parse(raw);
                    // Safe cast since we assign it
                    (p as DailyOrder & { date: string }).date = dStr;
                    history.push(p as DailyOrder & { date: string });
                } catch (e) {
                    console.error('Failed to parse stored order for date', dStr, e);
                    // Clean up malformed data
                    localStorage.removeItem(`order_${dStr}`);
                }
            }
        }

        const template = OrderService.findLastNonZeroDay(history, selectedDate);
        if (template) {
            let hasUpdates = false;
            const updatesObj: Partial<DailyOrder> = {};
            const newTouched = new Set(touchedMeals);

            mealsToCopy.forEach(mealKey => {
                // Check if key corresponds to a meal property (DailyOrder has 'status' which is string)
                if (mealKey === 'status') return;

                const mealData = template[mealKey] as MealData;
                if (mealData && !OrderService.isMealEmpty(mealData)) {
                    if (import.meta.env.DEV) {
                        console.log(`Lazy copying ${mealKey} from ${(template as unknown as { date: string }).date}`);
                    }
                    updatesObj[mealKey] = JSON.parse(JSON.stringify(mealData));
                    newTouched.add(mealKey);
                    hasUpdates = true;
                }
            });

            if (hasUpdates) {
                setCurrentOrder(prev => ({ ...prev, ...updatesObj }));
                setTouchedMeals(newTouched);
            }
        }

        // We use functional updates or separate logic to avoid dependency cycle.
        // But strictly here, since we depend on `currentOrder` to CHECK emptiness, 
        // and then SET `currentOrder` if empty, it will naturally re-run.
        // The re-run will find it NOT empty, and thus stabilize.
        // To be safe against "React Hook useEffect has missing dependencies", we include them.
    }, [activeMeals, selectedDate, currentOrder, touchedMeals]);

    // Copy Logic - Olovrant from Lunch
    useEffect(() => {
        if (settings.copyOlovrantFromLunch && activeMeals.olovrant && !touchedMeals.has('olovrant')) {
            // Only auto-copy if user hasn't touched olovrant explicitly
            setCurrentOrder((prev) => ({
                ...prev,
                olovrant: JSON.parse(JSON.stringify(prev.lunch))
            }));
            // Mark olovrant as touched so it won't be auto-overwritten later
            setTouchedMeals(prev => {
                const next = new Set(prev);
                next.add('olovrant');
                return next;
            });
        }
    }, [currentOrder.lunch, settings.copyOlovrantFromLunch, activeMeals.olovrant, touchedMeals]);

    // Copy Logic - Breakfast from Prev Lunch
    useEffect(() => {
        if (settings.copyBreakfastFromPrevLunch && activeMeals.breakfast && !touchedMeals.has('breakfast')) {
            // Only auto-copy if user hasn't touched breakfast
            const prevDate = new Date(selectedDate);
            prevDate.setDate(prevDate.getDate() - 1);
            const prevDateStr = prevDate.toISOString().split('T')[0];
            const prevOrderSaved = localStorage.getItem(`order_${prevDateStr}`);
            if (prevOrderSaved) {
                try {
                    const prevOrder = JSON.parse(prevOrderSaved);
                    if (prevOrder.lunch) {
                        setCurrentOrder((prev) => ({
                            ...prev,
                            breakfast: JSON.parse(JSON.stringify(prevOrder.lunch))
                        }));
                        // Mark as touched
                        setTouchedMeals(prev => {
                            const n = new Set(prev);
                            n.add('breakfast');
                            return n;
                        });
                    }
                } catch (e) { console.error(e); }
            }
        }
    }, [settings.copyBreakfastFromPrevLunch, activeMeals.breakfast, selectedDate, touchedMeals]);

    // Actions


    const toggleCategory = (category: string) => {
        setEnabledCategories(prev => prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]);
    };

    const toggleMeal = (mealKey: string) => {
        setActiveMeals(prev => ({ ...prev, [mealKey]: !prev[mealKey] }));
    };



    const updateDiet = (mealKey: 'breakfast' | 'lunch' | 'olovrant', category: string, diet: string, count: number) => {
        setTouchedMeals(prev => {
            const next = new Set(prev);
            next.add(mealKey);
            return next;
        });
        setCurrentOrder((prev) => ({ ...OrderService.updateDiet(prev, mealKey, category, diet, count), status: 'draft' }));
    };

    const clearMeal = (mealKey: 'breakfast' | 'lunch' | 'olovrant') => {
        setTouchedMeals(prev => {
            const next = new Set(prev);
            next.add(mealKey);
            return next;
        });
        setCurrentOrder((prev) => ({
            ...prev,
            [mealKey]: OrderService.createEmptyMeal(),
            status: 'draft',
        }));
    };



    const submitOrder = async (date: string) => {
        // Prepare payload - only active meals
        const payload = {
            breakfast: activeMeals.breakfast ? currentOrder.breakfast : OrderService.createEmptyMeal(),
            lunch: activeMeals.lunch ? currentOrder.lunch : OrderService.createEmptyMeal(),
            olovrant: activeMeals.olovrant ? currentOrder.olovrant : OrderService.createEmptyMeal(),
        };

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

            // Only update local state AFTER successful API call
            const orderWithStatus: DailyOrder = {
                ...currentOrder,
                ...payload,
                status: 'submitted'
            };
            setCurrentOrder(orderWithStatus);

            console.log('Order submitted to API');
            return true;
        } catch (e) {
            console.error('Failed to submit order to API', e);
            throw e;
        }
    };

    const deleteOrder = async (date: string) => {
        const empty: DailyOrder = {
            status: 'draft',
            breakfast: OrderService.createEmptyMeal(),
            lunch: OrderService.createEmptyMeal(),
            olovrant: OrderService.createEmptyMeal()
        };

        // If we are deleting the currently viewed order, update state
        if (date === selectedDate) {
            setCurrentOrder(empty);
            setActiveMeals({ breakfast: false, lunch: false, olovrant: false });
            // local storage updates via useEffect
        } else {
            // If deleting another day (e.g. from history), manually clear its local storage
            // so it doesn't persist as "submitted" or "dirty"
            localStorage.removeItem(`order_${date}`);
            localStorage.removeItem(`activeMeals_${date}`);
        }

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

    // Admin Constraints
    // Fall back to defaults only when the setting is null/undefined;
    // an explicitly empty array means "show none".
    const adminVisibleMenusSetting = user?.settings?.visible_menus;
    const adminVisibleMenus = adminVisibleMenusSetting == null
        ? ['A', 'B', 'C', 'V']
        : adminVisibleMenusSetting;

    const adminVisibleMealsSetting = user?.settings?.visible_meals;
    const adminVisibleMeals = adminVisibleMealsSetting == null
        ? ['breakfast', 'lunch', 'olovrant']
        : adminVisibleMealsSetting;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminVisibleDiets = user?.settings?.visible_diets && (user.settings.visible_diets as any[]).length > 0
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? (user.settings.visible_diets as any[]).map(d => d.name)
        : [];

    // Override getAvailableDiets to intersection of enabledDiets (local preference) AND adminVisibleDiets
    const getAvailableDiets = (categoryName: string) => {
        return OrderService.getAvailableDiets(categoryName, adminVisibleDiets);
    };



    // Enhanced updateMenuCount to handle forced diets
    const updateMenuCount = (mealKey: 'breakfast' | 'lunch' | 'olovrant', category: string, menuType: string, count: number) => {
        setTouchedMeals(prev => {
            const next = new Set(prev);
            next.add(mealKey);
            return next;
        });
        setCurrentOrder((prev) => ({ ...OrderService.updateMenuCount(prev, mealKey, category, menuType, count), status: 'draft' }));
    };

    /** Immediately copy yesterday’s lunch into breakfast. Returns true if data was found. */
    const loadBreakfastFromPrevLunch = (): boolean => {
        const prevDate = new Date(selectedDate);
        prevDate.setDate(prevDate.getDate() - 1);
        const prevDateStr = prevDate.toISOString().split('T')[0];
        const raw = localStorage.getItem(`order_${prevDateStr}`);
        if (raw) {
            try {
                const prevOrder = JSON.parse(raw);
                if (prevOrder.lunch && !OrderService.isMealEmpty(prevOrder.lunch)) {
                    setCurrentOrder((prev) => ({
                        ...prev,
                        breakfast: JSON.parse(JSON.stringify(prevOrder.lunch)),
                        status: 'draft',
                    }));
                    setActiveMeals(prev => ({ ...prev, breakfast: true }));
                    setTouchedMeals(prev => { const n = new Set(prev); n.add('breakfast'); return n; });
                    return true;
                }
            } catch (e) { console.error(e); }
        }
        return false;
    };

    /** Immediately copy today’s current lunch into olovrant. Returns true if lunch had data. */
    const copyOlovrantFromCurrentLunch = (): boolean => {
        if (OrderService.isMealEmpty(currentOrder.lunch)) return false;
        setCurrentOrder((prev) => ({
            ...prev,
            olovrant: JSON.parse(JSON.stringify(prev.lunch)),
            status: 'draft',
        }));
        setActiveMeals(prev => ({ ...prev, olovrant: true }));
        setTouchedMeals(prev => { const n = new Set(prev); n.add('olovrant'); return n; });
        return true;
    };

    return {
        enabledCategories, toggleCategory,
        selectedDate, setSelectedDate,
        currentOrder, activeMeals, toggleMeal,
        updateMenuCount, updateDiet,
        getAvailableDiets,
        prevDayLunches,
        clearMeal,
        loadBreakfastFromPrevLunch,
        copyOlovrantFromCurrentLunch,
        submitOrder, deleteOrder,
        adminVisibleMenus,
        adminVisibleMeals,
        globalDeadlines,
    };
};

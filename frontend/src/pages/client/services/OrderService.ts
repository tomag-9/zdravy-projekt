import { CATEGORIES, DIETS, GROUP_CONFIG } from '../config/constants';

export interface DietCounts {
    [key: string]: number;
}

export interface MenuCounts {
    [key: string]: number;
}

export interface CategoryData {
    menuCounts: MenuCounts;
    diets: DietCounts;
}

export interface MealData {
    [category: string]: CategoryData;
}

export interface DailyOrder {
    status?: 'draft' | 'submitted';
    breakfast: MealData;
    lunch: MealData;
    olovrant: MealData;
}

class OrderService {
    static createEmptyCategory(categoryName: string): CategoryData {
        const availableMenus = GROUP_CONFIG[categoryName] || ['A'];
        const menuCounts = availableMenus.reduce((acc, menu) => ({ ...acc, [menu]: 0 }), {} as MenuCounts);

        return {
            menuCounts,
            diets: DIETS.reduce((acc, diet) => ({ ...acc, [diet]: 0 }), {} as DietCounts)
        };
    }

    static createEmptyMeal(): MealData {
        return CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat]: this.createEmptyCategory(cat) }), {} as MealData);
    }

    static createEmptyOrder(): DailyOrder {
        return {
            status: 'draft',
            breakfast: this.createEmptyMeal(),
            lunch: this.createEmptyMeal(),
            olovrant: this.createEmptyMeal()
        };
    }

    static getAvailableDiets(categoryName: string, enabledDiets: string[]): string[] {
        const availableMenus = GROUP_CONFIG[categoryName] || [];
        const hasMenuV = availableMenus.includes('V');

        if (hasMenuV) {
            return enabledDiets.filter(d => d !== 'Vegetariánske');
        }
        return enabledDiets;
    }

    static updateMenuCount(currentOrder: DailyOrder, mealKey: 'breakfast' | 'lunch' | 'olovrant', category: string, menuType: string, count: number): DailyOrder {
        const newCount = Math.max(0, count);
        const categoryData = currentOrder[mealKey][category];

        const newMenuCounts = {
            ...categoryData.menuCounts,
            [menuType]: newCount
        };

        const newDiets = { ...categoryData.diets };
        if (menuType === 'A') {
            const totalDiets = (Object.values(newDiets) as number[]).reduce((a: number, b: number) => a + b, 0);
            if (newCount < totalDiets) {
                let diff = totalDiets - newCount;
                for (const diet of DIETS) {
                    if (diff <= 0) break;
                    if (newDiets[diet] > 0) {
                        const toRemove = Math.min(newDiets[diet], diff);
                        newDiets[diet] -= toRemove;
                        diff -= toRemove;
                    }
                }
            }
        }

        return {
            ...currentOrder,
            [mealKey]: {
                ...currentOrder[mealKey],
                [category]: { ...categoryData, menuCounts: newMenuCounts, diets: newDiets }
            }
        };
    }

    static updateDiet(currentOrder: DailyOrder, mealKey: 'breakfast' | 'lunch' | 'olovrant', category: string, diet: string, count: number): DailyOrder {
        const categoryData = currentOrder[mealKey][category];
        const menuACount = categoryData.menuCounts?.['A'] || 0;

        const newCount = Math.max(0, count);
        const totalOtherDiets = Object.entries(categoryData.diets)
            .filter(([d]) => d !== diet)
            .reduce((sum, [, c]) => sum + (c as number), 0);

        if (totalOtherDiets + newCount > menuACount) return currentOrder;

        return {
            ...currentOrder,
            [mealKey]: {
                ...currentOrder[mealKey],
                [category]: {
                    ...categoryData,
                    diets: { ...categoryData.diets, [diet]: newCount }
                }
            }
        };
    }

    static calculatePrevDayLunches(prevOrder: DailyOrder | null): number {
        if (!prevOrder || !prevOrder.lunch) return 0;

        return Object.values(prevOrder.lunch || {}).reduce((acc: number, cat: CategoryData) => {
            if (cat.menuCounts) {
                return acc + Object.values(cat.menuCounts).reduce((sum: number, val: number) => sum + val, 0);
            }
            return acc;
        }, 0);
    }

    // Schema enforcement helper
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static enforceStructure(data: any, schema: any): any {
        if (!data) return schema;
        if (typeof data !== 'object') return schema;

        if (Array.isArray(schema)) {
            return Array.isArray(data) ? data : schema;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result: any = { ...schema };
        Object.keys(schema).forEach(key => {
            if (key in data) {
                if (typeof schema[key] === 'object' && schema[key] !== null && !Array.isArray(schema[key])) {
                    result[key] = this.enforceStructure(data[key], schema[key]);
                } else {
                    result[key] = data[key];
                }
            }
        });

        return result;
    }

    // Deadline logic
    static checkDeadline(dateStr: string, mealKey: string, deadlines?: { breakfast: string, breakfast_day_before?: boolean, lunch: string, lunch_day_before?: boolean, olovrant: string, olovrant_day_before?: boolean }): boolean {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        if (!deadlines) return false;

        const defaultTime = "10:00";
        let deadlineStr = defaultTime;
        let isDayBefore = false;
        if (mealKey === 'breakfast') { deadlineStr = deadlines.breakfast || defaultTime; isDayBefore = !!deadlines.breakfast_day_before; }
        if (mealKey === 'lunch') { deadlineStr = deadlines.lunch || defaultTime; isDayBefore = !!deadlines.lunch_day_before; }
        if (mealKey === 'olovrant') { deadlineStr = deadlines.olovrant || defaultTime; isDayBefore = !!deadlines.olovrant_day_before; }

        if (isDayBefore) {
            // Deadline is 1 calendar day before the meal date at deadlineStr time.
            // e.g. to order for Tuesday, you must order by Monday at deadlineStr.
            const mealDate = new Date(dateStr + 'T00:00:00');
            const deadlineDate = new Date(mealDate);
            deadlineDate.setDate(deadlineDate.getDate() - 1);
            const deadlineDateStr = deadlineDate.toISOString().split('T')[0];

            if (deadlineDateStr > todayStr) return true;   // deadline day is in the future
            if (deadlineDateStr < todayStr) return false;  // deadline day has passed

            // Deadline day is today – check the time
            const [h, m] = deadlineStr.split(':').map(Number);
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            return currentMinutes < h * 60 + m;
        }

        // Original same-day deadline behaviour
        if (dateStr > todayStr) return true;
        if (dateStr < todayStr) return false;

        const [h, m] = deadlineStr.split(':').map(Number);
        const deadlineMinutes = h * 60 + m;
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = currentHour * 60 + currentMinute;

        return currentTime < deadlineMinutes;
    }
    static fastCopy<T>(source: T): T {
        return JSON.parse(JSON.stringify(source));
    }

    static isMealEmpty(meal?: MealData | null): boolean {
        if (!meal) return true;
        for (const catKey in meal) {
            const categoryData = meal[catKey];
            if (!categoryData || !categoryData.menuCounts) continue;
            const total = Object.values(categoryData.menuCounts).reduce((acc: number, val: number) => acc + val, 0);
            if (total > 0) return false;
        }
        return true;
    }

    static findLastNonZeroDay(history: (DailyOrder & { date: string })[], currentDateStr: string): DailyOrder | null {
        // 1. Filter out future dates (and current date)
        // 2. Sort descending
        const validHistory = history
            .filter(o => o.date < currentDateStr)
            .sort((a, b) => b.date.localeCompare(a.date));

        for (const order of validHistory) {
            // Check if any meal has content
            const hasContent = !this.isMealEmpty(order.breakfast) ||
                !this.isMealEmpty(order.lunch) ||
                !this.isMealEmpty(order.olovrant);

            if (hasContent) {
                return order;
            }
        }
        return null;
    }

    static mergeOrders(current: DailyOrder, source: DailyOrder, touchedMeals: Set<string>): DailyOrder {
        const result = this.fastCopy(current); // Start with current state

        (['breakfast', 'lunch', 'olovrant'] as const).forEach(mealKey => {
            // If user hasn't touched this meal, we can overwrite it
            if (!touchedMeals.has(mealKey)) {
                // Only copy if source has data, OR if we want to aggressively copy "emptiness"
                // The requirement says: "If intervention ... edit only lunch ... remaining meals are copied"
                // This implies overwriting with source is the default behavior for untouched fields.

                // However, we must be careful. If source is empty, do we overwrite current?
                // Yes, if we want to replicate the "previous day" exactly.
                // But usually current starts empty anyway.

                result[mealKey] = this.fastCopy(source[mealKey]);
            }
        });

        return result;
    }
}

export default OrderService;

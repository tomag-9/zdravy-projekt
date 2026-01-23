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
    breakfast: MealData;
    lunch: MealData;
    olovrant: MealData;
}

class OrderService {
    static createEmptyCategory(categoryName: string): CategoryData {
        const availableMenus = GROUP_CONFIG[categoryName] || ['A'];
        const menuCounts = availableMenus.reduce((acc: any, menu: string) => ({ ...acc, [menu]: 0 }), {});

        return {
            menuCounts,
            diets: DIETS.reduce((acc: any, diet: string) => ({ ...acc, [diet]: 0 }), {})
        };
    }

    static createEmptyMeal(): MealData {
        return CATEGORIES.reduce((acc: any, cat: string) => ({ ...acc, [cat]: this.createEmptyCategory(cat) }), {});
    }

    static getAvailableDiets(categoryName: string, enabledDiets: string[]): string[] {
        const availableMenus = GROUP_CONFIG[categoryName] || [];
        const hasMenuV = availableMenus.includes('V');

        if (hasMenuV) {
            return enabledDiets.filter(d => d !== 'Vegetariánske');
        }
        return enabledDiets;
    }

    static updateMenuCount(currentOrder: DailyOrder, mealKey: keyof DailyOrder, category: string, menuType: string, count: number): DailyOrder {
        const newCount = Math.max(0, count);
        const categoryData = currentOrder[mealKey][category];

        const newMenuCounts = {
            ...categoryData.menuCounts,
            [menuType]: newCount
        };

        const newDiets = { ...categoryData.diets };
        if (menuType === 'A') {
            const totalDiets = Object.values(newDiets).reduce((a: number, b: number) => a + b, 0);
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

    static updateDiet(currentOrder: DailyOrder, mealKey: keyof DailyOrder, category: string, diet: string, count: number): DailyOrder {
        const categoryData = currentOrder[mealKey][category];
        const menuACount = categoryData.menuCounts?.['A'] || 0;

        const newCount = Math.max(0, count);
        const totalOtherDiets = Object.entries(categoryData.diets)
            .filter(([d]) => d !== diet)
            .reduce((sum, [, c]) => sum + c, 0);

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
    static checkDeadline(dateStr: string, mealKey: string): boolean {
        // const orderDate = new Date(dateStr); // unused
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        // Future dates are always editable
        if (dateStr > todayStr) return true;

        // Past dates are never editable
        if (dateStr < todayStr) return false;

        // Today: specific deadlines
        // Breakfast: 3:00 AM
        // Lunch/Olovrant: 7:30 AM

        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = currentHour * 60 + currentMinute;

        if (mealKey === 'breakfast') {
            const deadline = 3 * 60; // 3:00
            return currentTime < deadline;
        } else {
            const deadline = 7 * 60 + 30; // 7:30
            return currentTime < deadline;
        }
    }
}

export default OrderService;

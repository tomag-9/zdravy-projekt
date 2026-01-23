import { CATEGORIES, DIETS, GROUP_CONFIG } from '../config/constants';

class OrderService {
    static createEmptyCategory(categoryName: string) {
        const availableMenus = GROUP_CONFIG[categoryName] || ['A'];
        const menuCounts = availableMenus.reduce((acc, menu) => ({ ...acc, [menu]: 0 }), {});

        return {
            menuCounts,
            diets: DIETS.reduce((acc, diet) => ({ ...acc, [diet]: 0 }), {})
        };
    }

    static createEmptyMeal() {
        return CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat]: this.createEmptyCategory(cat) }), {});
    }

    static getAvailableDiets(categoryName: string, enabledDiets: string[]) {
        const availableMenus = GROUP_CONFIG[categoryName] || [];
        const hasMenuV = availableMenus.includes('V');

        if (hasMenuV) {
            return enabledDiets.filter(d => d !== 'Vegetariánske');
        }
        return enabledDiets;
    }

    static updateMenuCount(currentOrder: any, mealKey: string, category: string, menuType: string, count: number) {
        const newCount = Math.max(0, count);
        const categoryData = currentOrder[mealKey][category];

        const newMenuCounts = {
            ...categoryData.menuCounts,
            [menuType]: newCount
        };

        const newDiets = { ...categoryData.diets };
        if (menuType === 'A') {
            const totalDiets = Object.values(newDiets).reduce((a: any, b: any) => a + b, 0) as number;
            if (newCount < totalDiets) {
                let diff = totalDiets - newCount;
                for (const diet of DIETS) {
                    if (diff <= 0) break;
                    // @ts-ignore
                    const toRemove = Math.min(newDiets[diet], diff);
                    // @ts-ignore
                    newDiets[diet] -= toRemove;
                    diff -= toRemove;
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

    static updateDiet(currentOrder: any, mealKey: string, category: string, diet: string, count: number) {
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

    static calculatePrevDayLunches(prevOrder: any) {
        if (!prevOrder || !prevOrder.lunch) return 0;

        return Object.values(prevOrder.lunch || {}).reduce((acc: number, cat: any) => {
            if ((cat as any).menuCounts) {
                return acc + (Object.values((cat as any).menuCounts) as any[]).reduce((sum: any, val: any) => sum + val, 0);
            }
            return acc + (cat.portions || 0); // Handling legacy data
        }, 0);
    }

    // Schema enforcement helper
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
}

export default OrderService;

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
    packSeparately?: {
        menus: Record<string, number>;
        diets: Record<string, number>;
    };
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
    static createEmptyPackSeparately(): { menus: Record<string, number>; diets: Record<string, number> } {
        return {
            menus: {},
            diets: {}
        };
    }

    static toLocalDateString(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    static getServerNow(): Date {
        const offsetRaw = sessionStorage.getItem('server_time_offset_ms');
        const offsetMs = offsetRaw ? Number(offsetRaw) : 0;
        return new Date(Date.now() + (Number.isFinite(offsetMs) ? offsetMs : 0));
    }

    static createEmptyCategory(categoryName: string): CategoryData {
        const availableMenus = GROUP_CONFIG[categoryName] || ['A'];
        const menuCounts = availableMenus.reduce((acc, menu) => ({ ...acc, [menu]: 0 }), {} as MenuCounts);

        return {
            menuCounts,
            diets: DIETS.reduce((acc, diet) => ({ ...acc, [diet]: 0 }), {} as DietCounts),
            packSeparately: this.createEmptyPackSeparately()
        };
    }

    static createEmptyMeal(): MealData {
        return CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat]: this.createEmptyCategory(cat) }), {} as MealData);
    }

    static createEmptyMealFor(categories: string[]): MealData {
        return categories.reduce((acc, cat) => ({ ...acc, [cat]: this.createEmptyCategory(cat) }), {} as MealData);
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

        const nextCategoryData = this.withClampedPackSeparately({
            ...categoryData,
            menuCounts: newMenuCounts,
            diets: newDiets
        });

        return {
            ...currentOrder,
            [mealKey]: {
                ...currentOrder[mealKey],
                [category]: nextCategoryData
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

        const nextCategoryData = this.withClampedPackSeparately({
            ...categoryData,
            diets: { ...categoryData.diets, [diet]: newCount }
        });

        return {
            ...currentOrder,
            [mealKey]: {
                ...currentOrder[mealKey],
                [category]: nextCategoryData
            }
        };
    }

    static updatePackSeparately(
        currentOrder: DailyOrder,
        mealKey: 'breakfast' | 'lunch' | 'olovrant',
        category: string,
        kind: 'menus' | 'diets',
        key: string,
        count: number
    ): DailyOrder {
        const categoryData = currentOrder[mealKey][category];
        const maxAllowed = kind === 'menus'
            ? categoryData.menuCounts?.[key] || 0
            : categoryData.diets?.[key] || 0;
        const nextCount = Math.min(Math.max(0, count), maxAllowed);
        const currentPackSeparately = categoryData.packSeparately || this.createEmptyPackSeparately();
        const nextKindCounts = { ...(currentPackSeparately[kind] || {}) };

        if (nextCount <= 0) {
            delete nextKindCounts[key];
        } else {
            nextKindCounts[key] = nextCount;
        }

        return {
            ...currentOrder,
            [mealKey]: {
                ...currentOrder[mealKey],
                [category]: {
                    ...categoryData,
                    packSeparately: this.cleanupPackSeparately({
                        ...currentPackSeparately,
                        [kind]: nextKindCounts
                    })
                }
            }
        };
    }

    static getPackSeparatelyAdjustments(before: CategoryData, after: CategoryData) {
        const adjustments: { kind: 'menus' | 'diets'; key: string; count: number }[] = [];
        const previous = before.packSeparately || this.createEmptyPackSeparately();
        const next = after.packSeparately || this.createEmptyPackSeparately();

        (['menus', 'diets'] as const).forEach((kind) => {
            const keys = new Set([
                ...Object.keys(previous[kind] || {}),
                ...Object.keys(next[kind] || {})
            ]);

            keys.forEach((key) => {
                const prevCount = previous[kind]?.[key] || 0;
                const nextCount = next[kind]?.[key] || 0;
                if (nextCount < prevCount) {
                    adjustments.push({ kind, key, count: nextCount });
                }
            });
        });

        return adjustments;
    }

    private static withClampedPackSeparately(categoryData: CategoryData): CategoryData {
        const currentPackSeparately = categoryData.packSeparately || this.createEmptyPackSeparately();
        const nextMenus = Object.entries(currentPackSeparately.menus || {}).reduce((acc, [key, value]) => {
            const maxAllowed = categoryData.menuCounts?.[key] || 0;
            const nextValue = Math.min(Math.max(0, value), maxAllowed);
            if (nextValue > 0) acc[key] = nextValue;
            return acc;
        }, {} as Record<string, number>);

        const nextDiets = Object.entries(currentPackSeparately.diets || {}).reduce((acc, [key, value]) => {
            const maxAllowed = categoryData.diets?.[key] || 0;
            const nextValue = Math.min(Math.max(0, value), maxAllowed);
            if (nextValue > 0) acc[key] = nextValue;
            return acc;
        }, {} as Record<string, number>);

        return {
            ...categoryData,
            packSeparately: this.cleanupPackSeparately({
                menus: nextMenus,
                diets: nextDiets
            })
        };
    }

    private static cleanupPackSeparately(packSeparately: { menus: Record<string, number>; diets: Record<string, number> }) {
        if (Object.keys(packSeparately.menus).length === 0 && Object.keys(packSeparately.diets).length === 0) {
            return undefined;
        }
        return packSeparately;
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

    static enforceStructure<T>(data: unknown, schema: T): T {
        if (!data) return schema;
        if (typeof data !== 'object') return schema;

        if (Array.isArray(schema)) {
            return (Array.isArray(data) ? data : schema) as T;
        }

        if (!schema || typeof schema !== 'object') {
            return data as T;
        }

        const dataRecord = data as Record<string, unknown>;
        const schemaRecord = schema as Record<string, unknown>;
        if (Object.keys(schemaRecord).length === 0) {
            return dataRecord as T;
        }
        const result: Record<string, unknown> = { ...schemaRecord };

        Object.keys(schemaRecord).forEach(key => {
            if (Object.prototype.hasOwnProperty.call(dataRecord, key)) {
                const schemaValue = schemaRecord[key];
                if (typeof schemaValue === 'object' && schemaValue !== null && !Array.isArray(schemaValue)) {
                    result[key] = this.enforceStructure(dataRecord[key], schemaValue);
                } else {
                    result[key] = dataRecord[key];
                }
            }
        });

        return result as T;
    }

    // Deadline logic
    static checkDeadline(dateStr: string, mealKey: string, deadlines?: { breakfast: string, breakfast_day_before?: boolean, lunch: string, lunch_day_before?: boolean, olovrant: string, olovrant_day_before?: boolean }): boolean {
        const now = this.getServerNow();
        const todayStr = this.toLocalDateString(now);

        if (!deadlines) {
            if (dateStr > todayStr) return true;
            return false;
        }

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
            const deadlineDateStr = this.toLocalDateString(deadlineDate);

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

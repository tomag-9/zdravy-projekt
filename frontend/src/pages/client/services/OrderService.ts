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

    /** Súčet všetkých diétnych porcií v kategórii. */
    static getDietTotal(categoryData: Pick<CategoryData, 'diets'>): number {
        return (Object.values(categoryData.diets || {}) as number[])
            .reduce((a, b) => a + b, 0);
    }

    /**
     * Počet bežných (nediétnych) porcií Menu A — to, čo klient vidí a edituje.
     *
     * `menuCounts.A` drží CELKOVÝ počet porcií Menu A vrátane diétnych (diéta je
     * naďalej podmnožina Menu A, tak ako to čaká backend, gramáž aj exporty).
     * UI ale zadáva bežné porcie zvlášť a diéty sa k nim pripočítavajú, takže
     * na vstupe/výstupe formulára prevádzame medzi týmito dvoma pohľadmi.
     */
    static getPlainMenuACount(categoryData: CategoryData): number {
        return Math.max(0, (categoryData.menuCounts?.['A'] || 0) - this.getDietTotal(categoryData));
    }

    static updateMenuCount(currentOrder: DailyOrder, mealKey: 'breakfast' | 'lunch' | 'olovrant', category: string, menuType: string, count: number): DailyOrder {
        const newCount = Math.max(0, count);
        const categoryData = currentOrder[mealKey][category];

        // Pri Menu A je `count` počet BEŽNÝCH porcií — diéty sa k nemu pripočítajú.
        // Znižovanie Menu A preto (na rozdiel od minulosti) diéty nekráti.
        const storedCount = menuType === 'A'
            ? newCount + this.getDietTotal(categoryData)
            : newCount;

        const newMenuCounts = {
            ...categoryData.menuCounts,
            [menuType]: storedCount
        };

        const nextCategoryData = this.withClampedPackSeparately({
            ...categoryData,
            menuCounts: newMenuCounts
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

        // Diéty sa pripočítavajú bez limitu: bežné (nediétne) porcie ostávajú
        // konštantné a celkové `menuCounts.A` rastie/klesá spolu s počtom diét.
        const plainMenuACount = this.getPlainMenuACount(categoryData);

        const newCount = Math.max(0, count);
        const newDiets = { ...categoryData.diets, [diet]: newCount };

        const nextCategoryData = this.withClampedPackSeparately({
            ...categoryData,
            menuCounts: {
                ...categoryData.menuCounts,
                A: plainMenuACount + this.getDietTotal({ diets: newDiets })
            },
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

    /**
     * Kľúče, ktorých obsah je mapa počtov s OTVORENOU množinou názvov.
     *
     * Diéty si definuje admin (`Diet` model → `prevadzka.visible_diets`), takže
     * ich mená nevie konštanta `DIETS` poznať — tá je len default pre prázdnu
     * objednávku. Keby ich `enforceStructure` filtrovala schémou, vlastná diéta
     * by sa pri načítaní ticho zahodila, prepísala do `currentOrder` aj
     * localStorage, a najbližšie odoslanie by ju vynulovalo aj v DB.
     *
     * `menuCounts` zámerne NIE je v zozname: tam je filtrovanie podľa
     * `GROUP_CONFIG` úmyselné (kategória má pevnú množinu menu variantov).
     */
    private static readonly OPEN_COUNT_MAP_KEYS = new Set(['diets']);

    /** Zlúči mapu počtov: defaulty zo schémy + všetky platné počty z dát. */
    private static enforceCountMap(
        data: unknown,
        schema: Record<string, unknown>
    ): Record<string, number> {
        const result = { ...schema } as Record<string, number>;
        if (!data || typeof data !== 'object' || Array.isArray(data)) return result;

        Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
            if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return;
            result[key] = value;
        });

        return result;
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
                if (this.OPEN_COUNT_MAP_KEYS.has(key)) {
                    result[key] = this.enforceCountMap(
                        dataRecord[key],
                        (schemaValue ?? {}) as Record<string, unknown>
                    );
                } else if (typeof schemaValue === 'object' && schemaValue !== null && !Array.isArray(schemaValue)) {
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

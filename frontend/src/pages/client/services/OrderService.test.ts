import { describe, it, expect, vi, afterEach } from 'vitest';
import OrderService, { DailyOrder } from './OrderService';
import { CATEGORIES } from '../config/constants';

describe('OrderService', () => {
    const localDateStr = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    describe('createEmptyMeal', () => {
        it('should create a meal with all categories', () => {
            const meal = OrderService.createEmptyMeal();
            CATEGORIES.forEach(category => {
                expect(meal).toHaveProperty(category);
                expect(meal[category]).toHaveProperty('menuCounts');
                expect(meal[category]).toHaveProperty('diets');
            });
        });
    });

    describe('enforceStructure', () => {
        it('returns a schema-shaped order while preserving known server values', () => {
            const schema = OrderService.createEmptyOrder();
            const result = OrderService.enforceStructure<DailyOrder>(
                {
                    status: 'submitted',
                    lunch: {
                        Škôlka: {
                            menuCounts: { A: 3, unexpected: 99 },
                        },
                    },
                    unknownMeal: { anything: true },
                },
                schema
            );

            expect(result.status).toBe('submitted');
            expect(result.lunch['Škôlka'].menuCounts.A).toBe(3);
            expect(result.lunch['Škôlka'].diets).toEqual(schema.lunch['Škôlka'].diets);
            expect(result).not.toHaveProperty('unknownMeal');
            expect(result.lunch['Škôlka'].menuCounts).not.toHaveProperty('unexpected');
        });
    });

    describe('updateMenuCount', () => {
        it('should update menu count', () => {
            const initialOrder: DailyOrder = {
                breakfast: OrderService.createEmptyMeal(),
                lunch: OrderService.createEmptyMeal(),
                olovrant: OrderService.createEmptyMeal()
            };

            const updatedOrder = OrderService.updateMenuCount(initialOrder, 'lunch', 'Škôlka', 'A', 5);
            expect(updatedOrder.lunch['Škôlka'].menuCounts.A).toBe(5);
        });

        it('should reduce diets if menu count drops below total diets', () => {
            let order: DailyOrder = {
                breakfast: OrderService.createEmptyMeal(),
                lunch: OrderService.createEmptyMeal(),
                olovrant: OrderService.createEmptyMeal()
            };

            // Set initial state: 5 menus, 5 diets
            order = OrderService.updateMenuCount(order, 'lunch', 'Škôlka', 'A', 5);
            order = OrderService.updateDiet(order, 'lunch', 'Škôlka', 'Bez lepku', 3);
            order = OrderService.updateDiet(order, 'lunch', 'Škôlka', 'Bez laktózy', 2);

            // Reduce menu count to 3. Diets should sum to max 3. 
            const updatedOrder = OrderService.updateMenuCount(order, 'lunch', 'Škôlka', 'A', 3);

            const newDiets = updatedOrder.lunch['Škôlka'].diets;
            const totalDiets = (Object.values(newDiets) as number[]).reduce((a: number, b: number) => a + b, 0);

            expect(totalDiets).toBe(3);
        });
    });

    describe('updateDiet', () => {
        it('should update diet count if within limit', () => {
            let order: DailyOrder = {
                breakfast: OrderService.createEmptyMeal(),
                lunch: OrderService.createEmptyMeal(),
                olovrant: OrderService.createEmptyMeal()
            };
            order = OrderService.updateMenuCount(order, 'lunch', 'Škôlka', 'A', 5);

            const updatedOrder = OrderService.updateDiet(order, 'lunch', 'Škôlka', 'Bez lepku', 3);
            expect(updatedOrder.lunch['Škôlka'].diets['Bez lepku']).toBe(3);
        });

        it('should not update diet count if it exceeds menu A count', () => {
            let order: DailyOrder = {
                breakfast: OrderService.createEmptyMeal(),
                lunch: OrderService.createEmptyMeal(),
                olovrant: OrderService.createEmptyMeal()
            };
            order = OrderService.updateMenuCount(order, 'lunch', 'Škôlka', 'A', 2);

            const updatedOrder = OrderService.updateDiet(order, 'lunch', 'Škôlka', 'Bez lepku', 3);
            expect(updatedOrder.lunch['Škôlka'].diets['Bez lepku']).toBe(0); // Should remain 0
        });
    });

    describe('checkDeadline', () => {
        afterEach(() => {
            vi.useRealTimers();
            sessionStorage.removeItem('server_time_offset_ms');
        });

        it('should allow future dates', () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 1);
            const dateStr = localDateStr(futureDate);
            expect(OrderService.checkDeadline(dateStr, 'lunch')).toBe(true);
        });

        it('should block past dates', () => {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 1);
            const dateStr = localDateStr(pastDate);
            expect(OrderService.checkDeadline(dateStr, 'lunch')).toBe(false);
        });

        it('should allow breakfast before 3:00 today', () => {
            const today = new Date();
            today.setHours(2, 59, 0, 0);
            vi.setSystemTime(today);
            const dateStr = localDateStr(today);
            // Must pass deadlines matching test conditions
            expect(OrderService.checkDeadline(dateStr, 'breakfast', { breakfast: '03:00', lunch: '03:00', olovrant: '03:00' })).toBe(true);
        });

        it('should block breakfast after 3:00 today', () => {
            const today = new Date();
            today.setHours(3, 1, 0, 0);
            vi.setSystemTime(today);
            const dateStr = localDateStr(today);
            expect(OrderService.checkDeadline(dateStr, 'breakfast', { breakfast: '03:00', lunch: '03:00', olovrant: '03:00' })).toBe(false);
        });

        it('should allow lunch before 7:30 today', () => {
            const today = new Date();
            today.setHours(7, 29, 0, 0);
            vi.setSystemTime(today);
            const dateStr = localDateStr(today);
            expect(OrderService.checkDeadline(dateStr, 'lunch', { breakfast: '07:30', lunch: '07:30', olovrant: '07:30' })).toBe(true);
        });

        it('should block lunch after 7:30 today', () => {
            const today = new Date();
            today.setHours(7, 31, 0, 0);
            vi.setSystemTime(today);
            const dateStr = localDateStr(today);
            expect(OrderService.checkDeadline(dateStr, 'lunch', { breakfast: '07:30', lunch: '07:30', olovrant: '07:30' })).toBe(false);
        });

        it('should block today when deadlines are not provided', () => {
            const today = new Date();
            today.setHours(9, 0, 0, 0);
            vi.setSystemTime(today);
            const dateStr = localDateStr(today);
            expect(OrderService.checkDeadline(dateStr, 'lunch')).toBe(false);
        });

        it('should use local date for day-before deadlines', () => {
            const now = new Date();
            now.setHours(7, 0, 0, 0);
            vi.setSystemTime(now);

            const mealDate = new Date(now);
            mealDate.setDate(mealDate.getDate() + 1);
            const dateStr = localDateStr(mealDate);

            expect(
                OrderService.checkDeadline(dateStr, 'lunch', {
                    breakfast: '10:00',
                    lunch: '08:00',
                    lunch_day_before: true,
                    olovrant: '10:00',
                })
            ).toBe(true);
        });

        it('should block day-before deadline when current time is at or after cutoff', () => {
            const now = new Date();
            now.setHours(8, 0, 0, 0);
            vi.setSystemTime(now);

            const mealDate = new Date(now);
            mealDate.setDate(mealDate.getDate() + 1);
            const dateStr = localDateStr(mealDate);

            expect(
                OrderService.checkDeadline(dateStr, 'lunch', {
                    breakfast: '10:00',
                    lunch: '08:00',
                    lunch_day_before: true,
                    olovrant: '10:00',
                })
            ).toBe(false);
        });
    });

    describe('getServerNow', () => {
        afterEach(() => {
            vi.useRealTimers();
            sessionStorage.removeItem('server_time_offset_ms');
        });

        it('should apply numeric server offset from sessionStorage', () => {
            const base = new Date('2026-03-14T10:00:00');
            vi.useFakeTimers();
            vi.setSystemTime(base);
            sessionStorage.setItem('server_time_offset_ms', '60000');

            expect(OrderService.getServerNow().getTime()).toBe(base.getTime() + 60000);
        });

        it('should ignore non-finite offsets', () => {
            const base = new Date('2026-03-14T10:00:00');
            vi.useFakeTimers();
            vi.setSystemTime(base);
            sessionStorage.setItem('server_time_offset_ms', 'Infinity');

            expect(OrderService.getServerNow().getTime()).toBe(base.getTime());
        });
    });

    describe('Copying Logic', () => {
        const createMockOrder = (date: string, hasFood: boolean): DailyOrder & { date: string } => {
            const order = {
                date,
                status: 'draft',
                breakfast: OrderService.createEmptyMeal(),
                lunch: OrderService.createEmptyMeal(),
                olovrant: OrderService.createEmptyMeal()
            } as DailyOrder & { date: string };

            if (hasFood) {
                order.lunch = OrderService.updateMenuCount(order, 'lunch', 'Škôlka', 'A', 1).lunch;
            }
            return order;
        };

        describe('isMealEmpty', () => {
            it('should return true for empty meal', () => {
                const emptyMeal = OrderService.createEmptyMeal();
                expect(OrderService.isMealEmpty(emptyMeal)).toBe(true);
            });

            it('should return false if menu count > 0', () => {
                const order = OrderService.updateMenuCount(
                    { breakfast: OrderService.createEmptyMeal(), lunch: OrderService.createEmptyMeal(), olovrant: OrderService.createEmptyMeal() },
                    'lunch', 'Škôlka', 'A', 1
                );
                expect(OrderService.isMealEmpty(order.lunch)).toBe(false);
            });
        });

        describe('findLastNonZeroDay', () => {
            it('should return null if history is empty', () => {
                expect(OrderService.findLastNonZeroDay([], '2025-01-01')).toBeNull();
            });

            it('should return previous day if it has food', () => {
                const history = [
                    createMockOrder('2025-01-01', true)
                ];
                const result = OrderService.findLastNonZeroDay(history, '2025-01-02');
                expect(result).not.toBeNull();
                expect((result as DailyOrder & { date: string }).date).toBe('2025-01-01');
            });

            it('should skip empty days', () => {
                const history = [
                    createMockOrder('2025-01-01', true),
                    createMockOrder('2025-01-02', false),
                ];
                // Target Friday
                const result = OrderService.findLastNonZeroDay(history, '2025-01-03');
                expect(result).not.toBeNull();
                expect((result as DailyOrder & { date: string }).date).toBe('2025-01-01');
            });

            it('should ignore days strictly after current date', () => {
                // Even if we have future data, we look backwards
                const history = [
                    createMockOrder('2025-01-01', true),
                    createMockOrder('2025-01-03', true)
                ];
                const result = OrderService.findLastNonZeroDay(history, '2025-01-02');
                expect(result).not.toBeNull();
                expect((result as DailyOrder & { date: string }).date).toBe('2025-01-01');
            });
        });

        describe('mergeOrders', () => {
            it('should copy everything if current is empty and untouched', () => {
                const current = {
                    breakfast: OrderService.createEmptyMeal(),
                    lunch: OrderService.createEmptyMeal(),
                    olovrant: OrderService.createEmptyMeal()
                };
                const source = {
                    breakfast: OrderService.createEmptyMeal(),
                    lunch: OrderService.createEmptyMeal(), // Modified below
                    olovrant: OrderService.createEmptyMeal()
                };
                // Add food to source lunch
                source.lunch = OrderService.updateMenuCount({ ...current }, 'lunch', 'Škôlka', 'A', 5).lunch;

                const result = OrderService.mergeOrders(current, source, new Set());

                expect(result.lunch['Škôlka'].menuCounts['A']).toBe(5);
            });

            it('should NOT copy to touched meals', () => {
                const current = {
                    breakfast: OrderService.createEmptyMeal(),
                    lunch: OrderService.createEmptyMeal(),
                    olovrant: OrderService.createEmptyMeal()
                };
                // User explicitly set lunch to 0 (conceptually), so it is "touched"
                const touched = new Set(['lunch']);

                const source = {
                    breakfast: OrderService.createEmptyMeal(),
                    lunch: OrderService.createEmptyMeal(),
                    olovrant: OrderService.createEmptyMeal()
                };
                // Source has 5 lunches
                source.lunch = OrderService.updateMenuCount({ ...current }, 'lunch', 'Škôlka', 'A', 5).lunch;

                const result = OrderService.mergeOrders(current, source, touched);

                // Should stay 0 because it was touched
                expect(result.lunch['Škôlka'].menuCounts['A']).toBe(0);
            });

            it('should copy one meal but keep another if touched', () => {
                // User ordered Breakfast (touched), but left Lunch empty (untouched)
                const current = {
                    breakfast: OrderService.createEmptyMeal(),
                    lunch: OrderService.createEmptyMeal(),
                    olovrant: OrderService.createEmptyMeal()
                };
                // Current Breakfast has 2 items
                current.breakfast = OrderService.updateMenuCount({ ...current }, 'breakfast', 'Škôlka', 'A', 2).breakfast;
                const touched = new Set(['breakfast']);

                const source = {
                    breakfast: OrderService.createEmptyMeal(),
                    lunch: OrderService.createEmptyMeal(),
                    olovrant: OrderService.createEmptyMeal()
                };
                // Source has 5 lunches and 5 breakfasts
                source.breakfast = OrderService.updateMenuCount({ ...source }, 'breakfast', 'Škôlka', 'A', 5).breakfast;
                source.lunch = OrderService.updateMenuCount({ ...source }, 'lunch', 'Škôlka', 'A', 5).lunch;

                const result = OrderService.mergeOrders(current, source, touched);

                // Breakfast should remain 2 (user input preferred over source 5)
                expect(result.breakfast['Škôlka'].menuCounts['A']).toBe(2);
                // Lunch should become 5 (copied from source)
                expect(result.lunch['Škôlka'].menuCounts['A']).toBe(5);
            });
        });
    });
});

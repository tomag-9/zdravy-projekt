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
                expect(meal[category]).toHaveProperty('packSeparately');
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

        it('keeps admin-defined diet names that are not in the DIETS constant', () => {
            const schema = OrderService.createEmptyOrder();
            const result = OrderService.enforceStructure<DailyOrder>(
                {
                    lunch: {
                        Škôlka: {
                            menuCounts: { A: 13 },
                            // Mená z `Diet` modelu — konštanta DIETS ich nepozná.
                            diets: { HISTAMIN: 3, 'NO EGG': 2 },
                        },
                    },
                },
                schema
            );

            const cat = result.lunch['Škôlka'];
            expect(cat.diets['HISTAMIN']).toBe(3);
            expect(cat.diets['NO EGG']).toBe(2);
            // Známe diéty ostávajú ako defaulty na nule
            expect(cat.diets['Bez lepku']).toBe(0);
            // A odvodený počet bežných porcií tým pádom sedí: 13 − 5 = 8
            expect(OrderService.getPlainMenuACount(cat)).toBe(8);
        });

        it('ignores non-numeric or negative diet counts', () => {
            const schema = OrderService.createEmptyOrder();
            const result = OrderService.enforceStructure<DailyOrder>(
                {
                    lunch: {
                        Škôlka: {
                            menuCounts: { A: 2 },
                            diets: { HISTAMIN: 2, BROKEN: 'x', NEGATIVE: -3, FLAGGED: true },
                        },
                    },
                },
                schema
            );

            const diets = result.lunch['Škôlka'].diets;
            expect(diets['HISTAMIN']).toBe(2);
            expect(diets).not.toHaveProperty('BROKEN');
            expect(diets).not.toHaveProperty('NEGATIVE');
            expect(diets).not.toHaveProperty('FLAGGED');
        });

        it('keeps custom diet names through a full save/load round trip', () => {
            let order = OrderService.createEmptyOrder();
            order = OrderService.updateMenuCount(order, 'lunch', 'Škôlka', 'A', 10);
            order = OrderService.updateDiet(order, 'lunch', 'Škôlka', 'HISTAMIN', 3);
            expect(order.lunch['Škôlka'].menuCounts.A).toBe(13);

            // Presne to, čo robí useOrder pri odpovedi zo servera / localStorage.
            const reloaded = OrderService.enforceStructure<DailyOrder>(
                JSON.parse(JSON.stringify(order)),
                OrderService.createEmptyOrder()
            );

            expect(reloaded.lunch['Škôlka'].diets['HISTAMIN']).toBe(3);
            expect(reloaded.lunch['Škôlka'].menuCounts.A).toBe(13);
            expect(OrderService.getPlainMenuACount(reloaded.lunch['Škôlka'])).toBe(10);
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

        it('should leave diets untouched when the plain menu A count drops', () => {
            let order: DailyOrder = {
                breakfast: OrderService.createEmptyMeal(),
                lunch: OrderService.createEmptyMeal(),
                olovrant: OrderService.createEmptyMeal()
            };

            // 5 bežných porcií + 5 diét => celkovo 10 porcií Menu A
            order = OrderService.updateMenuCount(order, 'lunch', 'Škôlka', 'A', 5);
            order = OrderService.updateDiet(order, 'lunch', 'Škôlka', 'Bez lepku', 3);
            order = OrderService.updateDiet(order, 'lunch', 'Škôlka', 'Bez laktózy', 2);
            expect(order.lunch['Škôlka'].menuCounts.A).toBe(10);

            // Zníženie bežných porcií na 3 diéty nekráti — celkovo 3 + 5 = 8
            const updatedOrder = OrderService.updateMenuCount(order, 'lunch', 'Škôlka', 'A', 3);

            expect(updatedOrder.lunch['Škôlka'].diets['Bez lepku']).toBe(3);
            expect(updatedOrder.lunch['Škôlka'].diets['Bez laktózy']).toBe(2);
            expect(updatedOrder.lunch['Škôlka'].menuCounts.A).toBe(8);
            expect(OrderService.getPlainMenuACount(updatedOrder.lunch['Škôlka'])).toBe(3);
        });

        it('should store plain menu A count plus the diet total', () => {
            let order: DailyOrder = {
                breakfast: OrderService.createEmptyMeal(),
                lunch: OrderService.createEmptyMeal(),
                olovrant: OrderService.createEmptyMeal()
            };

            order = OrderService.updateDiet(order, 'lunch', 'Škôlka', 'Bez lepku', 2);
            order = OrderService.updateMenuCount(order, 'lunch', 'Škôlka', 'A', 4);

            expect(order.lunch['Škôlka'].menuCounts.A).toBe(6);
            expect(OrderService.getPlainMenuACount(order.lunch['Škôlka'])).toBe(4);
        });

        it('should not fold diets into menus other than A', () => {
            let order: DailyOrder = {
                breakfast: OrderService.createEmptyMeal(),
                lunch: OrderService.createEmptyMeal(),
                olovrant: OrderService.createEmptyMeal()
            };

            order = OrderService.updateDiet(order, 'lunch', 'Škôlka', 'Bez lepku', 2);
            order = OrderService.updateMenuCount(order, 'lunch', 'Škôlka', 'B', 4);

            expect(order.lunch['Škôlka'].menuCounts.B).toBe(4);
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

        it('should add diets on top of menu A without any cap', () => {
            let order: DailyOrder = {
                breakfast: OrderService.createEmptyMeal(),
                lunch: OrderService.createEmptyMeal(),
                olovrant: OrderService.createEmptyMeal()
            };
            order = OrderService.updateMenuCount(order, 'lunch', 'Škôlka', 'A', 10);

            const updatedOrder = OrderService.updateDiet(order, 'lunch', 'Škôlka', 'Bez lepku', 3);

            expect(updatedOrder.lunch['Škôlka'].diets['Bez lepku']).toBe(3);
            expect(updatedOrder.lunch['Škôlka'].menuCounts.A).toBe(13);
            // Bežné porcie sa pridaním diét nesmú zmeniť
            expect(OrderService.getPlainMenuACount(updatedOrder.lunch['Škôlka'])).toBe(10);
        });

        it('should allow diets with no plain menu A portions at all', () => {
            const order: DailyOrder = {
                breakfast: OrderService.createEmptyMeal(),
                lunch: OrderService.createEmptyMeal(),
                olovrant: OrderService.createEmptyMeal()
            };

            const updatedOrder = OrderService.updateDiet(order, 'lunch', 'Škôlka', 'Bez lepku', 3);

            expect(updatedOrder.lunch['Škôlka'].menuCounts.A).toBe(3);
            expect(OrderService.getPlainMenuACount(updatedOrder.lunch['Škôlka'])).toBe(0);
        });

        it('should shrink menu A back when a diet is removed', () => {
            let order: DailyOrder = {
                breakfast: OrderService.createEmptyMeal(),
                lunch: OrderService.createEmptyMeal(),
                olovrant: OrderService.createEmptyMeal()
            };
            order = OrderService.updateMenuCount(order, 'lunch', 'Škôlka', 'A', 10);
            order = OrderService.updateDiet(order, 'lunch', 'Škôlka', 'Bez lepku', 3);

            const updatedOrder = OrderService.updateDiet(order, 'lunch', 'Škôlka', 'Bez lepku', 0);

            expect(updatedOrder.lunch['Škôlka'].menuCounts.A).toBe(10);
            expect(OrderService.getPlainMenuACount(updatedOrder.lunch['Škôlka'])).toBe(10);
        });

        it('reads a legacy order (diets carved out of menu A) as plain + diets', () => {
            // Stará objednávka: A=10 znamenalo „7 bežných + 3 diétne“.
            const order: DailyOrder = {
                breakfast: OrderService.createEmptyMeal(),
                lunch: OrderService.createEmptyMeal(),
                olovrant: OrderService.createEmptyMeal()
            };
            order.lunch['Škôlka'].menuCounts.A = 10;
            order.lunch['Škôlka'].diets['Bez lepku'] = 3;

            expect(OrderService.getPlainMenuACount(order.lunch['Škôlka'])).toBe(7);

            // Úprava bežných porcií na 8 => 8 + 3 = 11
            const updatedOrder = OrderService.updateMenuCount(order, 'lunch', 'Škôlka', 'A', 8);
            expect(updatedOrder.lunch['Škôlka'].menuCounts.A).toBe(11);
            expect(updatedOrder.lunch['Škôlka'].diets['Bez lepku']).toBe(3);
        });

        it('should reduce pack separately diets when diet count drops', () => {
            let order: DailyOrder = {
                breakfast: OrderService.createEmptyMeal(),
                lunch: OrderService.createEmptyMeal(),
                olovrant: OrderService.createEmptyMeal()
            };
            order = OrderService.updateMenuCount(order, 'lunch', 'Škôlka', 'A', 4);
            order = OrderService.updateDiet(order, 'lunch', 'Škôlka', 'Bez lepku', 3);
            order = OrderService.updatePackSeparately(order, 'lunch', 'Škôlka', 'diets', 'Bez lepku', 3);

            const updatedOrder = OrderService.updateDiet(order, 'lunch', 'Škôlka', 'Bez lepku', 1);
            expect(updatedOrder.lunch['Škôlka'].packSeparately?.diets['Bez lepku']).toBe(1);
        });
    });

    describe('updatePackSeparately', () => {
        it('should clamp pack separately menu count to ordered count', () => {
            let order: DailyOrder = {
                breakfast: OrderService.createEmptyMeal(),
                lunch: OrderService.createEmptyMeal(),
                olovrant: OrderService.createEmptyMeal()
            };
            order = OrderService.updateMenuCount(order, 'lunch', 'Škôlka', 'A', 2);

            const updatedOrder = OrderService.updatePackSeparately(order, 'lunch', 'Škôlka', 'menus', 'A', 5);
            expect(updatedOrder.lunch['Škôlka'].packSeparately?.menus.A).toBe(2);
        });

        it('should reduce pack separately menu count when ordered menu count drops', () => {
            let order: DailyOrder = {
                breakfast: OrderService.createEmptyMeal(),
                lunch: OrderService.createEmptyMeal(),
                olovrant: OrderService.createEmptyMeal()
            };
            order = OrderService.updateMenuCount(order, 'lunch', 'Škôlka', 'A', 4);
            order = OrderService.updatePackSeparately(order, 'lunch', 'Škôlka', 'menus', 'A', 4);

            const updatedOrder = OrderService.updateMenuCount(order, 'lunch', 'Škôlka', 'A', 1);
            expect(updatedOrder.lunch['Škôlka'].packSeparately?.menus.A).toBe(1);
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

    describe('checkMenuBcDeadline', () => {
        afterEach(() => {
            vi.useRealTimers();
            sessionStorage.removeItem('server_time_offset_ms');
        });

        it('allows Menu B/C changes more than 2 days before the meal date', () => {
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            vi.setSystemTime(now);

            const mealDate = new Date(now);
            mealDate.setDate(mealDate.getDate() + 3);
            const dateStr = localDateStr(mealDate);

            expect(
                OrderService.checkMenuBcDeadline(dateStr, { menu_bc: '07:30', menu_bc_days_before: 2 })
            ).toBe(true);
        });

        it('blocks Menu B/C changes once the strict 2-day-before deadline has passed', () => {
            const now = new Date();
            now.setHours(7, 31, 0, 0);
            vi.setSystemTime(now);

            const mealDate = new Date(now);
            mealDate.setDate(mealDate.getDate() + 2);
            const dateStr = localDateStr(mealDate);

            expect(
                OrderService.checkMenuBcDeadline(dateStr, { menu_bc: '07:30', menu_bc_days_before: 2 })
            ).toBe(false);
        });

        it('defaults to allowed when no deadlines are provided', () => {
            expect(OrderService.checkMenuBcDeadline('2099-01-01')).toBe(true);
        });
    });

    describe('extractRestrictedMenuCounts', () => {
        it('collects B/C/D counts keyed by meal|category|menu, skipping zeros and Menu A', () => {
            const order: DailyOrder = {
                ...OrderService.createEmptyOrder(),
                lunch: {
                    ...OrderService.createEmptyOrder().lunch,
                    Škôlka: {
                        menuCounts: { A: 5, B: 3, C: 0 },
                        diets: {},
                    },
                },
            };

            const counts = OrderService.extractRestrictedMenuCounts(order);

            expect(counts).toEqual({ 'lunch|Škôlka|B': 3 });
        });

        it('returns an empty map when nothing restricted is present', () => {
            expect(OrderService.extractRestrictedMenuCounts(OrderService.createEmptyOrder())).toEqual({});
        });
    });

    describe('extractRestrictedMenuCountsForMeal', () => {
        it('collects B/C/D counts under a custom label (celodenná objednávka)', () => {
            const fullDayData = {
                ...OrderService.createEmptyMeal(),
                Škôlka: { menuCounts: { A: 5, B: 2, D: 1 }, diets: {} },
            };

            expect(OrderService.extractRestrictedMenuCountsForMeal(fullDayData, 'fullDay')).toEqual({
                'fullDay|Škôlka|B': 2,
                'fullDay|Škôlka|D': 1,
            });
        });

        it('returns an empty map for undefined meal data', () => {
            expect(OrderService.extractRestrictedMenuCountsForMeal(undefined, 'fullDay')).toEqual({});
        });
    });

    describe('clampRestrictedMenusForMeal', () => {
        it('clamps B/C/D down to the target meal\'s ceiling, leaving Menu A untouched', () => {
            // Little Big (3.9.2026): "Kopírovať z obeda" copied yesterday's lunch,
            // which legitimately had Menu B, into today's olovrant — but today's
            // olovrant never had Menu B before, so its ceiling is 0.
            const copiedMeal = {
                Škôlka: { menuCounts: { A: 5, B: 3, C: 1 }, diets: {} },
            };
            const ceilings = { 'olovrant|Škôlka|B': 1 };

            const clamped = OrderService.clampRestrictedMenusForMeal(copiedMeal, ceilings, 'olovrant');

            expect(clamped.Škôlka.menuCounts).toEqual({ A: 5, B: 1, C: 0 });
        });

        it('leaves counts already at or under the ceiling untouched', () => {
            const copiedMeal = {
                Škôlka: { menuCounts: { A: 5, B: 1 }, diets: {} },
            };
            const ceilings = { 'lunch|Škôlka|B': 1 };

            const clamped = OrderService.clampRestrictedMenusForMeal(copiedMeal, ceilings, 'lunch');

            expect(clamped.Škôlka.menuCounts).toEqual({ A: 5, B: 1 });
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

    describe('formatRelativeDayLabel', () => {
        // Streda 2.9.2026, viď zadanie: dnes/zajtra/pozajtra zvýraznené, ďalej už len deň v týždni + dátum.
        const today = new Date('2026-09-02T10:00:00');

        it('should label today', () => {
            expect(OrderService.formatRelativeDayLabel('2026-09-02', today)).toEqual({
                text: 'Dnes streda 2.9.',
                emphasized: true,
            });
        });

        it('should label tomorrow', () => {
            expect(OrderService.formatRelativeDayLabel('2026-09-03', today)).toEqual({
                text: 'Zajtra štvrtok 3.9.',
                emphasized: true,
            });
        });

        it('should label the day after tomorrow', () => {
            expect(OrderService.formatRelativeDayLabel('2026-09-04', today)).toEqual({
                text: 'Pozajtra piatok 4.9.',
                emphasized: true,
            });
        });

        it('should label further dates as plain weekday + date, not emphasized', () => {
            expect(OrderService.formatRelativeDayLabel('2026-09-07', today)).toEqual({
                text: 'Pondelok 7.9.',
                emphasized: false,
            });
        });

        it('should label past dates as plain weekday + date, not emphasized', () => {
            expect(OrderService.formatRelativeDayLabel('2026-09-01', today)).toEqual({
                text: 'Utorok 1.9.',
                emphasized: false,
            });
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

import { describe, it, expect, vi, afterEach } from 'vitest';
import OrderService, { DailyOrder } from './OrderService';
import { CATEGORIES } from '../config/constants';

describe('OrderService', () => {
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
            const totalDiets = Object.values(newDiets).reduce((a: number, b: number) => a + b, 0);

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
        });

        it('should allow future dates', () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 1);
            const dateStr = futureDate.toISOString().split('T')[0];
            expect(OrderService.checkDeadline(dateStr, 'lunch')).toBe(true);
        });

        it('should block past dates', () => {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 1);
            const dateStr = pastDate.toISOString().split('T')[0];
            expect(OrderService.checkDeadline(dateStr, 'lunch')).toBe(false);
        });

        it('should allow breakfast before 3:00 today', () => {
            const today = new Date();
            today.setHours(2, 59, 0, 0);
            vi.setSystemTime(today);
            const dateStr = today.toISOString().split('T')[0];
            expect(OrderService.checkDeadline(dateStr, 'breakfast')).toBe(true);
        });

        it('should block breakfast after 3:00 today', () => {
            const today = new Date();
            today.setHours(3, 1, 0, 0);
            vi.setSystemTime(today);
            const dateStr = today.toISOString().split('T')[0];
            expect(OrderService.checkDeadline(dateStr, 'breakfast')).toBe(false);
        });

        it('should allow lunch before 7:30 today', () => {
            const today = new Date();
            today.setHours(7, 29, 0, 0);
            vi.setSystemTime(today);
            const dateStr = today.toISOString().split('T')[0];
            expect(OrderService.checkDeadline(dateStr, 'lunch')).toBe(true);
        });

        it('should block lunch after 7:30 today', () => {
            const today = new Date();
            today.setHours(7, 31, 0, 0);
            vi.setSystemTime(today);
            const dateStr = today.toISOString().split('T')[0];
            expect(OrderService.checkDeadline(dateStr, 'lunch')).toBe(false);
        });
    });
});

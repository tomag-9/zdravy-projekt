import { describe, it, expect } from 'vitest';
import OrderService from './OrderService';
import { CATEGORIES } from '../config/constants';

describe('OrderService', () => {
    describe('createEmptyMeal', () => {
        it('should create a meal with all categories', () => {
            const meal = OrderService.createEmptyMeal();
            CATEGORIES.forEach(category => {
                expect(meal).toHaveProperty(category);
                // @ts-ignore
                expect(meal[category]).toHaveProperty('menuCounts');
                // @ts-ignore
                expect(meal[category]).toHaveProperty('diets');
            });
        });
    });

    describe('updateMenuCount', () => {
        it('should update menu count', () => {
            const initialOrder = {
                lunch: OrderService.createEmptyMeal()
            };

            const updatedOrder = OrderService.updateMenuCount(initialOrder, 'lunch', 'Škôlka', 'A', 5);
            // @ts-ignore
            expect(updatedOrder.lunch['Škôlka'].menuCounts.A).toBe(5);
        });

        it('should reduce diets if menu count drops below total diets', () => {
            let order = { lunch: OrderService.createEmptyMeal() };
            // Set initial state: 5 menus, 5 diets
            order = OrderService.updateMenuCount(order, 'lunch', 'Škôlka', 'A', 5);
            order = OrderService.updateDiet(order, 'lunch', 'Škôlka', 'Bez lepku', 3);
            order = OrderService.updateDiet(order, 'lunch', 'Škôlka', 'Bez laktózy', 2);

            // Reduce menu count to 3. Diets should sum to max 3. 
            // Logic removes from diets until they fit.
            const updatedOrder = OrderService.updateMenuCount(order, 'lunch', 'Škôlka', 'A', 3);

            // @ts-ignore
            const newDiets = updatedOrder.lunch['Škôlka'].diets;
            const totalDiets = Object.values(newDiets).reduce((a: any, b: any) => a + b, 0);

            expect(totalDiets).toBe(3);
        });
    });

    describe('updateDiet', () => {
        it('should update diet count if within limit', () => {
            let order = { lunch: OrderService.createEmptyMeal() };
            order = OrderService.updateMenuCount(order, 'lunch', 'Škôlka', 'A', 5);

            const updatedOrder = OrderService.updateDiet(order, 'lunch', 'Škôlka', 'Bez lepku', 3);
            // @ts-ignore
            expect(updatedOrder.lunch['Škôlka'].diets['Bez lepku']).toBe(3);
        });

        it('should not update diet count if it exceeds menu A count', () => {
            let order = { lunch: OrderService.createEmptyMeal() };
            order = OrderService.updateMenuCount(order, 'lunch', 'Škôlka', 'A', 2);

            const updatedOrder = OrderService.updateDiet(order, 'lunch', 'Škôlka', 'Bez lepku', 3);
            // @ts-ignore
            expect(updatedOrder.lunch['Škôlka'].diets['Bez lepku']).toBe(0); // Should remain 0
        });
    });
});

import OrderService from '../services/OrderService';

export const seedDevData = () => {
    // Clear existing order data
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('order_')) {
            localStorage.removeItem(key);
        }
    });

    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    const createOrder = (dateOffset: number, config: { breakfast?: number; lunch?: number; olovrant?: number }) => {
        const d = new Date(today);
        d.setDate(d.getDate() + dateOffset);
        const dateStr = formatDate(d);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let order: any = {
            status: 'submitted',
            breakfast: OrderService.createEmptyMeal(),
            lunch: OrderService.createEmptyMeal(),
            olovrant: OrderService.createEmptyMeal()
        };

        if (config.breakfast) {
            order = OrderService.updateMenuCount(order, 'breakfast', 'Jasle', 'A', config.breakfast);
        }
        if (config.lunch) {
            order = OrderService.updateMenuCount(order, 'lunch', 'Škôlka', 'A', config.lunch);
        }
        if (config.olovrant) {
            order = OrderService.updateMenuCount(order, 'olovrant', 'Škôlka', 'A', config.olovrant);
        }

        localStorage.setItem(`order_${dateStr}`, JSON.stringify(order));

        // Mark meals as active
        const activeState = {
            breakfast: !!config.breakfast,
            lunch: !!config.lunch,
            olovrant: !!config.olovrant
        };
        localStorage.setItem(`activeMeals_${dateStr}`, JSON.stringify(activeState));
    };

    // Past orders (Completed / Missed Deadline)
    createOrder(-1, { breakfast: 10, lunch: 25, olovrant: 10 }); // Yesterday
    createOrder(-2, { breakfast: 0, lunch: 20, olovrant: 0 });
    createOrder(-3, { breakfast: 15, lunch: 30, olovrant: 15 });
    createOrder(-4, { breakfast: 12, lunch: 28, olovrant: 12 });
    createOrder(-5, { breakfast: 8, lunch: 22, olovrant: 8 });

    // Today
    createOrder(0, { breakfast: 5, lunch: 15, olovrant: 5 });

    // Future
    createOrder(1, { breakfast: 20, lunch: 40, olovrant: 20 }); // Tomorrow
    createOrder(2, { breakfast: 0, lunch: 0, olovrant: 0 }); // Empty future

    window.location.reload();
};

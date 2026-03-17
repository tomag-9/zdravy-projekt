import React, { useState } from 'react';
import { Coffee, Utensils, Apple, X } from 'lucide-react';
import MealCard from '../client/components/order/MealCard';
import CategoryRow from '../client/components/order/CategoryRow';
import DietSelector from '../client/components/order/DietSelector';
import OrderService, { DailyOrder, MealData } from '../client/services/OrderService';
import { CATEGORIES } from '../client/config/constants';
import { useAuth } from '../../context/auth';
import { useToast } from '../../context/ToastContext';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface ExistingOrder {
    id: number;
    date: string;
    data: {
        breakfast?: unknown;
        lunch?: unknown;
        olovrant?: unknown;
    };
}

interface Props {
    clientId: string | number;
    visibleMenus: string[];
    visibleMeals: string[];
    visibleDiets: number[];
    allDiets: { id: number; name: string }[];
    existingOrder?: ExistingOrder | null;
    onClose: () => void;
    onSaved: () => void;
}

type MealKey = 'breakfast' | 'lunch' | 'olovrant';

const MEAL_CONFIG: { key: MealKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'breakfast', label: 'Raňajky', icon: Coffee },
    { key: 'lunch', label: 'Obed', icon: Utensils },
    { key: 'olovrant', label: 'Olovrant', icon: Apple },
];

function buildInitialOrder(existingOrder?: ExistingOrder | null): DailyOrder {
    const empty = OrderService.createEmptyOrder();
    if (!existingOrder?.data) return empty;

    const enforceOrEmpty = (raw: unknown): MealData => {
        const emptyMeal = OrderService.createEmptyMeal();
        return OrderService.enforceStructure(raw, emptyMeal) as MealData;
    };

    return {
        status: 'draft',
        breakfast: enforceOrEmpty(existingOrder.data.breakfast),
        lunch: enforceOrEmpty(existingOrder.data.lunch),
        olovrant: enforceOrEmpty(existingOrder.data.olovrant),
    };
}

const AdminOrderEditorModal: React.FC<Props> = ({
    clientId,
    visibleMenus,
    visibleMeals,
    visibleDiets,
    allDiets,
    existingOrder,
    onClose,
    onSaved,
}) => {
    const { apiFetch } = useAuth();
    const toast = useToast();

    const [date, setDate] = useState<string>(existingOrder?.date ?? OrderService.toLocalDateString(new Date()));
    const [order, setOrder] = useState<DailyOrder>(() => buildInitialOrder(existingOrder));
    const [activeMeals, setActiveMeals] = useState<Record<MealKey, boolean>>(() => {
        const initial = buildInitialOrder(existingOrder);
        return {
            breakfast: !OrderService.isMealEmpty(initial.breakfast),
            lunch: !OrderService.isMealEmpty(initial.lunch),
            olovrant: !OrderService.isMealEmpty(initial.olovrant),
        };
    });
    const [activeDietModal, setActiveDietModal] = useState<{ meal: MealKey; category: string } | null>(null);
    const [saving, setSaving] = useState(false);

    const visibleMealsList = MEAL_CONFIG.filter((m) =>
        visibleMeals.length === 0 || visibleMeals.includes(m.key),
    );

    // Derive enabled diet names from IDs
    const enabledDietNames = allDiets.filter((d) => visibleDiets.includes(d.id)).map((d) => d.name);

    const getAvailableDiets = (category: string): string[] =>
        OrderService.getAvailableDiets(category, enabledDietNames);

    const toggleMeal = (key: MealKey) => {
        setActiveMeals((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const updateMenuCount = (meal: MealKey, category: string, menuType: string, val: number) => {
        setOrder((prev) => OrderService.updateMenuCount(prev, meal, category, menuType, val));
    };

    const updateDiet = (meal: MealKey, category: string, diet: string, count: number) => {
        setOrder((prev) => OrderService.updateDiet(prev, meal, category, diet, count));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Build payload: only meal keys, zero-out inactive meals (strip 'status' from DailyOrder type)
            const snapshot: DailyOrder = OrderService.fastCopy(order);
            const payloadData = {
                breakfast: activeMeals.breakfast ? snapshot.breakfast : OrderService.createEmptyMeal(),
                lunch: activeMeals.lunch ? snapshot.lunch : OrderService.createEmptyMeal(),
                olovrant: activeMeals.olovrant ? snapshot.olovrant : OrderService.createEmptyMeal(),
            };

            if (existingOrder) {
                const res = await apiFetch(`${API_URL}/orders/${existingOrder.id}/?user_id=${clientId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ data: payloadData }),
                });
                if (!res.ok) throw new Error('save failed');
                toast.success('Objednávka bola uložená.');
            } else {
                const res = await apiFetch(`${API_URL}/orders/?user_id=${clientId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ date, data: payloadData }),
                });
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    const msg = body?.date?.[0] || body?.non_field_errors?.[0] || 'Chyba pri vytváraní objednávky.';
                    toast.error(msg);
                    return;
                }
                toast.success('Objednávka bola vytvorená.');
            }
            onSaved();
        } catch {
            toast.error('Nepodarilo sa uložiť objednávku.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm overflow-y-auto p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-4 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">
                            {existingOrder ? 'Upraviť objednávku' : 'Nová objednávka'}
                        </h2>
                        {existingOrder && (
                            <p className="text-sm text-gray-500 mt-0.5">{existingOrder.date}</p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Date picker (new orders only) */}
                {!existingOrder && (
                    <div className="px-6 pt-5">
                        <label htmlFor="order-date" className="block text-sm font-medium text-gray-700 mb-1">Dátum objednávky</label>
                        <input
                            id="order-date"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                )}

                {/* Meal cards */}
                <div className="px-6 py-5 space-y-4">
                    {visibleMealsList.map(({ key, label, icon }) => {
                        const isActive = activeMeals[key];
                        return (
                            <MealCard
                                key={key}
                                title={label}
                                icon={icon}
                                isActive={isActive}
                                onToggle={() => toggleMeal(key)}
                                copyAction={null}
                                statusMessage={null}
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {CATEGORIES.map((category) => {
                                        const data = order[key]?.[category];
                                        if (!data) return null;

                                        const dietCount = (Object.values(data.diets || {}) as number[]).reduce(
                                            (a, b) => a + b,
                                            0,
                                        );
                                        const availableDiets = getAvailableDiets(category);

                                        return (
                                            <CategoryRow
                                                key={category}
                                                label={category}
                                                menuCounts={data.menuCounts}
                                                onMenuCountChange={(menuType, val) =>
                                                    updateMenuCount(key, category, menuType, val)
                                                }
                                                hasDietsEnabled={availableDiets.length > 0}
                                                dietCount={dietCount}
                                                onOpenDiets={() => setActiveDietModal({ meal: key, category })}
                                                visibleMenus={visibleMenus}
                                            />
                                        );
                                    })}
                                </div>
                            </MealCard>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition-colors"
                    >
                        Zrušiť
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-xl shadow-md shadow-indigo-200 transition-all"
                    >
                        {saving ? 'Ukladám...' : 'Uložiť'}
                    </button>
                </div>
            </div>

            {/* Diet selector modal */}
            {activeDietModal && (
                <DietSelector
                    isOpen={true}
                    onClose={() => setActiveDietModal(null)}
                    categoryLabel={activeDietModal.category}
                    enabledDiets={getAvailableDiets(activeDietModal.category)}
                    diets={order[activeDietModal.meal]?.[activeDietModal.category]?.diets ?? {}}
                    maxPortions={order[activeDietModal.meal]?.[activeDietModal.category]?.menuCounts?.['A'] || 0}
                    onUpdateDiet={(diet, count) =>
                        updateDiet(activeDietModal.meal, activeDietModal.category, diet, count)
                    }
                />
            )}
        </div>
    );
};

export default AdminOrderEditorModal;

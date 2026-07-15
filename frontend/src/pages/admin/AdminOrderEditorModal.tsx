import React, { useEffect, useState } from 'react';
import { Coffee, Utensils, Apple, X } from 'lucide-react';
import MealCard from '../client/components/order/MealCard';
import CategoryRow from '../client/components/order/CategoryRow';
import DietSelector from '../client/components/order/DietSelector';
import OrderService, { DailyOrder, MealData } from '../client/services/OrderService';
import { CATEGORIES } from '../client/config/constants';
import { useAuth } from '../../context/auth';
import { useToast } from '../../context/ToastContext';
import { Button, Field, Input } from './ui';

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

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) onClose();
    };

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
                    const msg =
                        body?.error?.details?.date?.[0] ||
                        body?.error?.message ||
                        'Chyba pri vytváraní objednávky.';
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
        <div
            className="zpa-scrim"
            style={{ alignItems: 'flex-start', overflowY: 'auto', padding: 16 }}
            onClick={handleOverlayClick}
        >
            <div
                className="zpa-modal"
                style={{ maxWidth: 780, width: '100%', margin: '16px 0', maxHeight: 'none' }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="admin-order-editor-title"
            >
                {/* Header */}
                <div className="zpa-modal-head">
                    <div>
                        <h3 id="admin-order-editor-title">
                            {existingOrder ? 'Upraviť objednávku' : 'Nová objednávka'}
                        </h3>
                        {existingOrder && (
                            <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '2px 0 0' }}>{existingOrder.date}</p>
                        )}
                    </div>
                    <button type="button" aria-label="Zavrieť" onClick={onClose} className="zpa-modal-close">
                        <X />
                    </button>
                </div>

                {/* Date picker (new orders only) */}
                {!existingOrder && (
                    <div style={{ padding: '20px 24px 0' }}>
                        <Field label="Dátum objednávky">
                            <Input id="order-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: 'auto' }} />
                        </Field>
                    </div>
                )}

                {/* Meal cards */}
                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                <div className="zpa-modal-foot">
                    <Button variant="ghost" onClick={onClose}>Zrušiť</Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? 'Ukladám…' : 'Uložiť'}
                    </Button>
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

import React, { useEffect, useMemo, useState } from 'react';
import { Apple, Coffee, PackagePlus, Utensils, X } from 'lucide-react';
import MealCard from '../client/components/order/MealCard';
import CategoryRow from '../client/components/order/CategoryRow';
import DietSelector from '../client/components/order/DietSelector';
import PackSeparatelySelector from '../client/components/order/PackSeparatelySelector';
import OrderService, { DailyOrder, MealData } from '../client/services/OrderService';
import { CATEGORIES } from '../client/config/constants';
import { useAuth } from '../../context/auth';
import { useToast } from '../../context/ToastContext';
import { Button, Field, Input, Textarea, Toggle } from './ui';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface ExistingOrder {
    id: number;
    date: string;
    data: {
        breakfast?: unknown;
        lunch?: unknown;
        olovrant?: unknown;
        special_diet_note?: unknown;
    };
}

interface Props {
    clientId?: string | number | null;
    prevadzkaId: string | number;
    visibleMenus: string[];
    visibleMeals: string[];
    visibleDiets: number[];
    portionTypeNames: string[];
    packSeparatelyEnabled: boolean;
    allDiets: { id: number; name: string }[];
    existingOrder?: ExistingOrder | null;
    onClose: () => void;
    onSaved: () => void;
}

type MealKey = 'breakfast' | 'lunch' | 'olovrant';

type PackSeparatelyMealKey = MealKey | 'fullDay';

const MEAL_CONFIG: { key: MealKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'breakfast', label: 'Raňajky', icon: Coffee },
    { key: 'lunch', label: 'Obed', icon: Utensils },
    { key: 'olovrant', label: 'Olovrant', icon: Apple },
];

const FALLBACK_CATEGORIES = CATEGORIES;

const getBaseCategories = (portionTypeNames: string[]) =>
    portionTypeNames.length > 0 ? portionTypeNames : FALLBACK_CATEGORIES;

const extractCategoriesFromMeal = (meal: unknown): string[] => {
    if (!meal || typeof meal !== 'object' || Array.isArray(meal)) return [];
    return Object.keys(meal as Record<string, unknown>);
};

const buildCategories = (portionTypeNames: string[], existingOrder?: ExistingOrder | null) => {
    const categories = new Set(getBaseCategories(portionTypeNames));
    if (existingOrder?.data) {
        extractCategoriesFromMeal(existingOrder.data.breakfast).forEach((key) => categories.add(key));
        extractCategoriesFromMeal(existingOrder.data.lunch).forEach((key) => categories.add(key));
        extractCategoriesFromMeal(existingOrder.data.olovrant).forEach((key) => categories.add(key));
    }
    return Array.from(categories);
};

function buildInitialOrder(categories: string[], existingOrder?: ExistingOrder | null): DailyOrder {
    const emptyMeal = () => OrderService.createEmptyMealFor(categories);
    const empty = {
        status: 'draft' as const,
        breakfast: emptyMeal(),
        lunch: emptyMeal(),
        olovrant: emptyMeal(),
    };
    if (!existingOrder?.data) return empty;

    const enforceOrEmpty = (raw: unknown): MealData =>
        OrderService.enforceStructure(raw, emptyMeal()) as MealData;

    return {
        status: 'draft',
        breakfast: enforceOrEmpty(existingOrder.data.breakfast),
        lunch: enforceOrEmpty(existingOrder.data.lunch),
        olovrant: enforceOrEmpty(existingOrder.data.olovrant),
    };
}

const buildPackSeparatelyItems = (categories: string[], mealData?: MealData) =>
    categories.flatMap((category) => {
        const categoryData = mealData?.[category];
        if (!categoryData) return [];

        const menuItems = Object.entries(categoryData.menuCounts || {})
            .filter(([, orderedCount]) => orderedCount > 0)
            .map(([menuKey, orderedCount]) => ({
                category,
                kind: 'menus' as const,
                keyName: menuKey,
                orderedCount,
                count: categoryData.packSeparately?.menus?.[menuKey] || 0,
            }));

        const dietItems = Object.entries(categoryData.diets || {})
            .filter(([, orderedCount]) => orderedCount > 0)
            .map(([dietKey, orderedCount]) => ({
                category,
                kind: 'diets' as const,
                keyName: dietKey,
                orderedCount,
                count: categoryData.packSeparately?.diets?.[dietKey] || 0,
            }));

        return [...menuItems, ...dietItems];
    });

const AdminOrderEditorModal: React.FC<Props> = ({
    clientId,
    prevadzkaId,
    visibleMenus,
    visibleMeals,
    visibleDiets,
    portionTypeNames,
    packSeparatelyEnabled,
    allDiets,
    existingOrder,
    onClose,
    onSaved,
}) => {
    const { apiFetch } = useAuth();
    const toast = useToast();

    const categories = useMemo(
        () => buildCategories(portionTypeNames, existingOrder),
        [portionTypeNames, existingOrder],
    );
    const emptyMeal = useMemo(() => OrderService.createEmptyMealFor(categories), [categories]);
    const visibleMealsList = useMemo(
        () => MEAL_CONFIG.filter((m) => visibleMeals.length === 0 || visibleMeals.includes(m.key)),
        [visibleMeals],
    );
    const firstVisibleMealKey = visibleMealsList[0]?.key;
    const enabledDietNames = useMemo(
        () => allDiets.filter((d) => visibleDiets.includes(d.id)).map((d) => d.name),
        [allDiets, visibleDiets],
    );

    const [date, setDate] = useState<string>(existingOrder?.date ?? OrderService.toLocalDateString(new Date()));
    const [order, setOrder] = useState<DailyOrder>(() => buildInitialOrder(categories, existingOrder));
    const [fullDayOrder, setFullDayOrder] = useState(false);
    const [fullDayData, setFullDayData] = useState<MealData>(() => {
        const initialOrder = buildInitialOrder(categories, existingOrder);
        return firstVisibleMealKey ? OrderService.fastCopy(initialOrder[firstVisibleMealKey]) : OrderService.createEmptyMealFor(categories);
    });
    const [specialDietNote, setSpecialDietNote] = useState(
        typeof existingOrder?.data?.special_diet_note === 'string' ? existingOrder.data.special_diet_note : '',
    );
    const [activeMeals, setActiveMeals] = useState<Record<MealKey, boolean>>(() => {
        const initial = buildInitialOrder(categories, existingOrder);
        return {
            breakfast: !OrderService.isMealEmpty(initial.breakfast),
            lunch: !OrderService.isMealEmpty(initial.lunch),
            olovrant: !OrderService.isMealEmpty(initial.olovrant),
        };
    });
    const [activeDietModal, setActiveDietModal] = useState<{ meal: PackSeparatelyMealKey; category: string } | null>(null);
    const [packSeparatelyOpen, setPackSeparatelyOpen] = useState(false);
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

    const wrapFullDay = (meal: MealData): DailyOrder => ({
        status: 'draft',
        breakfast: meal,
        lunch: emptyMeal,
        olovrant: emptyMeal,
    });

    const updateFullDayMenuCount = (category: string, menuType: string, val: number) => {
        setFullDayData((prev) =>
            OrderService.updateMenuCount(wrapFullDay(prev), 'breakfast', category, menuType, val).breakfast,
        );
    };

    const updateFullDayDiet = (category: string, diet: string, count: number) => {
        setFullDayData((prev) =>
            OrderService.updateDiet(wrapFullDay(prev), 'breakfast', category, diet, count).breakfast,
        );
    };

    const updatePackSeparately = (
        meal: PackSeparatelyMealKey,
        category: string,
        kind: 'menus' | 'diets',
        key: string,
        count: number,
    ) => {
        if (meal === 'fullDay') {
            setFullDayData((prev) =>
                OrderService.updatePackSeparately(wrapFullDay(prev), 'breakfast', category, kind, key, count).breakfast,
            );
            return;
        }

        setOrder((prev) => OrderService.updatePackSeparately(prev, meal, category, kind, key, count));
    };

    const packSeparatelySections = useMemo(() => {
        const sections = fullDayOrder
            ? [
                {
                    meal: 'fullDay' as const,
                    mealLabel: 'Celý deň',
                    items: buildPackSeparatelyItems(categories, fullDayData),
                },
            ]
            : visibleMealsList.map(({ key, label }) => ({
                meal: key,
                mealLabel: label,
                items: buildPackSeparatelyItems(categories, order[key]),
            }));

        return sections.filter((section) => section.items.length > 0);
    }, [categories, fullDayData, fullDayOrder, order, visibleMealsList]);

    const activePackSeparatelyItems = useMemo(
        () =>
            packSeparatelySections
                .map((section) => ({
                    ...section,
                    items: section.items.filter((item) => item.count > 0),
                }))
                .filter((section) => section.items.length > 0),
        [packSeparatelySections],
    );

    const handleSave = async () => {
        setSaving(true);
        try {
            const snapshot: DailyOrder = OrderService.fastCopy(order);
            const payloadData = {
                breakfast: fullDayOrder
                    ? (visibleMealsList.some((meal) => meal.key === 'breakfast') ? OrderService.fastCopy(fullDayData) : emptyMeal)
                    : (activeMeals.breakfast ? snapshot.breakfast : emptyMeal),
                lunch: fullDayOrder
                    ? (visibleMealsList.some((meal) => meal.key === 'lunch') ? OrderService.fastCopy(fullDayData) : emptyMeal)
                    : (activeMeals.lunch ? snapshot.lunch : emptyMeal),
                olovrant: fullDayOrder
                    ? (visibleMealsList.some((meal) => meal.key === 'olovrant') ? OrderService.fastCopy(fullDayData) : emptyMeal)
                    : (activeMeals.olovrant ? snapshot.olovrant : emptyMeal),
                special_diet_note: specialDietNote.trim() || undefined,
            };

            const query = clientId ? `?user_id=${encodeURIComponent(String(clientId))}` : '';

            if (existingOrder) {
                const res = await apiFetch(`${API_URL}/orders/${existingOrder.id}/?prevadzka=${encodeURIComponent(String(prevadzkaId))}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ data: payloadData, prevadzka: prevadzkaId }),
                });
                if (!res.ok) throw new Error('save failed');
                toast.success('Objednávka bola uložená.');
            } else {
                const res = await apiFetch(`${API_URL}/orders/${query}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ date, data: payloadData, prevadzka: prevadzkaId }),
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

    const renderCategoryRows = (meal: PackSeparatelyMealKey, mealData: MealData) => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map((category) => {
                const data = mealData[category];
                if (!data) return null;

                const dietCount = (Object.values(data.diets || {}) as number[]).reduce((a, b) => a + b, 0);
                const availableDiets = getAvailableDiets(category);

                return (
                    <CategoryRow
                        key={`${meal}-${category}`}
                        label={category}
                        menuCounts={data.menuCounts}
                        onMenuCountChange={(menuType, val) =>
                            meal === 'fullDay'
                                ? updateFullDayMenuCount(category, menuType, val)
                                : updateMenuCount(meal, category, menuType, val)
                        }
                        hasDietsEnabled={availableDiets.length > 0}
                        dietCount={dietCount}
                        onOpenDiets={() => setActiveDietModal({ meal, category })}
                        visibleMenus={visibleMenus}
                    />
                );
            })}
        </div>
    );

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

                {!existingOrder && (
                    <div style={{ padding: '20px 24px 0' }}>
                        <Field label="Dátum objednávky">
                            <Input id="order-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: 'auto' }} />
                        </Field>
                    </div>
                )}

                <div style={{ padding: '20px 24px 0' }}>
                    <Field label="Celý deň rovnaký">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                            <span style={{ color: 'var(--ink-2)', fontSize: 14 }}>
                                Použiť jeden rovnaký set porcií pre všetky viditeľné jedlá.
                            </span>
                            <Toggle
                                on={fullDayOrder}
                                onChange={setFullDayOrder}
                                ariaLabel="Celý deň rovnaký"
                            />
                        </div>
                    </Field>
                </div>

                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {fullDayOrder ? (
                        <MealCard
                            title="Celý deň"
                            icon={Coffee}
                            isActive={true}
                            onToggle={() => undefined}
                            copyAction={null}
                            statusMessage={null}
                        >
                            {renderCategoryRows('fullDay', fullDayData)}
                        </MealCard>
                    ) : (
                        visibleMealsList.map(({ key, label, icon }) => {
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
                                    {renderCategoryRows(key, order[key])}
                                </MealCard>
                            );
                        })
                    )}

                    {packSeparatelyEnabled && (
                        <MealCard
                            title="Zabaliť zvlášť"
                            icon={PackagePlus}
                            isActive={activePackSeparatelyItems.length > 0}
                            onToggle={() => setPackSeparatelyOpen(true)}
                            copyAction={
                                <button
                                    type="button"
                                    className="zp-btn zp-btn--secondary zp-btn--sm"
                                    style={{ flex: 1 }}
                                    onClick={() => setPackSeparatelyOpen(true)}
                                >
                                    <PackagePlus style={{ width: 12, height: 12 }} /> Pridať výnimku
                                </button>
                            }
                            statusMessage={null}
                        >
                            <div>
                                {activePackSeparatelyItems.length === 0 ? (
                                    <div className="zp-empty" style={{ margin: '8px 0 0' }}>
                                        <p>Zatiaľ nemáte nič označené na balenie zvlášť.</p>
                                    </div>
                                ) : (
                                    activePackSeparatelyItems.map((section) => (
                                        <div key={section.meal} style={{ marginBottom: 12 }}>
                                            {activePackSeparatelyItems.length > 1 && (
                                                <div className="zp-cat-head" style={{ marginBottom: 8 }}>{section.mealLabel}</div>
                                            )}
                                            {section.items.map((item) => (
                                                <div
                                                    key={`${section.meal}-${item.category}-${item.kind}-${item.keyName}`}
                                                    className={`zp-diet-row${item.count > 0 ? ' active' : ''}`}
                                                >
                                                    <div>
                                                        <span className="zp-diet-label">
                                                            {item.category} · {item.kind === 'menus' ? `Menu ${item.keyName}` : item.keyName}
                                                        </span>
                                                        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
                                                            Limit objednávky: {item.orderedCount}
                                                        </div>
                                                    </div>
                                                    <div className="zp-counter">
                                                        <button
                                                            type="button"
                                                            disabled={item.count <= 0}
                                                            aria-label={`Znížiť ${section.mealLabel} ${item.category} ${item.keyName}`}
                                                            onClick={() => updatePackSeparately(section.meal, item.category, item.kind, item.keyName, item.count - 1)}
                                                        >
                                                            -
                                                        </button>
                                                        <span className={`count${item.count <= 0 ? ' zero' : ''}`}>{item.count}</span>
                                                        <button
                                                            type="button"
                                                            className="plus"
                                                            disabled={item.count >= item.orderedCount}
                                                            aria-label={`Zvýšiť ${section.mealLabel} ${item.category} ${item.keyName}`}
                                                            onClick={() => updatePackSeparately(section.meal, item.category, item.kind, item.keyName, item.count + 1)}
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ))
                                )}
                            </div>
                        </MealCard>
                    )}

                    <Field label="Poznámka k špeciálnej diéte">
                        <Textarea
                            aria-label="Poznámka k špeciálnej diéte"
                            rows={4}
                            value={specialDietNote}
                            placeholder="Popis špeciálnej diéty"
                            onChange={(e) => setSpecialDietNote(e.target.value)}
                        />
                    </Field>
                </div>

                <div className="zpa-modal-foot">
                    <Button variant="ghost" onClick={onClose}>Zrušiť</Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? 'Ukladám…' : 'Uložiť'}
                    </Button>
                </div>
            </div>

            {activeDietModal && (
                <DietSelector
                    isOpen={true}
                    onClose={() => setActiveDietModal(null)}
                    categoryLabel={activeDietModal.category}
                    enabledDiets={getAvailableDiets(activeDietModal.category)}
                    diets={
                        activeDietModal.meal === 'fullDay'
                            ? fullDayData[activeDietModal.category]?.diets ?? {}
                            : order[activeDietModal.meal]?.[activeDietModal.category]?.diets ?? {}
                    }
                    maxPortions={
                        activeDietModal.meal === 'fullDay'
                            ? fullDayData[activeDietModal.category]?.menuCounts?.A || 0
                            : order[activeDietModal.meal]?.[activeDietModal.category]?.menuCounts?.A || 0
                    }
                    onUpdateDiet={(diet, count) =>
                        activeDietModal.meal === 'fullDay'
                            ? updateFullDayDiet(activeDietModal.category, diet, count)
                            : updateDiet(activeDietModal.meal, activeDietModal.category, diet, count)
                    }
                />
            )}

            {packSeparatelyEnabled && (
                <PackSeparatelySelector
                    isOpen={packSeparatelyOpen}
                    onClose={() => setPackSeparatelyOpen(false)}
                    sections={packSeparatelySections}
                    onUpdatePackSeparately={updatePackSeparately}
                />
            )}
        </div>
    );
};

export default AdminOrderEditorModal;

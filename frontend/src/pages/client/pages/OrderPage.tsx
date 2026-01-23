import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp, CATEGORIES } from '../context/AppContext';
import DaySelector from '../components/order/DaySelector';
import MealCard from '../components/order/MealCard';
import CategoryRow from '../components/order/CategoryRow';
import DietSelector from '../components/order/DietSelector';
import OrderSummary from '../components/order/OrderSummary';
import { Coffee, Utensils, Apple, Check, Trash2, ArrowLeft } from 'lucide-react';
import { Switch } from '../components/ui/Switch';
import { DailyOrder } from '../services/OrderService';

const OrderPage = () => {
    const [searchParams] = useSearchParams();
    const {
        selectedDate, setSelectedDate,
        activeMeals, toggleMeal,
        currentOrder, updateMenuCount, updateDiet,
        enabledCategories, settings, updateSettings,
        clearMeal, getAvailableDiets
    } = useApp();

    const [activeDietModal, setActiveDietModal] = useState<{ meal: keyof DailyOrder, category: string } | null>(null);
    const [showToast, setShowToast] = useState(false);
    const [dataChangedState, setDataChangedState] = useState({
        breakfast: false,
        lunch: false,
        olovrant: false
    });

    const initialDataRef = useRef<{ breakfast: string, lunch: string, olovrant: string } | null>(null);
    const dateKeyRef = useRef(selectedDate);

    useEffect(() => {
        const dateFromUrl = searchParams.get('date');
        if (dateFromUrl) {
            setSelectedDate(dateFromUrl);
        }
    }, [searchParams, setSelectedDate]);

    useEffect(() => {
        if (dateKeyRef.current !== selectedDate) {
            dateKeyRef.current = selectedDate;
            initialDataRef.current = null;
            setDataChangedState({
                breakfast: false,
                lunch: false,
                olovrant: false
            });
        }

        if (initialDataRef.current === null) {
            initialDataRef.current = {
                breakfast: JSON.stringify(currentOrder.breakfast),
                lunch: JSON.stringify(currentOrder.lunch),
                olovrant: JSON.stringify(currentOrder.olovrant)
            };
            return;
        }

        const currentData = {
            breakfast: JSON.stringify(currentOrder.breakfast),
            lunch: JSON.stringify(currentOrder.lunch),
            olovrant: JSON.stringify(currentOrder.olovrant)
        };

        setDataChangedState({
            breakfast: currentData.breakfast !== initialDataRef.current.breakfast,
            lunch: currentData.lunch !== initialDataRef.current.lunch,
            olovrant: currentData.olovrant !== initialDataRef.current.olovrant
        });
    }, [currentOrder, selectedDate]);

    useEffect(() => {
        if (dataChangedState.breakfast && settings.copyBreakfastFromPrevLunch) {
            updateSettings('copyBreakfastFromPrevLunch', false);
        }
        if (dataChangedState.olovrant && settings.copyOlovrantFromLunch) {
            updateSettings('copyOlovrantFromLunch', false);
        }
    }, [dataChangedState, settings.copyBreakfastFromPrevLunch, settings.copyOlovrantFromLunch, updateSettings]);

    const meals: { key: keyof DailyOrder; label: string; icon: any }[] = [
        { key: 'breakfast', label: 'Raňajky', icon: Coffee },
        { key: 'lunch', label: 'Obed', icon: Utensils },
        { key: 'olovrant', label: 'Olovrant', icon: Apple }
    ];

    const handleSubmit = () => {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const resetMealData = (mealKey: keyof DailyOrder) => {
        initialDataRef.current = {
            breakfast: mealKey === 'breakfast' ? JSON.stringify(currentOrder.breakfast) : initialDataRef.current?.breakfast as string,
            lunch: mealKey === 'lunch' ? JSON.stringify(currentOrder.lunch) : initialDataRef.current?.lunch as string,
            olovrant: mealKey === 'olovrant' ? JSON.stringify(currentOrder.olovrant) : initialDataRef.current?.olovrant as string
        };
    };

    const handleCopyTrigger = (mealKey: string) => {
        if (mealKey === 'breakfast') {
            return (
                <div className="flex flex-col gap-2 w-full">
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2 flex-1">
                            <span className="text-sm text-indigo-900 font-medium">Auto-výpočet (podľa včera)</span>
                        </div>
                        <Switch
                            checked={settings.copyBreakfastFromPrevLunch}
                            onCheckedChange={(val) => {
                                updateSettings('copyBreakfastFromPrevLunch', val);
                                if (!val) {
                                    clearMeal('breakfast');
                                    resetMealData('breakfast');
                                } else {
                                    setDataChangedState(prev => ({ ...prev, breakfast: false }));
                                    setTimeout(() => {
                                        initialDataRef.current = {
                                            ...((initialDataRef.current) as any),
                                            breakfast: JSON.stringify(currentOrder.breakfast)
                                        };
                                    }, 100);
                                }
                            }}
                            className="scale-90"
                        />
                    </div>
                    <button
                        onClick={() => {
                            clearMeal('breakfast');
                            resetMealData('breakfast');
                            setDataChangedState(prev => ({ ...prev, breakfast: false }));
                        }}
                        className="w-full text-xs py-2 px-3 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors font-medium flex items-center justify-center gap-1"
                    >
                        <Trash2 className="w-3 h-3" /> Vymazať
                    </button>
                </div>
            );
        }

        if (mealKey === 'lunch') {
            return (
                <div className="flex flex-col gap-2 w-full">
                    <button
                        onClick={() => {
                            clearMeal('lunch');
                            resetMealData('lunch');
                            setDataChangedState(prev => ({ ...prev, lunch: false }));
                        }}
                        className="w-full text-xs py-2 px-3 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors font-medium flex items-center justify-center gap-1"
                    >
                        <Trash2 className="w-3 h-3" /> Vymazať
                    </button>
                </div>
            );
        }

        if (mealKey === 'olovrant') {
            return (
                <div className="flex flex-col gap-2 w-full">
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2 flex-1">
                            <span className="text-sm text-indigo-900 font-medium">Kopírovať z dnešného obeda</span>
                        </div>
                        <Switch
                            checked={settings.copyOlovrantFromLunch}
                            onCheckedChange={(val) => {
                                updateSettings('copyOlovrantFromLunch', val);
                                if (!val) {
                                    clearMeal('olovrant');
                                    resetMealData('olovrant');
                                }
                            }}
                            className="scale-90"
                        />
                    </div>
                    <button
                        onClick={() => {
                            clearMeal('olovrant');
                            resetMealData('olovrant');
                            setDataChangedState(prev => ({ ...prev, olovrant: false }));
                        }}
                        className="w-full text-xs py-2 px-3 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors font-medium flex items-center justify-center gap-1"
                    >
                        <Trash2 className="w-3 h-3" /> Vymazať
                    </button>
                </div>
            );
        }

        return null;
    };

    return (
        <div className="p-4 md:p-0 pb-24">
            <div className="max-w-6xl mx-auto mb-8 pt-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link to="/home">
                            <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                                <ArrowLeft className="w-5 h-5 text-slate-600" />
                            </button>
                        </Link>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Objednávka jedál</h1>
                            <p className="text-sm sm:text-base text-slate-500">Správa denného menu a diét</p>
                        </div>
                    </div>
                    <Link to="/settings">
                        <button className="inline-flex items-center px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm self-start">
                            ⚙️ Nastavenia
                        </button>
                    </Link>
                </div>
            </div>

            <div className="max-w-6xl mx-auto space-y-6">
                <DaySelector selectedDate={selectedDate} onChange={setSelectedDate} />

                <div className="space-y-6">
                    {meals.map(({ key, label, icon }) => (
                        <MealCard
                            key={key}
                            title={label}
                            icon={icon}
                            isActive={activeMeals[key]}
                            onToggle={() => toggleMeal(key)}
                            copyAction={handleCopyTrigger(key)}
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {CATEGORIES.filter(category => enabledCategories.includes(category)).map(category => {
                                    const data = currentOrder[key]?.[category];
                                    if (!data) return null;

                                    const dietCount = Object.values(data.diets || {}).reduce((a: number, b: number) => a + b, 0);
                                    const availableDiets = getAvailableDiets(category);

                                    return (
                                        <CategoryRow
                                            key={category}
                                            label={category}
                                            menuCounts={data.menuCounts}
                                            onMenuCountChange={(menuType, val) => updateMenuCount(key, category, menuType, val)}
                                            hasDietsEnabled={availableDiets.length > 0}
                                            dietCount={dietCount}
                                            onOpenDiets={() => setActiveDietModal({ meal: key, category })}
                                        />
                                    );
                                })}
                            </div>
                        </MealCard>
                    ))}
                </div>

                <OrderSummary onSubmit={handleSubmit} />
            </div>

            {activeDietModal && (
                <DietSelector
                    isOpen={true}
                    onClose={() => setActiveDietModal(null)}
                    categoryLabel={activeDietModal.category}
                    enabledDiets={getAvailableDiets(activeDietModal.category)}
                    diets={currentOrder[activeDietModal.meal][activeDietModal.category].diets}
                    maxPortions={currentOrder[activeDietModal.meal][activeDietModal.category].menuCounts?.['A'] || 0}
                    onUpdateDiet={(diet, count) => updateDiet(activeDietModal.meal, activeDietModal.category, diet, count)}
                />
            )}

            {showToast && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900 text-white px-6 py-3 rounded-full shadow-xl animate-in fade-in slide-in-from-top-5 duration-300">
                    <div className="bg-green-500 p-1 rounded-full"><Check className="w-3 h-3 text-white" /></div>
                    <span className="font-medium text-sm">Objednávka bola úspešne uložená.</span>
                </div>
            )}
        </div>
    );
};

export default OrderPage;

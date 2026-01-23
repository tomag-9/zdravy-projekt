import { FileCheck, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useApp } from '../../context/AppContext';

interface OrderSummaryProps {
    onSubmit: () => void;
}

const OrderSummary = ({ onSubmit }: OrderSummaryProps) => {
    const { currentOrder, activeMeals, selectedDate } = useApp();

    const getMealTotal = (mealKey: string) => {
        // @ts-ignore
        if (!activeMeals[mealKey] || !currentOrder[mealKey]) return 0;
        // @ts-ignore
        return Object.values(currentOrder[mealKey]).reduce((acc, cat: any) => {
            const counts = cat?.menuCounts || {};
            const catTotal = Object.values(counts).reduce((sum: any, val: any) => sum + val, 0);
            return (acc as number) + (catTotal as number);
        }, 0);
    };

    const getDietTotal = (mealKey: string) => {
        // @ts-ignore
        if (!activeMeals[mealKey] || !currentOrder[mealKey]) return 0;
        // @ts-ignore
        return Object.values(currentOrder[mealKey]).reduce((acc, cat: any) => {
            if (!cat?.diets) return acc;
            return (acc as number) + (Object.values((cat as any).diets) as any[]).reduce((dAcc: any, d: any) => dAcc + d, 0);
        }, 0);
    };

    const lunchTotal = getMealTotal('lunch');
    const breakfastTotal = getMealTotal('breakfast');
    const olovrantTotal = getMealTotal('olovrant');

    const lunchDiets = getDietTotal('lunch');
    const breakfastDiets = getDietTotal('breakfast');
    const olovrantDiets = getDietTotal('olovrant');

    // @ts-ignore
    const totalPortions = lunchTotal + breakfastTotal + olovrantTotal;

    // Simple validation logic (overflow is already prevented by UI, but good to check)
    const isValid = (totalPortions as number) > 0;

    return (
        <Card className="mt-8 border-indigo-100 shadow-md bg-white">
            <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                    <FileCheck className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-lg font-bold text-slate-800">Rýchle zhrnutie</h3>
                </div>

                <div className="space-y-3 mb-6">
                    <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                        <span className="text-slate-500">Dátum</span>
                        <span className="font-medium text-slate-900">{new Date(selectedDate).toLocaleDateString('sk-SK')}</span>
                    </div>

                    {activeMeals.lunch && (
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-600">Obedy</span>
                            <div className="text-right">
                                <span className="font-bold text-slate-900">{lunchTotal as number}</span>
                                {lunchDiets as number > 0 && <span className="text-xs text-slate-500 block">({lunchDiets as number} diét)</span>}
                            </div>
                        </div>
                    )}

                    {activeMeals.breakfast && (
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-600">Raňajky</span>
                            <div className="text-right">
                                <span className="font-bold text-slate-900">{breakfastTotal as number}</span>
                                {breakfastDiets as number > 0 && <span className="text-xs text-slate-500 block">({breakfastDiets as number} diét)</span>}
                            </div>
                        </div>
                    )}

                    {activeMeals.olovrant && (
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-600">Olovranty</span>
                            <div className="text-right">
                                <span className="font-bold text-slate-900">{olovrantTotal as number}</span>
                                {olovrantDiets as number > 0 && <span className="text-xs text-slate-500 block">({olovrantDiets as number} diét)</span>}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                        <span className="font-bold text-slate-800">Spolu porcií</span>
                        <span className="font-bold text-2xl text-indigo-600">{totalPortions as number}</span>
                    </div>
                </div>

                <Button
                    className="w-full h-12 text-lg shadow-indigo-200"
                    disabled={!isValid}
                    onClick={onSubmit}
                >
                    Odoslať objednávku
                </Button>

                {!isValid && activeMeals.lunch && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
                        <AlertCircle className="w-4 h-4" />
                        Zadajte aspoň jednu porciu.
                    </div>
                )}
            </div>
        </Card>
    );
};

export default OrderSummary;

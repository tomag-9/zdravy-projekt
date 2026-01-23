import { X, Check } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { cn } from '../../lib/utils';

interface DietSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    categoryLabel: string;
    diets: Record<string, number>;
    enabledDiets: string[];
    onUpdateDiet: (diet: string, count: number) => void;
    maxPortions: number;
}

const DietSelector = ({
    isOpen,
    onClose,
    categoryLabel,
    diets,
    enabledDiets,
    onUpdateDiet,
    maxPortions
}: DietSelectorProps) => {
    if (!isOpen) return null;

    // Calculate used portions for diets to show remaining
    const currentDietSum = Object.values(diets || {}).reduce((a: number, b: number) => a + b, 0);
    const remaining = maxPortions - currentDietSum;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-200">
            <Card className="w-full max-w-md max-h-[85vh] flex flex-col rounded-t-2xl sm:rounded-2xl shadow-xl animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800">Diéty: {categoryLabel}</h3>
                        <p className="text-xs text-slate-500">
                            Dostupné: <span className={cn("font-bold", remaining < 0 ? "text-red-500" : "text-indigo-600")}>{remaining}</span> z {maxPortions} porcií
                        </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                <div className="overflow-y-auto p-4 space-y-3">
                    {enabledDiets.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                            <p>Žiadne povolené diéty.</p>
                            <p className="text-xs mt-1">Prejdite do nastavení pre zapnutie.</p>
                        </div>
                    ) : (
                        enabledDiets.map(diet => {
                            const count = diets?.[diet] || 0;
                            return (
                                <div key={diet} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                    <span className="text-sm font-medium text-slate-700">{diet}</span>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => onUpdateDiet(diet, count - 1)}
                                            disabled={count <= 0}
                                            className="w-8 h-8 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-white transition-all"
                                        >
                                            -
                                        </button>
                                        <span className={cn("w-6 text-center font-bold", count > 0 ? "text-indigo-600" : "text-slate-400")}>
                                            {count}
                                        </span>
                                        <button
                                            onClick={() => onUpdateDiet(diet, count + 1)}
                                            disabled={remaining <= 0}
                                            className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 hover:bg-indigo-200 disabled:opacity-50 disabled:bg-slate-100 disabled:text-slate-400 transition-all"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                    <Button className="w-full" size="lg" onClick={onClose}>
                        <Check className="w-5 h-5 mr-2" />
                        Hotovo
                    </Button>
                </div>
            </Card>
        </div>
    );
};

export default DietSelector;

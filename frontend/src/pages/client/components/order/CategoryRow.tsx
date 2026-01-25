import { Minus, Plus, Utensils } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

interface MenuCounterProps {
    type: string;
    count: number;
    onChange: (val: number) => void;
    onOpenDiets: (() => void) | null;
    dietCount: number;
}

const MenuCounter = ({ type, count, onChange, onOpenDiets, dietCount }: MenuCounterProps & { disabled?: boolean }) => {
    // Determine if disabled implicitly via props from parent (onChange check) or explicitly if we passed it (we didn't yet, but let's handle it)
    // Actually, we modified onChange in parent to be no-op. But visual disabled state is nice.
    // Let's assume we want to add visual disabled state.

    return (
        <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 opacity-100 group-disabled:opacity-50">
            <div className="flex items-center gap-2">
                <span className="font-medium text-slate-600 w-16">Menu {type}</span>
                {type === 'A' && onOpenDiets && (
                    <button
                        onClick={onOpenDiets}
                        className="text-xs text-indigo-600 font-medium flex items-center gap-1 hover:text-indigo-800 transition-colors bg-indigo-50 px-2 py-1 rounded-md"
                    >
                        <Utensils className="w-3 h-3" />
                        {dietCount > 0 ? `${dietCount} diét` : 'Diéty'}
                    </button>
                )}
            </div>

            <div className="flex items-center gap-3">
                <Button
                    variant="outline"
                    size="icon"
                    className="w-8 h-8 rounded-full border-slate-300 hover:bg-white hover:border-indigo-300 hover:text-indigo-600"
                    onClick={() => onChange(count - 1)}
                    disabled={count <= 0} // We rely on parent blocking calls for general disable, but we can add better props later if needed
                >
                    <Minus className="w-4 h-4" />
                </Button>

                <span className={cn(
                    "w-8 text-center text-lg font-bold tabular-nums",
                    count > 0 ? "text-slate-900" : "text-slate-300"
                )}>
                    {count}
                </span>

                <Button
                    variant="default"
                    size="icon"
                    className="w-8 h-8 rounded-full shadow-md shadow-indigo-100"
                    onClick={() => onChange(count + 1)}
                >
                    <Plus className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
};

interface CategoryRowProps {
    label: string;
    menuCounts: Record<string, number>;
    onMenuCountChange: (menu: string, val: number) => void;
    dietCount: number;
    onOpenDiets: () => void;
    hasDietsEnabled: boolean;
    disabled?: boolean;
}

const CategoryRow = ({
    label,
    menuCounts,
    onMenuCountChange,
    dietCount,
    onOpenDiets,
    hasDietsEnabled,
    disabled
}: CategoryRowProps) => {
    // Determine which menus to show based on the keys in menuCounts
    const menus = Object.keys(menuCounts || {});

    // Sort menus to ensure A is first, then B, C, V...
    menus.sort((a, b) => {
        const order: Record<string, number> = { 'A': 1, 'B': 2, 'C': 3, 'V': 4 };
        return (order[a] || 99) - (order[b] || 99);
    });

    return (
        <div className="bg-slate-50 rounded-xl border border-slate-100 hover:border-indigo-100 transition-colors overflow-hidden">
            <div className="bg-slate-100/50 px-4 py-2 border-b border-slate-100">
                <span className="font-semibold text-slate-700 text-sm">{label}</span>
            </div>
            <div className="p-2 flex flex-col">
                {menus.map(menuType => (
                    <MenuCounter
                        key={menuType}
                        type={menuType}
                        count={menuCounts[menuType]}
                        onChange={(val) => !disabled && onMenuCountChange(menuType, val)}
                        onOpenDiets={hasDietsEnabled && menuType === 'A' && !disabled ? onOpenDiets : null}
                        dietCount={dietCount}
                    />
                ))}
            </div>
        </div>
    );
};

export default CategoryRow;

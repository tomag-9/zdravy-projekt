import { Minus, Plus, Utensils } from 'lucide-react';

interface MenuCounterProps {
    type: string;
    count: number;
    onChange: (val: number) => void;
    onOpenDiets: (() => void) | null;
    dietCount: number;
    disabled?: boolean;
}

const MenuCounter = ({ type, count, onChange, onOpenDiets, dietCount, disabled }: MenuCounterProps) => {
    return (
        <div className="zp-menurow">
            <span className="name">Menu {type}</span>
            {type === 'A' && onOpenDiets && (
                <button className="diet-trigger" onClick={onOpenDiets} disabled={disabled}>
                    <Utensils style={{ width: 10, height: 10 }} />
                    {dietCount > 0 ? `${dietCount} diét` : 'Diéty'}
                </button>
            )}
            <span className="spacer"></span>
            <div className="zp-counter">
                <button
                    disabled={disabled || count <= 0}
                    aria-label="−"
                    onClick={() => onChange(Math.max(0, count - 1))}
                >
                    <Minus style={{ width: 14, height: 14, strokeWidth: 2.5 }} />
                </button>
                <span className={`count${count <= 0 ? " zero" : ""}`}>{count}</span>
                <button
                    className="plus"
                    disabled={disabled}
                    aria-label="+"
                    onClick={() => onChange(count + 1)}
                >
                    <Plus style={{ width: 14, height: 14, strokeWidth: 2.5 }} />
                </button>
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
    visibleMenus?: string[];
    tourId?: string;
}

const CategoryRow = ({
    label,
    menuCounts,
    onMenuCountChange,
    dietCount,
    onOpenDiets,
    hasDietsEnabled,
    disabled,
    visibleMenus,
    tourId,
}: CategoryRowProps) => {
    let menus = Object.keys(menuCounts || {});

    if (visibleMenus && visibleMenus.length > 0) {
        menus = menus.filter(m => visibleMenus.includes(m));
    }

    menus.sort((a, b) => {
        const order: Record<string, number> = { 'A': 1, 'B': 2, 'C': 3, 'V': 4 };
        return (order[a] || 99) - (order[b] || 99);
    });

    return (
        <div data-tour-id={tourId} className="zp-cat">
            <div className="zp-cat-head">{label}</div>
            {menus.map(menuType => (
                <MenuCounter
                    key={menuType}
                    type={menuType}
                    count={menuCounts[menuType]}
                    onChange={(val) => !disabled && onMenuCountChange(menuType, val)}
                    onOpenDiets={hasDietsEnabled && menuType === 'A' && !disabled ? onOpenDiets : null}
                    dietCount={dietCount}
                    disabled={disabled}
                />
            ))}
        </div>
    );
};

export default CategoryRow;

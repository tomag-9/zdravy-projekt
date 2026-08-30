import { Fragment } from 'react';
import { ChevronRight, Minus, Plus, Utensils } from 'lucide-react';
import NumericCountInput from './NumericCountInput';

interface MenuCounterProps {
    type: string;
    count: number;
    onChange: (val: number) => void;
    disabled?: boolean;
    isOccupied?: boolean;
    closedLabel?: string;
}

const MenuCounter = ({ type, count, onChange, disabled, isOccupied, closedLabel }: MenuCounterProps) => {
    if (isOccupied) {
        return (
            <div className="zp-menurow zp-menurow--occupied">
                <span className="name">Menu {type}</span>
                <span className="spacer"></span>
                <span className="zp-menurow-occupied-label">zasednutá</span>
            </div>
        );
    }

    return (
        <div className="zp-menurow" title={closedLabel}>
            <span className="name">Menu {type}</span>
            {closedLabel && <span className="zp-menurow-occupied-label">{closedLabel}</span>}
            <span className="spacer"></span>
            <div className="zp-counter">
                <button
                    disabled={disabled || count <= 0}
                    aria-label="−"
                    onClick={() => onChange(Math.max(0, count - 1))}
                >
                    <Minus style={{ width: 14, height: 14, strokeWidth: 2.5 }} />
                </button>
                <NumericCountInput
                    value={count}
                    onCommit={onChange}
                    disabled={disabled}
                    ariaLabel={`Počet porcií pre menu ${type}`}
                />
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

interface DietRowProps {
    dietCount: number;
    onOpenDiets: () => void;
    disabled?: boolean;
}

/**
 * Diéty sú samostatná položka hneď pod Menu A — nie výrez z jeho počtu.
 * Klik otvorí modál, v ktorom sa diéty pripočítavajú bez limitu.
 */
const DietRow = ({ dietCount, onOpenDiets, disabled }: DietRowProps) => (
    <button
        type="button"
        className="zp-menurow zp-menurow--diet"
        onClick={onOpenDiets}
        disabled={disabled}
    >
        <Utensils className="zp-menurow--diet-icon" style={{ width: 12, height: 12 }} />
        <span className="name">Diéty</span>
        <span className="spacer"></span>
        <span className={`zp-menurow--diet-count${dietCount > 0 ? " active" : ""}`}>{dietCount}</span>
        <ChevronRight style={{ width: 14, height: 14 }} />
    </button>
);

interface CategoryRowProps {
    label: string;
    menuCounts: Record<string, number>;
    onMenuCountChange: (menu: string, val: number) => void;
    dietCount: number;
    onOpenDiets: () => void;
    hasDietsEnabled: boolean;
    disabled?: boolean;
    visibleMenus?: string[];
    occupiedMenus?: Set<string>;
    disabledMenus?: string[];
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
    occupiedMenus,
    disabledMenus,
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
            {menus.map(menuType => {
                const isOccupied = occupiedMenus?.has(menuType);
                const isMenuDeadlineClosed = !disabled && !!disabledMenus?.includes(menuType);
                // Menu A drží celkový počet vrátane diétnych porcií; klient edituje
                // len bežné porcie, takže diéty od zobrazenej hodnoty odrátame.
                const shownCount = menuType === 'A'
                    ? Math.max(0, (menuCounts[menuType] || 0) - dietCount)
                    : menuCounts[menuType];

                return (
                    <Fragment key={menuType}>
                        <MenuCounter
                            type={menuType}
                            count={shownCount}
                            onChange={(val) => !disabled && !isMenuDeadlineClosed && onMenuCountChange(menuType, val)}
                            disabled={disabled || isMenuDeadlineClosed}
                            isOccupied={isOccupied}
                            closedLabel={isMenuDeadlineClosed ? "termín uplynul" : undefined}
                        />
                        {menuType === 'A' && hasDietsEnabled && !isOccupied && (
                            <DietRow
                                dietCount={dietCount}
                                onOpenDiets={onOpenDiets}
                                disabled={disabled}
                            />
                        )}
                    </Fragment>
                );
            })}
        </div>
    );
};

export default CategoryRow;

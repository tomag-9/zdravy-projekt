import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Minus, Plus } from 'lucide-react';
import { useScrollLock } from '../../../../hooks/useScrollLock';
import DietVariantHint from './DietVariantHint';
import NumericCountInput from './NumericCountInput';
import {
    getPackSeparatelyItemLabel,
    usePackSeparatelyUpdater,
    type PackSeparatelySection,
    type PackTarget,
} from './packSeparately';

// 'fullDay' je celodenná objednávka — drží dáta mimo currentOrder, ale UI je rovnaké.
type MealKey = 'breakfast' | 'lunch' | 'olovrant' | 'fullDay';

const TARGET_TABS: { target: PackTarget; label: string }[] = [
    { target: 'zvlast', label: 'Zvlášť' },
    { target: 'gn', label: 'Zvlášť do GN' },
];

interface PackSeparatelySelectorProps {
    isOpen: boolean;
    onClose: () => void;
    sections: PackSeparatelySection[];
    onUpdatePackSeparately: (
        meal: MealKey,
        category: string,
        kind: 'menus' | 'diets',
        key: string,
        count: number,
        target: PackTarget
    ) => void;
}

const PackSeparatelySelector = ({
    isOpen,
    onClose,
    sections,
    onUpdatePackSeparately
}: PackSeparatelySelectorProps) => {
    useScrollLock(isOpen);
    const updateItem = usePackSeparatelyUpdater(sections, onUpdatePackSeparately);
    const [activeTarget, setActiveTarget] = useState<PackTarget>('zvlast');
    if (!isOpen) return null;

    // `sections` nesie položky pre OBIDVA ciele naraz (rozlíšené `item.target`) -
    // tab len filtruje, ktoré sa v tomto zobrazení editujú.
    const visibleSections = sections
        .map((section) => ({ ...section, items: section.items.filter((item) => item.target === activeTarget) }))
        .filter((section) => section.items.length > 0);

    return createPortal(
        <div className="zp-sheet-scrim" onClick={onClose}>
            <div className="zp-sheet" onClick={(e) => e.stopPropagation()}>
                <div className="zp-sheet-grab"></div>
                <div className="zp-sheet-head">
                    <div>
                        <h3>Zabaliť zvlášť</h3>
                        <p className="sub">Vyberte už objednané položky, ktoré sa majú baliť zvlášť.</p>
                    </div>
                    <button className="zp-sheet-close" aria-label="Zavrieť" onClick={onClose}>
                        <X style={{ width: 16, height: 16, strokeWidth: 2 }} />
                    </button>
                </div>

                <div className="zp-tabs" role="tablist" style={{ display: 'flex', gap: 8, padding: '0 16px 12px' }}>
                    {TARGET_TABS.map((tab) => (
                        <button
                            key={tab.target}
                            role="tab"
                            aria-selected={activeTarget === tab.target}
                            className={`zp-btn zp-btn--sm${activeTarget === tab.target ? ' zp-btn--primary' : ' zp-btn--secondary'}`}
                            onClick={() => setActiveTarget(tab.target)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="zp-sheet-body">
                    {visibleSections.length === 0 ? (
                        <div className="zp-empty" style={{ margin: '16px 0' }}>
                            <p>Nemáte žiadne objednané položky.</p>
                            <p style={{ fontSize: 12, marginTop: 4 }}>Najprv pridajte porcie alebo diéty.</p>
                        </div>
                    ) : (
                        visibleSections.map((section) => (
                            <div key={section.meal} style={{ marginBottom: 16 }}>
                                {visibleSections.length > 1 && (
                                    <div className="zp-cat-head" style={{ marginBottom: 8 }}>{section.mealLabel}</div>
                                )}
                                {section.items.map((item) => (
                                    <div
                                        key={`${section.meal}-${item.category}-${item.kind}-${item.keyName}-${item.linkedRow || 'plain'}`}
                                        className={`zp-diet-row${item.count > 0 ? ' active' : ''}`}
                                    >
                                        <div>
                                            <span className="zp-diet-label">
                                                {item.category} · {getPackSeparatelyItemLabel(item)}
                                                <DietVariantHint kind={item.kind} menuVariant={item.menuVariant} />
                                            </span>
                                            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
                                                Objednané: {item.orderedCount}
                                            </div>
                                        </div>
                                        <div className="zp-counter">
                                            <button
                                                disabled={item.count <= 0}
                                                aria-label="−"
                                                onClick={() =>
                                                    updateItem(section, item, item.count - 1)
                                                }
                                            >
                                                <Minus style={{ width: 14, height: 14, strokeWidth: 2.5 }} />
                                            </button>
                                            <NumericCountInput
                                                value={item.count}
                                                onCommit={(value) =>
                                                    updateItem(section, item, value)
                                                }
                                                disabled={false}
                                                ariaLabel={`Počet balení zvlášť pre ${item.keyName}`}
                                            />
                                            <button
                                                className="plus"
                                                disabled={item.count >= item.orderedCount}
                                                aria-label="+"
                                                onClick={() =>
                                                    updateItem(section, item, item.count + 1)
                                                }
                                            >
                                                <Plus style={{ width: 14, height: 14, strokeWidth: 2.5 }} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))
                    )}
                </div>

                <div className="zp-sheet-foot">
                    <button className="zp-btn zp-btn--primary zp-btn--block zp-btn--lg" onClick={onClose}>
                        <Check style={{ width: 16, height: 16 }} /> Hotovo
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default PackSeparatelySelector;

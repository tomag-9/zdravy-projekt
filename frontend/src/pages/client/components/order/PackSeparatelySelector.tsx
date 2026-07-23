import { createPortal } from 'react-dom';
import { X, Check, Minus, Plus } from 'lucide-react';
import { useScrollLock } from '../../../../hooks/useScrollLock';
import NumericCountInput from './NumericCountInput';

// 'fullDay' je celodenná objednávka — drží dáta mimo currentOrder, ale UI je rovnaké.
type MealKey = 'breakfast' | 'lunch' | 'olovrant' | 'fullDay';

interface PackSeparatelySectionItem {
    category: string;
    kind: 'menus' | 'diets';
    keyName: string;
    orderedCount: number;
    count: number;
}

interface PackSeparatelySection {
    meal: MealKey;
    mealLabel: string;
    items: PackSeparatelySectionItem[];
}

interface PackSeparatelySelectorProps {
    isOpen: boolean;
    onClose: () => void;
    sections: PackSeparatelySection[];
    onUpdatePackSeparately: (
        meal: MealKey,
        category: string,
        kind: 'menus' | 'diets',
        key: string,
        count: number
    ) => void;
}

const PackSeparatelySelector = ({
    isOpen,
    onClose,
    sections,
    onUpdatePackSeparately
}: PackSeparatelySelectorProps) => {
    useScrollLock(isOpen);
    if (!isOpen) return null;

    return createPortal(
        <div className="zp-sheet-scrim" onClick={onClose}>
            <div className="zp-sheet" onClick={(e) => e.stopPropagation()}>
                <div className="zp-sheet-grab"></div>
                <div className="zp-sheet-head">
                    <div>
                        <h3>Pridať výnimku</h3>
                        <p className="sub">Vyberte už objednané položky, ktoré sa majú baliť zvlášť.</p>
                    </div>
                    <button className="zp-sheet-close" aria-label="Zavrieť" onClick={onClose}>
                        <X style={{ width: 16, height: 16, strokeWidth: 2 }} />
                    </button>
                </div>

                <div className="zp-sheet-body">
                    {sections.length === 0 ? (
                        <div className="zp-empty" style={{ margin: '16px 0' }}>
                            <p>Nemáte žiadne objednané položky.</p>
                            <p style={{ fontSize: 12, marginTop: 4 }}>Najprv pridajte porcie alebo diéty.</p>
                        </div>
                    ) : (
                        sections.map((section) => (
                            <div key={section.meal} style={{ marginBottom: 16 }}>
                                {sections.length > 1 && (
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
                                                Objednané: {item.orderedCount}
                                            </div>
                                        </div>
                                        <div className="zp-counter">
                                            <button
                                                disabled={item.count <= 0}
                                                aria-label="−"
                                                onClick={() =>
                                                    onUpdatePackSeparately(section.meal, item.category, item.kind, item.keyName, item.count - 1)
                                                }
                                            >
                                                <Minus style={{ width: 14, height: 14, strokeWidth: 2.5 }} />
                                            </button>
                                            <NumericCountInput
                                                value={item.count}
                                                onCommit={(value) =>
                                                    onUpdatePackSeparately(section.meal, item.category, item.kind, item.keyName, value)
                                                }
                                                disabled={false}
                                                ariaLabel={`Počet balení zvlášť pre ${item.keyName}`}
                                            />
                                            <button
                                                className="plus"
                                                disabled={item.count >= item.orderedCount}
                                                aria-label="+"
                                                onClick={() =>
                                                    onUpdatePackSeparately(section.meal, item.category, item.kind, item.keyName, item.count + 1)
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

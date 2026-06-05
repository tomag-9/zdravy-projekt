import { X, Check, Minus, Plus } from 'lucide-react';
import { useScrollLock } from '../../../../hooks/useScrollLock';

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
    useScrollLock(isOpen);
    if (!isOpen) return null;

    const currentDietSum = Object.values(diets || {}).reduce((a: number, b: number) => a + b, 0);
    const remaining = maxPortions - currentDietSum;

    return (
        <div className="zp-sheet-scrim" onClick={onClose}>
            <div className="zp-sheet" onClick={(e) => e.stopPropagation()}>
                <div className="zp-sheet-grab"></div>
                <div className="zp-sheet-head">
                    <div>
                        <h3>Diéty · {categoryLabel}</h3>
                        <p className="sub">
                            Dostupné: <span className="num">{remaining}</span> z {maxPortions} porcií Menu A
                        </p>
                    </div>
                    <button className="zp-sheet-close" aria-label="Zavrieť" onClick={onClose}>
                        <X style={{ width: 16, height: 16, strokeWidth: 2 }} />
                    </button>
                </div>

                <div className="zp-sheet-body">
                    {enabledDiets.length === 0 ? (
                        <div className="zp-empty" style={{ margin: "16px 0" }}>
                            <p>Žiadne povolené diéty.</p>
                            <p style={{ fontSize: 12, marginTop: 4 }}>Prejdite do nastavení pre zapnutie.</p>
                        </div>
                    ) : (
                        enabledDiets.map(diet => {
                            const count = diets?.[diet] || 0;
                            return (
                                <div key={diet} className={`zp-diet-row${count > 0 ? " active" : ""}`}>
                                    <div>
                                        <span className="zp-diet-label">{diet}</span>
                                    </div>
                                    <div className="zp-counter">
                                        <button
                                            disabled={count <= 0}
                                            aria-label="−"
                                            onClick={() => onUpdateDiet(diet, count - 1)}
                                        >
                                            <Minus style={{ width: 14, height: 14, strokeWidth: 2.5 }} />
                                        </button>
                                        <span className={`count${count <= 0 ? " zero" : ""}`}>{count}</span>
                                        <button
                                            className="plus"
                                            disabled={remaining <= 0}
                                            aria-label="+"
                                            onClick={() => onUpdateDiet(diet, count + 1)}
                                        >
                                            <Plus style={{ width: 14, height: 14, strokeWidth: 2.5 }} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="zp-sheet-foot">
                    <button className="zp-btn zp-btn--primary zp-btn--block zp-btn--lg" onClick={onClose}>
                        <Check style={{ width: 16, height: 16 }} /> Hotovo
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DietSelector;

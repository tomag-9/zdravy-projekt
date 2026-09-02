import { createPortal } from 'react-dom';
import { X, Check, Minus, Plus } from 'lucide-react';
import { useScrollLock } from '../../../../hooks/useScrollLock';
import NumericCountInput from './NumericCountInput';

interface DietSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    categoryLabel: string;
    diets: Record<string, number>;
    enabledDiets: string[];
    onUpdateDiet: (diet: string, count: number) => void;
}

const DietSelector = ({
    isOpen,
    onClose,
    categoryLabel,
    diets,
    enabledDiets,
    onUpdateDiet,
}: DietSelectorProps) => {
    useScrollLock(isOpen);
    if (!isOpen) return null;

    // Diéty sa pripočítavajú k Menu A, takže tu nie je žiadny strop.
    const currentDietSum = Object.values(diets || {}).reduce((a: number, b: number) => a + b, 0);

    // Objednávka môže obsahovať diétu, ktorá už nie je v `enabledDiets` — napr.
    // admin ju medzičasom vypol pre prevádzku/kategóriu, kategória obmedzuje
    // dostupné diéty (Vegetariánske pri menu V), alebo ju takto priniesol
    // EduPage scrape (`allowed_diet_names()` v edupage_scraper.py rieši
    // globálne aktívne diéty, nie visible_diets tejto konkrétnej prevádzky).
    // Bez tohto doplnenia by sa jej riadok vôbec nevykreslil a nedalo by sa
    // s ňou v modáli pracovať (ani ju vynulovať).
    const orderedDietsNotEnabled = Object.entries(diets || {})
        .filter(([diet, count]) => count > 0 && !enabledDiets.includes(diet))
        .map(([diet]) => diet);
    const visibleDiets = [...enabledDiets, ...orderedDietsNotEnabled];

    return createPortal(
        <div className="zp-sheet-scrim" onClick={onClose}>
            <div className="zp-sheet" onClick={(e) => e.stopPropagation()}>
                <div className="zp-sheet-grab"></div>
                <div className="zp-sheet-head">
                    <div>
                        <h3>Diéty · {categoryLabel}</h3>
                        <p className="sub">
                            Spolu diét: <span className="num">{currentDietSum}</span>
                        </p>
                    </div>
                    <button className="zp-sheet-close" aria-label="Zavrieť" onClick={onClose}>
                        <X style={{ width: 16, height: 16, strokeWidth: 2 }} />
                    </button>
                </div>

                <div className="zp-sheet-body">
                    {visibleDiets.length === 0 ? (
                        <div className="zp-empty" style={{ margin: "16px 0" }}>
                            <p>Žiadne povolené diéty.</p>
                            <p style={{ fontSize: 12, marginTop: 4 }}>Prejdite do nastavení pre zapnutie.</p>
                        </div>
                    ) : (
                        visibleDiets.map(diet => {
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
                                        <NumericCountInput
                                            value={count}
                                            onCommit={(value) => onUpdateDiet(diet, value)}
                                            disabled={false}
                                            ariaLabel={`Počet diéty ${diet}`}
                                        />
                                        <button
                                            className="plus"
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
    , document.body);
};

export default DietSelector;

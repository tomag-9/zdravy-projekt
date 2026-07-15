/* global React */
const { ArrowLeft: OArrowLeft, ChevronLeft: OChevronLeft, ChevronRight: OChevronRight,
        Coffee: OCoffee, Utensils: OUtensils, Apple: OApple, Calendar: OCalendar,
        Copy: OCopy, Trash: OTrash, FileCheck: OFileCheck, Lock: OLock, Eraser: OEraser,
        Plus: OPlus, Minus: OMinus, Sparkles: OSparkles, X: OX, Check: OCheck } = window.ZpIcons;

/* ============================================================
 * OrderScreen — connected. Submit → success screen → home.
 *
 * Adds:
 *  - Top context strip "Na {datum} máte objednané N porcií"
 *  - Footer thank-you note "Ďakujeme za Vašu objednávku"
 *  - Real diet sheet open/close
 *  - Submit handler
 * ============================================================ */

function Counter({ value, onChange, max = 99, plusActive = true }) {
    return (
        <div className="zp-counter">
            <button
                disabled={value <= 0}
                aria-label="−"
                onClick={() => onChange && onChange(Math.max(0, value - 1))}
            >
                <OMinus w={14} sw={2.5} />
            </button>
            <span className={"count" + (value <= 0 ? " zero" : "")}>{value}</span>
            <button
                className="plus"
                disabled={!plusActive || value >= max}
                aria-label="+"
                onClick={() => onChange && onChange(Math.min(max, value + 1))}
            >
                <OPlus w={14} sw={2.5} />
            </button>
        </div>
    );
}

function MenuRow({ name, value, onChange, withDiets, dietCount = 0, onOpenDiets }) {
    return (
        <div className="zp-menurow">
            <span className="name">Menu {name}</span>
            {withDiets && (
                <button className="diet-trigger" onClick={onOpenDiets}>
                    <OUtensils w={10} sw={2.5} />
                    {dietCount > 0 ? `${dietCount} diét` : "Diéty"}
                </button>
            )}
            <span className="spacer"></span>
            <Counter value={value} onChange={onChange} />
        </div>
    );
}

function OrderScreen({ navigate, params }) {
    const day = (params && params.day) || "streda, 28. mája";
    const isToday = !!(params && params.today);

    // Local mutable counts
    const [counts, setCounts] = React.useState({
        bA: 8,            // breakfast (one row)
        ms_A: 8, ms_B: 3, ms_V: 1,
        zam_A: 4, zam_B: 0,
    });
    const [dietCount, setDietCount] = React.useState(2);   // 2 diets on Menu A (MŠ)
    const [breakfastOn, setBreakfastOn] = React.useState(true);
    const [obedOn, setObedOn] = React.useState(true);
    const [sheetOpen, setSheetOpen] = React.useState(false);
    const [diets, setDiets] = React.useState({ vege: 1, nomilk: 1, nogluten: 0, nomilknogluten: 0, nono: 0 });

    const total =
        (breakfastOn ? counts.bA : 0) +
        (obedOn ? counts.ms_A + counts.ms_B + counts.ms_V + counts.zam_A + counts.zam_B : 0);

    const sumDiets = Object.values(diets).reduce((a, b) => a + b, 0);

    function submit() {
        navigate("success", { day, total, dietCount: sumDiets || dietCount });
    }

    return (
        <div className="zp-app">
            <div className="zp-orderpage">
                {/* Top bar */}
                <div className="zp-orderbar">
                    <button className="zp-iconbtn" aria-label="Späť" onClick={() => navigate("home")}>
                        <OArrowLeft w={18} sw={2} />
                    </button>
                    <div>
                        <h1>Objednávka</h1>
                        <p>{isToday ? "Detail dnešnej objednávky" : "Príprava na vybraný deň"}</p>
                    </div>
                </div>

                {/* Top context strip (P0 UI) */}
                <div className="zp-order-context">
                    <span className="ic"><OCalendar /></span>
                    <div className="body">
                        <div className="l">Na {day}</div>
                        <div className="v">máte objednané <span style={{ color: "var(--green-700)" }}>{total}</span> porcií</div>
                    </div>
                </div>

                {/* Day selector */}
                <div className="zp-daysel">
                    <button className="zp-daysel-nav" aria-label="Predchádzajúci deň"><OChevronLeft /></button>
                    <div className="zp-daysel-mid">
                        <span className="eye">Dátum objednávky</span>
                        <h3>{day}</h3>
                    </div>
                    <button className="zp-daysel-nav" aria-label="Ďalší deň"><OChevronRight /></button>
                </div>

                {/* Raňajky */}
                <div className={"zp-meal" + (breakfastOn ? " zp-meal--active" : "")}>
                    <div className="zp-meal-head">
                        <div className="zp-meal-icon"><OCoffee /></div>
                        <div className="zp-meal-title">
                            Raňajky
                            <span className="zp-meal-sub">{breakfastOn ? `${counts.bA} porcií` : "Vypnuté"} · termín 7:30</span>
                        </div>
                        <div
                            className={"zp-switch" + (breakfastOn ? " zp-switch--on" : "")}
                            role="switch"
                            aria-checked={breakfastOn}
                            onClick={() => setBreakfastOn(!breakfastOn)}
                        ></div>
                    </div>
                    {breakfastOn && (
                        <div className="zp-meal-body">
                            <div className="zp-cat">
                                <div className="zp-cat-head">Materská škola</div>
                                <MenuRow
                                    name="A"
                                    value={counts.bA}
                                    onChange={(v) => setCounts({ ...counts, bA: v })}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Obed */}
                <div className={"zp-meal" + (obedOn ? " zp-meal--active" : "")}>
                    <div className="zp-meal-head">
                        <div className="zp-meal-icon"><OUtensils /></div>
                        <div className="zp-meal-title">
                            Obed
                            <span className="zp-meal-sub">
                                {obedOn ? `${counts.ms_A + counts.ms_B + counts.ms_V + counts.zam_A + counts.zam_B} porcií` : "Vypnuté"} · termín 10:00
                            </span>
                        </div>
                        <div
                            className={"zp-switch" + (obedOn ? " zp-switch--on" : "")}
                            role="switch"
                            aria-checked={obedOn}
                            onClick={() => setObedOn(!obedOn)}
                        ></div>
                    </div>
                    {obedOn && (
                        <div className="zp-meal-body">
                            <div className="zp-copybar">
                                <button className="zp-btn zp-btn--secondary zp-btn--sm" style={{ flex: 1 }}>
                                    <OCopy w={12} /> Kopírovať z včerajška
                                </button>
                                <button
                                    className="zp-btn zp-btn--danger zp-btn--sm"
                                    onClick={() => setCounts({ ...counts, ms_A: 0, ms_B: 0, ms_V: 0, zam_A: 0, zam_B: 0 })}
                                >
                                    <OTrash w={12} /> Vymazať
                                </button>
                            </div>

                            <div className="zp-cat">
                                <div className="zp-cat-head">Materská škola · 3–6 rokov</div>
                                <MenuRow
                                    name="A"
                                    value={counts.ms_A}
                                    onChange={(v) => setCounts({ ...counts, ms_A: v })}
                                    withDiets
                                    dietCount={sumDiets || dietCount}
                                    onOpenDiets={() => setSheetOpen(true)}
                                />
                                <MenuRow name="B" value={counts.ms_B} onChange={(v) => setCounts({ ...counts, ms_B: v })} />
                                <MenuRow name="V" value={counts.ms_V} onChange={(v) => setCounts({ ...counts, ms_V: v })} />
                            </div>

                            <div className="zp-cat">
                                <div className="zp-cat-head">Zamestnanci</div>
                                <MenuRow name="A" value={counts.zam_A} onChange={(v) => setCounts({ ...counts, zam_A: v })} />
                                <MenuRow name="B" value={counts.zam_B} onChange={(v) => setCounts({ ...counts, zam_B: v })} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Olovrant — locked */}
                <div className="zp-meal zp-meal--locked">
                    <div className="zp-meal-head">
                        <div className="zp-meal-icon"><OApple /></div>
                        <div className="zp-meal-title">
                            Olovrant
                            <span className="zp-meal-sub">Termín uplynul o 9:00</span>
                        </div>
                        <div className="zp-switch" role="switch" aria-checked="false" style={{ opacity: 0.6 }}></div>
                    </div>
                    <div className="zp-banner zp-banner--locked" style={{ marginBottom: 16 }}>
                        <OLock /> Termín uplynul · Objednávka uzavretá
                    </div>
                </div>

                {/* Summary */}
                <div className="zp-summary">
                    <h3><OFileCheck /> Rýchle zhrnutie</h3>
                    <div className="zp-summary-row"><span className="l">Dátum</span><span className="r" style={{ textTransform: "capitalize" }}>{day}</span></div>
                    <div className="zp-summary-row"><span className="l">Raňajky</span><span className="r">{breakfastOn ? counts.bA : "—"}</span></div>
                    <div className="zp-summary-row"><span className="l">Obedy</span><span className="r">
                        {obedOn ? counts.ms_A + counts.ms_B + counts.ms_V + counts.zam_A + counts.zam_B : "—"}
                        {(sumDiets || dietCount) > 0 && <small>({sumDiets || dietCount} diéty)</small>}
                    </span></div>
                    <div className="zp-summary-row"><span className="l">Olovranty</span><span className="r" style={{ color: "var(--ink-mute)" }}>—</span></div>

                    <div className="zp-summary-total">
                        <span className="l">Spolu porcií</span>
                        <span className="r">{total}<small>ks</small></span>
                    </div>

                    <button className="zp-btn zp-btn--primary zp-btn--block zp-btn--lg" onClick={submit}>
                        Odoslať objednávku
                    </button>
                    <button className="zp-btn zp-btn--danger zp-btn--block" style={{ marginTop: 8 }}>
                        <OEraser w={14} /> Vynulovať objednávku
                    </button>
                </div>

                {/* Thank-you footer (P0 UI) */}
                <p className="zp-thanks">
                    Ďakujeme za Vašu objednávku
                    <small>Posielame ju priamo do našej kuchyne. Janka & Vlado</small>
                </p>
            </div>

            {/* Diet bottom-sheet */}
            {sheetOpen && (
                <div className="zp-sheet-scrim" onClick={() => setSheetOpen(false)}>
                    <div className="zp-sheet" onClick={(e) => e.stopPropagation()}>
                        <div className="zp-sheet-grab"></div>
                        <div className="zp-sheet-head">
                            <div>
                                <h3>Diéty · Materská škola</h3>
                                <p className="sub">
                                    Dostupné: <span className="num">{Math.max(0, counts.ms_A - sumDiets)}</span> z {counts.ms_A} porcií Menu A
                                </p>
                            </div>
                            <button className="zp-sheet-close" aria-label="Zavrieť" onClick={() => setSheetOpen(false)}>
                                <OX />
                            </button>
                        </div>
                        <div className="zp-sheet-body">
                            {[
                                { k: "vege", l: "VEGE", s: "Vegetariánska" },
                                { k: "nomilk", l: "NO MILK", s: "Bez mliečnych výrobkov" },
                                { k: "nogluten", l: "NO GLUTEN", s: "Bezlepková" },
                                { k: "nomilknogluten", l: "NO MILK / NO GLUTEN", s: "Bez mlieka a lepku" },
                                { k: "nono", l: "NONONO", s: "Bez mlieka, lepku a vajec" },
                            ].map((d) => (
                                <div key={d.k} className={"zp-diet-row" + (diets[d.k] > 0 ? " active" : "")}>
                                    <div>
                                        <span className="zp-diet-label">{d.l}</span>
                                        <span className="sublabel">{d.s}</span>
                                    </div>
                                    <Counter
                                        value={diets[d.k]}
                                        onChange={(v) => setDiets({ ...diets, [d.k]: v })}
                                        max={counts.ms_A}
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="zp-sheet-foot">
                            <button className="zp-btn zp-btn--primary zp-btn--block zp-btn--lg" onClick={() => setSheetOpen(false)}>
                                <OCheck w={16} /> Hotovo
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
window.OrderScreen = OrderScreen;

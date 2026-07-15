/* global React */
const { Check: SPCheck, Home: SPHome, Calendar: SPCal } = window.ZpIcons;

/* ============================================================
 * SuccessPC — confirmation, desktop centered.
 * ============================================================ */
function SuccessPC({ navigate, params }) {
    const day = (params && params.day) || "streda, 28. mája";
    const total = (params && params.total) || 0;
    const dietCount = (params && params.dietCount) || 0;

    const [remaining, setRemaining] = React.useState(4);
    React.useEffect(() => {
        if (remaining <= 0) { navigate("home"); return; }
        const t = setTimeout(() => setRemaining(remaining - 1), 1000);
        return () => clearTimeout(t);
    }, [remaining]);

    return (
        <div className="pc-success" data-screen-label="Objednávka odoslaná">
            <div className="badge"><SPCheck /></div>
            <h2>Objednávka odoslaná</h2>
            <p>Ďakujeme za Vašu objednávku. Pripravíme ju presne tak, ako ste si želali.</p>

            <div className="receipt">
                <div className="when">{day}</div>
                <div className="chips">
                    <span className="zp-mchip zp-mchip--lunch">{total} porcií</span>
                    {dietCount > 0 && <span className="zp-mchip zp-mchip--olovrant">{dietCount} diéty</span>}
                </div>
            </div>

            <div className="pc-success-actions">
                <button className="zp-btn zp-btn--primary zp-btn--lg" onClick={() => navigate("home")}>
                    <SPHome w={16} /> Späť na domov ({remaining}s)
                </button>
                <button className="zp-btn zp-btn--secondary zp-btn--lg" onClick={() => { setRemaining(999); navigate("order", { day }); }}>
                    <SPCal w={16} /> Zobraziť objednávku
                </button>
            </div>
        </div>
    );
}
window.SuccessPC = SuccessPC;

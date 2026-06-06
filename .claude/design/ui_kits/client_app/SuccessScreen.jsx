/* global React */
const { Check: SCheck, Home: SHome, Calendar: SCalendar } = window.ZpIcons;

/* ============================================================
 * SuccessScreen — confirmation after order submission.
 * ============================================================ */
function SuccessScreen({ navigate, params }) {
    const day = (params && params.day) || "streda, 28. mája";
    const total = (params && params.total) || 0;
    const dietCount = (params && params.dietCount) || 0;

    const [remaining, setRemaining] = React.useState(3);

    React.useEffect(() => {
        if (remaining <= 0) {
            navigate("home");
            return;
        }
        const t = setTimeout(() => setRemaining(remaining - 1), 1000);
        return () => clearTimeout(t);
    }, [remaining]);

    return (
        <div className="zp-app" style={{ height: "100%" }}>
            <div className="zp-success" style={{ height: "100%" }}>
                <div className="badge"><SCheck /></div>
                <h2>Objednávka odoslaná</h2>
                <p>Ďakujeme za Vašu objednávku. Pripravíme ju presne tak, ako ste si želali.</p>

                <div className="receipt">
                    <div className="when">{day}</div>
                    <div className="chips">
                        <span className="zp-mchip zp-mchip--lunch">{total} porcií</span>
                        {dietCount > 0 && <span className="zp-mchip zp-mchip--olovrant">{dietCount} diéty</span>}
                    </div>
                </div>

                <div className="zp-success-actions">
                    <button className="zp-btn zp-btn--primary zp-btn--block zp-btn--lg" onClick={() => navigate("home")}>
                        <SHome w={16} /> Späť na domov ({remaining}s)
                    </button>
                    <button
                        className="zp-btn zp-btn--ghost zp-btn--block"
                        onClick={() => { setRemaining(999); navigate("order", { day }); }}
                    >
                        <SCalendar w={16} /> Zobraziť objednávku
                    </button>
                </div>
            </div>
        </div>
    );
}
window.SuccessScreen = SuccessScreen;

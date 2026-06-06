// Partners.jsx — partner logo wall
const PARTNERS = [
    "yeme", "dobrozrut", "sladucké ovocie", "zelený klatov",
    "poverlogy", "microgreens", "kvaskové", "pavlické stejky",
    "dream farm", "chuť od Naty", "cucoriedkovo", "buslák oil",
];

const Partners = () => (
    <section id="partners" style={{
        padding: "80px 48px",
        background: "var(--bg-cream-warm)",
    }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 64, alignItems: "flex-start", marginBottom: 56 }}>
                <div>
                    <div style={{
                        fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 600,
                        color: "var(--green-600)", letterSpacing: "0.18em", textTransform: "uppercase",
                        marginBottom: 12,
                    }}>Spolupracujeme s</div>
                    <h2 style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 700,
                        fontSize: "clamp(28px, 3vw, 40px)",
                        color: "var(--green-900)",
                        margin: 0,
                        lineHeight: 1.1,
                    }}>Naši partneri</h2>
                </div>
                <p style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 17, lineHeight: 1.7,
                    color: "var(--ink-2)", margin: 0,
                    maxWidth: "60ch",
                }}>Záleží nám na tom, aby jedlo, ktoré varíme, aj torty, ktoré pečieme, boli chutné a zdravé — preto si vyberáme len tie najkvalitnejšie suroviny. Veríme, že zdravé jedlo vzniká aj vďaka dobrým vzťahom, a preto si s našimi dodávateľmi budujeme spoluprácu založenú na dôvere.</p>
            </div>

            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(6, 1fr)",
                gap: 14,
            }}>
                {PARTNERS.map(p => (
                    <div key={p} style={{
                        background: "var(--bg-cream)",
                        borderRadius: 18,
                        padding: 22,
                        aspectRatio: "1.4 / 1",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "var(--font-display)",
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--green-700)",
                        textAlign: "center",
                        boxShadow: "var(--shadow-xs)",
                        filter: "grayscale(0.4)",
                        opacity: 0.85,
                        transition: "all 200ms ease",
                        cursor: "default",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.filter = "grayscale(0)"; e.currentTarget.style.opacity = "1"; }}
                    onMouseLeave={e => { e.currentTarget.style.filter = "grayscale(0.4)"; e.currentTarget.style.opacity = "0.85"; }}
                    >{p}</div>
                ))}
            </div>
        </div>
    </section>
);

Object.assign(window, { Partners });

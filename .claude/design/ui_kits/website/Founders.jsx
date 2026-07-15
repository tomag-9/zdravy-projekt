// Founders.jsx — Janka & Vlado quotes
const Founders = () => {
    const founders = [
        {
            name: "Janka",
            role: "spoluzakladateľka · šéfkuchárka",
            initial: "J",
            bg: "var(--peach-400)",
            quote: "Chceme, aby deťom chutilo zdravé jedlo a vytvorili si pozitívny vzťah ku pestrej, sezónnej a lokálnej strave.",
        },
        {
            name: "Vlado",
            role: "spoluzakladateľ · prevádzka",
            initial: "V",
            bg: "var(--green-400)",
            quote: "Staráme sa o zdravé brušká vašich detí. Deti majú v našich jedlách každý deň dostatok čerstvej zeleniny a ovocia.",
        },
    ];
    return (
        <section id="founders" style={{
            padding: "100px 48px",
            maxWidth: 1280,
            margin: "0 auto",
        }}>
            <div style={{ textAlign: "center", marginBottom: 64 }}>
                <div style={{
                    fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 600,
                    color: "var(--green-600)", letterSpacing: "0.18em", textTransform: "uppercase",
                    marginBottom: 12,
                }}>O zakladateľoch</div>
                <h2 style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: "clamp(32px, 3.6vw, 48px)",
                    color: "var(--green-900)",
                    margin: 0,
                }}>Dva hlasy, jedna kuchyňa.</h2>
            </div>
            <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 32,
            }}>
                {founders.map(f => (
                    <figure key={f.name} style={{
                        margin: 0,
                        background: "var(--bg-cream-warm)",
                        borderRadius: 32,
                        padding: 40,
                        display: "flex",
                        gap: 24,
                        boxShadow: "var(--shadow-sm)",
                    }}>
                        <div style={{
                            width: 88, height: 88, borderRadius: "50%",
                            background: f.bg, flexShrink: 0,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontFamily: "var(--font-display)",
                            fontWeight: 700, fontSize: 40, color: "var(--green-900)",
                        }}>{f.initial}</div>
                        <div>
                            <blockquote style={{
                                margin: 0,
                                fontFamily: "var(--font-sans)",
                                fontSize: 18,
                                lineHeight: 1.5,
                                color: "var(--green-800)",
                                fontStyle: "italic",
                                borderLeft: "3px solid var(--peach-500)",
                                paddingLeft: 20,
                            }}>„{f.quote}"</blockquote>
                            <figcaption style={{
                                marginTop: 16,
                                paddingLeft: 23,
                                fontFamily: "var(--font-display)",
                                fontSize: 14, fontWeight: 700,
                                color: "var(--green-700)",
                                letterSpacing: "0.08em",
                                textTransform: "uppercase",
                            }}>{f.name} <span style={{ color: "var(--ink-3)", fontWeight: 500, letterSpacing: "0.04em", textTransform: "none", fontFamily: "var(--font-sans)", fontStyle: "italic" }}>· {f.role}</span></figcaption>
                        </div>
                    </figure>
                ))}
            </div>
        </section>
    );
};

Object.assign(window, { Founders });

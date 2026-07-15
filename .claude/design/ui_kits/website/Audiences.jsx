// Audiences.jsx — "Pre koho je Zdravý projekt?"
const Audiences = () => {
    const cards = [
        {
            badge: "B2B",
            title: "Škôlky a detské zariadenia",
            body: "Zabezpečujeme kompletné denné stravovanie — desiatu, obed aj olovrant. Jedlá pripravujeme tak, aby spĺňali nutričné potreby detí v rôznom veku.",
            cta: "Objednávka pre škôlky",
            accent: "var(--peach-400)",
            tint: "var(--bg-cream-warm)",
        },
        {
            badge: "D2C",
            title: "Rodiny a jednotlivci",
            body: "Ponúkame zdravé obedy, hotové jedlá a špeciálne diétne riešenia, ktoré šetria čas a zároveň podporujú zdravie celej rodiny.",
            cta: "Objednávky pre domácnosti",
            accent: "var(--green-400)",
            tint: "var(--bg-cream-soft)",
        },
    ];
    return (
        <section id="audiences" style={{
            padding: "80px 48px",
            maxWidth: 1280,
            margin: "0 auto",
        }}>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
                <div style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--green-600)",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    marginBottom: 12,
                }}>Pre koho varíme</div>
                <h2 style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: "clamp(32px, 4vw, 56px)",
                    color: "var(--green-900)",
                    margin: 0,
                    textWrap: "balance",
                }}>Pre koho je Zdravý projekt?</h2>
            </div>
            <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 24,
            }}>
                {cards.map((c, i) => (
                    <div key={i} style={{
                        background: c.tint,
                        borderRadius: 32,
                        padding: 40,
                        boxShadow: "var(--shadow-sm)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 20,
                        position: "relative",
                        overflow: "hidden",
                    }}>
                        <div style={{
                            position: "absolute",
                            top: -40, right: -40,
                            width: 180, height: 180,
                            background: c.accent,
                            borderRadius: "50%",
                            opacity: 0.5,
                        }}></div>
                        <div style={{
                            fontFamily: "var(--font-display)",
                            fontSize: 11,
                            fontWeight: 700,
                            color: "var(--green-700)",
                            letterSpacing: "0.18em",
                            textTransform: "uppercase",
                            background: "var(--bg-cream)",
                            display: "inline-block",
                            padding: "6px 12px",
                            borderRadius: 999,
                            alignSelf: "flex-start",
                            position: "relative",
                        }}>{c.badge}</div>
                        <h3 style={{
                            fontFamily: "var(--font-display)",
                            fontWeight: 700,
                            fontSize: 36,
                            lineHeight: 1.1,
                            color: "var(--green-900)",
                            margin: 0,
                            position: "relative",
                            maxWidth: "16ch",
                        }}>{c.title}</h3>
                        <p style={{
                            fontFamily: "var(--font-sans)",
                            fontSize: 16,
                            lineHeight: 1.6,
                            color: "var(--ink-2)",
                            margin: 0,
                            position: "relative",
                        }}>{c.body}</p>
                        <a href="#" style={{
                            fontFamily: "var(--font-display)",
                            fontSize: 14,
                            fontWeight: 600,
                            color: "var(--green-700)",
                            textDecoration: "underline",
                            textDecorationColor: "var(--peach-500)",
                            textDecorationThickness: 2,
                            textUnderlineOffset: 4,
                            position: "relative",
                            alignSelf: "flex-start",
                        }}>{c.cta} →</a>
                    </div>
                ))}
            </div>
        </section>
    );
};

Object.assign(window, { Audiences });

// DietPicker.jsx — 7 diet chips with a preview pane
const DIETS = [
    { id: "KLASIK", color: "var(--green-600)", fg: "#fff", note: "Klasické vyvážené menu — pestré, sezónne a chutné jedlá pre väčšinu detí." },
    { id: "VEGE", color: "var(--green-400)", fg: "var(--green-900)", note: "Vegetariánske varianty — bez mäsa, plné rastlinných bielkovín, strukovín a obilnín." },
    { id: "NO MILK", color: "var(--peach-400)", fg: "var(--green-900)", note: "Bez mliečnych výrobkov — pre deti s laktózovou intoleranciou alebo alergiou." },
    { id: "NO MILK / NO GLUTEN", color: "var(--honey-400)", fg: "var(--green-900)", note: "Dvojnásobne čisté: bez mlieka a bez lepku — pre deti s kombinovanou diétou." },
    { id: "NO GLUTEN", color: "var(--orange-500)", fg: "#fff", note: "Bezlepkové menu pripravené v oddelenom režime, aby sme úplne predišli kontaminácii." },
    { id: "NONONO", color: "var(--coral-600)", fg: "#fff", note: "Bez mlieka, bez lepku, bez vajec — najprísnejšia diéta v ponuke." },
    { id: "MONTE", color: "var(--teal-500)", fg: "#fff", note: "Špeciálne menu pre Montessori škôlky — pestrá, sezónna strava s dôrazom na samostatnosť detí." },
];

const DietPicker = () => {
    const [active, setActive] = React.useState(0);
    const a = DIETS[active];
    return (
        <section id="diets" style={{
            padding: "80px 48px",
            background: "var(--bg-cream-soft)",
        }}>
            <div style={{ maxWidth: 1280, margin: "0 auto" }}>
                <div style={{ textAlign: "center", marginBottom: 48, maxWidth: 720, margin: "0 auto 48px" }}>
                    <div style={{
                        fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 600,
                        color: "var(--green-600)", letterSpacing: "0.18em", textTransform: "uppercase",
                        marginBottom: 12,
                    }}>Diéty pre škôlky</div>
                    <h2 style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 700,
                        fontSize: "clamp(28px, 3.2vw, 44px)",
                        color: "var(--green-900)",
                        margin: 0,
                        textWrap: "balance",
                        lineHeight: 1.15,
                    }}>Ponúkame viacero typov diét pre škôlky, aby každé dieťa dostalo stravu prispôsobenú jeho potrebám.</h2>
                </div>

                <div style={{
                    display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center",
                    marginBottom: 40,
                }}>
                    {DIETS.map((d, i) => {
                        const isActive = i === active;
                        return (
                            <button key={d.id} onClick={() => setActive(i)} style={{
                                background: isActive ? d.color : "var(--bg-cream)",
                                color: isActive ? d.fg : "var(--green-800)",
                                border: "none",
                                borderRadius: 999,
                                padding: "10px 20px",
                                fontFamily: "var(--font-display)",
                                fontWeight: 700,
                                fontSize: 13,
                                letterSpacing: "0.08em",
                                cursor: "pointer",
                                boxShadow: isActive ? "var(--shadow-sm)" : "none",
                                transform: isActive ? "scale(1.04)" : "scale(1)",
                                transition: "all 200ms ease",
                            }}>{d.id}</button>
                        );
                    })}
                </div>

                <div style={{
                    background: "var(--bg-cream-warm)",
                    borderRadius: 32,
                    padding: 40,
                    boxShadow: "var(--shadow-md)",
                    display: "grid",
                    gridTemplateColumns: "1fr 1.4fr",
                    gap: 40,
                    alignItems: "center",
                }}>
                    <div>
                        <div style={{
                            display: "inline-block",
                            background: a.color, color: a.fg,
                            padding: "10px 24px", borderRadius: 999,
                            fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16,
                            letterSpacing: "0.08em", marginBottom: 20,
                        }}>{a.id}</div>
                        <h3 style={{
                            fontFamily: "var(--font-display)",
                            fontWeight: 700,
                            fontSize: 30,
                            color: "var(--green-900)",
                            margin: "0 0 16px",
                            lineHeight: 1.2,
                        }}>5-týždňový plán</h3>
                        <p style={{
                            fontFamily: "var(--font-sans)",
                            fontSize: 16, lineHeight: 1.6,
                            color: "var(--ink-2)", margin: "0 0 24px",
                        }}>{a.note}</p>
                        <a href="#" style={{
                            fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 600,
                            color: "var(--green-700)", textDecoration: "underline",
                            textDecorationColor: "var(--peach-500)", textDecorationThickness: 2,
                            textUnderlineOffset: 4,
                        }}>Stiahnuť 5-týždňové menu (PDF) →</a>
                    </div>
                    <div style={{
                        background: "var(--bg-cream)",
                        borderRadius: 22,
                        padding: 24,
                        aspectRatio: "16 / 11",
                        display: "grid",
                        gridTemplateColumns: "auto repeat(5, 1fr)",
                        gridTemplateRows: "auto repeat(3, 1fr)",
                        gap: 6,
                        fontFamily: "var(--font-display)",
                        fontSize: 11,
                        color: "var(--green-800)",
                    }}>
                        <div></div>
                        {["Po", "Ut", "St", "Št", "Pi"].map(d => (
                            <div key={d} style={{ textAlign: "center", fontWeight: 700, letterSpacing: "0.06em", paddingBottom: 4 }}>{d}</div>
                        ))}
                        {["Desiata", "Obed", "Olovrant"].map((meal, r) => (
                            <React.Fragment key={meal}>
                                <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-3)", display: "flex", alignItems: "center" }}>{meal}</div>
                                {[0, 1, 2, 3, 4].map(c => (
                                    <div key={c} style={{
                                        background: r === 1 ? a.color : `color-mix(in oklab, ${a.color} ${20 + ((r * 5 + c) % 4) * 8}%, var(--bg-cream-soft))`,
                                        opacity: r === 1 ? 0.92 : 0.7,
                                        borderRadius: 10,
                                        minHeight: 36,
                                    }}></div>
                                ))}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

Object.assign(window, { DietPicker });

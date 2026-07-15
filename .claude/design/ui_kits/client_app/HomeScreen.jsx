/* global React */
const { User: HUser, Settings: HSettings, Plus: HPlus, Calendar: HCalendar,
        CalendarDays: HCalendarDays, Clock: HClock, History: HHistory, Bot: HBot,
        PenLine: HPenLine, XCircle: HXCircle, ChevronRight: HChevronRight,
        Sparkles: HSparkles } = window.ZpIcons;

/* ============================================================
 * HomeScreen — connected to nav context
 *  - disclaimer under hero CTA
 *  - monthly summary card under planned orders
 * ============================================================ */
function HomeScreen({ navigate }) {
    return (
        <div className="zp-app">
            <div className="zp-grain" style={{ minHeight: "100%" }}>
                {/* Top bar */}
                <div className="zp-topbar">
                    <img
                        src="logo-zdravy-projekt.png"
                        alt="Zdravý projekt"
                        style={{ height: 32, width: "auto", display: "block" }}
                    />
                </div>

                {/* Greeting */}
                <div className="zp-greeting">
                    <span className="zp-eyebrow">Utorok · 27. máj</span>
                    <h1>Dobré ráno, Janka.</h1>
                    <p>Tu je váš týždeň v Zdravom projekte.</p>
                </div>

                {/* Hero CTA */}
                <a
                    className="zp-hero-cta"
                    href="#"
                    onClick={(e) => { e.preventDefault(); navigate("order", { day: "streda, 28. mája" }); }}
                >
                    <span className="icon-bubble"><HPlus w={26} /></span>
                    <span className="body">
                        <span className="eye">Pripravte novú</span>
                        <h3>Nová objednávka</h3>
                        <span className="when">streda, 28. mája</span>
                    </span>
                    <span className="chev"><HChevronRight w={22} /></span>
                </a>

                {/* Auto-rollover disclaimer */}
                <p className="zp-disclaimer">
                    Objednávky sa automaticky preklápajú na ďalší deň, pokiaľ ich
                    manuálne neupravíte.
                </p>

                {/* Today */}
                <div className="zp-section">
                    <h2><HClock w={18} /> Dnešná objednávka</h2>
                    <div className="zp-day zp-day--today" onClick={() => navigate("order", { day: "ut, 27. máj", today: true })} role="button">
                        <div className="zp-day-top">
                            <div className="zp-day-left">
                                <div className="zp-day-icon"><HClock /></div>
                                <div className="flex1">
                                    <div className="zp-day-title">
                                        ut, 27. máj
                                        <span className="pill-today">DNES</span>
                                    </div>
                                    <span className="zp-pill zp-pill--deadline"><HClock /> Upraviť do 10:00</span>
                                </div>
                            </div>
                            <div className="zp-day-count">32<small>porcií</small></div>
                        </div>
                        <div className="zp-meal-chips">
                            <span className="zp-mchip zp-mchip--breakfast">Raňajky · 8</span>
                            <span className="zp-mchip zp-mchip--lunch">Obed · 18</span>
                            <span className="zp-mchip zp-mchip--olovrant">Olovrant · 6</span>
                        </div>
                    </div>
                </div>

                {/* Planned */}
                <div className="zp-section">
                    <h2><HCalendarDays w={18} /> Plánované objednávky</h2>

                    <div className="zp-day" onClick={() => navigate("order", { day: "streda, 28. máj" })}>
                        <div className="zp-day-top">
                            <div className="zp-day-left">
                                <div className="zp-day-icon"><HBot /></div>
                                <div className="flex1">
                                    <div className="zp-day-title">streda, 28. máj</div>
                                    <span className="zp-pill zp-pill--auto"><HSparkles w={11} sw={2.2} /> Automatická</span>
                                </div>
                            </div>
                            <div className="zp-day-count">30<small>porcií</small></div>
                        </div>
                        <div className="zp-meal-chips">
                            <span className="zp-mchip zp-mchip--breakfast">Raňajky · 8</span>
                            <span className="zp-mchip zp-mchip--lunch">Obed · 16</span>
                            <span className="zp-mchip zp-mchip--olovrant">Olovrant · 6</span>
                        </div>
                    </div>

                    <div className="zp-day" onClick={() => navigate("order", { day: "štvrtok, 29. máj" })}>
                        <div className="zp-day-top">
                            <div className="zp-day-left">
                                <div className="zp-day-icon"><HPenLine /></div>
                                <div className="flex1">
                                    <div className="zp-day-title">štvrtok, 29. máj</div>
                                    <span className="zp-pill zp-pill--manual"><HPenLine w={11} sw={2.2} /> Manuálna</span>
                                </div>
                            </div>
                            <div className="zp-day-count">28<small>porcií</small></div>
                        </div>
                        <div className="zp-meal-chips">
                            <span className="zp-mchip zp-mchip--lunch">Obed · 22</span>
                            <span className="zp-mchip zp-mchip--olovrant">Olovrant · 6</span>
                        </div>
                    </div>

                    <div className="zp-day zp-day--empty" onClick={() => navigate("order", { day: "piatok, 30. máj" })}>
                        <div className="zp-day-top">
                            <div className="zp-day-left">
                                <div className="zp-day-icon"><HXCircle /></div>
                                <div className="flex1">
                                    <div className="zp-day-title">piatok, 30. máj</div>
                                    <span className="zp-pill zp-pill--empty"><HXCircle w={11} sw={2.2} /> Manuálna · nulová</span>
                                </div>
                            </div>
                            <div className="zp-day-count" style={{ color: "var(--ink-mute)" }}>0<small>porcií</small></div>
                        </div>
                        <div className="zp-day-hint">Bez objednávky — voľný deň pre kuchyňu.</div>
                    </div>
                </div>

                {/* Monthly summary — NEW (P1) */}
                <div className="zp-section">
                    <h2><HCalendarDays w={18} /> Mesačný súhrn</h2>
                </div>
                <div className="zp-monthly">
                    <div className="eye">Tento mesiac</div>
                    <h3>
                        Mesačný súhrn
                        <small>máj 2026 · doteraz odoberané</small>
                    </h3>
                    <div className="zp-monthly-grid">
                        <div className="zp-monthly-stat">
                            <div className="num">142×</div>
                            <div className="lbl">Menu A</div>
                        </div>
                        <div className="zp-monthly-stat">
                            <div className="num">38×</div>
                            <div className="lbl">Menu B</div>
                        </div>
                        <div className="zp-monthly-stat">
                            <div className="num">96×</div>
                            <div className="lbl">Raňajky</div>
                        </div>
                        <div className="zp-monthly-stat">
                            <div className="num">68×</div>
                            <div className="lbl">Olovrant</div>
                        </div>
                    </div>
                    <div className="zp-monthly-foot">
                        <span>Spolu</span>
                        <span><strong>344</strong> porcií · 18 dní</span>
                    </div>
                </div>

                {/* History */}
                <div className="zp-section">
                    <h2 className="with-action">
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                            <HHistory w={18} /> História
                        </span>
                        <span className="action">Viac →</span>
                    </h2>

                    {[
                        { d: "po, 26. máj", n: 32 },
                        { d: "pi, 23. máj", n: 28 },
                        { d: "št, 22. máj", n: 30 },
                    ].map((o) => (
                        <div key={o.d} className="zp-day" style={{ background: "var(--bg-cream-soft)", marginBottom: 8 }}>
                            <div className="zp-day-top">
                                <div className="zp-day-left">
                                    <div className="zp-day-icon" style={{ background: "rgba(114,136,75,0.12)", color: "var(--green-700)" }}><HCalendar /></div>
                                    <div>
                                        <div className="zp-day-title">{o.d}</div>
                                        <span className="zp-pill" style={{ background: "rgba(114,136,75,0.16)", color: "var(--green-700)" }}>Vybavená</span>
                                    </div>
                                </div>
                                <div className="zp-day-count" style={{ fontSize: 19 }}>{o.n}<small>porcií</small></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
window.HomeScreen = HomeScreen;

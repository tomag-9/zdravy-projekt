/* global React */
const { ChevronLeft: ODLeft, ChevronRight: ODRight, Coffee: ODCoffee, Utensils: ODUtensils,
        Apple: ODApple, Calendar: ODCal, PenLine: ODPen, Bot: ODBot, Clock: ODClock,
        Sparkles: ODSpark, XCircle: ODX, Check: ODCheck, Plus: ODPlus, ArrowLeft: ODBack,
        FileCheck: ODFile } = window.ZpIcons;

/* ============================================================
 * OrderDetailPC — read-only detail of one day's order.
 * Opened by clicking a day card on Home. "Upraviť" → builder.
 * ============================================================ */

const OD_STATUS = {
    today:  { cls: "zp-pill--deadline", icon: <ODClock w={11} sw={2.2} />, label: "Dnes · upraviť do 10:00" },
    auto:   { cls: "zp-pill--auto",     icon: <ODSpark w={11} sw={2.2} />, label: "Automatická objednávka" },
    manual: { cls: "zp-pill--manual",   icon: <ODPen w={11} sw={2.2} />,   label: "Manuálna objednávka" },
    empty:  { cls: "zp-pill--empty",    icon: <ODX w={11} sw={2.2} />,     label: "Bez objednávky" },
    done:   { cls: "",                  icon: <ODCheck w={11} sw={2.2} />, label: "Vybavená objednávka" },
};

function MealIcon({ k }) {
    if (k === "ranajky") return <ODCoffee />;
    if (k === "obed") return <ODUtensils />;
    return <ODApple />;
}

function OrderDetailPC({ navigate, params }) {
    const id = params && params.id;
    const isHist = !!(params && params.hist);
    const order = (isHist ? window.PC_HISTORY : window.PC_ORDERS)[id]
        || window.PC_ORDERS["ut-27"];
    const st = OD_STATUS[order.status] || OD_STATUS.auto;
    const editable = order.status !== "done";

    const goEdit = () => navigate("order", { day: order.day, today: order.status === "today" });

    return (
        <div className="pc-wrap" data-screen-label="Detail objednávky">
            {/* Day header */}
            <div className="pc-daysel-pc">
                <button className="nav" aria-label="Späť na domov" onClick={() => navigate("home")}><ODBack /></button>
                <div className="mid">
                    <div className="eye">Detail objednávky</div>
                    <h3>{order.day}</h3>
                </div>
                <span className={"zp-pill " + st.cls} style={{ marginLeft: 4 }}>{st.icon} {st.label}</span>
                <div className="pc-detail-context">
                    <span className="ic"><ODCal /></span>
                    <div className="body">
                        <div className="l">{order.date}</div>
                        <div className="v">spolu <span style={{ color: "var(--green-700)" }}>{order.total}</span> porcií</div>
                    </div>
                </div>
            </div>

            {order.status === "empty" ? (
                <div className="pc-detail-empty">
                    <div className="ic"><ODX w={34} sw={1.6} /></div>
                    <h3>Na tento deň nie je objednávka</h3>
                    <p>{order.day} je označený ako voľný deň pre kuchyňu. Ak chcete, môžete objednávku vytvoriť.</p>
                    <button className="zp-btn zp-btn--primary zp-btn--lg" onClick={goEdit}>
                        <ODPlus w={16} /> Vytvoriť objednávku
                    </button>
                </div>
            ) : (
                <div className="pc-order-grid">
                    {/* LEFT — read-only meal breakdown */}
                    <div>
                        {order.meals.map((meal) => (
                            <div className="zp-meal zp-meal--active" key={meal.key}>
                                <div className="zp-meal-head">
                                    <div className="zp-meal-icon"><MealIcon k={meal.key} /></div>
                                    <div className="zp-meal-title">
                                        {meal.name}
                                        <span className="zp-meal-sub">{meal.porcie} porcií · termín {meal.term}</span>
                                    </div>
                                    <span className="pc-meal-count">{meal.porcie}</span>
                                </div>
                                <div className="zp-meal-body">
                                    {meal.cats.map((cat) => (
                                        <div className="zp-cat" key={cat.head}>
                                            <div className="zp-cat-head">{cat.head}</div>
                                            {cat.rows.map((r) => (
                                                <div className="pc-rorow" key={r.menu}>
                                                    <span className="menu">Menu {r.menu}</span>
                                                    {r.diets && r.diets.length > 0 && (
                                                        <span className="diets">
                                                            {r.diets.map((d) => (
                                                                <span className="dchip" key={d.code}>{d.code} · {d.n}</span>
                                                            ))}
                                                        </span>
                                                    )}
                                                    <span className="num">{r.n}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* RIGHT — sticky summary + actions */}
                    <div className="pc-order-summary">
                        <div className="zp-summary">
                            <h3><ODFile /> Zhrnutie objednávky</h3>
                            <div className="zp-summary-row"><span className="l">Dátum</span><span className="r" style={{ textTransform: "capitalize" }}>{order.day}</span></div>
                            {["ranajky", "obed", "olovrant"].map((k) => {
                                const m = order.meals.find((x) => x.key === k);
                                const label = k === "ranajky" ? "Raňajky" : k === "obed" ? "Obedy" : "Olovranty";
                                return (
                                    <div className="zp-summary-row" key={k}>
                                        <span className="l">{label}</span>
                                        <span className="r" style={m ? null : { color: "var(--ink-mute)" }}>{m ? m.porcie : "—"}</span>
                                    </div>
                                );
                            })}
                            <div className="zp-summary-total">
                                <span className="l">Spolu porcií</span>
                                <span className="r">{order.total}<small>ks</small></span>
                            </div>

                            {editable ? (
                                <button className="zp-btn zp-btn--primary zp-btn--block zp-btn--lg" onClick={goEdit}>
                                    <ODPen w={15} /> Upraviť objednávku
                                </button>
                            ) : (
                                <div className="pc-detail-doneflag"><ODCheck w={15} /> Objednávka bola vybavená</div>
                            )}
                            <button className="zp-btn zp-btn--secondary zp-btn--block" style={{ marginTop: 8 }} onClick={() => navigate("home")}>
                                <ODBack w={14} /> Späť na prehľad
                            </button>
                        </div>
                        <p className="zp-thanks">
                            {editable ? "Objednávku môžete upraviť do termínu" : "Ďakujeme za Vašu objednávku"}
                            <small>{editable ? "Po termíne sa automaticky odošle do kuchyne." : "Janka & Vlado, Zdravý projekt"}</small>
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
window.OrderDetailPC = OrderDetailPC;

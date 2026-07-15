/* global React */
const { ArrowLeft: MArrowLeft, ChevronLeft: MChevLeft, ChevronRight: MChevRight,
        Coffee: MCoffee, Utensils: MUtensils, Apple: MApple, Calendar: MCalendar } = window.ZpIcons;

/* ============================================================
 * MenuScreen — Current week's menu, read-only.
 * Days are scrollable horizontally as tabs.
 * ============================================================ */

const WEEK = [
    {
        date: "po, 26. máj",
        label: "Pondelok",
        meals: {
            ranajky: { gram: "200/150 g", items: [{ l: "A", t: "Krupicová kaša s ovocím", d: "Pšeničná krupica, mlieko, lesné ovocie, med." }] },
            obed: {
                gram: "Polievka 200ml · 250/150g",
                items: [
                    { l: "A", t: "Kurací vývar · Kuracie soté so zeleninou, ryža", d: "Kurča, paprika, brokolica, cuketa, dusená ryža." },
                    { l: "B", t: "Kurací vývar · Šošovicový prívarok, vajce, chlieb", d: "Šošovica, vajce v cestíčku, celozrnný chlieb." },
                    { l: "V", t: "Zeleninová · Tofu so zeleninou, ryža", d: "Hľadkový tofu, paprika, mrkva, kel, ryža." },
                ],
            },
            olovrant: { gram: "150 g", items: [{ l: "A", t: "Ovocný šalát s tvarohom", d: "Jablko, hruška, banán, tvaroh, škorica." }] },
        },
    },
    {
        date: "ut, 27. máj",
        label: "Utorok",
        active: true,
        meals: {
            ranajky: { gram: "200/150 g", items: [{ l: "A", t: "Ovsené vločky s jablkom", d: "Ovsené vločky, jablko, mlieko, škorica, hrozienka." }] },
            obed: {
                gram: "Polievka 200ml · 250/150g",
                items: [
                    { l: "A", t: "Hrachová polievka · Hovädzí guláš, halušky", d: "Hovädzie pliecko, cibuľa, paprika, zemiakové halušky." },
                    { l: "B", t: "Hrachová · Cestoviny s tekvicou a fetou", d: "Penne, pečená tekvica hokkaido, feta syr, bylinky." },
                    { l: "V", t: "Hrachová · Šošovicové karbonátky, zemiaková kaša", d: "Červená šošovica, mrkva, ovos, kaša." },
                ],
            },
            olovrant: { gram: "150 g", items: [{ l: "A", t: "Domáce müsli tyčinky", d: "Ovsené vločky, med, sušené ovocie, slnečnica." }] },
        },
    },
    {
        date: "st, 28. máj",
        label: "Streda",
        meals: {
            ranajky: { gram: "200/150 g", items: [{ l: "A", t: "Bryndzové nátierky", d: "Bryndza, smotana, žemľa, cherry paradajky." }] },
            obed: {
                gram: "Polievka 200ml · 250/150g",
                items: [
                    { l: "A", t: "Špargľová · Pečené kuracie stehno, opekané zemiaky", d: "Kuracie stehno, rozmarín, zemiaky." },
                    { l: "B", t: "Špargľová · Špenátové gnocchi s parmezánom", d: "Špenátové gnocchi, parmezán, maslo." },
                    { l: "V", t: "Špargľová · Falafel, hummus, pita", d: "Cícer, sezam, koriander, pita chlieb." },
                ],
            },
            olovrant: { gram: "150 g", items: [{ l: "A", t: "Mliečne smoothie", d: "Mlieko, banán, lesné ovocie, ovsené vločky." }] },
        },
    },
];

function MenuScreen({ navigate }) {
    const [dayIdx, setDayIdx] = React.useState(1);
    const day = WEEK[dayIdx];

    return (
        <div className="zp-app">
            <div className="zp-pageheader">
                <button className="zp-iconbtn" onClick={() => navigate("home")}><MArrowLeft w={18} sw={2} /></button>
                <div>
                    <h1>Jedálniček</h1>
                    <p>Týždeň 26. – 30. mája 2026</p>
                </div>
            </div>

            {/* Day tabs */}
            <div style={{ display: "flex", gap: 6, padding: "6px 20px 16px", overflowX: "auto" }}>
                {WEEK.map((d, i) => (
                    <button
                        key={d.date}
                        onClick={() => setDayIdx(i)}
                        className={"zp-pill " + (i === dayIdx ? "zp-pill--manual" : "")}
                        style={{
                            padding: "8px 14px",
                            background: i === dayIdx ? "var(--green-700)" : "var(--bg-cream-warm)",
                            color: i === dayIdx ? "var(--bg-cream)" : "var(--ink-2)",
                            border: "1px solid " + (i === dayIdx ? "var(--green-700)" : "var(--line-soft)"),
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                            flexShrink: 0,
                        }}
                    >
                        {d.label}
                    </button>
                ))}
            </div>

            <div className="zp-menu-day">
                <div className="zp-menu-day-head">
                    <h3>{day.label}</h3>
                    <span className="when">{day.date}</span>
                </div>

                {/* Raňajky */}
                <div className="zp-menu-meal">
                    <div className="zp-menu-meal-head">
                        <MCoffee />
                        <span className="name">Raňajky</span>
                        <span className="gram">{day.meals.ranajky.gram}</span>
                    </div>
                    {day.meals.ranajky.items.map((m, i) => (
                        <div className="zp-menu-item" key={i}>
                            <span className={"letter " + m.l.toLowerCase()}>{m.l}</span>
                            <div className="body">
                                <div className="ttl">{m.t}</div>
                                <div className="desc">{m.d}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Obed */}
                <div className="zp-menu-meal">
                    <div className="zp-menu-meal-head">
                        <MUtensils />
                        <span className="name">Obed</span>
                        <span className="gram">{day.meals.obed.gram}</span>
                    </div>
                    {day.meals.obed.items.map((m, i) => (
                        <div className="zp-menu-item" key={i}>
                            <span className={"letter " + m.l.toLowerCase()}>{m.l}</span>
                            <div className="body">
                                <div className="ttl">{m.t}</div>
                                <div className="desc">{m.d}</div>
                                {i === 1 && (
                                    <div className="allergens">
                                        <span>1 lepok</span><span>3 vajce</span><span>7 mlieko</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Olovrant */}
                <div className="zp-menu-meal">
                    <div className="zp-menu-meal-head">
                        <MApple />
                        <span className="name">Olovrant</span>
                        <span className="gram">{day.meals.olovrant.gram}</span>
                    </div>
                    {day.meals.olovrant.items.map((m, i) => (
                        <div className="zp-menu-item" key={i}>
                            <span className={"letter " + m.l.toLowerCase()}>{m.l}</span>
                            <div className="body">
                                <div className="ttl">{m.t}</div>
                                <div className="desc">{m.d}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
window.MenuScreen = MenuScreen;

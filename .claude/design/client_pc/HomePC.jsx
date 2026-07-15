/* global React */
const { Plus: DHPlus, Clock: DHClock, CalendarDays: DHCalDays, Calendar: DHCal,
        Bot: DHBot, PenLine: DHPen, XCircle: DHX, History: DHHist, Sparkles: DHSpark,
        ChevronRight: DHChev } = window.ZpIcons;

/* ============================================================
 * Order data — shared by Home cards + the detail screen.
 * Each order is read-only summary data; the detail screen
 * renders it, and "Upraviť" jumps into the order builder.
 * ============================================================ */
const PC_ORDERS = {
    "ut-27": {
        id: "ut-27", day: "ut, 27. máj", weekday: "Utorok", date: "27. máj 2026",
        status: "today", deadline: "Upraviť do 10:00", total: 32,
        meals: [
            { key: "ranajky", name: "Raňajky", porcie: 8, term: "7:30",
              cats: [{ head: "Materská škola · 3–6 rokov", rows: [{ menu: "A", n: 8 }] }] },
            { key: "obed", name: "Obed", porcie: 18, term: "10:00",
              cats: [
                { head: "Materská škola · 3–6 rokov", rows: [
                    { menu: "A", n: 12, diets: [{ code: "VEGE", n: 1 }, { code: "NO MILK", n: 1 }] },
                    { menu: "B", n: 3 }, { menu: "V", n: 1 },
                ] },
                { head: "Zamestnanci", rows: [{ menu: "A", n: 2 }] },
              ] },
            { key: "olovrant", name: "Olovrant", porcie: 6, term: "9:00",
              cats: [{ head: "Materská škola · 3–6 rokov", rows: [{ menu: "A", n: 6 }] }] },
        ],
    },
    "st-28": {
        id: "st-28", day: "streda, 28. máj", weekday: "Streda", date: "28. máj 2026",
        status: "auto", total: 30,
        meals: [
            { key: "ranajky", name: "Raňajky", porcie: 8, term: "7:30",
              cats: [{ head: "Materská škola · 3–6 rokov", rows: [{ menu: "A", n: 8 }] }] },
            { key: "obed", name: "Obed", porcie: 16, term: "10:00",
              cats: [
                { head: "Materská škola · 3–6 rokov", rows: [
                    { menu: "A", n: 11, diets: [{ code: "VEGE", n: 1 }] },
                    { menu: "B", n: 3 },
                ] },
                { head: "Zamestnanci", rows: [{ menu: "A", n: 2 }] },
              ] },
            { key: "olovrant", name: "Olovrant", porcie: 6, term: "9:00",
              cats: [{ head: "Materská škola · 3–6 rokov", rows: [{ menu: "A", n: 6 }] }] },
        ],
    },
    "st-29": {
        id: "st-29", day: "štvrtok, 29. máj", weekday: "Štvrtok", date: "29. máj 2026",
        status: "manual", total: 28,
        meals: [
            { key: "obed", name: "Obed", porcie: 22, term: "10:00",
              cats: [
                { head: "Materská škola · 3–6 rokov", rows: [
                    { menu: "A", n: 16, diets: [{ code: "NO GLUTEN", n: 1 }] },
                    { menu: "B", n: 4 },
                ] },
                { head: "Zamestnanci", rows: [{ menu: "A", n: 2 }] },
              ] },
            { key: "olovrant", name: "Olovrant", porcie: 6, term: "9:00",
              cats: [{ head: "Materská škola · 3–6 rokov", rows: [{ menu: "A", n: 6 }] }] },
        ],
    },
    "pi-30": {
        id: "pi-30", day: "piatok, 30. máj", weekday: "Piatok", date: "30. máj 2026",
        status: "empty", total: 0, meals: [],
    },
    "po-2": {
        id: "po-2", day: "pondelok, 2. jún", weekday: "Pondelok", date: "2. jún 2026",
        status: "auto", total: 32,
        meals: [
            { key: "ranajky", name: "Raňajky", porcie: 8, term: "7:30",
              cats: [{ head: "Materská škola · 3–6 rokov", rows: [{ menu: "A", n: 8 }] }] },
            { key: "obed", name: "Obed", porcie: 18, term: "10:00",
              cats: [
                { head: "Materská škola · 3–6 rokov", rows: [
                    { menu: "A", n: 12, diets: [{ code: "VEGE", n: 1 }, { code: "NO MILK", n: 1 }] },
                    { menu: "B", n: 3 }, { menu: "V", n: 1 },
                ] },
                { head: "Zamestnanci", rows: [{ menu: "A", n: 2 }] },
              ] },
            { key: "olovrant", name: "Olovrant", porcie: 6, term: "9:00",
              cats: [{ head: "Materská škola · 3–6 rokov", rows: [{ menu: "A", n: 6 }] }] },
        ],
    },
};
// History orders (already fulfilled, read-only)
["po-26", "pi-23", "st-22", "st-21"].forEach((id) => {});
const PC_HISTORY = {
    "po-26": { id: "po-26", day: "po, 26. máj", weekday: "Pondelok", date: "26. máj 2026", status: "done", total: 32,
        meals: [
            { key: "ranajky", name: "Raňajky", porcie: 8, term: "7:30", cats: [{ head: "Materská škola · 3–6 rokov", rows: [{ menu: "A", n: 8 }] }] },
            { key: "obed", name: "Obed", porcie: 18, term: "10:00", cats: [
                { head: "Materská škola · 3–6 rokov", rows: [{ menu: "A", n: 12, diets: [{ code: "VEGE", n: 1 }] }, { menu: "B", n: 3 }, { menu: "V", n: 1 }] },
                { head: "Zamestnanci", rows: [{ menu: "A", n: 2 }] }] },
            { key: "olovrant", name: "Olovrant", porcie: 6, term: "9:00", cats: [{ head: "Materská škola · 3–6 rokov", rows: [{ menu: "A", n: 6 }] }] },
        ] },
    "pi-23": { id: "pi-23", day: "pi, 23. máj", weekday: "Piatok", date: "23. máj 2026", status: "done", total: 28,
        meals: [
            { key: "obed", name: "Obed", porcie: 22, term: "10:00", cats: [
                { head: "Materská škola · 3–6 rokov", rows: [{ menu: "A", n: 16 }, { menu: "B", n: 4 }] },
                { head: "Zamestnanci", rows: [{ menu: "A", n: 2 }] }] },
            { key: "olovrant", name: "Olovrant", porcie: 6, term: "9:00", cats: [{ head: "Materská škola · 3–6 rokov", rows: [{ menu: "A", n: 6 }] }] },
        ] },
    "st-22": { id: "st-22", day: "št, 22. máj", weekday: "Štvrtok", date: "22. máj 2026", status: "done", total: 30,
        meals: [
            { key: "ranajky", name: "Raňajky", porcie: 8, term: "7:30", cats: [{ head: "Materská škola · 3–6 rokov", rows: [{ menu: "A", n: 8 }] }] },
            { key: "obed", name: "Obed", porcie: 16, term: "10:00", cats: [
                { head: "Materská škola · 3–6 rokov", rows: [{ menu: "A", n: 11 }, { menu: "B", n: 3 }] },
                { head: "Zamestnanci", rows: [{ menu: "A", n: 2 }] }] },
            { key: "olovrant", name: "Olovrant", porcie: 6, term: "9:00", cats: [{ head: "Materská škola · 3–6 rokov", rows: [{ menu: "A", n: 6 }] }] },
        ] },
    "st-21": { id: "st-21", day: "st, 21. máj", weekday: "Streda", date: "21. máj 2026", status: "done", total: 30,
        meals: [
            { key: "ranajky", name: "Raňajky", porcie: 8, term: "7:30", cats: [{ head: "Materská škola · 3–6 rokov", rows: [{ menu: "A", n: 8 }] }] },
            { key: "obed", name: "Obed", porcie: 16, term: "10:00", cats: [
                { head: "Materská škola · 3–6 rokov", rows: [{ menu: "A", n: 11 }, { menu: "B", n: 3 }] },
                { head: "Zamestnanci", rows: [{ menu: "A", n: 2 }] }] },
            { key: "olovrant", name: "Olovrant", porcie: 6, term: "9:00", cats: [{ head: "Materská škola · 3–6 rokov", rows: [{ menu: "A", n: 6 }] }] },
        ] },
};
window.PC_ORDERS = PC_ORDERS;
window.PC_HISTORY = PC_HISTORY;

/* ============================================================
 * HomePC — desktop dashboard. Two columns.
 * Day cards open the read-only DETAIL screen (not edit).
 * ============================================================ */

function DayCard({ icon, title, pill, count, chips, hint, today, empty, onClick }) {
    return (
        <div
            className={"zp-day" + (today ? " zp-day--today" : "") + (empty ? " zp-day--empty" : "")}
            onClick={onClick} role="button"
            style={{ marginBottom: 0 }}
        >
            <div className="zp-day-top">
                <div className="zp-day-left">
                    <div className="zp-day-icon">{icon}</div>
                    <div className="flex1">
                        <div className="zp-day-title">
                            {title}
                            {today && <span className="pill-today">DNES</span>}
                        </div>
                        {pill}
                    </div>
                </div>
                <div className="zp-day-count" style={empty ? { color: "var(--ink-mute)" } : null}>
                    {count}<small>porcií</small>
                </div>
            </div>
            {chips && <div className="zp-meal-chips">{chips}</div>}
            {hint && <div className="zp-day-hint">{hint}</div>}
        </div>
    );
}

function HomePC({ navigate }) {
    const openDetail = (id) => navigate("detail", { id });

    return (
        <div className="pc-wrap" data-screen-label="Domov">
            {/* Hero — starts a NEW order (goes straight to builder) */}
            <a
                className="pc-hero" href="#"
                onClick={(e) => { e.preventDefault(); navigate("order", { day: "streda, 28. mája" }); }}
                style={{ marginBottom: 16 }}
            >
                <span className="bubble"><DHPlus w={28} /></span>
                <span className="body">
                    <span className="eye">Pripravte novú</span>
                    <h3>Nová objednávka</h3>
                    <span className="when">streda, 28. mája</span>
                </span>
                <span className="chev"><DHChev w={24} /></span>
            </a>
            <p className="zp-disclaimer" style={{ margin: "0 0 28px" }}>
                Objednávky sa automaticky preklápajú na ďalší deň, pokiaľ ich manuálne neupravíte.
            </p>

            <div className="pc-home-grid">
                {/* LEFT */}
                <div className="pc-col">
                    <div>
                        <h2 className="pc-h2"><DHClock /> Dnešná objednávka</h2>
                        <DayCard
                            today
                            icon={<DHClock />}
                            title="ut, 27. máj"
                            pill={<span className="zp-pill zp-pill--deadline"><DHClock /> Upraviť do 10:00</span>}
                            count={32}
                            chips={<>
                                <span className="zp-mchip zp-mchip--breakfast">Raňajky · 8</span>
                                <span className="zp-mchip zp-mchip--lunch">Obed · 18</span>
                                <span className="zp-mchip zp-mchip--olovrant">Olovrant · 6</span>
                            </>}
                            onClick={() => openDetail("ut-27")}
                        />
                    </div>

                    <div>
                        <h2 className="pc-h2"><DHCalDays /> Plánované objednávky</h2>
                        <div className="pc-daygrid">
                            <DayCard
                                icon={<DHBot />} title="streda, 28. máj"
                                pill={<span className="zp-pill zp-pill--auto"><DHSpark w={11} sw={2.2} /> Automatická</span>}
                                count={30}
                                chips={<>
                                    <span className="zp-mchip zp-mchip--breakfast">Raňajky · 8</span>
                                    <span className="zp-mchip zp-mchip--lunch">Obed · 16</span>
                                    <span className="zp-mchip zp-mchip--olovrant">Olovrant · 6</span>
                                </>}
                                onClick={() => openDetail("st-28")}
                            />
                            <DayCard
                                icon={<DHPen />} title="štvrtok, 29. máj"
                                pill={<span className="zp-pill zp-pill--manual"><DHPen w={11} sw={2.2} /> Manuálna</span>}
                                count={28}
                                chips={<>
                                    <span className="zp-mchip zp-mchip--lunch">Obed · 22</span>
                                    <span className="zp-mchip zp-mchip--olovrant">Olovrant · 6</span>
                                </>}
                                onClick={() => openDetail("st-29")}
                            />
                            <DayCard
                                empty icon={<DHX />} title="piatok, 30. máj"
                                pill={<span className="zp-pill zp-pill--empty"><DHX w={11} sw={2.2} /> Manuálna · nulová</span>}
                                count={0}
                                hint="Bez objednávky — voľný deň pre kuchyňu."
                                onClick={() => openDetail("pi-30")}
                            />
                            <DayCard
                                icon={<DHBot />} title="pondelok, 2. jún"
                                pill={<span className="zp-pill zp-pill--auto"><DHSpark w={11} sw={2.2} /> Automatická</span>}
                                count={32}
                                chips={<>
                                    <span className="zp-mchip zp-mchip--breakfast">Raňajky · 8</span>
                                    <span className="zp-mchip zp-mchip--lunch">Obed · 18</span>
                                    <span className="zp-mchip zp-mchip--olovrant">Olovrant · 6</span>
                                </>}
                                onClick={() => openDetail("po-2")}
                            />
                        </div>
                    </div>
                </div>

                {/* RIGHT */}
                <div className="pc-col">
                    <div className="zp-monthly" style={{ margin: 0 }}>
                        <div className="eye">Tento mesiac</div>
                        <h3>Mesačný súhrn<small>máj 2026 · doteraz odoberané</small></h3>
                        <div className="zp-monthly-grid">
                            <div className="zp-monthly-stat"><div className="num">142×</div><div className="lbl">Menu A</div></div>
                            <div className="zp-monthly-stat"><div className="num">38×</div><div className="lbl">Menu B</div></div>
                            <div className="zp-monthly-stat"><div className="num">96×</div><div className="lbl">Raňajky</div></div>
                            <div className="zp-monthly-stat"><div className="num">68×</div><div className="lbl">Olovrant</div></div>
                        </div>
                        <div className="zp-monthly-foot">
                            <span>Spolu</span>
                            <span><strong>344</strong> porcií · 18 dní</span>
                        </div>
                    </div>

                    <div>
                        <h2 className="pc-h2"><DHHist /> História <span className="action">Viac →</span></h2>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {[
                                { id: "po-26", d: "po, 26. máj", n: 32 },
                                { id: "pi-23", d: "pi, 23. máj", n: 28 },
                                { id: "st-22", d: "št, 22. máj", n: 30 },
                                { id: "st-21", d: "st, 21. máj", n: 30 },
                            ].map((o) => (
                                <div key={o.id} className="zp-day pc-hist" style={{ background: "var(--bg-cream-soft)", marginBottom: 0 }}
                                    role="button" onClick={() => navigate("detail", { id: o.id, hist: true })}>
                                    <div className="zp-day-top">
                                        <div className="zp-day-left">
                                            <div className="zp-day-icon" style={{ background: "rgba(114,136,75,0.12)", color: "var(--green-700)", width: 40, height: 40, flexBasis: 40 }}><DHCal /></div>
                                            <div className="pc-hist-body">
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
            </div>
        </div>
    );
}
window.HomePC = HomePC;

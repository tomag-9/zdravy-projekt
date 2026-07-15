/* global React, PageHead */
// Prehľad — Gramáž jedál. The flagship data screen: date navigator + a
// meal-colour-coded gramage table with expandable operations.

(function () {
    const { useState, useMemo } = React;
    const Ic = () => window.AdIcons;

    // ── Meal column groups (hue = brand-translated meal colour) ──
    const COL_GROUPS = [
        { key: "break", label: "Raňajky-desiata", hue: "break", tpl: "Nátierkový chlieb", comps: [
            { label: "Pečivo", g: 40 }, { label: "Nátierka", g: 30 }, { label: "Zelenina", g: 25 } ] },
        { key: "soup", label: "Polievka", hue: "soup", tpl: "Zeleninová", comps: [ { label: "Polievka", g: 200, unit: "ml" } ] },
        { key: "menuA", label: "Menu A", hue: "menuA", tpl: "Kuracie so ryžou", comps: [ { label: "Porcia", g: 230 } ] },
        { key: "menuB", label: "Menu B", hue: "menuB", tpl: "Bravčové s knedľou", comps: [ { label: "Porcia", g: 250 } ] },
        { key: "menuC", label: "Menu C", hue: "menuC", tpl: "Zapekané cestoviny", comps: [ { label: "Porcia", g: 240 } ] },
        { key: "menuV", label: "Menu V", hue: "menuV", tpl: "Šošovicový guláš (vege)", comps: [ { label: "Porcia", g: 230 } ] },
        { key: "snack", label: "Olovrant", hue: "snack", tpl: "Ovocie + mlieko", comps: [
            { label: "Ovocie", g: 100 }, { label: "Nápoj", g: 150, unit: "ml" } ] },
    ];

    // ── Operations with standard + diet breakdowns ──
    const ROWS = [
        {
            id: 1, name: "MŠ Ružinová", std: 84, note: "Prosím oddelene baliť bezlepkové porcie.",
            subs: [
                { type: "std", label: "Predškoláci (3–6 r.)", count: 52 },
                { type: "std", label: "Jasle (do 3 r.)", count: 32 },
                { type: "diet", label: "NO GLUTEN", count: 4 },
                { type: "diet", label: "NO MILK", count: 3 },
            ],
            diets: [ { name: "NO GLUTEN", count: 4 }, { name: "NO MILK", count: 3 } ],
        },
        {
            id: 2, name: "ZŠ Vajnorská 47", std: 156, note: "",
            subs: [
                { type: "std", label: "1. stupeň", count: 98 },
                { type: "std", label: "2. stupeň", count: 58 },
                { type: "diet", label: "VEGE", count: 11 },
                { type: "diet", label: "NONONO", count: 2 },
            ],
            diets: [ { name: "VEGE", count: 11 }, { name: "NONONO", count: 2 } ],
        },
        {
            id: 3, name: "MŠ Slnečnica", std: 46, note: "",
            subs: [
                { type: "std", label: "Predškoláci (3–6 r.)", count: 46 },
                { type: "diet", label: "NO MILK / NO GLUTEN", count: 2 },
            ],
            diets: [ { name: "NO MILK / NO GLUTEN", count: 2 } ],
        },
    ];

    // grams helper — plausible totals per component for a given count
    const gramsFor = (count, g) => Math.round(count * g);

    function Dashboard() {
        const [dateLabel] = useState("štvrtok, 12. jún 2025");
        const [expanded, setExpanded] = useState([1]);
        const toggle = (id) => setExpanded((e) => e.includes(id) ? e.filter((x) => x !== id) : [...e, id]);

        const flatComps = useMemo(() => COL_GROUPS.flatMap((cg) => cg.comps.map((c) => ({ ...c, hue: cg.hue }))), []);
        const totalCols = flatComps.length;

        // grand totals per component across all operations
        const grand = flatComps.map((c) => {
            const totalCount = ROWS.reduce((s, r) => s + r.std, 0);
            return gramsFor(totalCount, c.g);
        });

        const Download = Ic().Download, FileText = Ic().FileText, FileSpreadsheet = Ic().FileSpreadsheet,
            ChevronLeft = Ic().ChevronLeft, ChevronRight = Ic().ChevronRight, ChevronRt = Ic().ChevronRight;

        // render gram cells for a given count across all groups (muted per-column tint)
        const gramCells = (count) => flatComps.map((c, i) => (
            count > 0
                ? <td key={i} className={"cell-num mh-" + c.hue + "-cell"}>{gramsFor(count, c.g)}</td>
                : <td key={i} className="cell-empty">—</td>
        ));

        return (
            <>
                <PageHead eyebrow="Prehľad" title="Gramáž jedál" desc={dateLabel}
                    actions={<>
                        <button className="zpa-btn zpa-btn--danger" onClick={() => window.adToast("Generujem PDF…")}><FileText />Stiahnuť PDF</button>
                        <button className="zpa-btn zpa-btn--primary" onClick={() => window.adToast("Generujem XLSX…")}><FileSpreadsheet />Stiahnuť XLSX</button>
                    </>} />

                <div className="zpa-stack">
                    {/* Date navigator */}
                    <div className="zpa-card">
                        <div className="zpa-datenav">
                            <button className="zpa-navchip" onClick={() => window.adToast("Predchádzajúci pracovný deň")}><ChevronLeft />Predchádzajúci deň</button>
                            <div className="mid">
                                <div className="curr">{dateLabel}</div>
                                <span className="zpa-badge zpa-badge--orange">Dnes</span>
                            </div>
                            <button className="zpa-navchip" disabled>Nasledujúci deň<ChevronRight /></button>
                        </div>
                    </div>

                    {/* Gramáž table */}
                    <div className="zpa-card" style={{ overflow: "hidden" }}>
                        <div className="zpa-table-wrap">
                            <table className="zpa-gram">
                                <thead>
                                    <tr>
                                        <th className="corner" rowSpan={2}>Prevádzka / Riadok</th>
                                        <th className="cnt" rowSpan={2}>Počet</th>
                                        {COL_GROUPS.map((cg) => (
                                            <th key={cg.key} className={"grp mh-" + cg.hue + "-1"} colSpan={cg.comps.length}>
                                                {cg.label}<small>{cg.tpl}</small>
                                            </th>
                                        ))}
                                    </tr>
                                    <tr>
                                        {COL_GROUPS.map((cg) => cg.comps.map((c, ci) => (
                                            <th key={cg.key + ci} className={"comp mh-" + cg.hue + "-2"}>
                                                {c.label}<small>{c.g}{c.unit || "g"}</small>
                                            </th>
                                        )))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {ROWS.map((row) => {
                                        const open = expanded.includes(row.id);
                                        const dietTotal = row.diets.reduce((s, d) => s + d.count, 0);
                                        return (
                                            <React.Fragment key={row.id}>
                                                <tr className="client-row">
                                                    <td colSpan={2 + totalCols}>
                                                        <button className="client-toggle" onClick={() => toggle(row.id)}>
                                                            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                                                                <span className={"chev" + (open ? " open" : "")}><ChevronRt w={15} /></span>
                                                                {row.name}
                                                                <span className="meta">štandard {row.std}{dietTotal ? `, diéty ${dietTotal}` : ""}</span>
                                                            </span>
                                                            <span className="meta">spolu porcií {row.std + dietTotal}</span>
                                                        </button>
                                                    </td>
                                                </tr>
                                                {open && row.subs.map((sr, si) => (
                                                    <tr key={si} className={"sub-row" + (sr.type === "diet" ? " diet" : "")}>
                                                        <td className="lbl">{sr.type === "diet" ? "↳ " + sr.label : sr.label}</td>
                                                        <td className="cell-cnt">{sr.count}</td>
                                                        {gramCells(sr.count)}
                                                    </tr>
                                                ))}
                                                {open && row.note && (
                                                    <tr><td colSpan={2 + totalCols} style={{ background: "rgba(114,136,75,0.06)", color: "var(--green-800)", fontSize: 13, padding: "10px 20px" }}>
                                                        <strong style={{ fontFamily: "var(--font-display)" }}>Poznámka k objednávke:</strong> {row.note}
                                                    </td></tr>
                                                )}
                                                <tr className="summ-std">
                                                    <td>Súčet bez diét</td>
                                                    <td className="cell-cnt" style={{ color: "inherit" }}>{row.std}</td>
                                                    {gramCells(row.std)}
                                                </tr>
                                                {row.diets.map((d) => (
                                                    <tr className="summ-diet" key={d.name}>
                                                        <td>{d.name}</td>
                                                        <td className="cell-cnt" style={{ color: "inherit" }}>{d.count}</td>
                                                        {gramCells(d.count)}
                                                    </tr>
                                                ))}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="band"><td colSpan={2 + totalCols}>Súhrn porcií</td></tr>
                                    {COL_GROUPS.map((cg) => {
                                        const cnt = ROWS.reduce((s, r) => s + r.std, 0);
                                        return (
                                            <tr key={cg.key} style={{ background: "var(--bg-cream-warm)" }}>
                                                <td style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--green-800)", paddingLeft: 20 }}>{cg.label}</td>
                                                <td className="cell-cnt">{cnt}</td>
                                                {flatComps.map((c, i) => (
                                                    c.hue === cg.hue
                                                        ? <td key={i} className={"cell-num mh-" + c.hue + "-cell"}>{gramsFor(cnt, c.g)}</td>
                                                        : <td key={i} className="cell-empty">—</td>
                                                ))}
                                            </tr>
                                        );
                                    })}
                                    <tr className="total">
                                        <td className="corner" colSpan={2} style={{ textAlign: "left" }}>CELKOM (g / ml)</td>
                                        {grand.map((g, i) => <td key={i}>{g.toLocaleString("sk-SK")}</td>)}
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    window.DashboardScreen = Dashboard;
})();

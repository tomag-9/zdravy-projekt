/* global React, PageHead, Modal, Field */
// Jedálniček — month calendar with a per-day meal-plan editor modal.

(function () {
    const { useState } = React;
    const Ic = () => window.AdIcons;

    const MONTHS = ["Január", "Február", "Marec", "Apríl", "Máj", "Jún", "Júl", "August", "September", "Október", "November", "December"];
    const DOW = ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"];

    // demo: which weekdays of June 2025 have a plan (+ grand grams)
    const PLANS = { 2: "38.4 kg", 3: "41.1 kg", 4: "39.7 kg", 5: "40.2 kg", 6: "37.9 kg", 9: "42.0 kg", 10: "40.8 kg", 11: "41.5 kg", 12: "39.2 kg" };
    const TODAY = 12;

    const CATS = [
        { key: "breakfast_snack", label: "Raňajky-desiata", opts: ["Nátierkový chlieb (95g)", "Ovsená kaša (250g)", "Rožok s maslom (70g)"] },
        { key: "soup", label: "Polievka", opts: ["Zeleninová (200ml)", "Šošovicová (220ml)", "Slepačí vývar (200ml)"] },
        { key: "main_A", label: "Hlavný chod — Menu A", opts: ["Kuracie so ryžou (230g)", "Bravčové s knedľou (250g)"] },
        { key: "main_B", label: "Hlavný chod — Menu B", opts: ["Cestoviny s brokolicou (240g)", "Rizoto (230g)"] },
        { key: "main_V", label: "Hlavný chod — Menu V (vege)", opts: ["Šošovicový guláš (240g)", "Zeleninové karí (230g)"] },
        { key: "afternoon_snack", label: "Olovrant", opts: ["Ovocie + mlieko (250g)", "Jogurt s müsli (200g)"] },
    ];

    function DayEditor({ day, onClose }) {
        const [sel, setSel] = useState({ breakfast_snack: "Nátierkový chlieb (95g)", soup: "Zeleninová (200ml)", main_A: "Kuracie so ryžou (230g)", main_B: "", main_V: "Šošovicový guláš (240g)", afternoon_snack: "Ovocie + mlieko (250g)" });
        return (
            <Modal wide title={`Jedálniček — ${day}. ${MONTHS[5].toLowerCase()} 2025`} onClose={onClose}
                foot={<>
                    <button className="zpa-btn zpa-btn--ghost" onClick={onClose}>Zrušiť</button>
                    <button className="zpa-btn zpa-btn--primary" onClick={() => { window.adToast("Jedálniček uložený"); onClose(); }}>Uložiť</button>
                </>}>
                {CATS.map((c) => (
                    <Field key={c.key} label={c.label}>
                        <select className="zpa-select" value={sel[c.key]} onChange={(e) => setSel((s) => ({ ...s, [c.key]: e.target.value }))}>
                            <option value="">— nevybraté —</option>
                            {c.opts.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </Field>
                ))}
                <div className="zpa-notice zpa-notice--honey">
                    {(() => { const Inf = Ic().Info; return <Inf />; })()}
                    <span>Menu A/B/C/V sú samostatné gramáže. Prvý výber Menu A sa skopíruje do prázdnych variantov; ďalšie zmeny sú nezávislé.</span>
                </div>
            </Modal>
        );
    }

    function MealPlan() {
        const [editing, setEditing] = useState(null);
        const first = new Date(2025, 5, 1).getDay(); // June 1 2025
        const startDow = (first + 6) % 7;
        const numDays = 30;
        const cells = [...Array(startDow).fill(null), ...Array.from({ length: numDays }, (_, i) => i + 1)];
        while (cells.length % 7) cells.push(null);
        const ChevronLeft = Ic().ChevronLeft, ChevronRight = Ic().ChevronRight;

        return (
            <>
                <PageHead eyebrow="Plánovanie" title="Jedálniček" desc="Naplánujte jedálniček pre každý pracovný deň." />
                <div className="zpa-card zpa-card--pad">
                    <div className="zpa-cal-head">
                        <button className="zpa-navchip" onClick={() => window.adToast("Predošlý mesiac")}><ChevronLeft />Predošlý</button>
                        <h3>{MONTHS[5]} 2025</h3>
                        <button className="zpa-navchip" onClick={() => window.adToast("Ďalší mesiac")}>Ďalší<ChevronRight /></button>
                    </div>
                    <div className="zpa-cal-dow">{DOW.map((d) => <span key={d}>{d}</span>)}</div>
                    <div className="zpa-cal-grid">
                        {cells.map((day, i) => {
                            if (day === null) return <div key={"e" + i} className="zpa-cal-cell empty" />;
                            const col = (startDow + day - 1) % 7;
                            const weekend = col >= 5;
                            const plan = PLANS[day];
                            return (
                                <button key={day} className={"zpa-cal-cell" + (day === TODAY ? " today" : "") + (weekend ? " weekend" : "")}
                                    onClick={() => setEditing(day)}>
                                    <span className="dnum">{day}</span>
                                    {plan && <span className="zpa-cal-plan"><span className="dot" />Plán <span className="grams">· {plan}</span></span>}
                                </button>
                            );
                        })}
                    </div>
                    <div className="zpa-cal-legend">
                        <span><span className="dot" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green-600)" }} />Existujúci plán</span>
                        <span><span style={{ width: 14, height: 14, borderRadius: 4, border: "2px solid var(--orange-500)", background: "#fff4e0" }} />Dnešný deň</span>
                    </div>
                </div>
                {editing && <DayEditor day={editing} onClose={() => setEditing(null)} />}
            </>
        );
    }

    window.MealPlanScreen = MealPlan;
})();

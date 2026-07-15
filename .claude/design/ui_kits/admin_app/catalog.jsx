/* global React, PageHead */
// Katalóg jedál — portion-type coefficients + meal templates grouped by category.

(function () {
    const { useState } = React;
    const Ic = () => window.AdIcons;

    const PORTIONS = [
        { id: 1, name: "Jasle (do 3 r.)", pct: 80 },
        { id: 2, name: "Predškoláci (3–6 r.)", pct: 100 },
        { id: 3, name: "1. stupeň (7–11 r.)", pct: 115 },
        { id: 4, name: "2. stupeň (12–15 r.)", pct: 130 },
        { id: 5, name: "Dospelí", pct: 145 },
    ];

    const CATS = [
        { key: "break", label: "Raňajky-desiata", icon: "Coffee", tpls: [
            { name: "Nátierkový chlieb", wl: "95 g", on: true },
            { name: "Ovsená kaša", wl: "250 g", on: true },
            { name: "Rožok s maslom a medom", wl: "70 g", on: false } ] },
        { key: "soup", label: "Polievka", icon: "Soup", tpls: [
            { name: "Zeleninová", wl: "200 ml", on: true },
            { name: "Šošovicová", wl: "220 ml", on: true } ] },
        { key: "main", label: "Hlavný chod", icon: "Utensils", tpls: [
            { name: "Kuracie so ryžou", wl: "80 g + 150 g", on: true },
            { name: "Bravčové s knedľou", wl: "80 g + 150 g", on: true },
            { name: "Vajcová pomazánka", wl: "1 ks vajce podľa vek. sk.", exc: true, on: true } ] },
        { key: "snack", label: "Olovrant", icon: "Cookie", tpls: [
            { name: "Ovocie + mlieko", wl: "100 g + 150 ml", on: true },
            { name: "Jogurt s müsli", wl: "200 g", on: true } ] },
    ];

    function Catalog() {
        const [drafts, setDrafts] = useState(Object.fromEntries(PORTIONS.map((p) => [p.id, String(p.pct)])));
        const [addingCat, setAddingCat] = useState(null);
        const Plus = Ic().Plus;

        return (
            <>
                <PageHead eyebrow="Nastavenia jedál" title="Katalóg jedál"
                    desc="Spravujte koeficienty vekových skupín a rozloženia váh jedál." />
                <div className="zpa-stack">
                    {/* Portion coefficients */}
                    <div className="zpa-card">
                        <div className="zpa-card-head"><h3>Typy porcií a koeficienty</h3></div>
                        <div className="zpa-card--pad" style={{ paddingTop: 8, paddingBottom: 8 }}>
                            {PORTIONS.map((p) => (
                                <div className="zpa-coefrow" key={p.id}>
                                    <span className="nm">{p.name}</span>
                                    <input className="zpa-input" type="number" value={drafts[p.id]}
                                        onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value }))} />
                                    <span className="pct">%</span>
                                    <button className="zpa-btn zpa-btn--secondary zpa-btn--sm" onClick={() => window.adToast(`Koeficient „${p.name}“ uložený`)}>Uložiť</button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Templates by category */}
                    {CATS.map((cat) => {
                        const CatIcon = Ic()[cat.icon];
                        return (
                            <div className="zpa-card" key={cat.key}>
                                <div className="zpa-card-head">
                                    <h3 style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <span style={{ width: 34, height: 34, borderRadius: 10, background: "var(--bg-cream-soft)", color: "var(--green-700)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><CatIcon w={18} /></span>
                                        {cat.label}
                                    </h3>
                                    <button className="zpa-btn zpa-btn--secondary zpa-btn--sm" onClick={() => setAddingCat(addingCat === cat.key ? null : cat.key)}><Plus />Pridať rozloženie</button>
                                </div>
                                <div className="zpa-card--pad">
                                    {cat.tpls.map((t, i) => (
                                        <div className={"zpa-tplrow" + (t.on ? "" : " off")} key={i}>
                                            <div><span className="nm">{t.name}</span><span className={"wl" + (t.exc ? " exc" : "")}>{t.wl}</span></div>
                                            <button className="zpa-btn zpa-btn--ghost zpa-btn--sm" onClick={() => window.adToast(t.on ? "Deaktivované" : "Aktivované")}>{t.on ? "Deaktivovať" : "Aktivovať"}</button>
                                        </div>
                                    ))}
                                    {addingCat === cat.key && (
                                        <div style={{ marginTop: 14, paddingTop: 16, borderTop: "1px solid var(--line-soft)", display: "flex", flexDirection: "column", gap: 12 }}>
                                            <input className="zpa-input" placeholder={`Názov (napr. „${cat.label} 8")`} />
                                            <div style={{ display: "flex", gap: 8 }}>
                                                <input className="zpa-input" placeholder="Názov zložky" style={{ flex: 1 }} />
                                                <input className="zpa-input" placeholder="Množstvo" style={{ width: 110 }} />
                                                <select className="zpa-select" style={{ width: 90 }}><option>g</option><option>ml</option><option>ks</option></select>
                                            </div>
                                            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                                                <button className="zpa-btn zpa-btn--ghost zpa-btn--sm" onClick={() => setAddingCat(null)}>Zrušiť</button>
                                                <button className="zpa-btn zpa-btn--primary zpa-btn--sm" onClick={() => { window.adToast("Pridané do katalógu"); setAddingCat(null); }}>Pridať do katalógu</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </>
        );
    }

    window.CatalogScreen = Catalog;
})();

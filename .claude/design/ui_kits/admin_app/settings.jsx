/* global React, PageHead, Modal, Field, Toggle */
// Diéty, Systémové nastavenia, Voľné dni.

(function () {
    const { useState } = React;
    const Ic = () => window.AdIcons;

    /* ── Diéty ── */
    const DIET_SEED = [
        { id: 1, name: "KLASIK", desc: "Bežná strava bez obmedzení." },
        { id: 2, name: "VEGE", desc: "Vegetariánska — bez mäsa, s mliekom a vajcami." },
        { id: 3, name: "NO MILK", desc: "Bez mlieka a mliečnych výrobkov." },
        { id: 4, name: "NO GLUTEN", desc: "Bezlepková strava." },
        { id: 5, name: "NO MILK / NO GLUTEN", desc: "Bez mlieka aj lepku." },
        { id: 6, name: "NONONO", desc: "Bez mlieka, lepku, vajec a orechov." },
        { id: 7, name: "MONTE", desc: "Špeciálne menu pre Montessori zariadenia." },
    ];

    function Diets() {
        const [diets, setDiets] = useState(DIET_SEED);
        const [name, setName] = useState(""); const [desc, setDesc] = useState("");
        const [edit, setEdit] = useState(null); const [del, setDel] = useState(null);
        const Plus = Ic().Plus, Pencil = Ic().Pencil, Trash = Ic().Trash, AlertTriangle = Ic().AlertTriangle;
        return (
            <>
                <PageHead eyebrow="Nastavenia" title="Správa diét" desc="Pridajte, premenujte alebo upravte popisy systémových diét." />
                <div className="zpa-stack">
                    <div className="zpa-card zpa-card--pad">
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr auto", gap: 12, alignItems: "end" }}>
                            <Field label="Názov novej diéty"><input className="zpa-input" value={name} placeholder="napr. Bez lepku" onChange={(e) => setName(e.target.value)} /></Field>
                            <Field label="Popis pre prevádzku"><input className="zpa-input" value={desc} placeholder="Krátky popis diéty" onChange={(e) => setDesc(e.target.value)} /></Field>
                            <button className="zpa-btn zpa-btn--primary" disabled={!name.trim()} onClick={() => { setDiets((d) => [{ id: Date.now(), name: name.trim().toUpperCase(), desc }, ...d]); setName(""); setDesc(""); window.adToast("Diéta pridaná"); }}><Plus />Pridať diétu</button>
                        </div>
                    </div>
                    <div className="zpa-grid-cards">
                        {diets.map((d) => (
                            <div className="zpa-card zpa-card--pad" key={d.id} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                                <div>
                                    <span className="zpa-badge zpa-badge--peach" style={{ fontSize: 12 }}>{d.name}</span>
                                    {d.desc && <p style={{ margin: "10px 0 0", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5 }}>{d.desc}</p>}
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                    <button className="zpa-iconbtn" title="Upraviť" onClick={() => setEdit(d)}><Pencil /></button>
                                    <button className="zpa-iconbtn zpa-iconbtn--danger" title="Vymazať" onClick={() => setDel(d)}><Trash /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                {edit && (
                    <Modal title="Premenovať diétu" onClose={() => setEdit(null)}
                        foot={<><button className="zpa-btn zpa-btn--ghost" onClick={() => setEdit(null)}>Zrušiť</button><button className="zpa-btn zpa-btn--primary" onClick={() => { setDiets((ds) => ds.map((x) => x.id === edit.id ? edit : x)); setEdit(null); window.adToast("Diéta upravená"); }}>Uložiť</button></>}>
                        <Field label="Názov diéty"><input className="zpa-input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
                        <Field label="Popis"><textarea className="zpa-textarea" value={edit.desc} onChange={(e) => setEdit({ ...edit, desc: e.target.value })} /></Field>
                    </Modal>
                )}
                {del && (
                    <Modal title="Odstrániť diétu" onClose={() => setDel(null)} icon="AlertTriangle" iconKind="danger"
                        foot={<><button className="zpa-btn zpa-btn--ghost" onClick={() => setDel(null)}>Zrušiť</button><button className="zpa-btn zpa-btn--danger" onClick={() => { setDiets((ds) => ds.filter((x) => x.id !== del.id)); setDel(null); window.adToast("Diéta odstránená"); }}>Áno, vymazať</button></>}>
                        <p style={{ margin: 0, color: "var(--ink-2)" }}>Naozaj chcete odstrániť diétu <strong style={{ color: "var(--green-900)" }}>{del.name}</strong>? Táto akcia sa nedá vrátiť.</p>
                    </Modal>
                )}
            </>
        );
    }

    /* ── Systémové nastavenia ── */
    function Settings() {
        const [dl, setDl] = useState({ b: "10:00", bDay: false, l: "10:00", lDay: false, o: "10:00", oDay: false });
        const [auto, setAuto] = useState(true);
        const [recips, setRecips] = useState(["objednavky@zdravyprojekt.sk", "kuchyna@zdravyprojekt.sk"]);
        const [newR, setNewR] = useState("");
        const DEADLINES = [["b", "Raňajky", "bDay"], ["l", "Obed", "lDay"], ["o", "Olovrant", "oDay"]];
        return (
            <>
                <PageHead eyebrow="Nastavenia" title="Systémové nastavenia" desc="Uzávierky, automatika a kontaktné údaje." />
                <div className="zpa-stack" style={{ maxWidth: 780 }}>
                    <div className="zpa-card">
                        <div className="zpa-card-head"><h3>Časy uzávierok objednávok</h3></div>
                        <div className="zpa-card--pad">
                            <div className="zpa-grid-3">
                                {DEADLINES.map(([k, lbl, dk]) => (
                                    <div key={k} className="zpa-field">
                                        <span className="zpa-label">{lbl}</span>
                                        <input className="zpa-input" type="time" value={dl[k]} onChange={(e) => setDl({ ...dl, [k]: e.target.value })} />
                                        <label className="zpa-check" onClick={() => setDl({ ...dl, [dk]: !dl[dk] })} style={{ marginTop: 4, fontSize: 12.5 }}>
                                            <span className={"box" + (dl[dk] ? "" : "")} style={{ width: 18, height: 18, background: dl[dk] ? "var(--green-600)" : "var(--bg-cream)", borderColor: dl[dk] ? "var(--green-700)" : "var(--line-strong)", color: "#fff" }}>{dl[dk] && (() => { const C = Ic().Check; return <C w={12} />; })()}</span>
                                            Uzávierka deň vopred
                                        </label>
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--line-soft)" }}>
                                <button className="zpa-btn zpa-btn--primary" onClick={() => window.adToast("Nastavenia uložené")}>Uložiť zmeny</button>
                            </div>
                        </div>
                    </div>

                    <div className="zpa-card zpa-card--pad">
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 24, alignItems: "flex-start" }}>
                            <div>
                                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, color: "var(--green-900)", margin: "0 0 4px" }}>EduPage automatika</h3>
                                <p style={{ margin: 0, fontSize: 13.5, color: "var(--ink-3)", lineHeight: 1.5 }}>Automatické čítanie objednávok z EduPage pred uzávierkami. Manuálne načítanie zostane dostupné.</p>
                            </div>
                            <Toggle on={auto} onChange={setAuto} />
                        </div>
                    </div>

                    <div className="zpa-card">
                        <div className="zpa-card-head"><h3>Kontakt pre prevádzky</h3><p>Zobrazuje sa prevádzkam pri porciách a diétach.</p></div>
                        <div className="zpa-card--pad zpa-grid-2" style={{ gap: 14 }}>
                            <Field label="Meno kontaktnej osoby"><input className="zpa-input" defaultValue="Janka Uhríková" /></Field>
                            <Field label="Rola / poznámka"><input className="zpa-input" defaultValue="Koordinátorka stravovania" /></Field>
                            <Field label="Email"><input className="zpa-input" type="email" defaultValue="janka@zdravyprojekt.sk" /></Field>
                            <Field label="Telefón"><input className="zpa-input" type="tel" defaultValue="+421 903 123 456" /></Field>
                            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}><button className="zpa-btn zpa-btn--primary" onClick={() => window.adToast("Kontakt uložený")}>Uložiť kontakt</button></div>
                        </div>
                    </div>

                    <div className="zpa-card">
                        <div className="zpa-card-head"><h3>Príjemcovia denného reportu</h3><p>Na tieto adresy sa posiela denný prehľad objednávok (XLSX).</p></div>
                        <div className="zpa-card--pad">
                            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                                <input className="zpa-input" type="email" placeholder="email@priklad.sk" value={newR} onChange={(e) => setNewR(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newR.trim()) { setRecips((r) => [...r, newR.trim()]); setNewR(""); window.adToast("Príjemca pridaný"); } }} />
                                <button className="zpa-btn zpa-btn--primary" onClick={() => { if (newR.trim()) { setRecips((r) => [...r, newR.trim()]); setNewR(""); window.adToast("Príjemca pridaný"); } }}>Pridať</button>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {recips.map((e) => (
                                    <div key={e} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-cream-soft)", borderRadius: "var(--radius-md)", padding: "12px 16px" }}>
                                        <span style={{ fontSize: 14, color: "var(--ink-1)" }}>{e}</span>
                                        <button className="zpa-btn zpa-btn--ghost zpa-btn--sm" style={{ color: "var(--coral-600)" }} onClick={() => { setRecips((r) => r.filter((x) => x !== e)); window.adToast("Príjemca odstránený"); }}>Odstrániť</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    /* ── Voľné dni ── */
    const HOL_SEED = [
        { id: 1, date: "2025-07-01", reason: "Letné prázdniny", up: true },
        { id: 2, date: "2025-07-05", reason: "Sviatok — sv. Cyril a Metod", up: true },
        { id: 3, date: "2025-08-29", reason: "Výročie SNP", up: true },
        { id: 4, date: "2025-05-01", reason: "Sviatok práce", up: false },
    ];
    const fmt = (s) => new Intl.DateTimeFormat("sk-SK", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(s + "T12:00:00"));

    function Holidays() {
        const [tab, setTab] = useState("single");
        const [hols, setHols] = useState(HOL_SEED);
        const up = hols.filter((h) => h.up), past = hols.filter((h) => !h.up);
        const Trash = Ic().Trash;
        const Row = ({ h }) => (
            <div className={"zpa-listrow" + (h.up ? "" : " past")}>
                <div><div className="lr-ttl">{fmt(h.date)}</div>{h.reason && <div className="lr-sub">{h.reason}</div>}</div>
                <button className="zpa-iconbtn zpa-iconbtn--danger" title="Odstrániť" onClick={() => { setHols((x) => x.filter((y) => y.id !== h.id)); window.adToast("Voľný deň odstránený"); }}><Trash /></button>
            </div>
        );
        return (
            <>
                <PageHead eyebrow="Nastavenia" title="Voľné dni" desc="V tieto dni nie je možné zadať objednávku. Nastavte jednotlivé dni alebo celý úsek." />
                <div className="zpa-stack" style={{ maxWidth: 780 }}>
                    <div className="zpa-card" style={{ overflow: "hidden" }}>
                        <div className="zpa-tabs">
                            <button className={"zpa-tab" + (tab === "single" ? " active" : "")} onClick={() => setTab("single")}>+ Pridať deň</button>
                            <button className={"zpa-tab" + (tab === "range" ? " active" : "")} onClick={() => setTab("range")}>+ Pridať úsek dní</button>
                        </div>
                        <div className="zpa-card--pad">
                            {tab === "single" ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                                    <div className="zpa-grid-2">
                                        <Field label="Dátum"><input className="zpa-input" type="date" /></Field>
                                        <Field label="Poznámka" hint="(nepovinné)"><input className="zpa-input" placeholder="napr. Sviatok, dovolenka…" /></Field>
                                    </div>
                                    <div><button className="zpa-btn zpa-btn--primary" onClick={() => window.adToast("Voľný deň pridaný")}>Pridať deň</button></div>
                                </div>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                                    <div className="zpa-grid-3">
                                        <Field label="Od"><input className="zpa-input" type="date" /></Field>
                                        <Field label="Do"><input className="zpa-input" type="date" /></Field>
                                        <Field label="Poznámka" hint="(nepovinné)"><input className="zpa-input" placeholder="napr. Vianočné sviatky" /></Field>
                                    </div>
                                    <div><button className="zpa-btn zpa-btn--primary" onClick={() => window.adToast("Úsek pridaný")}>Pridať úsek</button></div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="zpa-card">
                        <div className="zpa-card-head"><h3>Nastavené voľné dni</h3></div>
                        <div>
                            {up.length > 0 && <><div className="zpa-listgroup-label">Nadchádzajúce</div>{up.map((h) => <Row key={h.id} h={h} />)}</>}
                            {past.length > 0 && <><div className="zpa-listgroup-label">Minulé</div>{past.map((h) => <Row key={h.id} h={h} />)}</>}
                        </div>
                    </div>
                </div>
            </>
        );
    }

    window.DietsScreen = Diets;
    window.SettingsScreen = Settings;
    window.HolidaysScreen = Holidays;
})();

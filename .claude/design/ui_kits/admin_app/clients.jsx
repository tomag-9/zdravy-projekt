/* global React, PageHead, Modal, Field, SearchBox, Toggle, Checkbox */
// Prevádzky — operations list (search + table + CRUD modals) and a detail view.

(function () {
    const { useState } = React;
    const Ic = () => window.AdIcons;

    const SEED = [
        { id: 1, company: "MŠ Ružinová", email: "ruzinova@ms.sk", billing: "Materská škola Ružinová, s.r.o.", ico: "45872145", edupage: false, av: "green" },
        { id: 2, company: "ZŠ Vajnorská 47", email: "jedalen@zsvajnorska.sk", billing: "Základná škola Vajnorská", ico: "31245789", edupage: true, av: "teal" },
        { id: 3, company: "MŠ Slnečnica", email: "skolka@slnecnica.sk", billing: "", ico: "", edupage: false, av: "peach" },
        { id: 4, company: "ZŠ Nábrežná", email: "strava@zsnabrezna.sk", billing: "ZŠ Nábrežná, Bratislava", ico: "37129654", edupage: true, av: "green" },
        { id: 5, company: "Rodina Kováčová", email: "kovacova@gmail.com", billing: "", ico: "", edupage: false, av: "peach" },
    ];

    const EMPTY = { company: "", billing: "", email: "", ico: "", dic: "", edupage: false, apiId: "", url: "" };

    function OperationForm({ form, setForm, urlResult, onTest, testing }) {
        return (
            <>
                <Field label="Názov prevádzky" req hint="(interný)">
                    <input className="zpa-input" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                </Field>
                <Field label="Názov spoločnosti" hint="(fakturácia)">
                    <input className="zpa-input" value={form.billing} onChange={(e) => setForm({ ...form, billing: e.target.value })} />
                </Field>
                <Field label="Email" req>
                    <input className="zpa-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </Field>
                <div className="zpa-grid-2">
                    <Field label="IČO"><input className="zpa-input" value={form.ico} onChange={(e) => setForm({ ...form, ico: e.target.value })} /></Field>
                    <Field label="DIČ"><input className="zpa-input" value={form.dic} onChange={(e) => setForm({ ...form, dic: e.target.value })} /></Field>
                </div>
                <Checkbox on={form.edupage} onChange={(v) => setForm({ ...form, edupage: v })}>Edupage prevádzka</Checkbox>
                {form.edupage && (
                    <>
                        <Field label="Edupage identifikátor">
                            <input className="zpa-input" placeholder="Identifikátor pre párovanie v Edupage súboroch" value={form.apiId} onChange={(e) => setForm({ ...form, apiId: e.target.value })} />
                        </Field>
                        <Field label="MealsGuest URL">
                            <div style={{ display: "flex", gap: 8 }}>
                                <input className="zpa-input" placeholder="https://skola.edupage.org/menu/mealsGuest?id=…" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} style={{ flex: 1 }} />
                                <button className="zpa-btn zpa-btn--secondary zpa-btn--sm" onClick={onTest} disabled={testing} type="button">{testing ? "Testujem…" : "Test"}</button>
                            </div>
                            {urlResult && <span style={{ fontSize: 12, color: urlResult.ok ? "var(--green-600)" : "var(--coral-600)" }}>{urlResult.msg}</span>}
                        </Field>
                    </>
                )}
            </>
        );
    }

    function ClientDetail({ op, onBack }) {
        const ArrowL = Ic().ChevronLeft, Building = Ic().Building, Salad = Ic().Salad, Sliders = Ic().Sliders;
        const [portions, setPortions] = useState({ 1: true, 2: true, 3: false, 4: false, 5: false });
        const [diets, setDiets] = useState({ KLASIK: true, VEGE: true, "NO MILK": true, "NO GLUTEN": false, NONONO: false });
        const PORTIONS = [[1, "Jasle (do 3 r.)"], [2, "Predškoláci (3–6 r.)"], [3, "1. stupeň"], [4, "2. stupeň"], [5, "Dospelí"]];
        return (
            <>
                <PageHead eyebrow="Prevádzky › Detail" title={op.company} desc={op.email}
                    actions={<button className="zpa-btn zpa-btn--ghost" onClick={onBack}><ArrowL />Späť na zoznam</button>} />
                <div className="zpa-stack">
                    <div className="zpa-grid-2">
                        <div className="zpa-card">
                            <div className="zpa-card-head"><h3 style={{ display: "flex", gap: 8, alignItems: "center" }}><Building w={18} />Fakturačné údaje</h3></div>
                            <div className="zpa-card--pad" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                <Field label="Fakturačný názov"><input className="zpa-input" defaultValue={op.billing} /></Field>
                                <div className="zpa-grid-2">
                                    <Field label="IČO"><input className="zpa-input" defaultValue={op.ico} /></Field>
                                    <Field label="DIČ"><input className="zpa-input" defaultValue="" /></Field>
                                </div>
                                <div style={{ display: "flex", justifyContent: "flex-end" }}><button className="zpa-btn zpa-btn--primary zpa-btn--sm" onClick={() => window.adToast("Uložené")}>Uložiť</button></div>
                            </div>
                        </div>
                        <div className="zpa-card">
                            <div className="zpa-card-head"><h3 style={{ display: "flex", gap: 8, alignItems: "center" }}><Sliders w={18} />Dostupné porcie</h3><p>Vekové skupiny, ktoré môže prevádzka objednávať.</p></div>
                            <div className="zpa-card--pad" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                {PORTIONS.map(([id, nm]) => (
                                    <div key={id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                        <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--green-900)", fontSize: 14 }}>{nm}</span>
                                        <Toggle on={portions[id]} onChange={(v) => setPortions((p) => ({ ...p, [id]: v }))} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="zpa-card">
                        <div className="zpa-card-head"><h3 style={{ display: "flex", gap: 8, alignItems: "center" }}><Salad w={18} />Povolené diéty</h3><p>Ktoré diéty vidí prevádzka pri objednávaní.</p></div>
                        <div className="zpa-card--pad" style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                            {Object.keys(diets).map((d) => (
                                <button key={d} className={"zpa-badge " + (diets[d] ? "zpa-badge--green" : "zpa-badge--gray")} style={{ fontSize: 13, padding: "8px 14px", cursor: "pointer", border: "1px solid transparent" }}
                                    onClick={() => setDiets((s) => ({ ...s, [d]: !s[d] }))}>
                                    {diets[d] && (() => { const C = Ic().Check; return <C w={13} />; })()} {d}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </>
        );
    }

    function Clients() {
        const [rows, setRows] = useState(SEED);
        const [q, setQ] = useState("");
        const [detail, setDetail] = useState(null);
        const [create, setCreate] = useState(false);
        const [edit, setEdit] = useState(null);
        const [del, setDel] = useState(null);
        const [form, setForm] = useState(EMPTY);
        const [urlResult, setUrlResult] = useState(null);
        const [testing, setTesting] = useState(false);

        const Plus = Ic().Plus, Pencil = Ic().Pencil, Trash = Ic().Trash, Sliders = Ic().Sliders, Link = Ic().Link, AlertTriangle = Ic().AlertTriangle;

        const fakeTest = () => { setTesting(true); setUrlResult(null); setTimeout(() => { setTesting(false); setUrlResult({ ok: true, msg: "✓ OK — 128 porcií (raňajky, obed, olovrant)" }); }, 900); };
        const filtered = rows.filter((r) => (r.company + r.email + r.billing).toLowerCase().includes(q.toLowerCase()));

        if (detail) return <ClientDetail op={detail} onBack={() => setDetail(null)} />;

        return (
            <>
                <PageHead eyebrow="Prevádzky" title="Správa prevádzok" desc="Prevádzky, ich fakturačné údaje, porcie a diéty."
                    actions={<button className="zpa-btn zpa-btn--primary" onClick={() => { setForm(EMPTY); setUrlResult(null); setCreate(true); }}><Plus />Pridať prevádzku</button>} />
                <div className="zpa-stack">
                    <SearchBox value={q} onChange={setQ} placeholder="Hľadať prevádzky…" />
                    <div className="zpa-card" style={{ overflow: "hidden" }}>
                        <div className="zpa-table-wrap">
                            <table className="zpa-table">
                                <thead><tr><th>Prevádzka</th><th className="r">Akcie</th></tr></thead>
                                <tbody>
                                    {filtered.map((u) => (
                                        <tr key={u.id}>
                                            <td>
                                                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                                    <span className={"zpa-avatar-sm " + u.av}>{u.company.charAt(0)}</span>
                                                    <div>
                                                        <div className="zpa-cellname" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                            {u.company}
                                                            {u.edupage && <span className="zpa-badge zpa-badge--teal"><Link w={11} />Edupage</span>}
                                                        </div>
                                                        <div className="zpa-cellsub">{u.email}{u.billing ? " · " + u.billing : ""}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="r">
                                                <div style={{ display: "inline-flex", gap: 2 }}>
                                                    <button className="zpa-iconbtn" title="Upraviť" onClick={() => { setEdit(u); setForm({ company: u.company, billing: u.billing, email: u.email, ico: u.ico, dic: "", edupage: u.edupage, apiId: "", url: "" }); setUrlResult(null); }}><Pencil /></button>
                                                    <button className="zpa-iconbtn" title="Nastavenia" onClick={() => setDetail(u)}><Sliders /></button>
                                                    <button className="zpa-iconbtn zpa-iconbtn--danger" title="Odstrániť" onClick={() => setDel(u)}><Trash /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filtered.length === 0 && <tr><td colSpan={2} className="zpa-empty">Žiadne prevádzky.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {create && (
                    <Modal title="Pridať prevádzku" onClose={() => setCreate(false)}
                        foot={<><button className="zpa-btn zpa-btn--ghost" onClick={() => setCreate(false)}>Zrušiť</button>
                            <button className="zpa-btn zpa-btn--primary" onClick={() => { setRows((r) => [...r, { id: Date.now(), company: form.company || "Nová prevádzka", email: form.email, billing: form.billing, ico: form.ico, edupage: form.edupage, av: "green" }]); setCreate(false); window.adToast("Prevádzka vytvorená"); }}>Pridať</button></>}>
                        <OperationForm form={form} setForm={setForm} urlResult={urlResult} onTest={fakeTest} testing={testing} />
                    </Modal>
                )}
                {edit && (
                    <Modal title="Upraviť prevádzku" onClose={() => setEdit(null)}
                        foot={<><button className="zpa-btn zpa-btn--ghost" onClick={() => setEdit(null)}>Zrušiť</button>
                            <button className="zpa-btn zpa-btn--primary" onClick={() => { setRows((r) => r.map((x) => x.id === edit.id ? { ...x, company: form.company, email: form.email, billing: form.billing, ico: form.ico, edupage: form.edupage } : x)); setEdit(null); window.adToast("Prevádzka upravená"); }}>Uložiť</button></>}>
                        <OperationForm form={form} setForm={setForm} urlResult={urlResult} onTest={fakeTest} testing={testing} />
                    </Modal>
                )}
                {del && (
                    <Modal title="Odstrániť prevádzku" onClose={() => setDel(null)} icon="AlertTriangle" iconKind="danger"
                        foot={<><button className="zpa-btn zpa-btn--ghost" onClick={() => setDel(null)}>Zrušiť</button>
                            <button className="zpa-btn zpa-btn--danger" onClick={() => { setRows((r) => r.filter((x) => x.id !== del.id)); setDel(null); window.adToast("Prevádzka odstránená"); }}>Odstrániť</button></>}>
                        <p style={{ margin: 0, color: "var(--ink-2)", lineHeight: 1.55 }}>Naozaj chcete odstrániť prevádzku <strong style={{ color: "var(--green-900)" }}>{del.company}</strong>? Táto akcia je nevratná a vymaže aj všetky jej objednávky.</p>
                    </Modal>
                )}
            </>
        );
    }

    window.ClientsScreen = Clients;
})();

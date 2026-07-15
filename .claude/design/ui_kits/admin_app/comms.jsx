/* global React, PageHead, Modal, Field, SearchBox */
// Logy, Notifikácie, Správa adminov.

(function () {
    const { useState } = React;
    const Ic = () => window.AdIcons;

    /* ── Logy ── */
    const LOG_SEED = [
        { id: 1, ts: "12.06.2025 07:41:03", level: "INFO", src: "edupage.import:88", msg: "Import ZŠ Vajnorská 47 — 128 porcií spracovaných." },
        { id: 2, ts: "12.06.2025 07:39:55", level: "ERROR", src: "edupage.import:142", msg: "Neznámy identifikátor jedla v riadku 14 (nabrezna_obed.xml).", tb: "Traceback (most recent call last):\n  File \"edupage/import.py\", line 142, in parse_row\n    meal = MEAL_MAP[code]\nKeyError: 'X-4471'" },
        { id: 3, ts: "12.06.2025 07:30:00", level: "WARNING", src: "notifications.push:51", msg: "3 neplatné push subscriptions odstránené pri odosielaní." },
        { id: 4, ts: "12.06.2025 06:00:12", level: "INFO", src: "reports.daily:33", msg: "Denný report odoslaný na 2 adresy." },
        { id: 5, ts: "11.06.2025 22:14:07", level: "CRITICAL", src: "billing.export:210", msg: "Zlyhalo generovanie mesačnej faktúry — chýba IČO prevádzky #5.", tb: "Traceback (most recent call last):\n  File \"billing/export.py\", line 210, in build_invoice\n    raise MissingFieldError('ico')\nbilling.errors.MissingFieldError: ico" },
    ];
    const LEVELS = ["INFO", "WARNING", "ERROR", "CRITICAL"];
    const lvlIcon = (l) => { const I = Ic(); return l === "CRITICAL" || l === "ERROR" ? I.XCircle : l === "WARNING" ? I.AlertTriangle : I.Info; };

    function Logs() {
        const [active, setActive] = useState(["WARNING", "ERROR", "CRITICAL"]);
        const [q, setQ] = useState("");
        const [open, setOpen] = useState([]);
        const RefreshCw = Ic().RefreshCw, ChevronRight = Ic().ChevronRight, ChevronDown = Ic().ChevronDown;
        const counts = LOG_SEED.reduce((a, e) => ({ ...a, [e.level]: (a[e.level] || 0) + 1 }), {});
        const rows = LOG_SEED.filter((e) => active.includes(e.level) && (e.msg + e.src).toLowerCase().includes(q.toLowerCase()));
        const toggle = (id) => setOpen((o) => o.includes(id) ? o.filter((x) => x !== id) : [...o, id]);
        return (
            <>
                <PageHead eyebrow="Nastavenia" title="Logy" desc="Dôležité systémové udalosti z backendu."
                    actions={<button className="zpa-btn zpa-btn--secondary" onClick={() => window.adToast("Obnovené")}><RefreshCw />Obnoviť</button>} />
                <div className="zpa-stack">
                    <div className="zpa-grid-cards" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
                        {LEVELS.map((l) => { const Li = lvlIcon(l); return (
                            <div className="zpa-statcard" key={l}>
                                <span className={"zpa-lvl " + l}><Li />{l}</span>
                                <span className="num">{counts[l] || 0}</span>
                            </div>
                        ); })}
                    </div>
                    <div className="zpa-card zpa-card--pad">
                        <SearchBox value={q} onChange={setQ} placeholder="Hľadať v správach alebo tracebacku…" />
                        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                            {LEVELS.map((l) => { const Li = lvlIcon(l); const on = active.includes(l); return (
                                <button key={l} className={"zpa-lvl btn " + (on ? l : "off")} onClick={() => setActive((a) => on ? a.filter((x) => x !== l) : [...a, l])}><Li />{l}</button>
                            ); })}
                        </div>
                    </div>
                    <div className="zpa-card">
                        <div className="zpa-card-head"><h3>Záznamy ({rows.length})</h3></div>
                        <div>
                            {rows.map((e) => { const Li = lvlIcon(e.level); const isOpen = open.includes(e.id); const Chev = isOpen ? ChevronDown : ChevronRight; return (
                                <div className="zpa-log" key={e.id}>
                                    <div className="ts">{e.ts}</div>
                                    <span className={"zpa-lvl " + e.level}><Li />{e.level}</span>
                                    <div>
                                        <div className="src">{e.src}</div>
                                        <pre className="msg">{e.msg}</pre>
                                        {e.tb && isOpen && <pre className="tb">{e.tb}</pre>}
                                    </div>
                                    {e.tb ? <button className="zpa-btn zpa-btn--ghost zpa-btn--sm" onClick={() => toggle(e.id)}><Chev w={14} />Detail</button> : <span />}
                                </div>
                            ); })}
                            {rows.length === 0 && <div className="zpa-empty">Žiadne logy pre aktuálne filtre.</div>}
                        </div>
                    </div>
                </div>
            </>
        );
    }

    /* ── Notifikácie ── */
    function Notifications() {
        const [title, setTitle] = useState(""); const [body, setBody] = useState(""); const [url, setUrl] = useState("/home");
        const Send = Ic().Send, Info = Ic().Info;
        return (
            <>
                <PageHead eyebrow="Komunikácia" title="Push notifikácie" desc="Odošlite notifikáciu jednej prevádzke alebo všetkým aktívnym odberateľom." />
                <div className="zpa-stack" style={{ maxWidth: 720 }}>
                    <div className="zpa-card">
                        <div className="zpa-card-head"><h3>Odoslať notifikáciu</h3></div>
                        <div className="zpa-card--pad" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            <Field label="Príjemca">
                                <select className="zpa-select"><option>Všetci aktívni odberatelia</option><option>MŠ Ružinová</option><option>ZŠ Vajnorská 47</option><option>MŠ Slnečnica</option></select>
                            </Field>
                            <Field label="Nadpis"><input className="zpa-input" value={title} placeholder="Napr. Pripomienka objednávky" onChange={(e) => setTitle(e.target.value)} /></Field>
                            <Field label="Správa"><textarea className="zpa-textarea" value={body} placeholder="Text notifikácie…" onChange={(e) => setBody(e.target.value)} /></Field>
                            <Field label="Cieľová stránka (URL)" hint="kam sa otvorí po kliknutí">
                                <input className="zpa-input" value={url} onChange={(e) => setUrl(e.target.value)} />
                            </Field>
                            <div><button className="zpa-btn zpa-btn--primary" disabled={!title.trim() || !body.trim()} onClick={() => { window.adToast("Notifikácia odoslaná"); setTitle(""); setBody(""); }}><Send />Odoslať notifikáciu</button></div>
                        </div>
                    </div>
                    <div className="zpa-notice zpa-notice--teal">
                        <Info />
                        <div>
                            <strong>Informácie</strong>
                            <ul style={{ margin: "6px 0 0", paddingLeft: 18, lineHeight: 1.6 }}>
                                <li>Notifikácie dostanú len používatelia, ktorí si nainštalovali aplikáciu a povolili notifikácie.</li>
                                <li>Automatické pripomienky sa odosielajú 15 minút pred uzávierkou objednávky.</li>
                                <li>Neplatné subscriptions sa pri odosielaní automaticky odstraňujú.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    /* ── Správa adminov ── */
    const ADMIN_SEED = [
        { id: 1, name: "Janka Uhríková", email: "janka@zdravyprojekt.sk", av: "green" },
        { id: 2, name: "Vlado Uhrík", email: "vlado@zdravyprojekt.sk", av: "peach" },
        { id: 3, name: "Peter Dvořák", email: "peter@zdravyprojekt.sk", av: "teal" },
    ];
    function Admins() {
        const [rows, setRows] = useState(ADMIN_SEED);
        const [q, setQ] = useState(""); const [create, setCreate] = useState(false); const [del, setDel] = useState(null);
        const [form, setForm] = useState({ first: "", last: "", email: "" });
        const Plus = Ic().Plus, Pencil = Ic().Pencil, Trash = Ic().Trash, AlertTriangle = Ic().AlertTriangle;
        const filtered = rows.filter((r) => (r.name + r.email).toLowerCase().includes(q.toLowerCase()));
        return (
            <>
                <PageHead eyebrow="Oprávnenia" title="Správa adminov" desc="Admin účty a ich prístupové údaje."
                    actions={<button className="zpa-btn zpa-btn--primary" onClick={() => { setForm({ first: "", last: "", email: "" }); setCreate(true); }}><Plus />Pridať admina</button>} />
                <div className="zpa-stack">
                    <SearchBox value={q} onChange={setQ} placeholder="Hľadať používateľov…" />
                    <div className="zpa-card" style={{ overflow: "hidden" }}>
                        <div className="zpa-table-wrap">
                            <table className="zpa-table">
                                <thead><tr><th>Admin</th><th className="r">Akcie</th></tr></thead>
                                <tbody>
                                    {filtered.map((u) => (
                                        <tr key={u.id}>
                                            <td>
                                                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                                    <span className={"zpa-avatar-sm " + u.av}>{u.name.charAt(0)}</span>
                                                    <div><div className="zpa-cellname">{u.name}</div><div className="zpa-cellsub">{u.email}</div></div>
                                                </div>
                                            </td>
                                            <td className="r">
                                                <div style={{ display: "inline-flex", gap: 2 }}>
                                                    <button className="zpa-iconbtn" title="Upraviť" onClick={() => window.adToast("Úprava admina (demo)")}><Pencil /></button>
                                                    <button className="zpa-iconbtn zpa-iconbtn--danger" title="Odstrániť" onClick={() => setDel(u)}><Trash /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filtered.length === 0 && <tr><td colSpan={2} className="zpa-empty">Žiadni admini.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                {create && (
                    <Modal title="Pridať admina" onClose={() => setCreate(false)}
                        foot={<><button className="zpa-btn zpa-btn--ghost" onClick={() => setCreate(false)}>Zrušiť</button><button className="zpa-btn zpa-btn--primary" onClick={() => { setRows((r) => [...r, { id: Date.now(), name: (form.first + " " + form.last).trim() || form.email, email: form.email, av: "green" }]); setCreate(false); window.adToast("Admin účet vytvorený"); }}>Vytvoriť</button></>}>
                        <div className="zpa-grid-2">
                            <Field label="Meno"><input className="zpa-input" value={form.first} onChange={(e) => setForm({ ...form, first: e.target.value })} /></Field>
                            <Field label="Priezvisko"><input className="zpa-input" value={form.last} onChange={(e) => setForm({ ...form, last: e.target.value })} /></Field>
                        </div>
                        <Field label="Email" req><input className="zpa-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
                        <p style={{ margin: 0, fontSize: 12.5, color: "var(--ink-3)" }}>Admin dostane email s odkazom na nastavenie hesla.</p>
                    </Modal>
                )}
                {del && (
                    <Modal title="Vymazať účet" onClose={() => setDel(null)} icon="AlertTriangle" iconKind="danger"
                        foot={<><button className="zpa-btn zpa-btn--ghost" onClick={() => setDel(null)}>Zrušiť</button><button className="zpa-btn zpa-btn--danger" onClick={() => { setRows((r) => r.filter((x) => x.id !== del.id)); setDel(null); window.adToast("Účet vymazaný"); }}>Vymazať</button></>}>
                        <p style={{ margin: 0, color: "var(--ink-2)", lineHeight: 1.55 }}>Naozaj chcete vymazať účet <strong style={{ color: "var(--green-900)" }}>{del.email}</strong>? Táto akcia je nevratná.</p>
                    </Modal>
                )}
            </>
        );
    }

    window.LogsScreen = Logs;
    window.NotificationsScreen = Notifications;
    window.AdminsScreen = Admins;
})();

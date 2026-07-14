/* global React, PageHead */
// Objednávky (Edupage) — date, per-operation status grid, drop zone, uploaded list.

(function () {
    const { useState } = React;
    const Ic = () => window.AdIcons;

    const SCHOOLS = [
        { id: 2, name: "ZŠ Vajnorská 47", uploaded: true, count: 1 },
        { id: 4, name: "ZŠ Nábrežná", uploaded: true, count: 2 },
        { id: 6, name: "ZŠ Karloveská", uploaded: false, count: 0 },
        { id: 7, name: "Gymnázium Metodova", uploaded: false, count: 0 },
    ];
    const UPLOADED = [
        { id: 1, file: "vajnorska_2025-06-12.xml", op: "ZŠ Vajnorská 47", status: "processed", when: "12.6.2025 07:41" },
        { id: 2, file: "nabrezna_ranajky.xml", op: "ZŠ Nábrežná", status: "processed", when: "12.6.2025 07:38" },
        { id: 3, file: "nabrezna_obed.xml", op: "ZŠ Nábrežná", status: "error", when: "12.6.2025 07:39", err: "Neznámy identifikátor jedla v riadku 14." },
    ];

    function Edupage() {
        const [drag, setDrag] = useState(false);
        const done = SCHOOLS.filter((s) => s.uploaded).length;
        const Upload = Ic().Upload, Folder = Ic().Folder, Check = Ic().Check, CheckCircle = Ic().CheckCircle, XCircle = Ic().XCircle, AlertTriangle = Ic().AlertTriangle;

        return (
            <>
                <PageHead eyebrow="Import" title="Objednávky (Edupage)" desc="Nahrávanie objednávok z Edupage exportov." />
                <div className="zpa-stack">
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 24, flexWrap: "wrap" }}>
                        <div className="zpa-field" style={{ maxWidth: 220 }}>
                            <span className="zpa-label">Dátum objednávok</span>
                            <input className="zpa-input" type="date" defaultValue="2025-06-12" />
                        </div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 8, paddingBottom: 8 }}>
                            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 28, color: done === SCHOOLS.length ? "var(--green-600)" : "var(--green-900)" }}>{done}/{SCHOOLS.length}</span>
                            <span style={{ color: "var(--ink-3)", fontSize: 14 }}>prevádzok nahratých</span>
                        </div>
                    </div>

                    <div className="zpa-card">
                        <div className="zpa-card-head"><h3>Stav prevádzok pre 12. jún 2025</h3></div>
                        <div className="zpa-card--pad">
                            <div className="zpa-statusgrid">
                                {SCHOOLS.map((s) => (
                                    <div key={s.id} className={"zpa-statuschip " + (s.uploaded ? "done" : "wait")}>
                                        <span className="ck">{s.uploaded ? <Check /> : <span style={{ width: 15, height: 15, border: "2px solid currentColor", borderRadius: 4, display: "inline-block" }} />}</span>
                                        <span className="nm">{s.name}</span>
                                        {s.count > 1 && <span className="n">{s.count}×</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "var(--green-800)", margin: "0 0 12px" }}>Nahrať súbory</h3>
                        <div className={"zpa-dropzone" + (drag ? " drag" : "")}
                            onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
                            onDrop={(e) => { e.preventDefault(); setDrag(false); window.adToast("Súbory pridané do fronty"); }}
                            onClick={() => window.adToast("Výber súborov (demo)")}>
                            <div className="ic"><Folder /></div>
                            <div className="t">Presuň súbory sem alebo klikni pre výber</div>
                            <div className="s">Môžeš nahrať viac súborov naraz (.xml, .xlsx)</div>
                        </div>
                    </div>

                    <div className="zpa-card">
                        <div className="zpa-card-head"><h3>Nahrané súbory pre 12. jún 2025</h3></div>
                        <div>
                            {UPLOADED.map((u) => {
                                const St = u.status === "processed" ? CheckCircle : u.status === "error" ? XCircle : AlertTriangle;
                                const color = u.status === "processed" ? "var(--green-600)" : u.status === "error" ? "var(--coral-600)" : "var(--mustard-700)";
                                return (
                                    <div className="zpa-listrow" key={u.id}>
                                        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                                            <span style={{ color, marginTop: 2 }}><St w={18} /></span>
                                            <div>
                                                <div className="lr-ttl" style={{ textTransform: "none" }}>{u.file}</div>
                                                <div className="lr-sub">{u.op} · {u.when}</div>
                                                {u.err && <div className="lr-sub" style={{ color: "var(--coral-600)" }}>{u.err}</div>}
                                            </div>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                            <span className={"zpa-badge " + (u.status === "processed" ? "zpa-badge--green" : u.status === "error" ? "zpa-badge--coral" : "zpa-badge--honey")}>
                                                {u.status === "processed" ? "Spracovaný" : u.status === "error" ? "Chyba" : "Čaká"}
                                            </span>
                                            <button className="zpa-btn zpa-btn--ghost zpa-btn--sm" style={{ color: "var(--coral-600)" }} onClick={() => window.adToast("Zmazané")}>Zmazať</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </>
        );
    }

    window.EdupageScreen = Edupage;
})();

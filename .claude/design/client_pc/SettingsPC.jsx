/* global React */
const { User: STPUser, ChevronRight: STPChev, Utensils: STPUtensils, Apple: STPApple,
        Bell: STPBell, LogOut: STPLogOut, Info: STPInfo, Mail: STPMail, Phone: STPPhone,
        Users: STPUsers, Lock: STPLock } = window.ZpIcons;

/* ============================================================
 * SettingsPC — desktop. Left sub-nav + content panel.
 * Sections: Účet · Dostupné porcie · Dostupné diéty · Podpora
 * ============================================================ */

const PC_PORTIONS = [
    { id: "ms", title: "Materská škola", desc: "Pre deti vo veku 3–6 rokov. Menšie porcie, jemnejšie korenenie, ovocie a zelenina krájané na drobno.", coef: 1.0 },
    { id: "zs", title: "Základná škola", desc: "Pre deti vo veku 7–11 rokov. Stredne veľké porcie s vyššou energiou.", coef: 1.15 },
    { id: "zam", title: "Zamestnanci", desc: "Dospelé porcie. Plnohodnotné množstvo, štandardné korenenie.", coef: 1.35 },
];

const PC_DIETS = [
    { code: "VEGGIE", name: "Vegetariánska", desc: "Bez mäsa. Zachované mliečne výrobky a vajcia." },
    { code: "NO MILK", name: "Bez mliečnych výrobkov", desc: "Vynechané všetky mliečne výrobky, vrátane masla a smotany." },
    { code: "NO GLUTEN", name: "Bezlepková", desc: "Bez pšenice, žita, jačmeňa a ovsa. Vhodné pri celiakii." },
    { code: "NO MILK / NO GLUTEN", name: "Bez mlieka a lepku", desc: "Kombinácia oboch obmedzení." },
    { code: "NONONO", name: "Bez mlieka, lepku a vajec", desc: "Najprísnejší variant pri kombinovaných alergiách." },
    { code: "HISTAMIN", name: "Nízkohistamínová", desc: "Bez fermentovaných potravín a zrelých syrov." },
    { code: "NO ORECH", name: "Bez orechov", desc: "Vynechané všetky druhy orechov a arašidov." },
    { code: "NO PARADAJKA", name: "Bez paradajok", desc: "Bez paradajok v akejkoľvek forme (čerstvé, pretlak, omáčka)." },
    { code: "NO FISH", name: "Bez rýb", desc: "Bez rýb a morských plodov." },
    { code: "NO EGG", name: "Bez vajec", desc: "Vynechané vajcia aj ako prísada do cesta a omáčok." },
    { code: "NO ZEMIAK", name: "Bez zemiakov", desc: "Bez zemiakov v hlavnom jedle a prílohách." },
    { code: "NO SOJA", name: "Bez sóje", desc: "Bez sóje a sójových produktov." },
    { code: "NO ZELER", name: "Bez zeleru", desc: "Vynechaný zeler vo všetkých formách (vňať, hľuza, sušený)." },
];

function AccountPanel({ navigate }) {
    return (
        <div>
            <div className="zp-settings-section">
                <h2>Účet</h2>
                <div className="zp-settings-list">
                    <button className="zp-settings-row">
                        <span className="ic"><STPUser /></span>
                        <span className="body">
                            <span className="ttl">Janka Lúková</span>
                            <span className="sub">Materská škola Lúka</span>
                            <span className="sub">janka@skolka-luka.sk</span>
                        </span>
                        <span className="chev"><STPChev w={18} /></span>
                    </button>
                    <button className="zp-settings-row">
                        <span className="ic"><STPBell /></span>
                        <span className="body">
                            <span className="ttl">Upozornenia</span>
                            <span className="sub">Pripomienky a nedeľné notifikácie</span>
                        </span>
                        <span className="chev"><STPChev w={18} /></span>
                    </button>
                </div>
            </div>

            <div className="zp-settings-section">
                <h2>Podpora</h2>
                <div className="zp-settings-list">
                    <button className="zp-settings-row">
                        <span className="ic"><STPInfo /></span>
                        <span className="body">
                            <span className="ttl">O aplikácii</span>
                            <span className="sub">Verzia 2.1 · Zdravý projekt s. r. o.</span>
                        </span>
                        <span className="chev"><STPChev w={18} /></span>
                    </button>
                    <button className="zp-settings-row" onClick={() => navigate("login")}>
                        <span className="ic" style={{ background: "rgba(201,46,82,0.1)", color: "var(--coral-600)" }}><STPLogOut /></span>
                        <span className="body">
                            <span className="ttl" style={{ color: "var(--coral-600)" }}>Odhlásiť sa</span>
                            <span className="sub">Vrátite sa na prihlásenie</span>
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}

function PortionsPanel() {
    return (
        <div>
            <div className="zp-readonly-banner">
                <STPLock />
                <div><strong>Iba na čítanie.</strong> Povolené typy porcií nastavujeme v Zdravom projekte. Ak chcete pridať alebo upraviť typ porcie, ozvite sa nám.</div>
            </div>
            <div className="pc-rdgrid-3" style={{ marginBottom: 16 }}>
                {PC_PORTIONS.map((p) => (
                    <div className="zp-portion-card" key={p.id} style={{ flexDirection: "column", alignItems: "flex-start" }}>
                        <div className="ic"><STPUsers /></div>
                        <div className="body" style={{ marginTop: 12 }}>
                            <div className="ttl">{p.title}</div>
                            <div className="desc">{p.desc}</div>
                            <span className="coef">Koeficient · {p.coef.toFixed(2)}× MŠ</span>
                        </div>
                    </div>
                ))}
            </div>
            <div className="zp-contact-card">
                <span className="eye">Potrebujete zmenu?</span>
                <h4>Kontakt pre úpravu povolených porcií</h4>
                <p>Pre rozšírenie alebo zmenu typov porcií kontaktujte zodpovednú osobu v Zdravom projekte.</p>
                <div className="contact-row"><STPUser w={14} /> Vlado Kováč · prevádzkový riaditeľ</div>
                <div className="contact-row"><STPMail w={14} /> vlado@zdravyprojekt.sk</div>
                <div className="contact-row"><STPPhone w={14} /> +421 905 123 456</div>
            </div>
        </div>
    );
}

function DietsPanel() {
    return (
        <div>
            <div className="zp-readonly-banner">
                <STPLock />
                <div><strong>Iba na čítanie.</strong> Zoznam diét spravujeme v Zdravom projekte. Ak chcete pridať alebo upraviť diétu, ozvite sa nám.</div>
            </div>
            <div className="pc-rdgrid" style={{ marginBottom: 16 }}>
                {PC_DIETS.map((d) => (
                    <div className="zp-diet-readonly" key={d.code}>
                        <span className="badge">{d.code}</span>
                        <div className="body">
                            <div className="name">{d.name}</div>
                            <div className="desc">{d.desc}</div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="zp-contact-card">
                <span className="eye">Chýba vám niečo?</span>
                <h4>Kontakt pre pridanie / úpravu diéty</h4>
                <p>Ak potrebujete novú diétu, ktorá tu nie je, kontaktujte zodpovednú osobu.</p>
                <div className="contact-row"><STPUser w={14} /> Janka Adamcová · dietologička</div>
                <div className="contact-row"><STPMail w={14} /> janka@zdravyprojekt.sk</div>
                <div className="contact-row"><STPPhone w={14} /> +421 905 234 567</div>
            </div>
        </div>
    );
}

function SettingsPC({ navigate, params }) {
    const [tab, setTab] = React.useState((params && params.tab) || "account");
    React.useEffect(() => { if (params && params.tab) setTab(params.tab); }, [params && params.tab]);

    const tabs = [
        { k: "account", l: "Účet", icon: <STPUser /> },
        { k: "portions", l: "Dostupné porcie", icon: <STPUsers /> },
        { k: "diets", l: "Dostupné diéty", icon: <STPApple /> },
    ];

    return (
        <div className="pc-wrap" data-screen-label="Nastavenia">
            <div className="pc-settings-grid">
                <aside className="pc-settings-side">
                    {tabs.map((t) => (
                        <button key={t.k} className={tab === t.k ? "active" : ""} onClick={() => setTab(t.k)}>
                            {t.icon}<span>{t.l}</span>
                        </button>
                    ))}
                </aside>
                <div>
                    {tab === "account" && <AccountPanel navigate={navigate} />}
                    {tab === "portions" && <PortionsPanel />}
                    {tab === "diets" && <DietsPanel />}
                </div>
            </div>
        </div>
    );
}
window.SettingsPC = SettingsPC;

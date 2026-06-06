/* global React */
const { ArrowLeft: STArrowLeft, ChevronRight: STChevronRight, User: STUser, Utensils: STUtensils,
        Apple: STApple, Bell: STBell, LogOut: STLogOut, Info: STInfo, Mail: STMail,
        Phone: STPhone, Users: STUsers, Lock: STLock, Book: STBook } = window.ZpIcons;

/* ============================================================
 * Settings — landing page
 * ============================================================ */
function SettingsScreen({ navigate }) {
    return (
        <div className="zp-app">
            <div className="zp-pageheader">
                <button className="zp-iconbtn" onClick={() => navigate("home")}><STArrowLeft w={18} sw={2} /></button>
                <div>
                    <h1>Nastavenia</h1>
                    <p>Účet, povolené porcie, diéty</p>
                </div>
            </div>

            <div className="zp-settings-section">
                <h2>Účet</h2>
                <div className="zp-settings-list">
                    <button className="zp-settings-row" onClick={() => {}}>
                        <span className="ic"><STUser /></span>
                        <span className="body">
                            <span className="ttl">Janka Lúková</span>
                            <span className="sub">Materská škola Lúka</span>
                            <span className="sub">janka@skolka-luka.sk</span>
                        </span>
                        <span className="chev"><STChevronRight w={18} /></span>
                    </button>
                    <button className="zp-settings-row" onClick={() => {}}>
                        <span className="ic"><STBell /></span>
                        <span className="body">
                            <span className="ttl">Upozornenia</span>
                            <span className="sub">Pripomienky a nedeľné notifikácie</span>
                        </span>
                        <span className="chev"><STChevronRight w={18} /></span>
                    </button>
                </div>
            </div>

            <div className="zp-settings-section">
                <h2>Stravovanie</h2>
                <div className="zp-settings-list">
                    <button className="zp-settings-row" onClick={() => navigate("portions")}>
                        <span className="ic"><STUsers /></span>
                        <span className="body">
                            <span className="ttl">Dostupné porcie</span>
                            <span className="sub">3 typy · MŠ, ZŠ, Zamestnanci</span>
                        </span>
                        <span className="chev"><STChevronRight w={18} /></span>
                    </button>
                    <button className="zp-settings-row" onClick={() => navigate("diets")}>
                        <span className="ic"><STApple /></span>
                        <span className="body">
                            <span className="ttl">Dostupné diéty</span>
                            <span className="sub">13 diét · popis a alergény</span>
                        </span>
                        <span className="chev"><STChevronRight w={18} /></span>
                    </button>
                </div>
            </div>

            <div className="zp-settings-section">
                <h2>Podpora</h2>
                <div className="zp-settings-list">
                    <button className="zp-settings-row">
                        <span className="ic"><STInfo /></span>
                        <span className="body">
                            <span className="ttl">O aplikácii</span>
                            <span className="sub">Verzia 2.1 · Zdravý projekt s. r. o.</span>
                        </span>
                        <span className="chev"><STChevronRight w={18} /></span>
                    </button>
                    <button className="zp-settings-row" onClick={() => navigate("login")}>
                        <span className="ic" style={{ background: "rgba(201,46,82,0.1)", color: "var(--coral-600)" }}><STLogOut /></span>
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
window.SettingsScreen = SettingsScreen;

/* ============================================================
 * PortionsScreen — read-only allowed portion types
 * Configured by admin. Coefficients shown.
 * ============================================================ */
const PORTIONS = [
    {
        id: "ms",
        title: "Materská škola",
        desc: "Pre deti vo veku 3–6 rokov. Menšie porcie, jemnejšie korenenie, ovocie a zelenina krájané na drobno.",
        coef: 1.0,
    },
    {
        id: "zs",
        title: "Základná škola",
        desc: "Pre deti vo veku 7–11 rokov. Stredne veľké porcie s vyššou energiou.",
        coef: 1.15,
    },
    {
        id: "zam",
        title: "Zamestnanci",
        desc: "Dospelé porcie. Plnohodnotné množstvo, štandardné korenenie.",
        coef: 1.35,
    },
];

function PortionsScreen({ navigate }) {
    return (
        <div className="zp-app">
            <div className="zp-pageheader">
                <button className="zp-iconbtn" onClick={() => navigate("settings")}><STArrowLeft w={18} sw={2} /></button>
                <div>
                    <h1>Dostupné porcie</h1>
                    <p>3 typy aktivované pre vás</p>
                </div>
            </div>

            <div className="zp-readonly-banner">
                <STLock />
                <div>
                    <strong>Iba na čítanie.</strong> Povolené typy porcií nastavujeme v Zdravom Brušku.
                    Ak chcete pridať alebo upraviť typ porcie, ozvite sa nám.
                </div>
            </div>

            {PORTIONS.map((p) => (
                <div className="zp-portion-card" key={p.id}>
                    <div className="ic"><STUsers /></div>
                    <div className="body">
                        <div className="ttl">{p.title}</div>
                        <div className="desc">{p.desc}</div>
                        <span className="coef">Koeficient · {p.coef.toFixed(2)}× MŠ</span>
                    </div>
                </div>
            ))}

            <div className="zp-contact-card">
                <span className="eye">Potrebujete zmenu?</span>
                <h4>Kontakt pre úpravu povolených porcií</h4>
                <p>Pre rozšírenie alebo zmenu typov porcií kontaktujte zodpovednú osobu v Zdravom projekte.</p>
                <div className="contact-row"><STUser w={14} /> Vlado Kováč · prevádzkový riaditeľ</div>
                <div className="contact-row"><STMail w={14} /> vlado@zdravyprojekt.sk</div>
                <div className="contact-row"><STPhone w={14} /> +421 905 123 456</div>
            </div>
        </div>
    );
}
window.PortionsScreen = PortionsScreen;

/* ============================================================
 * DietsScreen — read-only list of allowed diets w/ description
 * ============================================================ */
const DIETS = [
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

function DietsScreen({ navigate }) {
    return (
        <div className="zp-app">
            <div className="zp-pageheader">
                <button className="zp-iconbtn" onClick={() => navigate("settings")}><STArrowLeft w={18} sw={2} /></button>
                <div>
                    <h1>Dostupné diéty</h1>
                    <p>{DIETS.length} diét · popis a alergény</p>
                </div>
            </div>

            <div className="zp-readonly-banner">
                <STLock />
                <div>
                    <strong>Iba na čítanie.</strong> Zoznam diét spravujeme v Zdravom Brušku.
                    Ak chcete pridať alebo upraviť diétu, ozvite sa nám.
                </div>
            </div>

            {DIETS.map((d) => (
                <div className="zp-diet-readonly" key={d.code}>
                    <span className="badge">{d.code}</span>
                    <div className="body">
                        <div className="name">{d.name}</div>
                        <div className="desc">{d.desc}</div>
                    </div>
                </div>
            ))}

            <div className="zp-contact-card">
                <span className="eye">Chýba vám niečo?</span>
                <h4>Kontakt pre pridanie / úpravu diéty</h4>
                <p>Ak potrebujete novú diétu, ktorá tu nie je, kontaktujte zodpovednú osobu.</p>
                <div className="contact-row"><STUser w={14} /> Janka Adamcová · dietologička</div>
                <div className="contact-row"><STMail w={14} /> janka@zdravyprojekt.sk</div>
                <div className="contact-row"><STPhone w={14} /> +421 905 234 567</div>
            </div>
        </div>
    );
}
window.DietsScreen = DietsScreen;

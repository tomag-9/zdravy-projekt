/* global React */
// Admin shell: sidebar navigation, user footer, logout modal, and shared UI
// primitives (Modal, Toast, Field, Card) reused across screens.

const { useState, useEffect } = React;
const I = () => window.AdIcons;

/* ── Navigation model ── */
const NAV = [
    { type: "item", id: "dashboard", label: "Prehľad", icon: "Gauge" },
    { type: "item", id: "meal-plan", label: "Jedálniček", icon: "CalendarDays" },
    { type: "item", id: "catalog", label: "Katalóg jedál", icon: "BookOpen" },
    { type: "section", label: "Prevádzky", icon: "Building" },
    { type: "item", id: "clients", label: "Správa prevádzok", icon: "Building" },
    { type: "section", label: "Import", icon: "Upload" },
    { type: "item", id: "edupage", label: "Objednávky (Edupage)", icon: "Upload" },
    { type: "section", label: "Nastavenia", icon: "Cog" },
    { type: "item", id: "diets", label: "Diéty", icon: "Salad" },
    { type: "item", id: "settings", label: "Systémové nastavenia", icon: "Sliders" },
    { type: "item", id: "holidays", label: "Voľné dni", icon: "Umbrella" },
    { type: "item", id: "logs", label: "Logy", icon: "Scroll" },
    { type: "section", label: "Komunikácia", icon: "Bell" },
    { type: "item", id: "notifications", label: "Notifikácie", icon: "Bell" },
    { type: "section", label: "Oprávnenia", icon: "Shield" },
    { type: "item", id: "admins", label: "Správa adminov", icon: "Shield" },
];

/* ── Toast (module-level emitter so any screen can call it) ── */
let _toastFn = null;
function toast(message, kind) { if (_toastFn) _toastFn(message, kind); }
window.adToast = toast;

function Toast() {
    const [t, setT] = useState(null);
    useEffect(() => {
        _toastFn = (message, kind) => {
            setT({ message, kind, id: Date.now() });
            clearTimeout(Toast._to);
            Toast._to = setTimeout(() => setT(null), 2600);
        };
        return () => { _toastFn = null; };
    }, []);
    if (!t) return null;
    const Ic = t.kind === "err" ? I().XCircle : I().CheckCircle;
    return (
        <div className={"zpa-toast" + (t.kind === "err" ? " err" : "")} key={t.id}>
            <Ic /><span>{t.message}</span>
        </div>
    );
}

/* ── Shared primitives ── */
function Field({ label, req, hint, children }) {
    return (
        <label className="zpa-field">
            {label && <span className="zpa-label">{label}{req && <span className="req">*</span>}{hint && <span className="hint">{hint}</span>}</span>}
            {children}
        </label>
    );
}

function Toggle({ on, onChange }) {
    return <button type="button" className={"zpa-switch" + (on ? " on" : "")} onClick={() => onChange(!on)} aria-pressed={on} />;
}

function Checkbox({ on, onChange, children }) {
    return (
        <button type="button" className={"zpa-check" + (on ? " on" : "")} onClick={() => onChange(!on)}>
            <span className="box">{on && <I.Check />}</span>{children}
        </button>
    );
}
// Checkbox uses I.Check — resolve at render:
function CheckboxReal({ on, onChange, children }) {
    const Ck = I().Check;
    return (
        <button type="button" className={"zpa-check" + (on ? " on" : "")} onClick={() => onChange(!on)}>
            <span className="box">{on && <Ck />}</span>{children}
        </button>
    );
}

function Modal({ title, onClose, children, foot, wide, icon, iconKind }) {
    const X = I().X;
    return (
        <div className="zpa-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose && onClose(); }}>
            <div className={"zpa-modal" + (wide ? " zpa-modal--wide" : "")}>
                {title !== undefined && (
                    <div className="zpa-modal-head">
                        <h3>{title}</h3>
                        {onClose && <button className="zpa-modal-close" onClick={onClose} aria-label="Zavrieť"><X /></button>}
                    </div>
                )}
                <div className="zpa-modal-body">
                    {icon && (() => { const Ic = I()[icon]; return <div className={"zpa-modal-icon " + (iconKind || "")}><Ic /></div>; })()}
                    {children}
                </div>
                {foot && <div className="zpa-modal-foot">{foot}</div>}
            </div>
        </div>
    );
}

function PageHead({ eyebrow, title, desc, actions }) {
    return (
        <div className="zpa-pagehead">
            <div>
                {eyebrow && <div className="eyebrow">{eyebrow}</div>}
                <h1>{title}</h1>
                {desc && <p>{desc}</p>}
            </div>
            {actions && <div className="actions">{actions}</div>}
        </div>
    );
}

function SearchBox({ value, onChange, placeholder }) {
    const S = I().Search;
    return (
        <div className="zpa-search">
            <S />
            <input className="zpa-input" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
        </div>
    );
}

/* ── The shell ── */
function AdminShell({ route, onNavigate, children }) {
    const [logoutOpen, setLogoutOpen] = useState(false);
    const Icons = I();
    const Sprout = Icons.Sprout, LogOut = Icons.LogOut;

    return (
        <div className="zpa-app">
            <aside className="zpa-sidebar">
              <div className="zpa-side-inner">
                <div className="zpa-brand">
                    <div className="brand-mini"><img src="logo-zdravy-projekt.png" alt="Zdravý projekt" /></div>
                    <div className="brand-full">
                        <img src="logo-zdravy-projekt.png" alt="Zdravý projekt" />
                        <span className="badge">Administrácia</span>
                    </div>
                </div>
                <nav className="zpa-nav">
                    {NAV.map((n, i) => {
                        if (n.type === "section") {
                            const Sc = Icons[n.icon];
                            return <div className="zpa-nav-section" key={"s" + i}><Sc /><span className="lbl">{n.label}</span></div>;
                        }
                        const Ic = Icons[n.icon];
                        return (
                            <button key={n.id} className={"zpa-nav-item" + (route === n.id ? " active" : "")} onClick={() => onNavigate(n.id)} title={n.label}>
                                <Ic /><span className="lbl">{n.label}</span>
                            </button>
                        );
                    })}
                </nav>
                <div className="zpa-user">
                    <div className="avatar">J</div>
                    <div className="body">
                        <div className="nm">Janka Uhríková</div>
                        <div className="em">janka@zdravyprojekt.sk</div>
                    </div>
                    <button className="logout" onClick={() => setLogoutOpen(true)} title="Odhlásiť sa"><LogOut /></button>
                </div>
              </div>
            </aside>

            <main className="zpa-main" id="zpa-main">
                <div className="zpa-content">{children}</div>
            </main>

            {logoutOpen && (
                <Modal title="Naozaj sa chcete odhlásiť?" onClose={() => setLogoutOpen(false)}
                    foot={<>
                        <button className="zpa-btn zpa-btn--ghost" onClick={() => setLogoutOpen(false)}>Zrušiť</button>
                        <button className="zpa-btn zpa-btn--danger" onClick={() => { setLogoutOpen(false); toast("Odhlásené (demo)"); }}>Odhlásiť sa</button>
                    </>}>
                    <p style={{ margin: 0, color: "var(--ink-2)" }}>Budete presmerovaný na prihlasovaciu obrazovku.</p>
                </Modal>
            )}

            <Toast />
        </div>
    );
}

Object.assign(window, { AdminShell, Modal, Field, Toggle, Checkbox: CheckboxReal, PageHead, SearchBox, NAV });

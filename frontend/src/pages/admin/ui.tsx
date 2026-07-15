/* =============================================================
 * Zdravý Projekt — Admin shared UI primitives.
 * Thin React wrappers over the `zpa-*` classes in admin.css,
 * mirroring the design kit (.claude/design/ui_kits/admin_app).
 * ============================================================= */
import React from 'react';
import { Search, X } from 'lucide-react';

type Div = React.HTMLAttributes<HTMLDivElement>;

/* ── Page header ── */
export const PageHead: React.FC<{
    eyebrow?: React.ReactNode;
    title: React.ReactNode;
    desc?: React.ReactNode;
    actions?: React.ReactNode;
}> = ({ eyebrow, title, desc, actions }) => (
    <div className="zpa-pagehead">
        <div>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            <h1>{title}</h1>
            {desc && <p>{desc}</p>}
        </div>
        {actions && <div className="actions">{actions}</div>}
    </div>
);

/* ── Button ── */
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'honey';
export const Button: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; sm?: boolean }
> = ({ variant = 'primary', sm, className = '', children, ...rest }) => (
    <button
        className={`zpa-btn zpa-btn--${variant}${sm ? ' zpa-btn--sm' : ''} ${className}`.trim()}
        {...rest}
    >
        {children}
    </button>
);

export const IconButton: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement>
> = ({ className = '', children, ...rest }) => (
    <button className={`zpa-iconbtn ${className}`.trim()} {...rest}>
        {children}
    </button>
);

/* ── Card ── */
export const Card: React.FC<Div & { pad?: boolean }> = ({ pad, className = '', children, ...rest }) => (
    <div className={`zpa-card${pad ? ' zpa-card--pad' : ''} ${className}`.trim()} {...rest}>
        {children}
    </div>
);

export const CardHead: React.FC<{ title: React.ReactNode; desc?: React.ReactNode; actions?: React.ReactNode }> = ({
    title,
    desc,
    actions,
}) => (
    <div className="zpa-card-head">
        <div>
            <h3>{title}</h3>
            {desc && <p>{desc}</p>}
        </div>
        {actions && <div className="actions">{actions}</div>}
    </div>
);

/* ── Badge ── */
type BadgeTone = 'green' | 'peach' | 'teal' | 'honey' | 'coral' | 'gray' | 'orange';
export const Badge: React.FC<React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }> = ({
    tone = 'gray',
    className = '',
    children,
    ...rest
}) => (
    <span className={`zpa-badge zpa-badge--${tone} ${className}`.trim()} {...rest}>
        {children}
    </span>
);

/* ── Form controls ── */
export const Field: React.FC<{
    label?: React.ReactNode;
    req?: boolean;
    hint?: React.ReactNode;
    children: React.ReactNode;
}> = ({ label, req, hint, children }) => (
    <label className="zpa-field">
        {label && (
            <span className="zpa-label">
                {label}
                {req && <span className="req"> *</span>}
                {hint && <span className="hint"> {hint}</span>}
            </span>
        )}
        {children}
    </label>
);

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className = '', ...rest }) => (
    <input className={`zpa-input ${className}`.trim()} {...rest} />
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({
    className = '',
    children,
    ...rest
}) => (
    <select className={`zpa-select ${className}`.trim()} {...rest}>
        {children}
    </select>
);

export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({
    className = '',
    ...rest
}) => <textarea className={`zpa-textarea ${className}`.trim()} {...rest} />;

export const Toggle: React.FC<{ on: boolean; onChange: (v: boolean) => void; disabled?: boolean; ariaLabel?: string }> = ({
    on,
    onChange,
    disabled,
    ariaLabel,
}) => (
    <button
        type="button"
        className={`zpa-switch${on ? ' on' : ''}`}
        aria-pressed={on}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => onChange(!on)}
    />
);

export const Checkbox: React.FC<{ on: boolean; onChange: (v: boolean) => void; children?: React.ReactNode }> = ({
    on,
    onChange,
    children,
}) => (
    <button type="button" className={`zpa-check${on ? ' on' : ''}`} onClick={() => onChange(!on)}>
        <span className="box">{on && <CheckMark />}</span>
        {children}
    </button>
);

const CheckMark = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
    </svg>
);

export const SearchBox: React.FC<{
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    className?: string;
}> = ({ value, onChange, placeholder, className = '' }) => (
    <div className={`zpa-search ${className}`.trim()}>
        <Search />
        <input className="zpa-input" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
);

/* ── Stat card ── */
export const StatCard: React.FC<{ num: React.ReactNode; label: React.ReactNode; slot?: React.ReactNode }> = ({
    num,
    label,
    slot,
}) => (
    <div className="zpa-statcard">
        <div>
            <div className="num">{num}</div>
            <div className="lbl">{label}</div>
        </div>
        {slot}
    </div>
);

/* ── Empty state ── */
export const Empty: React.FC<{ icon?: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
    <div className="zpa-empty">
        {icon}
        <div>{children}</div>
    </div>
);

/* ── Modal ── */
export const Modal: React.FC<{
    title?: React.ReactNode;
    onClose?: () => void;
    children: React.ReactNode;
    foot?: React.ReactNode;
    wide?: boolean;
    icon?: React.ReactNode;
    iconKind?: 'danger' | 'warn' | 'ok' | '';
}> = ({ title, onClose, children, foot, wide, icon, iconKind = '' }) => (
    <div
        className="zpa-scrim"
        onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose?.();
        }}
    >
        <div className={`zpa-modal${wide ? ' zpa-modal--wide' : ''}`}>
            {title !== undefined && (
                <div className="zpa-modal-head">
                    <h3>{title}</h3>
                    {onClose && (
                        <button className="zpa-modal-close" onClick={onClose} aria-label="Zavrieť">
                            <X />
                        </button>
                    )}
                </div>
            )}
            <div className="zpa-modal-body">
                {icon && <div className={`zpa-modal-icon ${iconKind}`}>{icon}</div>}
                {children}
            </div>
            {foot && <div className="zpa-modal-foot">{foot}</div>}
        </div>
    </div>
);

/* ── Table helpers (use plain <table className="zpa-table"> within) ── */
export const TableWrap: React.FC<Div> = ({ className = '', children, ...rest }) => (
    <div className={`zpa-table-wrap ${className}`.trim()} {...rest}>
        {children}
    </div>
);

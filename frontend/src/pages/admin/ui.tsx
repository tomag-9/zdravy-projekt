/* =============================================================
 * Zdravý Projekt — Admin shared UI primitives.
 * Thin React wrappers over the `zpa-*` classes in admin.css,
 * mirroring the design kit (.claude/design/ui_kits/admin_app).
 * ============================================================= */
import React from 'react';
import { Search, X } from 'lucide-react';
import { useDisabled } from '../../lib/editAccessContext';

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
/** `allowReadOnly` = prvok nič nemení (hľadanie, filter, export), viď editAccess. */
type ReadOnlyAware = { allowReadOnly?: boolean };

export const Button: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement> &
        ReadOnlyAware & { variant?: BtnVariant; sm?: boolean }
> = ({ variant = 'primary', sm, className = '', children, allowReadOnly, disabled, ...rest }) => (
    <button
        className={`zpa-btn zpa-btn--${variant}${sm ? ' zpa-btn--sm' : ''} ${className}`.trim()}
        disabled={useDisabled(disabled, allowReadOnly)}
        {...rest}
    >
        {children}
    </button>
);

export const IconButton: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement> & ReadOnlyAware
> = ({ className = '', children, allowReadOnly, disabled, ...rest }) => (
    <button
        className={`zpa-iconbtn ${className}`.trim()}
        disabled={useDisabled(disabled, allowReadOnly)}
        {...rest}
    >
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
    as?: 'label' | 'div';
}> = ({ label, req, hint, children, as: Component = 'label' }) => (
    <Component className="zpa-field">
        {label && (
            <span className="zpa-label">
                {label}
                {req && <span className="req"> *</span>}
                {hint && <span className="hint"> {hint}</span>}
            </span>
        )}
        {children}
    </Component>
);

export const Input: React.FC<
    React.InputHTMLAttributes<HTMLInputElement> & ReadOnlyAware
> = ({ className = '', allowReadOnly, disabled, ...rest }) => (
    <input
        className={`zpa-input ${className}`.trim()}
        disabled={useDisabled(disabled, allowReadOnly)}
        {...rest}
    />
);

const DIET_COLORS = [
    // One consistent saturation/lightness level across the full hue wheel.
    // This keeps every diet equally prominent without repeating light/dark
    // variants of the same eight colours.
    '#D83131', '#D85B31', '#D88531', '#D8AE31', '#D8D831', '#AED831',
    '#85D831', '#5BD831', '#31D831', '#31D85B', '#31D885', '#31D8AE',
    '#31D8D8', '#31AED8', '#3185D8', '#315BD8', '#3131D8', '#5B31D8',
    '#8531D8', '#AE31D8', '#D831D8', '#D831AE', '#D83185', '#D8315B',
];

export const ColorSwatchPicker: React.FC<{
    value: string;
    onChange: (value: string) => void;
    ariaLabel: string;
}> = ({ value, onChange, ariaLabel }) => {
    const [showCustomColor, setShowCustomColor] = React.useState(
        () => !!value && !DIET_COLORS.includes(value.toUpperCase())
    );
    const [focusedColor, setFocusedColor] = React.useState<string | null>(null);

    return (
        <div>
            <div
                role="group"
                aria-label={ariaLabel}
                style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 28px)', gap: 8 }}
            >
                {DIET_COLORS.map((color) => {
                    const selected = value.toUpperCase() === color;
                    const focused = focusedColor === color;

                    return (
                        <button
                            key={color}
                            type="button"
                            aria-label={`${ariaLabel}: ${color}`}
                            aria-pressed={selected}
                            onClick={() => onChange(color)}
                            onFocus={() => setFocusedColor(color)}
                            onBlur={() => setFocusedColor(null)}
                            style={{
                                width: 28,
                                height: 28,
                                padding: 0,
                                border: '2px solid white',
                                borderRadius: 999,
                                background: color,
                                boxShadow: focused
                                    ? '0 0 0 3px var(--green-700)'
                                    : selected
                                      ? '0 0 0 3px var(--green-900)'
                                      : '0 0 0 1px rgba(39, 52, 34, 0.22)',
                                cursor: 'pointer',
                                outline: 'none',
                            }}
                        />
                    );
                })}
            </div>
            <button
                type="button"
                aria-expanded={showCustomColor}
                onClick={() => setShowCustomColor((shown) => !shown)}
                style={{
                    display: 'block',
                    margin: '10px 0 0',
                    padding: 0,
                    border: 0,
                    background: 'transparent',
                    color: 'var(--green-700)',
                    font: 'inherit',
                    fontSize: 12,
                    textDecoration: 'underline',
                    cursor: 'pointer',
                }}
            >
                Vlastná farba
            </button>
            {showCustomColor && (
                <Input
                    type="color"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    aria-label={ariaLabel}
                    style={{ width: 64, marginTop: 8, padding: 4 }}
                />
            )}
        </div>
    );
};

export const Select: React.FC<
    React.SelectHTMLAttributes<HTMLSelectElement> & ReadOnlyAware
> = ({ className = '', children, allowReadOnly, disabled, ...rest }) => (
    <select
        className={`zpa-select ${className}`.trim()}
        disabled={useDisabled(disabled, allowReadOnly)}
        {...rest}
    >
        {children}
    </select>
);

export const Textarea: React.FC<
    React.TextareaHTMLAttributes<HTMLTextAreaElement> & ReadOnlyAware
> = ({ className = '', allowReadOnly, disabled, ...rest }) => (
    <textarea
        className={`zpa-textarea ${className}`.trim()}
        disabled={useDisabled(disabled, allowReadOnly)}
        {...rest}
    />
);

export const Toggle: React.FC<
    { on: boolean; onChange: (v: boolean) => void; disabled?: boolean; ariaLabel?: string } & ReadOnlyAware
> = ({ on, onChange, disabled: ownDisabled, ariaLabel, allowReadOnly }) => {
    const disabled = useDisabled(ownDisabled, allowReadOnly);
    return (
    <button
        type="button"
        className={`zpa-switch${on ? ' on' : ''}`}
        aria-pressed={on}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => onChange(!on)}
    />
    );
};

export const Checkbox: React.FC<
    { on: boolean; onChange: (v: boolean) => void; children?: React.ReactNode } & ReadOnlyAware
> = ({ on, onChange, children, allowReadOnly }) => (
    <button
        type="button"
        className={`zpa-check${on ? ' on' : ''}`}
        disabled={useDisabled(undefined, allowReadOnly)}
        onClick={() => onChange(!on)}
    >
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

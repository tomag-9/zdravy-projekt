/* =============================================================
 * Zdravý Projekt — Admin shared UI primitives.
 * Thin React wrappers over the `zpa-*` classes in admin.css,
 * mirroring the design kit (.claude/design/ui_kits/admin_app).
 * ============================================================= */
import React from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { useDisabled } from '../../lib/editAccessContext';
import { fromDateKey, isWeekday, nextWeekday, prevWeekday, toDateString } from '../../lib/businessDay';

type Div = React.HTMLAttributes<HTMLDivElement>;

/** Spoločné správanie všetkých vlastných rozbaľovacích ovládačov. */
function usePopoverDismissal(open: boolean, onDismiss: () => void) {
    const ref = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (!open) return undefined;
        const onPointerDown = (event: PointerEvent) => {
            if (!ref.current?.contains(event.target as Node)) onDismiss();
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onDismiss();
        };
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open, onDismiss]);

    return ref;
}

/* ── Page header ── */
export const PageHead: React.FC<{
    eyebrow?: React.ReactNode;
    title: React.ReactNode;
    /** Voliteľný obsah hneď vpravo od nadpisu, na tom istom riadku (napr.
     * kompaktný dátumový prepínač na Gramáži jedál) — nie je to `desc`, ktorý
     * ide na riadok pod nadpis. */
    titleExtra?: React.ReactNode;
    desc?: React.ReactNode;
    actions?: React.ReactNode;
}> = ({ eyebrow, title, titleExtra, desc, actions }) => (
    <div className="zpa-pagehead">
        <div>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            <div className="zpa-pagehead-title-row">
                <h1>{title}</h1>
                {titleExtra}
            </div>
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

/* ── Date navigator ──
 * Zdieľaný dátumový prepínač (Gramáž jedál, Kontrola objednávok) — šípky na
 * predchádzajúci/nasledujúci pracovný deň, štýlovaný popisok "deň + dátum"
 * (napr. "piatok 4. sep", klik otvorí zdieľaný štýlovaný kalendár) a badge
 * Dnes/Zajtra/Posledný pracovný deň. Jeden komponent namiesto
 * kopírovania medzi obrazovkami, nech vizuálne aj funkčne nedivergujú. */
export const AdminDateNav: React.FC<{
    date: string;
    onChange: (date: string) => void;
    maxDate: string;
    /** Dni, pre ktoré už existujú uložené podklady. */
    dataDates?: Set<string>;
    /** Dni s hotovými/uzavretými podkladmi. Sú čitateľné, ale viditeľne odlíšené. */
    closedDates?: Set<string>;
    /** Voľno kuchyne alebo prevádzky; nedajú sa vybrať. */
    unavailableDates?: Set<string>;
    disabled?: boolean;
    compact?: boolean;
    className?: string;
}> = ({ date, onChange, maxDate, dataDates, closedDates, unavailableDates, disabled, compact, className = '' }) => {
    const actualToday = React.useMemo(() => toDateString(new Date()), []);
    const [open, setOpen] = React.useState(false);
    const closePicker = React.useCallback(() => setOpen(false), []);
    const pickerRef = usePopoverDismissal(open, closePicker);
    const [viewMonth, setViewMonth] = React.useState(() => {
        const selected = fromDateKey(date);
        return new Date(selected.getFullYear(), selected.getMonth(), 1, 12);
    });
    // Zložené ručne z troch samostatných formátovačov — spojený skeleton
    // (weekday+day+month:'short') si ICU pre sk-SK prekladá na numerický
    // mesiac ("piatok 4. 9."), samostatný `month: 'short'` formátovač ale
    // správne vráti skratku ("sep"), preto "piatok 4. sep".
    const label = React.useMemo(() => {
        const d = fromDateKey(date);
        const weekday = new Intl.DateTimeFormat('sk-SK', { weekday: 'long' }).format(d);
        const month = new Intl.DateTimeFormat('sk-SK', { month: 'short' }).format(d).replace('.', '');
        return `${weekday} ${d.getDate()}. ${month}`;
    }, [date]);

    const monthLabel = new Intl.DateTimeFormat('sk-SK', { month: 'long', year: 'numeric' }).format(viewMonth);
    const monthDays = React.useMemo(() => {
        const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1, 12);
        // Kalendár je vedome iba pracovný Po–Pi. Víkend nie je „ďalšia
        // voľba", preto ho namiesto šedej bunky vôbec nezobrazujeme.
        const days: Array<Date | null> = Array.from(
            { length: (first.getDay() + 6) % 7 },
            () => null,
        );
        const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
        for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber++) {
            const day = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), dayNumber, 12);
            if (isWeekday(day)) days.push(day);
        }
        while (days.length % 5 !== 0) days.push(null);
        return days;
    }, [viewMonth]);

    const chooseDate = (key: string) => {
        onChange(key);
        setOpen(false);
    };

    // Skrytý input ponechávame pre kompatibilitu formulárov a automatizovaných
    // testov. Rešpektuje však tie isté obmedzenia ako vizuálny kalendár.
    const handleHiddenInputChange = (key: string) => {
        if (!key || key > maxDate || !isWeekday(fromDateKey(key)) || unavailableDates?.has(key)) return;
        chooseDate(key);
    };

    return (
        <Card className={`zpa-datenav-card ${className}`.trim()}>
            <div className={`zpa-datenav${compact ? ' zpa-datenav--compact' : ''}`}>
                <button
                    type="button"
                    className="zpa-navchip"
                    onClick={() => onChange(prevWeekday(date))}
                    disabled={disabled}
                    aria-label="Predchádzajúci deň"
                    title="Predchádzajúci deň"
                >
                    <ChevronLeft />
                </button>
                <div className="mid zpa-datenav-picker-wrap" ref={pickerRef}>
                    <button
                        type="button"
                        className="curr zpa-datenav-currbtn"
                        onClick={() => {
                            setViewMonth(new Date(fromDateKey(date).getFullYear(), fromDateKey(date).getMonth(), 1, 12));
                            setOpen((current) => !current);
                        }}
                        disabled={disabled}
                        title="Vybrať dátum"
                        aria-label="Vybrať dátum"
                        aria-expanded={open}
                    >
                        {label} <ChevronDown size={15} />
                    </button>
                    <input type="date" value={date} max={maxDate} disabled={disabled} className="zpa-datenav-hidden-input" aria-label="Vybrať dátum" tabIndex={-1} onChange={(event) => handleHiddenInputChange(event.target.value)} />
                    {open && (
                        <div className="zpa-datepop" role="dialog" aria-label="Výber dátumu">
                            <div className="zpa-datepop-head">
                                <span className="zpa-datepop-month">
                                    {monthLabel} <ChevronDown size={14} />
                                </span>
                                <div className="zpa-datepop-monthnav">
                                    <button type="button" aria-label="Predchádzajúci mesiac" onClick={() => setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1, 12))}><ChevronLeft /></button>
                                    <button type="button" aria-label="Nasledujúci mesiac" onClick={() => setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1, 12))}><ChevronRight /></button>
                                </div>
                            </div>
                            <div className="zpa-datepop-weekdays" aria-hidden="true">
                                {['Po', 'Ut', 'St', 'Št', 'Pi'].map((day) => <span key={day}>{day}</span>)}
                            </div>
                            <div className="zpa-datepop-days">
                                {monthDays.map((day, index) => {
                                    if (!day) return <span key={`empty-${index}`} aria-hidden="true" />;
                                    const key = toDateString(day);
                                    const unavailable = key > maxDate || unavailableDates?.has(key);
                                    const classes = [
                                        'zpa-datepop-day',
                                        key === date && 'is-selected',
                                        key === actualToday && 'is-today',
                                        dataDates?.has(key) && 'is-has-data',
                                        closedDates?.has(key) && 'is-closed',
                                        closedDates?.has(key) && 'is-locked',
                                        key < actualToday && !closedDates?.has(key) && 'is-history',
                                        key >= actualToday && !closedDates?.has(key) && 'is-upcoming',
                                        unavailable && 'is-unavailable',
                                    ].filter(Boolean).join(' ');
                                    const accessible = day.toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' });
                                    return <button key={key} type="button" className={classes} disabled={unavailable} aria-label={accessible} onClick={() => chooseDate(key)}>{day.getDate()}</button>;
                                })}
                            </div>
                            <div className="zpa-datepop-foot">
                                <button type="button" onClick={() => { setViewMonth(new Date(fromDateKey(actualToday).getFullYear(), fromDateKey(actualToday).getMonth(), 1, 12)); if (actualToday <= maxDate && isWeekday(fromDateKey(actualToday))) chooseDate(actualToday); }}>Dnes</button>
                            </div>
                        </div>
                    )}
                    {date === actualToday && <Badge tone="orange">Dnes</Badge>}
                    {date === maxDate && date !== actualToday && date > actualToday && (
                        <Badge tone="orange">Zajtra</Badge>
                    )}
                    {date === maxDate && date !== actualToday && date < actualToday && (
                        <Badge tone="gray">Posledný pracovný deň</Badge>
                    )}
                </div>
                <button
                    type="button"
                    className="zpa-navchip"
                    onClick={() => {
                        const n = nextWeekday(date);
                        if (n <= maxDate) onChange(n);
                    }}
                    disabled={disabled || date >= maxDate}
                    aria-label="Nasledujúci deň"
                    title="Nasledujúci deň"
                >
                    <ChevronRight />
                </button>
            </div>
        </Card>
    );
};

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
    const [open, setOpen] = React.useState(false);
    const [showCustomColor, setShowCustomColor] = React.useState(
        () => !!value && !DIET_COLORS.includes(value.toUpperCase())
    );
    const [focusedColor, setFocusedColor] = React.useState<string | null>(null);

    const selectColor = (color: string) => {
        onChange(color);
        setOpen(false);
    };

    return (
        <>
            <button
                type="button"
                className="zpa-color-trigger"
                aria-label={`Vybrať ${ariaLabel}`}
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={() => setOpen(true)}
            >
                <span className="zpa-color-trigger-swatch" style={{ background: value }} aria-hidden="true" />
                <span>{value.toUpperCase()}</span>
                <span className="zpa-color-trigger-action">Zmeniť</span>
            </button>
            {open && (
                <Modal title={ariaLabel} onClose={() => setOpen(false)}>
                    <div role="group" aria-label={ariaLabel} className="zpa-color-grid">
                        {DIET_COLORS.map((color) => {
                            const selected = value.toUpperCase() === color;
                            const focused = focusedColor === color;

                            return (
                                <button
                                    key={color}
                                    type="button"
                                    aria-label={`${ariaLabel}: ${color}`}
                                    aria-pressed={selected}
                                    onClick={() => selectColor(color)}
                                    onFocus={() => setFocusedColor(color)}
                                    onBlur={() => setFocusedColor(null)}
                                    className="zpa-color-option"
                                    style={{
                                        background: color,
                                        boxShadow: focused
                                            ? '0 0 0 3px var(--green-700)'
                                            : selected
                                              ? '0 0 0 3px var(--green-900)'
                                              : '0 0 0 1px rgba(39, 52, 34, 0.22)',
                                    }}
                                />
                            );
                        })}
                    </div>
                    <button
                        type="button"
                        aria-expanded={showCustomColor}
                        onClick={() => setShowCustomColor((shown) => !shown)}
                        className="zpa-color-custom-toggle"
                    >
                        Vlastná farba
                    </button>
                    {showCustomColor && (
                        <Input
                            type="color"
                            value={value}
                            onChange={(e) => selectColor(e.target.value)}
                            aria-label={ariaLabel}
                            style={{ width: 64, padding: 4 }}
                        />
                    )}
                </Modal>
            )}
        </>
    );
};

export type DropdownOption = {
    value: string;
    label: React.ReactNode;
    disabled?: boolean;
};

/**
 * Vlastný, postupne nasadzovaný dropdown. Pôvodný `Select` ostáva natívny,
 * kým sa nový vzhľad neodsúhlasí na pilotných formulároch.
 */
export const Dropdown: React.FC<{
    value: string;
    options: DropdownOption[];
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    allowReadOnly?: boolean;
    className?: string;
    style?: React.CSSProperties;
    'aria-label'?: string;
}> = ({ value, options, onChange, placeholder = 'Vyberte možnosť', disabled, allowReadOnly, className = '', style, 'aria-label': ariaLabel }) => {
    const [open, setOpen] = React.useState(false);
    const isDisabled = useDisabled(disabled, allowReadOnly);
    const selected = options.find((option) => option.value === value);
    const closeDropdown = React.useCallback(() => setOpen(false), []);
    const dropdownRef = usePopoverDismissal(open, closeDropdown);

    return (
        <div className={`zpa-dropdown ${className}`.trim()} style={style} ref={dropdownRef}>
            <button
                type="button"
                className="zpa-dropdown-trigger"
                role="combobox"
                aria-label={ariaLabel}
                aria-expanded={open}
                aria-haspopup="listbox"
                disabled={isDisabled}
                onClick={() => setOpen((current) => !current)}
            >
                <span>{selected?.label ?? placeholder}</span>
                <ChevronDown size={16} aria-hidden="true" />
            </button>
            {open && (
                <div className="zpa-dropdown-menu" role="listbox" aria-label={ariaLabel}>
                    {options.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            role="option"
                            aria-selected={option.value === value}
                            disabled={option.disabled}
                            className={option.value === value ? 'is-selected' : ''}
                            onClick={() => {
                                onChange(option.value);
                                setOpen(false);
                            }}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

/**
 * Verejný shared select. Zachováva pôvodné API (`<option>` a `onChange`),
 * no menu je už jednotný dropdown namiesto rozdielneho natívneho menu OS.
 */
export const Select: React.FC<
    React.SelectHTMLAttributes<HTMLSelectElement> & ReadOnlyAware
> = ({ children, value, defaultValue, onChange, className, allowReadOnly, disabled, ...rest }) => {
    const [uncontrolledValue, setUncontrolledValue] = React.useState(() => String(defaultValue ?? ''));
    const currentValue = value === undefined ? uncontrolledValue : String(value);
    const options = React.Children.toArray(children).flatMap((child): DropdownOption[] => {
        if (!React.isValidElement<React.OptionHTMLAttributes<HTMLOptionElement>>(child) || child.type !== 'option') return [];
        return [{
            value: String(child.props.value ?? ''),
            label: child.props.children,
            disabled: child.props.disabled,
        }];
    });
    const { 'aria-label': ariaLabel, style } = rest;

    return (
        <Dropdown
            value={currentValue}
            options={options}
            disabled={disabled}
            allowReadOnly={allowReadOnly}
            className={className}
            style={style}
            aria-label={ariaLabel}
            onChange={(nextValue) => {
                if (value === undefined) setUncontrolledValue(nextValue);
                onChange?.({
                    target: { value: nextValue },
                    currentTarget: { value: nextValue },
                } as React.ChangeEvent<HTMLSelectElement>);
            }}
        />
    );
};

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
    { on: boolean; onChange: (v: boolean) => void; children?: React.ReactNode; disabled?: boolean } & ReadOnlyAware
> = ({ on, onChange, children, allowReadOnly, disabled }) => (
    <button
        type="button"
        className={`zpa-check${on ? ' on' : ''}`}
        disabled={useDisabled(disabled, allowReadOnly)}
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
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
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

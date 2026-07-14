/* global React */
/* ============================================================
 * Button — Zdravý projekt design system
 * Pill-shaped brand button with tone + size variants. Icons are
 * passed as children alongside the label; renders a leading SVG
 * automatically when `icon` (a React element) is supplied.
 * ============================================================ */

const BTN_TONES = {
  primary:   { background: "var(--green-700)",     color: "var(--bg-cream)", boxShadow: "var(--shadow-sm)" },
  secondary: { background: "var(--bg-cream-soft)",  color: "var(--green-700)" },
  ghost:     { background: "transparent",           color: "var(--green-700)" },
  danger:    { background: "var(--coral-600)",      color: "#fff", boxShadow: "var(--shadow-sm)" },
  honey:     { background: "var(--mustard-700)",    color: "var(--bg-cream)", boxShadow: "var(--shadow-sm)" },
};

const BTN_SIZES = {
  sm: { padding: "8px 14px",  fontSize: 12.5 },
  md: { padding: "11px 20px", fontSize: 14 },
  lg: { padding: "14px 26px", fontSize: 16 },
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  icon = null,
  shape = "pill",
  full = false,
  disabled = false,
  type = "button",
  onClick,
  style,
  ...rest
}) {
  const tone = BTN_TONES[variant] || BTN_TONES.primary;
  const sz = BTN_SIZES[size] || BTN_SIZES.md;
  const base = {
    display: full ? "flex" : "inline-flex",
    width: full ? "100%" : undefined,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontFamily: "var(--font-display)",
    fontWeight: 600,
    lineHeight: 1,
    border: "1px solid transparent",
    borderRadius: shape === "pill" ? "999px" : "var(--radius-md, 14px)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.45 : 1,
    transition: "filter 180ms ease, transform 120ms ease",
    whiteSpace: "nowrap",
    ...tone,
    ...sz,
    ...style,
  };
  return (
    <button type={type} disabled={disabled} onClick={onClick} style={base} {...rest}>
      {icon}
      {children}
    </button>
  );
}

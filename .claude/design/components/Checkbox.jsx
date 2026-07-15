/* global React */
/* ============================================================
 * Checkbox — labelled brand checkbox. Controlled via `on` +
 * `onChange(next)`. Pairs with Toggle for boolean form input.
 * ============================================================ */

export function Checkbox({ on = false, onChange, disabled = false, children, style, ...rest }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      disabled={disabled}
      onClick={() => !disabled && onChange && onChange(!on)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        fontSize: 14,
        color: "var(--ink-2)",
        fontFamily: "var(--font-sans)",
        background: "transparent",
        border: 0,
        padding: 0,
        textAlign: "left",
        ...style,
      }}
      {...rest}
    >
      <span
        style={{
          width: 20,
          height: 20,
          flex: "0 0 20px",
          borderRadius: 6,
          border: `1.5px solid ${on ? "var(--green-700)" : "var(--line-strong, rgba(23,53,5,0.28))"}`,
          background: on ? "var(--green-600)" : "var(--bg-cream)",
          color: "#fff",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 160ms ease",
        }}
      >
        {on && (
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        )}
      </span>
      {children}
    </button>
  );
}

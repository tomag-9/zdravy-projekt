/* global React */
/* ============================================================
 * Toggle — brand switch. Controlled via `on` + `onChange(next)`.
 * ============================================================ */

export function Toggle({ on = false, onChange, disabled = false, style, ...rest }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => !disabled && onChange && onChange(!on)}
      style={{
        position: "relative",
        width: 46,
        height: 26,
        flex: "0 0 46px",
        background: on ? "var(--green-600)" : "var(--bg-cream-soft)",
        border: `1px solid ${on ? "var(--green-700)" : "var(--line, rgba(23,53,5,0.12))"}`,
        borderRadius: "999px",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "background 200ms ease, border-color 200ms ease",
        padding: 0,
        ...style,
      }}
      {...rest}
    >
      <span
        style={{
          position: "absolute",
          left: 2,
          top: 1,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "var(--shadow-xs, 0 1px 2px rgba(0,0,0,0.15))",
          transform: on ? "translateX(20px)" : "translateX(0)",
          transition: "transform 200ms cubic-bezier(.4,0,.2,1)",
        }}
      />
    </button>
  );
}

/* global React */
/* ============================================================
 * TextField — labelled form control. Uppercase Poppins label,
 * cream-warm field, brand focus ring. Renders <input>,
 * <textarea> (multiline) or a <select> (when `options` given).
 * ============================================================ */

const FIELD_STYLE = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: "var(--radius-md, 14px)",
  border: "1.5px solid var(--line, rgba(23,53,5,0.12))",
  background: "var(--bg-cream)",
  color: "var(--ink-1)",
  fontFamily: "var(--font-sans)",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

export function TextField({
  label,
  hint,
  required = false,
  multiline = false,
  options = null,
  value,
  onChange,
  placeholder,
  type = "text",
  style,
  ...rest
}) {
  const [focused, setFocused] = React.useState(false);
  const focusStyle = focused
    ? { borderColor: "var(--green-600)", background: "var(--bg-cream-warm)", boxShadow: "0 0 0 3px rgba(114,136,75,0.16)" }
    : null;
  const common = {
    value,
    onChange,
    placeholder,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: { ...FIELD_STYLE, ...focusStyle, ...style },
    ...rest,
  };
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {label && (
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 12,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "var(--tracking-caps, 0.08em)",
            color: "var(--green-700)",
          }}
        >
          {label}
          {required && <span style={{ color: "var(--coral-600)", marginLeft: 2 }}>*</span>}
          {hint && (
            <span style={{ color: "var(--ink-mute)", fontWeight: 500, textTransform: "none", letterSpacing: 0, marginLeft: 6 }}>
              {hint}
            </span>
          )}
        </span>
      )}
      {options ? (
        <select {...common} style={{ ...common.style, cursor: "pointer", appearance: "none", paddingRight: 38,
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%237C9853' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
          backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}>
          {options.map((o) => {
            const val = typeof o === "string" ? o : o.value;
            const lbl = typeof o === "string" ? o : o.label;
            return <option key={val} value={val}>{lbl}</option>;
          })}
        </select>
      ) : multiline ? (
        <textarea {...common} style={{ ...common.style, resize: "vertical", minHeight: 90, lineHeight: 1.5 }} />
      ) : (
        <input type={type} {...common} />
      )}
    </label>
  );
}

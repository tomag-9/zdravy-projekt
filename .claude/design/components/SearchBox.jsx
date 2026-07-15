/* global React */
/* ============================================================
 * SearchBox — text input with a leading magnifier icon and the
 * brand focus ring. Controlled via `value` + `onChange(text)`.
 * ============================================================ */

export function SearchBox({ value = "", onChange, placeholder = "Hľadať…", style, ...rest }) {
  const [focused, setFocused] = React.useState(false);
  return (
    <div style={{ position: "relative", ...style }}>
      <svg
        viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        style={{ position: "absolute", left: 15, top: "50%", transform: "translateY(-50%)", color: "var(--ink-mute)" }}
      >
        <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
      </svg>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange && onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%",
          padding: "11px 14px 11px 42px",
          borderRadius: "var(--radius-md, 14px)",
          border: `1.5px solid ${focused ? "var(--green-600)" : "var(--line, rgba(23,53,5,0.12))"}`,
          background: focused ? "var(--bg-cream-warm)" : "var(--bg-cream)",
          color: "var(--ink-1)",
          fontFamily: "var(--font-sans)",
          fontSize: 14,
          outline: "none",
          boxSizing: "border-box",
          boxShadow: focused ? "0 0 0 3px rgba(114,136,75,0.16)" : "none",
          transition: "all 180ms ease",
        }}
        {...rest}
      />
    </div>
  );
}

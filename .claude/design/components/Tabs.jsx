/* global React */
/* ============================================================
 * Tabs — underline tab bar. `tabs` is an array of {id,label};
 * controlled via `active` + `onChange(id)`. Equal-width by
 * default; pass `fit={false}` to size to content.
 * ============================================================ */

export function Tabs({ tabs = [], active, onChange, fit = true, style, ...rest }) {
  return (
    <div
      style={{ display: "flex", borderBottom: "1px solid var(--line-soft, rgba(23,53,5,0.08))", ...style }}
      {...rest}
    >
      {tabs.map((t) => {
        const on = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange && onChange(t.id)}
            style={{
              flex: fit ? 1 : "0 0 auto",
              padding: "14px 18px",
              border: 0,
              borderBottom: `2px solid ${on ? "var(--green-600)" : "transparent"}`,
              background: on ? "rgba(114,136,75,0.05)" : "transparent",
              cursor: "pointer",
              fontFamily: "var(--font-display)",
              fontSize: 14,
              fontWeight: 600,
              color: on ? "var(--green-700)" : "var(--ink-3)",
              transition: "all 160ms ease",
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

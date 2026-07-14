/* global React */
/* ============================================================
 * Card — cream surface container. Optional header (title +
 * subtitle + right-aligned actions slot) and padded body.
 * ============================================================ */

export function Card({ children, title, subtitle, actions, pad = true, style, bodyStyle, ...rest }) {
  const hasHead = title || subtitle || actions;
  return (
    <div
      style={{
        background: "var(--bg-cream-warm)",
        border: "1px solid var(--line-soft, rgba(23,53,5,0.08))",
        borderRadius: "var(--radius-lg, 20px)",
        boxShadow: "var(--shadow-sm)",
        overflow: "hidden",
        ...style,
      }}
      {...rest}
    >
      {hasHead && (
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid var(--line-soft, rgba(23,53,5,0.08))",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div>
            {title && (
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, color: "var(--green-900)", margin: 0 }}>
                {title}
              </h3>
            )}
            {subtitle && <p style={{ margin: "3px 0 0", fontSize: 13, color: "var(--ink-3)" }}>{subtitle}</p>}
          </div>
          {actions && <div style={{ display: "flex", gap: 10, alignItems: "center" }}>{actions}</div>}
        </div>
      )}
      <div style={{ padding: pad ? 24 : 0, ...bodyStyle }}>{children}</div>
    </div>
  );
}

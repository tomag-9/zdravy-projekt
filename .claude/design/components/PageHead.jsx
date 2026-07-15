/* global React */
/* ============================================================
 * PageHead — screen header: uppercase eyebrow, display title,
 * optional description and a right-aligned actions slot.
 * ============================================================ */

export function PageHead({ eyebrow, title, desc, actions, style, ...rest }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 20,
        flexWrap: "wrap",
        marginBottom: 26,
        ...style,
      }}
      {...rest}
    >
      <div>
        {eyebrow && (
          <div style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "var(--tracking-caps, 0.08em)", color: "var(--green-600)", marginBottom: 6 }}>
            {eyebrow}
          </div>
        )}
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 700, color: "var(--green-900)", margin: 0, letterSpacing: "-0.01em", lineHeight: 1.1 }}>
          {title}
        </h1>
        {desc && <p style={{ margin: "6px 0 0", color: "var(--ink-3)", fontSize: 14 }}>{desc}</p>}
      </div>
      {actions && <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>{actions}</div>}
    </div>
  );
}

/* global React */
/* ============================================================
 * StatCard — compact metric surface: a big display number with
 * a label, plus an optional leading slot (icon or badge).
 * ============================================================ */

export function StatCard({ label, value, lead, style, ...rest }) {
  return (
    <div
      style={{
        padding: "16px 18px",
        borderRadius: "var(--radius-md, 14px)",
        border: "1px solid var(--line-soft, rgba(23,53,5,0.08))",
        background: "var(--bg-cream-warm)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        ...style,
      }}
      {...rest}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {lead}
        {label && <span style={{ fontSize: 13, color: "var(--ink-3)", fontWeight: 500 }}>{label}</span>}
      </div>
      <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 26, color: "var(--green-900)", lineHeight: 1 }}>
        {value}
      </span>
    </div>
  );
}

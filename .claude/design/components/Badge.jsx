/* global React */
/* ============================================================
 * Badge — small status / category pill.
 * Tone maps to the brand accent palette. Optional leading icon.
 * ============================================================ */

const BADGE_TONES = {
  green:  { background: "rgba(114,136,75,0.16)", color: "var(--green-700)" },
  peach:  { background: "var(--peach-300)",       color: "var(--mustard-700)" },
  teal:   { background: "rgba(0,151,167,0.12)",   color: "var(--teal-500)" },
  honey:  { background: "rgba(255,201,92,0.28)",  color: "var(--mustard-700)" },
  coral:  { background: "rgba(201,46,82,0.10)",   color: "var(--coral-600)" },
  orange: { background: "rgba(239,152,33,0.18)",  color: "var(--orange-500)" },
  gray:   { background: "var(--bg-cream-soft)",   color: "var(--ink-3)" },
};

export function Badge({ children, tone = "green", icon = null, style, ...rest }) {
  const t = BADGE_TONES[tone] || BADGE_TONES.green;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontFamily: "var(--font-display)",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.02em",
        padding: "4px 10px",
        borderRadius: "999px",
        ...t,
        ...style,
      }}
      {...rest}
    >
      {icon}
      {children}
    </span>
  );
}

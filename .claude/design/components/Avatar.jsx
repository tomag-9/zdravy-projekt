/* global React */
/* ============================================================
 * Avatar — round initials badge with brand gradient tones.
 * Used in tables, sidebars and lists across the app.
 * ============================================================ */

const AVATAR_TONES = {
  green: "linear-gradient(135deg, var(--green-500), var(--green-700))",
  peach: "linear-gradient(135deg, var(--peach-500), var(--mustard-700))",
  teal:  "linear-gradient(135deg, #34b5c2, var(--teal-500))",
};

const AVATAR_SIZES = { sm: 32, md: 40, lg: 52 };

export function Avatar({ name = "", tone = "green", size = "md", style, ...rest }) {
  const px = AVATAR_SIZES[size] || (typeof size === "number" ? size : 40);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
  return (
    <span
      style={{
        width: px,
        height: px,
        flex: `0 0 ${px}px`,
        borderRadius: "50%",
        background: AVATAR_TONES[tone] || AVATAR_TONES.green,
        color: "#fff",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        fontSize: px * 0.38,
        boxShadow: "var(--shadow-xs, 0 1px 2px rgba(0,0,0,0.15))",
        ...style,
      }}
      {...rest}
    >
      {initials || "?"}
    </span>
  );
}

/* global React */
/* ============================================================
 * Modal — centered dialog on a blurred scrim. Optional title,
 * close button, icon badge and footer actions slot. Click the
 * scrim or the close button to dismiss.
 * ============================================================ */

export function Modal({ title, children, onClose, footer, wide = false, icon = null, iconTone = "danger" }) {
  const iconBg = iconTone === "danger"
    ? { background: "rgba(201,46,82,0.1)", color: "var(--coral-600)" }
    : { background: "rgba(114,136,75,0.12)", color: "var(--green-700)" };
  return (
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(23,53,5,0.36)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: 24,
      }}
    >
      <div
        style={{
          background: "var(--bg-cream-warm)",
          borderRadius: "var(--radius-xl, 26px)",
          boxShadow: "var(--shadow-lg)",
          width: "100%",
          maxWidth: wide ? 620 : 480,
          maxHeight: "90%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {(title !== undefined || onClose) && (
          <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--line-soft, rgba(23,53,5,0.08))", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--green-900)", margin: 0 }}>{title}</h3>
            {onClose && (
              <button
                onClick={onClose}
                aria-label="Zavrieť"
                style={{ width: 36, height: 36, borderRadius: "50%", border: 0, background: "var(--bg-cream-soft)", color: "var(--green-700)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 20, lineHeight: 1 }}
              >×</button>
            )}
          </div>
        )}
        <div style={{ padding: 24, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
          {icon && (
            <div style={{ width: 52, height: 52, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", ...iconBg }}>{icon}</div>
          )}
          {children}
        </div>
        {footer && (
          <div style={{ padding: "16px 24px", borderTop: "1px solid var(--line-soft, rgba(23,53,5,0.08))", display: "flex", gap: 10, justifyContent: "flex-end" }}>{footer}</div>
        )}
      </div>
    </div>
  );
}

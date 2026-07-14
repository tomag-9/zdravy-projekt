// Header.jsx — top bar
const Header = () => {
    const linkStyle = {
        fontFamily: "var(--font-display)",
        fontSize: 14,
        fontWeight: 500,
        color: "var(--green-800)",
        textDecoration: "none",
        padding: "8px 0",
        position: "relative",
    };
    return (
        <header style={{
            background: "rgba(251,247,228,0.92)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderBottom: "1px solid var(--line-soft)",
            position: "sticky",
            top: 0,
            zIndex: 50,
        }}>
            <div style={{
                maxWidth: 1280,
                margin: "0 auto",
                padding: "18px 48px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 32,
            }}>
                <a href="#" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
                    <span style={{
                        fontFamily: "var(--font-marker)",
                        fontSize: 26,
                        color: "var(--green-700)",
                        lineHeight: 1,
                    }}>zdravý projekt</span>
                </a>
                <nav style={{ display: "flex", gap: 28 }}>
                    <a href="#about" style={linkStyle}>O nás</a>
                    <a href="#bisb" style={linkStyle}>BISB</a>
                    <a href="#orders" style={linkStyle}>Objednávky pre domácnosti</a>
                    <a href="#kindergarten" style={linkStyle}>Objednávka pre škôlky</a>
                </nav>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{
                        display: "flex",
                        gap: 6,
                        padding: 4,
                        background: "var(--bg-cream-soft)",
                        borderRadius: 999,
                    }}>
                        <button style={{
                            background: "var(--green-700)", color: "var(--bg-cream)",
                            border: "none", borderRadius: 999,
                            padding: "5px 14px", fontFamily: "var(--font-display)",
                            fontSize: 12, fontWeight: 600, cursor: "pointer",
                        }}>SK</button>
                        <button style={{
                            background: "transparent", color: "var(--ink-2)",
                            border: "none", padding: "5px 12px",
                            fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 600, cursor: "pointer",
                        }}>EN</button>
                    </div>
                    <button aria-label="košík" style={{
                        background: "var(--bg-cream-soft)",
                        border: "none",
                        width: 38, height: 38, borderRadius: "50%",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer",
                        color: "var(--green-700)",
                    }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                    </button>
                </div>
            </div>
        </header>
    );
};

Object.assign(window, { Header });

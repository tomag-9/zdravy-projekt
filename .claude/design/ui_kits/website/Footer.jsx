// Footer.jsx — about + contact + sub-brand chips
const Footer = () => (
    <footer style={{
        background: "var(--green-900)",
        color: "var(--bg-cream)",
        padding: "80px 48px 32px",
    }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
            <div style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr",
                gap: 64,
                marginBottom: 56,
            }}>
                <div>
                    <div style={{
                        fontFamily: "var(--font-marker)",
                        fontSize: 36,
                        color: "var(--bg-cream)",
                        marginBottom: 18,
                        lineHeight: 1,
                    }}>zdravý projekt</div>
                    <h3 style={{
                        fontFamily: "var(--font-display)", fontWeight: 700,
                        fontSize: 26, color: "var(--bg-cream)",
                        margin: "0 0 16px", lineHeight: 1.2,
                    }}>O nás</h3>
                    <p style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 15, lineHeight: 1.7,
                        color: "rgba(251,247,228,0.78)",
                        margin: "0 0 24px",
                        maxWidth: "44ch",
                    }}>Spojili sme to najlepšie z dvoch silných značiek, ktoré ste si obľúbili, aby sme vám mohli prinášať ešte viac kvality, odbornosti a starostlivosti o zdravú stravu vašich detí.</p>
                    <a href="#" style={{
                        fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14,
                        color: "var(--peach-400)",
                        textDecoration: "underline", textDecorationColor: "var(--peach-500)",
                        textDecorationThickness: 2, textUnderlineOffset: 4,
                    }}>Viac o nás →</a>
                </div>
                <div>
                    <h3 style={{
                        fontFamily: "var(--font-display)", fontWeight: 700,
                        fontSize: 18, color: "var(--bg-cream)",
                        margin: "0 0 18px",
                    }}>Kontakt</h3>
                    <div style={{
                        fontFamily: "var(--font-sans)", fontSize: 15, lineHeight: 1.7,
                        color: "rgba(251,247,228,0.78)",
                    }}>
                        Zdravý projekt s. r. o.<br />
                        Ďumbierska 11884/3G<br />
                        831 01 Bratislava<br />
                    </div>
                </div>
                <div>
                    <h3 style={{
                        fontFamily: "var(--font-display)", fontWeight: 700,
                        fontSize: 18, color: "var(--bg-cream)",
                        margin: "0 0 18px",
                    }}>Pôvodné značky</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <a href="https://zdravebrusko.sk" style={{
                            display: "flex", alignItems: "center", gap: 12,
                            background: "rgba(251,247,228,0.06)",
                            padding: "10px 14px", borderRadius: 14,
                            textDecoration: "none",
                            color: "var(--bg-cream)",
                        }}>
                            <span style={{
                                width: 32, height: 32, borderRadius: "50%",
                                background: "var(--coral-logo)", display: "flex",
                                alignItems: "center", justifyContent: "center",
                                fontFamily: "var(--font-marker)", fontSize: 16, color: "#fff",
                            }}>z</span>
                            <span style={{
                                fontFamily: "var(--font-sans)", fontSize: 14,
                            }}>zdravebrusko.sk</span>
                        </a>
                        <a href="https://zdravy-dom.sk" style={{
                            display: "flex", alignItems: "center", gap: 12,
                            background: "rgba(251,247,228,0.06)",
                            padding: "10px 14px", borderRadius: 14,
                            textDecoration: "none",
                            color: "var(--bg-cream)",
                        }}>
                            <span style={{
                                width: 32, height: 32, borderRadius: "50%",
                                background: "var(--green-logo)", display: "flex",
                                alignItems: "center", justifyContent: "center",
                                fontFamily: "var(--font-marker)", fontSize: 16, color: "#fff",
                            }}>z</span>
                            <span style={{
                                fontFamily: "var(--font-sans)", fontSize: 14,
                            }}>zdravy-dom.sk</span>
                        </a>
                    </div>
                </div>
            </div>

            <div style={{
                borderTop: "1px solid rgba(251,247,228,0.12)",
                paddingTop: 24,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 16,
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                color: "rgba(251,247,228,0.5)",
            }}>
                <span>© 2026 zdravyprojekt.sk · Všetky práva vyhradené.</span>
                <div style={{ display: "flex", gap: 22 }}>
                    <a href="#" style={{ color: "rgba(251,247,228,0.62)", textDecoration: "none" }}>GDPR</a>
                    <a href="#" style={{ color: "rgba(251,247,228,0.62)", textDecoration: "none" }}>Cookies</a>
                </div>
            </div>
        </div>
    </footer>
);

Object.assign(window, { Footer });

// Hero.jsx — brand-equation hero
const Hero = () => (
    <section style={{
        padding: "80px 48px 96px",
        maxWidth: 1280,
        margin: "0 auto",
        position: "relative",
    }}>
        <div style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 56,
        }}>
            <img src="../../assets/brand-equation.png" alt="Zdravé Brušká + Zdravý Dom = Zdravý projekt" style={{
                maxWidth: 720,
                width: "100%",
                height: "auto",
            }} />
        </div>

        <h1 style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "clamp(40px, 6vw, 84px)",
            lineHeight: 1.02,
            letterSpacing: "-0.02em",
            color: "var(--green-900)",
            textAlign: "center",
            margin: "0 auto 32px",
            maxWidth: 22,
            textWrap: "balance",
            maxInlineSize: "24ch",
        }}>
            To najlepšie zo Zdravého domu a Zdravého bruška.
        </h1>

        <p style={{
            fontFamily: "var(--font-sans)",
            fontSize: 22,
            lineHeight: 1.55,
            color: "var(--ink-2)",
            textAlign: "center",
            margin: "0 auto 48px",
            maxWidth: "52ch",
        }}>
            Vytvárame chutné, vyvážené a nutrične hodnotné jedlá, ktoré podporujú zdravie, rast a pohodu detí aj dospelých.
        </p>

        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="#orders" style={{
                background: "var(--green-700)",
                color: "var(--bg-cream)",
                padding: "16px 32px",
                borderRadius: 999,
                fontFamily: "var(--font-display)",
                fontSize: 16,
                fontWeight: 600,
                textDecoration: "none",
                boxShadow: "var(--shadow-sm)",
            }}>Objednávky pre domácnosti</a>
            <a href="#kindergarten" style={{
                background: "var(--bg-cream-soft)",
                color: "var(--green-700)",
                padding: "16px 32px",
                borderRadius: 999,
                fontFamily: "var(--font-display)",
                fontSize: 16,
                fontWeight: 600,
                textDecoration: "none",
            }}>Pre škôlky</a>
        </div>

        <div style={{
            position: "absolute",
            top: 40, right: 80,
            width: 92, height: 92,
            background: "var(--coral-400)",
            color: "#fff",
            borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            transform: "rotate(-12deg)",
            fontFamily: "var(--font-marker)",
            fontSize: 14,
            textAlign: "center",
            lineHeight: 1.15,
            boxShadow: "var(--shadow-md)",
            flexDirection: "column",
        }}>
            <span>nová</span>
            <span>kapitola</span>
        </div>
    </section>
);

Object.assign(window, { Hero });

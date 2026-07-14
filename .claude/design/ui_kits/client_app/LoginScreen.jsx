/* global React */
const { Mail: LMail } = window.ZpIcons;

/* ============================================================
 * LoginScreen — uses brand-equation logo image
 * (no tagline, no "Stará sa o vás" footer)
 * Adds note that registration is handled by the provider.
 * ============================================================ */
function LoginScreen({ onLogin }) {
    const [email, setEmail] = React.useState("janka@skolka-luka.sk");
    const [pwd, setPwd] = React.useState("");

    function submit(e) {
        e && e.preventDefault();
        onLogin && onLogin();
    }

    return (
        <div className="zp-app">
            <div className="zp-login">
                <div className="zp-login-brand">
                    <img className="logoimg" src="logo-zdravy-projekt.png" alt="Zdravý projekt" />
                </div>

                <form className="zp-login-card" onSubmit={submit}>
                    <h2>Vitajte späť</h2>
                    <p className="sub">Prihláste sa, prosím, do svojho účtu.</p>

                    <div className="zp-field">
                        <label className="zp-label">Email</label>
                        <input
                            className="zp-input"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="vase@meno.sk"
                        />
                    </div>

                    <div className="zp-field">
                        <label className="zp-label">Heslo</label>
                        <input
                            className="zp-input"
                            type="password"
                            value={pwd}
                            onChange={(e) => setPwd(e.target.value)}
                            placeholder="••••••••"
                        />
                        <div style={{ textAlign: "right", marginTop: 8 }}>
                            <a className="zp-link" href="#" onClick={(e) => e.preventDefault()}>Zabudli ste heslo?</a>
                        </div>
                    </div>

                    <button type="submit" className="zp-btn zp-btn--primary zp-btn--block zp-btn--lg" style={{ marginTop: 8 }}>
                        Prihlásiť sa
                    </button>

                    <div className="zp-divider">Nemáte účet?</div>

                    <div className="zp-login-info">
                        <strong>Registráciu vykonáva poskytovateľ.</strong><br />
                        Ak máte záujem o službu, napíšte nám na{" "}
                        <a href="mailto:info@zdravyprojekt.sk">info@zdravyprojekt.sk</a>{" "}
                        a my Vám vytvoríme prístup.
                    </div>
                </form>

                <div style={{ height: 24 }}></div>
            </div>
        </div>
    );
}
window.LoginScreen = LoginScreen;

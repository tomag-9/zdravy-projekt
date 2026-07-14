/* global React */

/* ============================================================
 * LoginPC — split-screen desktop login.
 * Left: brand art panel. Right: sign-in card.
 * ============================================================ */
function LoginPC({ onLogin }) {
    const [email, setEmail] = React.useState("janka@skolka-luka.sk");
    const [pwd, setPwd] = React.useState("");

    function submit(e) {
        e && e.preventDefault();
        onLogin && onLogin();
    }

    return (
        <div className="pc-login" data-screen-label="Login">
            <div className="pc-login-art">
                <div className="mk">Zdravý projekt</div>
                <div className="pitch">
                    <span className="script">Dobré jedlo, každý deň</span>
                    <h2>Objednávky pre vašu škôlku na jednom mieste.</h2>
                    <p>
                        Plánujte raňajky, obedy a olovranty, sledujte jedálniček
                        a spravujte diéty — prehľadne, z počítača aj mobilu.
                    </p>
                </div>
                <div className="foot">Zdravý projekt s. r. o. · klientský portál v2.1</div>
            </div>

            <div className="pc-login-panel">
                <form className="pc-login-card" onSubmit={submit}>
                    <img className="logoimg" src="logo-zdravy-projekt.png" alt="Zdravý projekt" />
                    <h2>Vitajte späť</h2>
                    <p className="sub">Prihláste sa, prosím, do svojho účtu.</p>

                    <div className="zp-field">
                        <label className="zp-label">Email</label>
                        <input
                            className="zp-input" type="email" value={email}
                            onChange={(e) => setEmail(e.target.value)} placeholder="vase@meno.sk"
                        />
                    </div>

                    <div className="zp-field">
                        <label className="zp-label">Heslo</label>
                        <input
                            className="zp-input" type="password" value={pwd}
                            onChange={(e) => setPwd(e.target.value)} placeholder="••••••••"
                        />
                        <div style={{ textAlign: "right", marginTop: 8 }}>
                            <a className="zp-link" href="#" onClick={(e) => e.preventDefault()}>Zabudli ste heslo?</a>
                        </div>
                    </div>

                    <button type="submit" className="zp-btn zp-btn--primary zp-btn--block zp-btn--lg" style={{ marginTop: 8, whiteSpace: "nowrap" }}>
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
            </div>
        </div>
    );
}
window.LoginPC = LoginPC;

/* global React */
const { Home: NavHome, Book: NavBook, Settings: NavSettings } = window.ZpIcons;

/* ============================================================
 * App.jsx — router shell, phone frame, bottom tab nav.
 *
 * State-based router:
 *   route: "login" | "home" | "order" | "success" | "menu"
 *          | "settings" | "portions" | "diets"
 * ============================================================ */

function PhoneFrame({ children }) {
    return (
        <div className="zp-phone" id="zp-phone">
            {children}
        </div>
    );
}

function TabBar({ route, navigate }) {
    // Visible only on tab-rooted pages
    const tabRoutes = ["home", "menu", "settings"];
    const visible = tabRoutes.includes(route);
    if (!visible) return null;

    return (
        <div className="zp-tabbar">
            <button
                className={"zp-tab" + (route === "home" ? " zp-tab--active" : "")}
                onClick={() => navigate("home")}
            >
                <NavHome />
                <span>Domov</span>
            </button>
            <button
                className={"zp-tab" + (route === "menu" ? " zp-tab--active" : "")}
                onClick={() => navigate("menu")}
            >
                <NavBook />
                <span>Jedálniček</span>
            </button>
            <button
                className={"zp-tab" + (route === "settings" ? " zp-tab--active" : "")}
                onClick={() => navigate("settings")}
            >
                <NavSettings />
                <span>Nastavenia</span>
            </button>
        </div>
    );
}

function App() {
    const [route, setRoute] = React.useState("login");
    const [params, setParams] = React.useState({});

    function navigate(name, p = {}) {
        // scroll to top on each route change
        const body = document.querySelector("#zp-phone .zp-route-body");
        if (body) body.scrollTop = 0;
        setParams(p);
        setRoute(name);
    }

    let screen = null;
    if (route === "login") screen = <window.LoginScreen onLogin={() => navigate("home")} />;
    else if (route === "home") screen = <window.HomeScreen navigate={navigate} />;
    else if (route === "order") screen = <window.OrderScreen navigate={navigate} params={params} />;
    else if (route === "success") screen = <window.SuccessScreen navigate={navigate} params={params} />;
    else if (route === "menu") screen = <window.MenuScreen navigate={navigate} />;
    else if (route === "settings") screen = <window.SettingsScreen navigate={navigate} />;
    else if (route === "portions") screen = <window.PortionsScreen navigate={navigate} />;
    else if (route === "diets") screen = <window.DietsScreen navigate={navigate} />;

    const tabRoutes = ["home", "menu", "settings"];
    const onTab = tabRoutes.includes(route);

    return (
        <PhoneFrame>
            <div className={"zp-route-body" + (onTab ? "" : " zp-route-body--notab")}>
                {screen}
            </div>
            <TabBar route={route} navigate={navigate} />
        </PhoneFrame>
    );
}
window.App = App;

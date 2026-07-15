/* global React */
const { Coffee: MPCoffee, Utensils: MPUtensils, Apple: MPApple } = window.ZpIcons;

/* ============================================================
 * MenuPC — Jedálniček, desktop. Week tabs + 3 meal columns.
 * ============================================================ */

const PC_WEEK = [
    {
        date: "po, 26. máj", label: "Pondelok",
        meals: {
            ranajky: { gram: "200/150 g", items: [{ l: "A", t: "Krupicová kaša s ovocím", d: "Pšeničná krupica, mlieko, lesné ovocie, med." }] },
            obed: { gram: "Polievka 200ml · 250/150g", items: [
                { l: "A", t: "Kurací vývar · Kuracie soté so zeleninou, ryža", d: "Kurča, paprika, brokolica, cuketa, dusená ryža." },
                { l: "B", t: "Kurací vývar · Šošovicový prívarok, vajce, chlieb", d: "Šošovica, vajce v cestíčku, celozrnný chlieb." },
                { l: "V", t: "Zeleninová · Tofu so zeleninou, ryža", d: "Hľadkový tofu, paprika, mrkva, kel, ryža." },
            ] },
            olovrant: { gram: "150 g", items: [{ l: "A", t: "Ovocný šalát s tvarohom", d: "Jablko, hruška, banán, tvaroh, škorica." }] },
        },
    },
    {
        date: "ut, 27. máj", label: "Utorok", active: true,
        meals: {
            ranajky: { gram: "200/150 g", items: [{ l: "A", t: "Ovsené vločky s jablkom", d: "Ovsené vločky, jablko, mlieko, škorica, hrozienka." }] },
            obed: { gram: "Polievka 200ml · 250/150g", items: [
                { l: "A", t: "Hrachová polievka · Hovädzí guláš, halušky", d: "Hovädzie pliecko, cibuľa, paprika, zemiakové halušky." },
                { l: "B", t: "Hrachová · Cestoviny s tekvicou a fetou", d: "Penne, pečená tekvica hokkaido, feta syr, bylinky.", allerg: ["1 lepok", "3 vajce", "7 mlieko"] },
                { l: "V", t: "Hrachová · Šošovicové karbonátky, zemiaková kaša", d: "Červená šošovica, mrkva, ovos, kaša." },
            ] },
            olovrant: { gram: "150 g", items: [{ l: "A", t: "Domáce müsli tyčinky", d: "Ovsené vločky, med, sušené ovocie, slnečnica." }] },
        },
    },
    {
        date: "st, 28. máj", label: "Streda",
        meals: {
            ranajky: { gram: "200/150 g", items: [{ l: "A", t: "Bryndzové nátierky", d: "Bryndza, smotana, žemľa, cherry paradajky." }] },
            obed: { gram: "Polievka 200ml · 250/150g", items: [
                { l: "A", t: "Špargľová · Pečené kuracie stehno, opekané zemiaky", d: "Kuracie stehno, rozmarín, zemiaky." },
                { l: "B", t: "Špargľová · Špenátové gnocchi s parmezánom", d: "Špenátové gnocchi, parmezán, maslo." },
                { l: "V", t: "Špargľová · Falafel, hummus, pita", d: "Cícer, sezam, koriander, pita chlieb." },
            ] },
            olovrant: { gram: "150 g", items: [{ l: "A", t: "Mliečne smoothie", d: "Mlieko, banán, lesné ovocie, ovsené vločky." }] },
        },
    },
    {
        date: "št, 29. máj", label: "Štvrtok",
        meals: {
            ranajky: { gram: "200/150 g", items: [{ l: "A", t: "Praženica s pažítkou", d: "Vajcia, maslo, pažítka, celozrnný chlieb." }] },
            obed: { gram: "Polievka 200ml · 250/150g", items: [
                { l: "A", t: "Zeleninová · Sviečková na smotane, knedľa", d: "Hovädzie, koreňová zelenina, smotana, knedľa." },
                { l: "B", t: "Zeleninová · Rizoto so zeleninou a syrom", d: "Ryža arborio, cuketa, hrášok, parmezán." },
                { l: "V", t: "Zeleninová · Cícerový guláš, ryža", d: "Cícer, paprika, rajčiny, ryža." },
            ] },
            olovrant: { gram: "150 g", items: [{ l: "A", t: "Jogurt s granolou", d: "Biely jogurt, domáca granola, med." }] },
        },
    },
    {
        date: "pi, 30. máj", label: "Piatok",
        meals: {
            ranajky: { gram: "200/150 g", items: [{ l: "A", t: "Lievance s lekvárom", d: "Múka, mlieko, vajce, slivkový lekvár." }] },
            obed: { gram: "Polievka 200ml · 250/150g", items: [
                { l: "A", t: "Paradajková · Pečený losos, zemiaková kaša", d: "Losos, citrón, zemiaky, maslo." },
                { l: "B", t: "Paradajková · Zapekané cestoviny so šunkou", d: "Cestoviny, šunka, smotana, syr." },
                { l: "V", t: "Paradajková · Zeleninové lečo, chlieb", d: "Paprika, rajčiny, cibuľa, vajce." },
            ] },
            olovrant: { gram: "150 g", items: [{ l: "A", t: "Ovocný tanier", d: "Sezónne ovocie krájané na drobno." }] },
        },
    },
];

function MealColumn({ icon, name, gram, items }) {
    return (
        <div className="zp-menu-meal">
            <div className="zp-menu-meal-head">
                {icon}
                <span className="name">{name}</span>
                <span className="gram">{gram}</span>
            </div>
            {items.map((m, i) => (
                <div className="zp-menu-item" key={i}>
                    <span className={"letter " + m.l.toLowerCase()}>{m.l}</span>
                    <div className="body">
                        <div className="ttl">{m.t}</div>
                        <div className="desc">{m.d}</div>
                        {m.allerg && (
                            <div className="allergens">
                                {m.allerg.map((a) => <span key={a}>{a}</span>)}
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

function MenuPC() {
    const [dayIdx, setDayIdx] = React.useState(1);
    const day = PC_WEEK[dayIdx];

    return (
        <div className="pc-wrap" data-screen-label="Jedálniček">
            <div className="pc-menu-tabs">
                {PC_WEEK.map((d, i) => (
                    <button
                        key={d.date}
                        className={"pc-menu-tab" + (i === dayIdx ? " active" : "")}
                        onClick={() => setDayIdx(i)}
                    >
                        {d.label}
                        <span className="d">{d.date}</span>
                    </button>
                ))}
            </div>

            <div className="pc-menu-cols">
                <MealColumn icon={<MPCoffee />} name="Raňajky" gram={day.meals.ranajky.gram} items={day.meals.ranajky.items} />
                <MealColumn icon={<MPUtensils />} name="Obed" gram={day.meals.obed.gram} items={day.meals.obed.items} />
                <MealColumn icon={<MPApple />} name="Olovrant" gram={day.meals.olovrant.gram} items={day.meals.olovrant.items} />
            </div>
        </div>
    );
}
window.MenuPC = MenuPC;

// TODO: wire to real API — currently uses mock week data
import { useState } from "react";
import { Coffee, Utensils, Apple } from "lucide-react";

interface MenuItem {
  l: string;
  t: string;
  d: string;
  allergens?: string[];
}

interface MealData {
  gram: string;
  items: MenuItem[];
}

interface DayData {
  date: string;
  label: string;
  active?: boolean;
  meals: {
    ranajky: MealData;
    obed: MealData;
    olovrant: MealData;
  };
}

const WEEK: DayData[] = [
  {
    date: "po",
    label: "Pondelok",
    meals: {
      ranajky: { gram: "200/150 g", items: [{ l: "A", t: "Krupicová kaša s ovocím", d: "Pšeničná krupica, mlieko, lesné ovocie, med." }] },
      obed: {
        gram: "Polievka 200ml · 250/150g",
        items: [
          { l: "A", t: "Kurací vývar · Kuracie soté so zeleninou, ryža", d: "Kurča, paprika, brokolica, cuketa, dusená ryža." },
          { l: "B", t: "Kurací vývar · Šošovicový prívarok, vajce, chlieb", d: "Šošovica, vajce v cestíčku, celozrnný chlieb.", allergens: ["1 lepok", "3 vajce", "7 mlieko"] },
          { l: "V", t: "Zeleninová · Tofu so zeleninou, ryža", d: "Hľadkový tofu, paprika, mrkva, kel, ryža." },
        ],
      },
      olovrant: { gram: "150 g", items: [{ l: "A", t: "Ovocný šalát s tvarohom", d: "Jablko, hruška, banán, tvaroh, škorica." }] },
    },
  },
  {
    date: "ut",
    label: "Utorok",
    active: true,
    meals: {
      ranajky: { gram: "200/150 g", items: [{ l: "A", t: "Ovsené vločky s jablkom", d: "Ovsené vločky, jablko, mlieko, škorica, hrozienka." }] },
      obed: {
        gram: "Polievka 200ml · 250/150g",
        items: [
          { l: "A", t: "Hrachová polievka · Hovädzí guláš, halušky", d: "Hovädzie pliecko, cibuľa, paprika, zemiakové halušky." },
          { l: "B", t: "Hrachová · Cestoviny s tekvicou a fetou", d: "Penne, pečená tekvica hokkaido, feta syr, bylinky.", allergens: ["1 lepok", "7 mlieko"] },
          { l: "V", t: "Hrachová · Šošovicové karbonátky, zemiaková kaša", d: "Červená šošovica, mrkva, ovos, kaša." },
        ],
      },
      olovrant: { gram: "150 g", items: [{ l: "A", t: "Domáce müsli tyčinky", d: "Ovsené vločky, med, sušené ovocie, slnečnica." }] },
    },
  },
  {
    date: "st",
    label: "Streda",
    meals: {
      ranajky: { gram: "200/150 g", items: [{ l: "A", t: "Bryndzové nátierky", d: "Bryndza, smotana, žemľa, cherry paradajky." }] },
      obed: {
        gram: "Polievka 200ml · 250/150g",
        items: [
          { l: "A", t: "Špargľová · Pečené kuracie stehno, opekané zemiaky", d: "Kuracie stehno, rozmarín, zemiaky." },
          { l: "B", t: "Špargľová · Špenátové gnocchi s parmezánom", d: "Špenátové gnocchi, parmezán, maslo.", allergens: ["1 lepok", "7 mlieko"] },
          { l: "V", t: "Špargľová · Falafel, hummus, pita", d: "Cícer, sezam, koriander, pita chlieb." },
        ],
      },
      olovrant: { gram: "150 g", items: [{ l: "A", t: "Mliečne smoothie", d: "Mlieko, banán, lesné ovocie, ovsené vločky." }] },
    },
  },
  {
    date: "št",
    label: "Štvrtok",
    meals: {
      ranajky: { gram: "200/150 g", items: [{ l: "A", t: "Celozrnné rožky s maslom", d: "Celozrnné rožky, maslo, med, čaj." }] },
      obed: {
        gram: "Polievka 200ml · 250/150g",
        items: [
          { l: "A", t: "Paradajková polievka · Bravčový rezeň, ryža", d: "Bravčové plátky, strúhanka, vajce, varená ryža." },
          { l: "B", t: "Paradajková · Vegetariánska čína, ryža", d: "Zelenina wok, sója, zázvor, ryža." },
          { l: "V", t: "Paradajková · Zeleninový kuskus", d: "Kuskus, cuketa, paprika, olivový olej." },
        ],
      },
      olovrant: { gram: "150 g", items: [{ l: "A", t: "Tvarohový závin", d: "Tvaroh, rozínky, vanilka, lístkové cesto." }] },
    },
  },
  {
    date: "pi",
    label: "Piatok",
    meals: {
      ranajky: { gram: "200/150 g", items: [{ l: "A", t: "Mlieko s kukuričnými lupienkami", d: "Kukuričné lupienky, mlieko, ovocie." }] },
      obed: {
        gram: "Polievka 200ml · 250/150g",
        items: [
          { l: "A", t: "Zeleninová polievka · Ryba na masle, zemiaková kaša", d: "Treska, maslo, citrón, zemiaková kaša." },
          { l: "B", t: "Zeleninová · Cícer na špenáte, ryža", d: "Cícer, špenát, cesnak, olivový olej, ryža." },
          { l: "V", t: "Zeleninová · Syrové knedličky, špenát", d: "Tvaroh, múka, vajce, špenát s cesnakom." },
        ],
      },
      olovrant: { gram: "150 g", items: [{ l: "A", t: "Ovocná pena", d: "Jogurt, banán, jahody, med." }] },
    },
  },
];

const MenuPage = () => {
  const today = new Date();
  // Find active day index (today's weekday), fallback to 0
  const dayOfWeek = today.getDay(); // 0 = Sunday
  const defaultIdx = dayOfWeek >= 1 && dayOfWeek <= 5 ? dayOfWeek - 1 : 0;
  const [dayIdx, setDayIdx] = useState(defaultIdx);
  const day = WEEK[dayIdx];

  const letterClass = (l: string) => {
    if (l === "B") return "b";
    if (l === "V") return "v";
    return "";
  };

  return (
    <div className="zp-app">
      <div className="zp-pageheader">
        <div>
          <h1>Jedálniček</h1>
          <p>Aktuálny týždeň</p>
        </div>
      </div>

      {/* Day tabs */}
      <div style={{ display: "flex", gap: 6, padding: "6px 20px 16px", overflowX: "auto" }}>
        {WEEK.map((d, i) => (
          <button
            key={d.date}
            onClick={() => setDayIdx(i)}
            className="zp-pill"
            style={{
              padding: "8px 14px",
              background: i === dayIdx ? "var(--green-700)" : "var(--bg-cream-warm)",
              color: i === dayIdx ? "var(--bg-cream)" : "var(--ink-2)",
              border: `1px solid ${i === dayIdx ? "var(--green-700)" : "var(--line-soft)"}`,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className="zp-menu-day">
        <div className="zp-menu-day-head">
          <h3>{day.label}</h3>
          <span className="when">{day.date}</span>
        </div>

        {/* Raňajky */}
        <div className="zp-menu-meal">
          <div className="zp-menu-meal-head">
            <Coffee style={{ width: 16, height: 16 }} />
            <span className="name">Raňajky</span>
            <span className="gram">{day.meals.ranajky.gram}</span>
          </div>
          {day.meals.ranajky.items.map((m, i) => (
            <div className="zp-menu-item" key={i}>
              <span className={`letter ${letterClass(m.l)}`}>{m.l}</span>
              <div className="body">
                <div className="ttl">{m.t}</div>
                <div className="desc">{m.d}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Obed */}
        <div className="zp-menu-meal">
          <div className="zp-menu-meal-head">
            <Utensils style={{ width: 16, height: 16 }} />
            <span className="name">Obed</span>
            <span className="gram">{day.meals.obed.gram}</span>
          </div>
          {day.meals.obed.items.map((m, i) => (
            <div className="zp-menu-item" key={i}>
              <span className={`letter ${letterClass(m.l)}`}>{m.l}</span>
              <div className="body">
                <div className="ttl">{m.t}</div>
                <div className="desc">{m.d}</div>
                {m.allergens && m.allergens.length > 0 && (
                  <div className="allergens">
                    {m.allergens.map((a) => <span key={a}>{a}</span>)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Olovrant */}
        <div className="zp-menu-meal">
          <div className="zp-menu-meal-head">
            <Apple style={{ width: 16, height: 16 }} />
            <span className="name">Olovrant</span>
            <span className="gram">{day.meals.olovrant.gram}</span>
          </div>
          {day.meals.olovrant.items.map((m, i) => (
            <div className="zp-menu-item" key={i}>
              <span className={`letter ${letterClass(m.l)}`}>{m.l}</span>
              <div className="body">
                <div className="ttl">{m.t}</div>
                <div className="desc">{m.d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MenuPage;

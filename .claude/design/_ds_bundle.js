/* @ds-bundle: {"format":3,"namespace":"ZdravProjektDesignSystem_970737","components":[],"sourceHashes":{"client_pc/HomePC.jsx":"7744d0863ca2","client_pc/LoginPC.jsx":"4dffbc4fd6dc","client_pc/MenuPC.jsx":"98a7269120bd","client_pc/OrderDetailPC.jsx":"7612933706ee","client_pc/OrderPC.jsx":"2acdec09e7cf","client_pc/SettingsPC.jsx":"a6e13b94b1a2","client_pc/SuccessPC.jsx":"f9e063defad6","client_pc/icons.jsx":"9ee61ff34461","slides/deck-stage.js":"0c125b8b1e23","ui_kits/client_app/App.jsx":"f8682325f0ba","ui_kits/client_app/HomeScreen.jsx":"fe5135f7062b","ui_kits/client_app/LoginScreen.jsx":"2420afd8f422","ui_kits/client_app/MenuScreen.jsx":"ffe164a9ae78","ui_kits/client_app/OrderScreen.jsx":"66dca56dcaca","ui_kits/client_app/SettingsScreens.jsx":"f9d3babcc009","ui_kits/client_app/SuccessScreen.jsx":"5929cc40b34c","ui_kits/client_app/design-canvas.jsx":"3b0e985041dd","ui_kits/client_app/icons.jsx":"9ee61ff34461","ui_kits/website/Audiences.jsx":"afe87135d719","ui_kits/website/DietPicker.jsx":"2ac3e5b3dd68","ui_kits/website/Footer.jsx":"47c1034b0090","ui_kits/website/Founders.jsx":"e58ab06f1891","ui_kits/website/Header.jsx":"0103e0e1e60b","ui_kits/website/Hero.jsx":"cf7d3378effa","ui_kits/website/Partners.jsx":"82687371b563"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.ZdravProjektDesignSystem_970737 = window.ZdravProjektDesignSystem_970737 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// client_pc/HomePC.jsx
try { (() => {
/* global React */
const {
  Plus: DHPlus,
  Clock: DHClock,
  CalendarDays: DHCalDays,
  Calendar: DHCal,
  Bot: DHBot,
  PenLine: DHPen,
  XCircle: DHX,
  History: DHHist,
  Sparkles: DHSpark,
  ChevronRight: DHChev
} = window.ZpIcons;

/* ============================================================
 * Order data — shared by Home cards + the detail screen.
 * Each order is read-only summary data; the detail screen
 * renders it, and "Upraviť" jumps into the order builder.
 * ============================================================ */
const PC_ORDERS = {
  "ut-27": {
    id: "ut-27",
    day: "ut, 27. máj",
    weekday: "Utorok",
    date: "27. máj 2026",
    status: "today",
    deadline: "Upraviť do 10:00",
    total: 32,
    meals: [{
      key: "ranajky",
      name: "Raňajky",
      porcie: 8,
      term: "7:30",
      cats: [{
        head: "Materská škola · 3–6 rokov",
        rows: [{
          menu: "A",
          n: 8
        }]
      }]
    }, {
      key: "obed",
      name: "Obed",
      porcie: 18,
      term: "10:00",
      cats: [{
        head: "Materská škola · 3–6 rokov",
        rows: [{
          menu: "A",
          n: 12,
          diets: [{
            code: "VEGE",
            n: 1
          }, {
            code: "NO MILK",
            n: 1
          }]
        }, {
          menu: "B",
          n: 3
        }, {
          menu: "V",
          n: 1
        }]
      }, {
        head: "Zamestnanci",
        rows: [{
          menu: "A",
          n: 2
        }]
      }]
    }, {
      key: "olovrant",
      name: "Olovrant",
      porcie: 6,
      term: "9:00",
      cats: [{
        head: "Materská škola · 3–6 rokov",
        rows: [{
          menu: "A",
          n: 6
        }]
      }]
    }]
  },
  "st-28": {
    id: "st-28",
    day: "streda, 28. máj",
    weekday: "Streda",
    date: "28. máj 2026",
    status: "auto",
    total: 30,
    meals: [{
      key: "ranajky",
      name: "Raňajky",
      porcie: 8,
      term: "7:30",
      cats: [{
        head: "Materská škola · 3–6 rokov",
        rows: [{
          menu: "A",
          n: 8
        }]
      }]
    }, {
      key: "obed",
      name: "Obed",
      porcie: 16,
      term: "10:00",
      cats: [{
        head: "Materská škola · 3–6 rokov",
        rows: [{
          menu: "A",
          n: 11,
          diets: [{
            code: "VEGE",
            n: 1
          }]
        }, {
          menu: "B",
          n: 3
        }]
      }, {
        head: "Zamestnanci",
        rows: [{
          menu: "A",
          n: 2
        }]
      }]
    }, {
      key: "olovrant",
      name: "Olovrant",
      porcie: 6,
      term: "9:00",
      cats: [{
        head: "Materská škola · 3–6 rokov",
        rows: [{
          menu: "A",
          n: 6
        }]
      }]
    }]
  },
  "st-29": {
    id: "st-29",
    day: "štvrtok, 29. máj",
    weekday: "Štvrtok",
    date: "29. máj 2026",
    status: "manual",
    total: 28,
    meals: [{
      key: "obed",
      name: "Obed",
      porcie: 22,
      term: "10:00",
      cats: [{
        head: "Materská škola · 3–6 rokov",
        rows: [{
          menu: "A",
          n: 16,
          diets: [{
            code: "NO GLUTEN",
            n: 1
          }]
        }, {
          menu: "B",
          n: 4
        }]
      }, {
        head: "Zamestnanci",
        rows: [{
          menu: "A",
          n: 2
        }]
      }]
    }, {
      key: "olovrant",
      name: "Olovrant",
      porcie: 6,
      term: "9:00",
      cats: [{
        head: "Materská škola · 3–6 rokov",
        rows: [{
          menu: "A",
          n: 6
        }]
      }]
    }]
  },
  "pi-30": {
    id: "pi-30",
    day: "piatok, 30. máj",
    weekday: "Piatok",
    date: "30. máj 2026",
    status: "empty",
    total: 0,
    meals: []
  },
  "po-2": {
    id: "po-2",
    day: "pondelok, 2. jún",
    weekday: "Pondelok",
    date: "2. jún 2026",
    status: "auto",
    total: 32,
    meals: [{
      key: "ranajky",
      name: "Raňajky",
      porcie: 8,
      term: "7:30",
      cats: [{
        head: "Materská škola · 3–6 rokov",
        rows: [{
          menu: "A",
          n: 8
        }]
      }]
    }, {
      key: "obed",
      name: "Obed",
      porcie: 18,
      term: "10:00",
      cats: [{
        head: "Materská škola · 3–6 rokov",
        rows: [{
          menu: "A",
          n: 12,
          diets: [{
            code: "VEGE",
            n: 1
          }, {
            code: "NO MILK",
            n: 1
          }]
        }, {
          menu: "B",
          n: 3
        }, {
          menu: "V",
          n: 1
        }]
      }, {
        head: "Zamestnanci",
        rows: [{
          menu: "A",
          n: 2
        }]
      }]
    }, {
      key: "olovrant",
      name: "Olovrant",
      porcie: 6,
      term: "9:00",
      cats: [{
        head: "Materská škola · 3–6 rokov",
        rows: [{
          menu: "A",
          n: 6
        }]
      }]
    }]
  }
};
// History orders (already fulfilled, read-only)
["po-26", "pi-23", "st-22", "st-21"].forEach(id => {});
const PC_HISTORY = {
  "po-26": {
    id: "po-26",
    day: "po, 26. máj",
    weekday: "Pondelok",
    date: "26. máj 2026",
    status: "done",
    total: 32,
    meals: [{
      key: "ranajky",
      name: "Raňajky",
      porcie: 8,
      term: "7:30",
      cats: [{
        head: "Materská škola · 3–6 rokov",
        rows: [{
          menu: "A",
          n: 8
        }]
      }]
    }, {
      key: "obed",
      name: "Obed",
      porcie: 18,
      term: "10:00",
      cats: [{
        head: "Materská škola · 3–6 rokov",
        rows: [{
          menu: "A",
          n: 12,
          diets: [{
            code: "VEGE",
            n: 1
          }]
        }, {
          menu: "B",
          n: 3
        }, {
          menu: "V",
          n: 1
        }]
      }, {
        head: "Zamestnanci",
        rows: [{
          menu: "A",
          n: 2
        }]
      }]
    }, {
      key: "olovrant",
      name: "Olovrant",
      porcie: 6,
      term: "9:00",
      cats: [{
        head: "Materská škola · 3–6 rokov",
        rows: [{
          menu: "A",
          n: 6
        }]
      }]
    }]
  },
  "pi-23": {
    id: "pi-23",
    day: "pi, 23. máj",
    weekday: "Piatok",
    date: "23. máj 2026",
    status: "done",
    total: 28,
    meals: [{
      key: "obed",
      name: "Obed",
      porcie: 22,
      term: "10:00",
      cats: [{
        head: "Materská škola · 3–6 rokov",
        rows: [{
          menu: "A",
          n: 16
        }, {
          menu: "B",
          n: 4
        }]
      }, {
        head: "Zamestnanci",
        rows: [{
          menu: "A",
          n: 2
        }]
      }]
    }, {
      key: "olovrant",
      name: "Olovrant",
      porcie: 6,
      term: "9:00",
      cats: [{
        head: "Materská škola · 3–6 rokov",
        rows: [{
          menu: "A",
          n: 6
        }]
      }]
    }]
  },
  "st-22": {
    id: "st-22",
    day: "št, 22. máj",
    weekday: "Štvrtok",
    date: "22. máj 2026",
    status: "done",
    total: 30,
    meals: [{
      key: "ranajky",
      name: "Raňajky",
      porcie: 8,
      term: "7:30",
      cats: [{
        head: "Materská škola · 3–6 rokov",
        rows: [{
          menu: "A",
          n: 8
        }]
      }]
    }, {
      key: "obed",
      name: "Obed",
      porcie: 16,
      term: "10:00",
      cats: [{
        head: "Materská škola · 3–6 rokov",
        rows: [{
          menu: "A",
          n: 11
        }, {
          menu: "B",
          n: 3
        }]
      }, {
        head: "Zamestnanci",
        rows: [{
          menu: "A",
          n: 2
        }]
      }]
    }, {
      key: "olovrant",
      name: "Olovrant",
      porcie: 6,
      term: "9:00",
      cats: [{
        head: "Materská škola · 3–6 rokov",
        rows: [{
          menu: "A",
          n: 6
        }]
      }]
    }]
  },
  "st-21": {
    id: "st-21",
    day: "st, 21. máj",
    weekday: "Streda",
    date: "21. máj 2026",
    status: "done",
    total: 30,
    meals: [{
      key: "ranajky",
      name: "Raňajky",
      porcie: 8,
      term: "7:30",
      cats: [{
        head: "Materská škola · 3–6 rokov",
        rows: [{
          menu: "A",
          n: 8
        }]
      }]
    }, {
      key: "obed",
      name: "Obed",
      porcie: 16,
      term: "10:00",
      cats: [{
        head: "Materská škola · 3–6 rokov",
        rows: [{
          menu: "A",
          n: 11
        }, {
          menu: "B",
          n: 3
        }]
      }, {
        head: "Zamestnanci",
        rows: [{
          menu: "A",
          n: 2
        }]
      }]
    }, {
      key: "olovrant",
      name: "Olovrant",
      porcie: 6,
      term: "9:00",
      cats: [{
        head: "Materská škola · 3–6 rokov",
        rows: [{
          menu: "A",
          n: 6
        }]
      }]
    }]
  }
};
window.PC_ORDERS = PC_ORDERS;
window.PC_HISTORY = PC_HISTORY;

/* ============================================================
 * HomePC — desktop dashboard. Two columns.
 * Day cards open the read-only DETAIL screen (not edit).
 * ============================================================ */

function DayCard({
  icon,
  title,
  pill,
  count,
  chips,
  hint,
  today,
  empty,
  onClick
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "zp-day" + (today ? " zp-day--today" : "") + (empty ? " zp-day--empty" : ""),
    onClick: onClick,
    role: "button",
    style: {
      marginBottom: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-day-top"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-day-left"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-day-icon"
  }, icon), /*#__PURE__*/React.createElement("div", {
    className: "flex1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-day-title"
  }, title, today && /*#__PURE__*/React.createElement("span", {
    className: "pill-today"
  }, "DNES")), pill)), /*#__PURE__*/React.createElement("div", {
    className: "zp-day-count",
    style: empty ? {
      color: "var(--ink-mute)"
    } : null
  }, count, /*#__PURE__*/React.createElement("small", null, "porci\xED"))), chips && /*#__PURE__*/React.createElement("div", {
    className: "zp-meal-chips"
  }, chips), hint && /*#__PURE__*/React.createElement("div", {
    className: "zp-day-hint"
  }, hint));
}
function HomePC({
  navigate
}) {
  const openDetail = id => navigate("detail", {
    id
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "pc-wrap",
    "data-screen-label": "Domov"
  }, /*#__PURE__*/React.createElement("a", {
    className: "pc-hero",
    href: "#",
    onClick: e => {
      e.preventDefault();
      navigate("order", {
        day: "streda, 28. mája"
      });
    },
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "bubble"
  }, /*#__PURE__*/React.createElement(DHPlus, {
    w: 28
  })), /*#__PURE__*/React.createElement("span", {
    className: "body"
  }, /*#__PURE__*/React.createElement("span", {
    className: "eye"
  }, "Pripravte nov\xFA"), /*#__PURE__*/React.createElement("h3", null, "Nov\xE1 objedn\xE1vka"), /*#__PURE__*/React.createElement("span", {
    className: "when"
  }, "streda, 28. m\xE1ja")), /*#__PURE__*/React.createElement("span", {
    className: "chev"
  }, /*#__PURE__*/React.createElement(DHChev, {
    w: 24
  }))), /*#__PURE__*/React.createElement("p", {
    className: "zp-disclaimer",
    style: {
      margin: "0 0 28px"
    }
  }, "Objedn\xE1vky sa automaticky prekl\xE1paj\xFA na \u010Fal\u0161\xED de\u0148, pokia\u013E ich manu\xE1lne neuprav\xEDte."), /*#__PURE__*/React.createElement("div", {
    className: "pc-home-grid"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pc-col"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "pc-h2"
  }, /*#__PURE__*/React.createElement(DHClock, null), " Dne\u0161n\xE1 objedn\xE1vka"), /*#__PURE__*/React.createElement(DayCard, {
    today: true,
    icon: /*#__PURE__*/React.createElement(DHClock, null),
    title: "ut, 27. m\xE1j",
    pill: /*#__PURE__*/React.createElement("span", {
      className: "zp-pill zp-pill--deadline"
    }, /*#__PURE__*/React.createElement(DHClock, null), " Upravi\u0165 do 10:00"),
    count: 32,
    chips: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
      className: "zp-mchip zp-mchip--breakfast"
    }, "Ra\u0148ajky \xB7 8"), /*#__PURE__*/React.createElement("span", {
      className: "zp-mchip zp-mchip--lunch"
    }, "Obed \xB7 18"), /*#__PURE__*/React.createElement("span", {
      className: "zp-mchip zp-mchip--olovrant"
    }, "Olovrant \xB7 6")),
    onClick: () => openDetail("ut-27")
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "pc-h2"
  }, /*#__PURE__*/React.createElement(DHCalDays, null), " Pl\xE1novan\xE9 objedn\xE1vky"), /*#__PURE__*/React.createElement("div", {
    className: "pc-daygrid"
  }, /*#__PURE__*/React.createElement(DayCard, {
    icon: /*#__PURE__*/React.createElement(DHBot, null),
    title: "streda, 28. m\xE1j",
    pill: /*#__PURE__*/React.createElement("span", {
      className: "zp-pill zp-pill--auto"
    }, /*#__PURE__*/React.createElement(DHSpark, {
      w: 11,
      sw: 2.2
    }), " Automatick\xE1"),
    count: 30,
    chips: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
      className: "zp-mchip zp-mchip--breakfast"
    }, "Ra\u0148ajky \xB7 8"), /*#__PURE__*/React.createElement("span", {
      className: "zp-mchip zp-mchip--lunch"
    }, "Obed \xB7 16"), /*#__PURE__*/React.createElement("span", {
      className: "zp-mchip zp-mchip--olovrant"
    }, "Olovrant \xB7 6")),
    onClick: () => openDetail("st-28")
  }), /*#__PURE__*/React.createElement(DayCard, {
    icon: /*#__PURE__*/React.createElement(DHPen, null),
    title: "\u0161tvrtok, 29. m\xE1j",
    pill: /*#__PURE__*/React.createElement("span", {
      className: "zp-pill zp-pill--manual"
    }, /*#__PURE__*/React.createElement(DHPen, {
      w: 11,
      sw: 2.2
    }), " Manu\xE1lna"),
    count: 28,
    chips: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
      className: "zp-mchip zp-mchip--lunch"
    }, "Obed \xB7 22"), /*#__PURE__*/React.createElement("span", {
      className: "zp-mchip zp-mchip--olovrant"
    }, "Olovrant \xB7 6")),
    onClick: () => openDetail("st-29")
  }), /*#__PURE__*/React.createElement(DayCard, {
    empty: true,
    icon: /*#__PURE__*/React.createElement(DHX, null),
    title: "piatok, 30. m\xE1j",
    pill: /*#__PURE__*/React.createElement("span", {
      className: "zp-pill zp-pill--empty"
    }, /*#__PURE__*/React.createElement(DHX, {
      w: 11,
      sw: 2.2
    }), " Manu\xE1lna \xB7 nulov\xE1"),
    count: 0,
    hint: "Bez objedn\xE1vky \u2014 vo\u013En\xFD de\u0148 pre kuchy\u0148u.",
    onClick: () => openDetail("pi-30")
  }), /*#__PURE__*/React.createElement(DayCard, {
    icon: /*#__PURE__*/React.createElement(DHBot, null),
    title: "pondelok, 2. j\xFAn",
    pill: /*#__PURE__*/React.createElement("span", {
      className: "zp-pill zp-pill--auto"
    }, /*#__PURE__*/React.createElement(DHSpark, {
      w: 11,
      sw: 2.2
    }), " Automatick\xE1"),
    count: 32,
    chips: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
      className: "zp-mchip zp-mchip--breakfast"
    }, "Ra\u0148ajky \xB7 8"), /*#__PURE__*/React.createElement("span", {
      className: "zp-mchip zp-mchip--lunch"
    }, "Obed \xB7 18"), /*#__PURE__*/React.createElement("span", {
      className: "zp-mchip zp-mchip--olovrant"
    }, "Olovrant \xB7 6")),
    onClick: () => openDetail("po-2")
  })))), /*#__PURE__*/React.createElement("div", {
    className: "pc-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-monthly",
    style: {
      margin: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "eye"
  }, "Tento mesiac"), /*#__PURE__*/React.createElement("h3", null, "Mesa\u010Dn\xFD s\xFAhrn", /*#__PURE__*/React.createElement("small", null, "m\xE1j 2026 \xB7 doteraz odoberan\xE9")), /*#__PURE__*/React.createElement("div", {
    className: "zp-monthly-grid"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-monthly-stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "num"
  }, "142\xD7"), /*#__PURE__*/React.createElement("div", {
    className: "lbl"
  }, "Menu A")), /*#__PURE__*/React.createElement("div", {
    className: "zp-monthly-stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "num"
  }, "38\xD7"), /*#__PURE__*/React.createElement("div", {
    className: "lbl"
  }, "Menu B")), /*#__PURE__*/React.createElement("div", {
    className: "zp-monthly-stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "num"
  }, "96\xD7"), /*#__PURE__*/React.createElement("div", {
    className: "lbl"
  }, "Ra\u0148ajky")), /*#__PURE__*/React.createElement("div", {
    className: "zp-monthly-stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "num"
  }, "68\xD7"), /*#__PURE__*/React.createElement("div", {
    className: "lbl"
  }, "Olovrant"))), /*#__PURE__*/React.createElement("div", {
    className: "zp-monthly-foot"
  }, /*#__PURE__*/React.createElement("span", null, "Spolu"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("strong", null, "344"), " porci\xED \xB7 18 dn\xED"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "pc-h2"
  }, /*#__PURE__*/React.createElement(DHHist, null), " Hist\xF3ria ", /*#__PURE__*/React.createElement("span", {
    className: "action"
  }, "Viac \u2192")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, [{
    id: "po-26",
    d: "po, 26. máj",
    n: 32
  }, {
    id: "pi-23",
    d: "pi, 23. máj",
    n: 28
  }, {
    id: "st-22",
    d: "št, 22. máj",
    n: 30
  }, {
    id: "st-21",
    d: "st, 21. máj",
    n: 30
  }].map(o => /*#__PURE__*/React.createElement("div", {
    key: o.id,
    className: "zp-day pc-hist",
    style: {
      background: "var(--bg-cream-soft)",
      marginBottom: 0
    },
    role: "button",
    onClick: () => navigate("detail", {
      id: o.id,
      hist: true
    })
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-day-top"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-day-left"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-day-icon",
    style: {
      background: "rgba(114,136,75,0.12)",
      color: "var(--green-700)",
      width: 40,
      height: 40,
      flexBasis: 40
    }
  }, /*#__PURE__*/React.createElement(DHCal, null)), /*#__PURE__*/React.createElement("div", {
    className: "pc-hist-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-day-title"
  }, o.d), /*#__PURE__*/React.createElement("span", {
    className: "zp-pill",
    style: {
      background: "rgba(114,136,75,0.16)",
      color: "var(--green-700)"
    }
  }, "Vybaven\xE1"))), /*#__PURE__*/React.createElement("div", {
    className: "zp-day-count",
    style: {
      fontSize: 19
    }
  }, o.n, /*#__PURE__*/React.createElement("small", null, "porci\xED"))))))))));
}
window.HomePC = HomePC;
})(); } catch (e) { __ds_ns.__errors.push({ path: "client_pc/HomePC.jsx", error: String((e && e.message) || e) }); }

// client_pc/LoginPC.jsx
try { (() => {
/* global React */

/* ============================================================
 * LoginPC — split-screen desktop login.
 * Left: brand art panel. Right: sign-in card.
 * ============================================================ */
function LoginPC({
  onLogin
}) {
  const [email, setEmail] = React.useState("janka@skolka-luka.sk");
  const [pwd, setPwd] = React.useState("");
  function submit(e) {
    e && e.preventDefault();
    onLogin && onLogin();
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "pc-login",
    "data-screen-label": "Login"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pc-login-art"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mk"
  }, "Zdrav\xFD projekt"), /*#__PURE__*/React.createElement("div", {
    className: "pitch"
  }, /*#__PURE__*/React.createElement("span", {
    className: "script"
  }, "Dobr\xE9 jedlo, ka\u017Ed\xFD de\u0148"), /*#__PURE__*/React.createElement("h2", null, "Objedn\xE1vky pre va\u0161u \u0161k\xF4lku na jednom mieste."), /*#__PURE__*/React.createElement("p", null, "Pl\xE1nujte ra\u0148ajky, obedy a olovranty, sledujte jed\xE1lni\u010Dek a spravujte di\xE9ty \u2014 preh\u013Eadne, z po\u010D\xEDta\u010Da aj mobilu.")), /*#__PURE__*/React.createElement("div", {
    className: "foot"
  }, "Zdrav\xFD projekt s. r. o. \xB7 klientsk\xFD port\xE1l v2.1")), /*#__PURE__*/React.createElement("div", {
    className: "pc-login-panel"
  }, /*#__PURE__*/React.createElement("form", {
    className: "pc-login-card",
    onSubmit: submit
  }, /*#__PURE__*/React.createElement("img", {
    className: "logoimg",
    src: "logo-zdravy-projekt.png",
    alt: "Zdrav\xFD projekt"
  }), /*#__PURE__*/React.createElement("h2", null, "Vitajte sp\xE4\u0165"), /*#__PURE__*/React.createElement("p", {
    className: "sub"
  }, "Prihl\xE1ste sa, pros\xEDm, do svojho \xFA\u010Dtu."), /*#__PURE__*/React.createElement("div", {
    className: "zp-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "zp-label"
  }, "Email"), /*#__PURE__*/React.createElement("input", {
    className: "zp-input",
    type: "email",
    value: email,
    onChange: e => setEmail(e.target.value),
    placeholder: "vase@meno.sk"
  })), /*#__PURE__*/React.createElement("div", {
    className: "zp-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "zp-label"
  }, "Heslo"), /*#__PURE__*/React.createElement("input", {
    className: "zp-input",
    type: "password",
    value: pwd,
    onChange: e => setPwd(e.target.value),
    placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "right",
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement("a", {
    className: "zp-link",
    href: "#",
    onClick: e => e.preventDefault()
  }, "Zabudli ste heslo?"))), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    className: "zp-btn zp-btn--primary zp-btn--block zp-btn--lg",
    style: {
      marginTop: 8,
      whiteSpace: "nowrap"
    }
  }, "Prihl\xE1si\u0165 sa"), /*#__PURE__*/React.createElement("div", {
    className: "zp-divider"
  }, "Nem\xE1te \xFA\u010Det?"), /*#__PURE__*/React.createElement("div", {
    className: "zp-login-info"
  }, /*#__PURE__*/React.createElement("strong", null, "Registr\xE1ciu vykon\xE1va poskytovate\u013E."), /*#__PURE__*/React.createElement("br", null), "Ak m\xE1te z\xE1ujem o slu\u017Ebu, nap\xED\u0161te n\xE1m na", " ", /*#__PURE__*/React.createElement("a", {
    href: "mailto:info@zdravyprojekt.sk"
  }, "info@zdravyprojekt.sk"), " ", "a my V\xE1m vytvor\xEDme pr\xEDstup."))));
}
window.LoginPC = LoginPC;
})(); } catch (e) { __ds_ns.__errors.push({ path: "client_pc/LoginPC.jsx", error: String((e && e.message) || e) }); }

// client_pc/MenuPC.jsx
try { (() => {
/* global React */
const {
  Coffee: MPCoffee,
  Utensils: MPUtensils,
  Apple: MPApple
} = window.ZpIcons;

/* ============================================================
 * MenuPC — Jedálniček, desktop. Week tabs + 3 meal columns.
 * ============================================================ */

const PC_WEEK = [{
  date: "po, 26. máj",
  label: "Pondelok",
  meals: {
    ranajky: {
      gram: "200/150 g",
      items: [{
        l: "A",
        t: "Krupicová kaša s ovocím",
        d: "Pšeničná krupica, mlieko, lesné ovocie, med."
      }]
    },
    obed: {
      gram: "Polievka 200ml · 250/150g",
      items: [{
        l: "A",
        t: "Kurací vývar · Kuracie soté so zeleninou, ryža",
        d: "Kurča, paprika, brokolica, cuketa, dusená ryža."
      }, {
        l: "B",
        t: "Kurací vývar · Šošovicový prívarok, vajce, chlieb",
        d: "Šošovica, vajce v cestíčku, celozrnný chlieb."
      }, {
        l: "V",
        t: "Zeleninová · Tofu so zeleninou, ryža",
        d: "Hľadkový tofu, paprika, mrkva, kel, ryža."
      }]
    },
    olovrant: {
      gram: "150 g",
      items: [{
        l: "A",
        t: "Ovocný šalát s tvarohom",
        d: "Jablko, hruška, banán, tvaroh, škorica."
      }]
    }
  }
}, {
  date: "ut, 27. máj",
  label: "Utorok",
  active: true,
  meals: {
    ranajky: {
      gram: "200/150 g",
      items: [{
        l: "A",
        t: "Ovsené vločky s jablkom",
        d: "Ovsené vločky, jablko, mlieko, škorica, hrozienka."
      }]
    },
    obed: {
      gram: "Polievka 200ml · 250/150g",
      items: [{
        l: "A",
        t: "Hrachová polievka · Hovädzí guláš, halušky",
        d: "Hovädzie pliecko, cibuľa, paprika, zemiakové halušky."
      }, {
        l: "B",
        t: "Hrachová · Cestoviny s tekvicou a fetou",
        d: "Penne, pečená tekvica hokkaido, feta syr, bylinky.",
        allerg: ["1 lepok", "3 vajce", "7 mlieko"]
      }, {
        l: "V",
        t: "Hrachová · Šošovicové karbonátky, zemiaková kaša",
        d: "Červená šošovica, mrkva, ovos, kaša."
      }]
    },
    olovrant: {
      gram: "150 g",
      items: [{
        l: "A",
        t: "Domáce müsli tyčinky",
        d: "Ovsené vločky, med, sušené ovocie, slnečnica."
      }]
    }
  }
}, {
  date: "st, 28. máj",
  label: "Streda",
  meals: {
    ranajky: {
      gram: "200/150 g",
      items: [{
        l: "A",
        t: "Bryndzové nátierky",
        d: "Bryndza, smotana, žemľa, cherry paradajky."
      }]
    },
    obed: {
      gram: "Polievka 200ml · 250/150g",
      items: [{
        l: "A",
        t: "Špargľová · Pečené kuracie stehno, opekané zemiaky",
        d: "Kuracie stehno, rozmarín, zemiaky."
      }, {
        l: "B",
        t: "Špargľová · Špenátové gnocchi s parmezánom",
        d: "Špenátové gnocchi, parmezán, maslo."
      }, {
        l: "V",
        t: "Špargľová · Falafel, hummus, pita",
        d: "Cícer, sezam, koriander, pita chlieb."
      }]
    },
    olovrant: {
      gram: "150 g",
      items: [{
        l: "A",
        t: "Mliečne smoothie",
        d: "Mlieko, banán, lesné ovocie, ovsené vločky."
      }]
    }
  }
}, {
  date: "št, 29. máj",
  label: "Štvrtok",
  meals: {
    ranajky: {
      gram: "200/150 g",
      items: [{
        l: "A",
        t: "Praženica s pažítkou",
        d: "Vajcia, maslo, pažítka, celozrnný chlieb."
      }]
    },
    obed: {
      gram: "Polievka 200ml · 250/150g",
      items: [{
        l: "A",
        t: "Zeleninová · Sviečková na smotane, knedľa",
        d: "Hovädzie, koreňová zelenina, smotana, knedľa."
      }, {
        l: "B",
        t: "Zeleninová · Rizoto so zeleninou a syrom",
        d: "Ryža arborio, cuketa, hrášok, parmezán."
      }, {
        l: "V",
        t: "Zeleninová · Cícerový guláš, ryža",
        d: "Cícer, paprika, rajčiny, ryža."
      }]
    },
    olovrant: {
      gram: "150 g",
      items: [{
        l: "A",
        t: "Jogurt s granolou",
        d: "Biely jogurt, domáca granola, med."
      }]
    }
  }
}, {
  date: "pi, 30. máj",
  label: "Piatok",
  meals: {
    ranajky: {
      gram: "200/150 g",
      items: [{
        l: "A",
        t: "Lievance s lekvárom",
        d: "Múka, mlieko, vajce, slivkový lekvár."
      }]
    },
    obed: {
      gram: "Polievka 200ml · 250/150g",
      items: [{
        l: "A",
        t: "Paradajková · Pečený losos, zemiaková kaša",
        d: "Losos, citrón, zemiaky, maslo."
      }, {
        l: "B",
        t: "Paradajková · Zapekané cestoviny so šunkou",
        d: "Cestoviny, šunka, smotana, syr."
      }, {
        l: "V",
        t: "Paradajková · Zeleninové lečo, chlieb",
        d: "Paprika, rajčiny, cibuľa, vajce."
      }]
    },
    olovrant: {
      gram: "150 g",
      items: [{
        l: "A",
        t: "Ovocný tanier",
        d: "Sezónne ovocie krájané na drobno."
      }]
    }
  }
}];
function MealColumn({
  icon,
  name,
  gram,
  items
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "zp-menu-meal"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-menu-meal-head"
  }, icon, /*#__PURE__*/React.createElement("span", {
    className: "name"
  }, name), /*#__PURE__*/React.createElement("span", {
    className: "gram"
  }, gram)), items.map((m, i) => /*#__PURE__*/React.createElement("div", {
    className: "zp-menu-item",
    key: i
  }, /*#__PURE__*/React.createElement("span", {
    className: "letter " + m.l.toLowerCase()
  }, m.l), /*#__PURE__*/React.createElement("div", {
    className: "body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ttl"
  }, m.t), /*#__PURE__*/React.createElement("div", {
    className: "desc"
  }, m.d), m.allerg && /*#__PURE__*/React.createElement("div", {
    className: "allergens"
  }, m.allerg.map(a => /*#__PURE__*/React.createElement("span", {
    key: a
  }, a)))))));
}
function MenuPC() {
  const [dayIdx, setDayIdx] = React.useState(1);
  const day = PC_WEEK[dayIdx];
  return /*#__PURE__*/React.createElement("div", {
    className: "pc-wrap",
    "data-screen-label": "Jed\xE1lni\u010Dek"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pc-menu-tabs"
  }, PC_WEEK.map((d, i) => /*#__PURE__*/React.createElement("button", {
    key: d.date,
    className: "pc-menu-tab" + (i === dayIdx ? " active" : ""),
    onClick: () => setDayIdx(i)
  }, d.label, /*#__PURE__*/React.createElement("span", {
    className: "d"
  }, d.date)))), /*#__PURE__*/React.createElement("div", {
    className: "pc-menu-cols"
  }, /*#__PURE__*/React.createElement(MealColumn, {
    icon: /*#__PURE__*/React.createElement(MPCoffee, null),
    name: "Ra\u0148ajky",
    gram: day.meals.ranajky.gram,
    items: day.meals.ranajky.items
  }), /*#__PURE__*/React.createElement(MealColumn, {
    icon: /*#__PURE__*/React.createElement(MPUtensils, null),
    name: "Obed",
    gram: day.meals.obed.gram,
    items: day.meals.obed.items
  }), /*#__PURE__*/React.createElement(MealColumn, {
    icon: /*#__PURE__*/React.createElement(MPApple, null),
    name: "Olovrant",
    gram: day.meals.olovrant.gram,
    items: day.meals.olovrant.items
  })));
}
window.MenuPC = MenuPC;
})(); } catch (e) { __ds_ns.__errors.push({ path: "client_pc/MenuPC.jsx", error: String((e && e.message) || e) }); }

// client_pc/OrderDetailPC.jsx
try { (() => {
/* global React */
const {
  ChevronLeft: ODLeft,
  ChevronRight: ODRight,
  Coffee: ODCoffee,
  Utensils: ODUtensils,
  Apple: ODApple,
  Calendar: ODCal,
  PenLine: ODPen,
  Bot: ODBot,
  Clock: ODClock,
  Sparkles: ODSpark,
  XCircle: ODX,
  Check: ODCheck,
  Plus: ODPlus,
  ArrowLeft: ODBack,
  FileCheck: ODFile
} = window.ZpIcons;

/* ============================================================
 * OrderDetailPC — read-only detail of one day's order.
 * Opened by clicking a day card on Home. "Upraviť" → builder.
 * ============================================================ */

const OD_STATUS = {
  today: {
    cls: "zp-pill--deadline",
    icon: /*#__PURE__*/React.createElement(ODClock, {
      w: 11,
      sw: 2.2
    }),
    label: "Dnes · upraviť do 10:00"
  },
  auto: {
    cls: "zp-pill--auto",
    icon: /*#__PURE__*/React.createElement(ODSpark, {
      w: 11,
      sw: 2.2
    }),
    label: "Automatická objednávka"
  },
  manual: {
    cls: "zp-pill--manual",
    icon: /*#__PURE__*/React.createElement(ODPen, {
      w: 11,
      sw: 2.2
    }),
    label: "Manuálna objednávka"
  },
  empty: {
    cls: "zp-pill--empty",
    icon: /*#__PURE__*/React.createElement(ODX, {
      w: 11,
      sw: 2.2
    }),
    label: "Bez objednávky"
  },
  done: {
    cls: "",
    icon: /*#__PURE__*/React.createElement(ODCheck, {
      w: 11,
      sw: 2.2
    }),
    label: "Vybavená objednávka"
  }
};
function MealIcon({
  k
}) {
  if (k === "ranajky") return /*#__PURE__*/React.createElement(ODCoffee, null);
  if (k === "obed") return /*#__PURE__*/React.createElement(ODUtensils, null);
  return /*#__PURE__*/React.createElement(ODApple, null);
}
function OrderDetailPC({
  navigate,
  params
}) {
  const id = params && params.id;
  const isHist = !!(params && params.hist);
  const order = (isHist ? window.PC_HISTORY : window.PC_ORDERS)[id] || window.PC_ORDERS["ut-27"];
  const st = OD_STATUS[order.status] || OD_STATUS.auto;
  const editable = order.status !== "done";
  const goEdit = () => navigate("order", {
    day: order.day,
    today: order.status === "today"
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "pc-wrap",
    "data-screen-label": "Detail objedn\xE1vky"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pc-daysel-pc"
  }, /*#__PURE__*/React.createElement("button", {
    className: "nav",
    "aria-label": "Sp\xE4\u0165 na domov",
    onClick: () => navigate("home")
  }, /*#__PURE__*/React.createElement(ODBack, null)), /*#__PURE__*/React.createElement("div", {
    className: "mid"
  }, /*#__PURE__*/React.createElement("div", {
    className: "eye"
  }, "Detail objedn\xE1vky"), /*#__PURE__*/React.createElement("h3", null, order.day)), /*#__PURE__*/React.createElement("span", {
    className: "zp-pill " + st.cls,
    style: {
      marginLeft: 4
    }
  }, st.icon, " ", st.label), /*#__PURE__*/React.createElement("div", {
    className: "pc-detail-context"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ic"
  }, /*#__PURE__*/React.createElement(ODCal, null)), /*#__PURE__*/React.createElement("div", {
    className: "body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, order.date), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, "spolu ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--green-700)"
    }
  }, order.total), " porci\xED")))), order.status === "empty" ? /*#__PURE__*/React.createElement("div", {
    className: "pc-detail-empty"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ic"
  }, /*#__PURE__*/React.createElement(ODX, {
    w: 34,
    sw: 1.6
  })), /*#__PURE__*/React.createElement("h3", null, "Na tento de\u0148 nie je objedn\xE1vka"), /*#__PURE__*/React.createElement("p", null, order.day, " je ozna\u010Den\xFD ako vo\u013En\xFD de\u0148 pre kuchy\u0148u. Ak chcete, m\xF4\u017Eete objedn\xE1vku vytvori\u0165."), /*#__PURE__*/React.createElement("button", {
    className: "zp-btn zp-btn--primary zp-btn--lg",
    onClick: goEdit
  }, /*#__PURE__*/React.createElement(ODPlus, {
    w: 16
  }), " Vytvori\u0165 objedn\xE1vku")) : /*#__PURE__*/React.createElement("div", {
    className: "pc-order-grid"
  }, /*#__PURE__*/React.createElement("div", null, order.meals.map(meal => /*#__PURE__*/React.createElement("div", {
    className: "zp-meal zp-meal--active",
    key: meal.key
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-meal-head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-meal-icon"
  }, /*#__PURE__*/React.createElement(MealIcon, {
    k: meal.key
  })), /*#__PURE__*/React.createElement("div", {
    className: "zp-meal-title"
  }, meal.name, /*#__PURE__*/React.createElement("span", {
    className: "zp-meal-sub"
  }, meal.porcie, " porci\xED \xB7 term\xEDn ", meal.term)), /*#__PURE__*/React.createElement("span", {
    className: "pc-meal-count"
  }, meal.porcie)), /*#__PURE__*/React.createElement("div", {
    className: "zp-meal-body"
  }, meal.cats.map(cat => /*#__PURE__*/React.createElement("div", {
    className: "zp-cat",
    key: cat.head
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-cat-head"
  }, cat.head), cat.rows.map(r => /*#__PURE__*/React.createElement("div", {
    className: "pc-rorow",
    key: r.menu
  }, /*#__PURE__*/React.createElement("span", {
    className: "menu"
  }, "Menu ", r.menu), r.diets && r.diets.length > 0 && /*#__PURE__*/React.createElement("span", {
    className: "diets"
  }, r.diets.map(d => /*#__PURE__*/React.createElement("span", {
    className: "dchip",
    key: d.code
  }, d.code, " \xB7 ", d.n))), /*#__PURE__*/React.createElement("span", {
    className: "num"
  }, r.n))))))))), /*#__PURE__*/React.createElement("div", {
    className: "pc-order-summary"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-summary"
  }, /*#__PURE__*/React.createElement("h3", null, /*#__PURE__*/React.createElement(ODFile, null), " Zhrnutie objedn\xE1vky"), /*#__PURE__*/React.createElement("div", {
    className: "zp-summary-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "l"
  }, "D\xE1tum"), /*#__PURE__*/React.createElement("span", {
    className: "r",
    style: {
      textTransform: "capitalize"
    }
  }, order.day)), ["ranajky", "obed", "olovrant"].map(k => {
    const m = order.meals.find(x => x.key === k);
    const label = k === "ranajky" ? "Raňajky" : k === "obed" ? "Obedy" : "Olovranty";
    return /*#__PURE__*/React.createElement("div", {
      className: "zp-summary-row",
      key: k
    }, /*#__PURE__*/React.createElement("span", {
      className: "l"
    }, label), /*#__PURE__*/React.createElement("span", {
      className: "r",
      style: m ? null : {
        color: "var(--ink-mute)"
      }
    }, m ? m.porcie : "—"));
  }), /*#__PURE__*/React.createElement("div", {
    className: "zp-summary-total"
  }, /*#__PURE__*/React.createElement("span", {
    className: "l"
  }, "Spolu porci\xED"), /*#__PURE__*/React.createElement("span", {
    className: "r"
  }, order.total, /*#__PURE__*/React.createElement("small", null, "ks"))), editable ? /*#__PURE__*/React.createElement("button", {
    className: "zp-btn zp-btn--primary zp-btn--block zp-btn--lg",
    onClick: goEdit
  }, /*#__PURE__*/React.createElement(ODPen, {
    w: 15
  }), " Upravi\u0165 objedn\xE1vku") : /*#__PURE__*/React.createElement("div", {
    className: "pc-detail-doneflag"
  }, /*#__PURE__*/React.createElement(ODCheck, {
    w: 15
  }), " Objedn\xE1vka bola vybaven\xE1"), /*#__PURE__*/React.createElement("button", {
    className: "zp-btn zp-btn--secondary zp-btn--block",
    style: {
      marginTop: 8
    },
    onClick: () => navigate("home")
  }, /*#__PURE__*/React.createElement(ODBack, {
    w: 14
  }), " Sp\xE4\u0165 na preh\u013Ead")), /*#__PURE__*/React.createElement("p", {
    className: "zp-thanks"
  }, editable ? "Objednávku môžete upraviť do termínu" : "Ďakujeme za Vašu objednávku", /*#__PURE__*/React.createElement("small", null, editable ? "Po termíne sa automaticky odošle do kuchyne." : "Janka & Vlado, Zdravý projekt")))));
}
window.OrderDetailPC = OrderDetailPC;
})(); } catch (e) { __ds_ns.__errors.push({ path: "client_pc/OrderDetailPC.jsx", error: String((e && e.message) || e) }); }

// client_pc/OrderPC.jsx
try { (() => {
/* global React */
const {
  ChevronLeft: OPLeft,
  ChevronRight: OPRight,
  Coffee: OPCoffee,
  Utensils: OPUtensils,
  Apple: OPApple,
  Calendar: OPCal,
  Copy: OPCopy,
  Trash: OPTrash,
  FileCheck: OPFile,
  Lock: OPLock,
  Eraser: OPEraser,
  Plus: OPPlus,
  Minus: OPMinus,
  X: OPX,
  Check: OPCheck
} = window.ZpIcons;

/* ============================================================
 * OrderPC — Nová objednávka, desktop. Builder + sticky summary.
 * ============================================================ */

function CounterPC({
  value,
  onChange,
  max = 99,
  plusActive = true
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "zp-counter"
  }, /*#__PURE__*/React.createElement("button", {
    disabled: value <= 0,
    "aria-label": "\u2212",
    onClick: () => onChange && onChange(Math.max(0, value - 1))
  }, /*#__PURE__*/React.createElement(OPMinus, {
    w: 14,
    sw: 2.5
  })), /*#__PURE__*/React.createElement("span", {
    className: "count" + (value <= 0 ? " zero" : "")
  }, value), /*#__PURE__*/React.createElement("button", {
    className: "plus",
    disabled: !plusActive || value >= max,
    "aria-label": "+",
    onClick: () => onChange && onChange(Math.min(max, value + 1))
  }, /*#__PURE__*/React.createElement(OPPlus, {
    w: 14,
    sw: 2.5
  })));
}
function MenuRowPC({
  name,
  value,
  onChange,
  withDiets,
  dietCount = 0,
  onOpenDiets
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "zp-menurow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "name"
  }, "Menu ", name), withDiets && /*#__PURE__*/React.createElement("button", {
    className: "diet-trigger",
    onClick: onOpenDiets
  }, /*#__PURE__*/React.createElement(OPUtensils, {
    w: 10,
    sw: 2.5
  }), dietCount > 0 ? `${dietCount} diét` : "Diéty"), /*#__PURE__*/React.createElement("span", {
    className: "spacer"
  }), /*#__PURE__*/React.createElement(CounterPC, {
    value: value,
    onChange: onChange
  }));
}
function OrderPC({
  navigate,
  params
}) {
  const day = params && params.day || "streda, 28. mája";
  const isToday = !!(params && params.today);
  const [counts, setCounts] = React.useState({
    bA: 8,
    ms_A: 8,
    ms_B: 3,
    ms_V: 1,
    zam_A: 4,
    zam_B: 0
  });
  const [dietCount, setDietCount] = React.useState(2);
  const [breakfastOn, setBreakfastOn] = React.useState(true);
  const [obedOn, setObedOn] = React.useState(true);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [diets, setDiets] = React.useState({
    vege: 1,
    nomilk: 1,
    nogluten: 0,
    nomilknogluten: 0,
    nono: 0
  });
  const total = (breakfastOn ? counts.bA : 0) + (obedOn ? counts.ms_A + counts.ms_B + counts.ms_V + counts.zam_A + counts.zam_B : 0);
  const sumDiets = Object.values(diets).reduce((a, b) => a + b, 0);
  function submit() {
    navigate("success", {
      day,
      total,
      dietCount: sumDiets || dietCount
    });
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "pc-wrap",
    "data-screen-label": "Nov\xE1 objedn\xE1vka"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pc-daysel-pc"
  }, /*#__PURE__*/React.createElement("button", {
    className: "nav",
    "aria-label": "Predch\xE1dzaj\xFAci de\u0148"
  }, /*#__PURE__*/React.createElement(OPLeft, null)), /*#__PURE__*/React.createElement("div", {
    className: "mid"
  }, /*#__PURE__*/React.createElement("div", {
    className: "eye"
  }, "D\xE1tum objedn\xE1vky"), /*#__PURE__*/React.createElement("h3", null, day)), /*#__PURE__*/React.createElement("button", {
    className: "nav",
    "aria-label": "\u010Eal\u0161\xED de\u0148"
  }, /*#__PURE__*/React.createElement(OPRight, null)), /*#__PURE__*/React.createElement("div", {
    className: "zp-order-context",
    style: {
      margin: 0,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "ic"
  }, /*#__PURE__*/React.createElement(OPCal, null)), /*#__PURE__*/React.createElement("div", {
    className: "body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, isToday ? "Detail dnešnej objednávky" : "Na " + day), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, "m\xE1te objednan\xE9 ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--green-700)"
    }
  }, total), " porci\xED")))), /*#__PURE__*/React.createElement("div", {
    className: "pc-order-grid"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "zp-meal" + (breakfastOn ? " zp-meal--active" : "")
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-meal-head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-meal-icon"
  }, /*#__PURE__*/React.createElement(OPCoffee, null)), /*#__PURE__*/React.createElement("div", {
    className: "zp-meal-title"
  }, "Ra\u0148ajky", /*#__PURE__*/React.createElement("span", {
    className: "zp-meal-sub"
  }, breakfastOn ? `${counts.bA} porcií` : "Vypnuté", " \xB7 term\xEDn 7:30")), /*#__PURE__*/React.createElement("div", {
    className: "zp-switch" + (breakfastOn ? " zp-switch--on" : ""),
    role: "switch",
    "aria-checked": breakfastOn,
    onClick: () => setBreakfastOn(!breakfastOn)
  })), breakfastOn && /*#__PURE__*/React.createElement("div", {
    className: "zp-meal-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-cat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-cat-head"
  }, "Matersk\xE1 \u0161kola"), /*#__PURE__*/React.createElement(MenuRowPC, {
    name: "A",
    value: counts.bA,
    onChange: v => setCounts({
      ...counts,
      bA: v
    })
  })))), /*#__PURE__*/React.createElement("div", {
    className: "zp-meal" + (obedOn ? " zp-meal--active" : "")
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-meal-head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-meal-icon"
  }, /*#__PURE__*/React.createElement(OPUtensils, null)), /*#__PURE__*/React.createElement("div", {
    className: "zp-meal-title"
  }, "Obed", /*#__PURE__*/React.createElement("span", {
    className: "zp-meal-sub"
  }, obedOn ? `${counts.ms_A + counts.ms_B + counts.ms_V + counts.zam_A + counts.zam_B} porcií` : "Vypnuté", " \xB7 term\xEDn 10:00")), /*#__PURE__*/React.createElement("div", {
    className: "zp-switch" + (obedOn ? " zp-switch--on" : ""),
    role: "switch",
    "aria-checked": obedOn,
    onClick: () => setObedOn(!obedOn)
  })), obedOn && /*#__PURE__*/React.createElement("div", {
    className: "zp-meal-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-copybar"
  }, /*#__PURE__*/React.createElement("button", {
    className: "zp-btn zp-btn--secondary zp-btn--sm",
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(OPCopy, {
    w: 12
  }), " Kop\xEDrova\u0165 z v\u010Deraj\u0161ka"), /*#__PURE__*/React.createElement("button", {
    className: "zp-btn zp-btn--danger zp-btn--sm",
    onClick: () => setCounts({
      ...counts,
      ms_A: 0,
      ms_B: 0,
      ms_V: 0,
      zam_A: 0,
      zam_B: 0
    })
  }, /*#__PURE__*/React.createElement(OPTrash, {
    w: 12
  }), " Vymaza\u0165")), /*#__PURE__*/React.createElement("div", {
    className: "zp-cat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-cat-head"
  }, "Matersk\xE1 \u0161kola \xB7 3\u20136 rokov"), /*#__PURE__*/React.createElement(MenuRowPC, {
    name: "A",
    value: counts.ms_A,
    onChange: v => setCounts({
      ...counts,
      ms_A: v
    }),
    withDiets: true,
    dietCount: sumDiets || dietCount,
    onOpenDiets: () => setSheetOpen(true)
  }), /*#__PURE__*/React.createElement(MenuRowPC, {
    name: "B",
    value: counts.ms_B,
    onChange: v => setCounts({
      ...counts,
      ms_B: v
    })
  }), /*#__PURE__*/React.createElement(MenuRowPC, {
    name: "V",
    value: counts.ms_V,
    onChange: v => setCounts({
      ...counts,
      ms_V: v
    })
  })), /*#__PURE__*/React.createElement("div", {
    className: "zp-cat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-cat-head"
  }, "Zamestnanci"), /*#__PURE__*/React.createElement(MenuRowPC, {
    name: "A",
    value: counts.zam_A,
    onChange: v => setCounts({
      ...counts,
      zam_A: v
    })
  }), /*#__PURE__*/React.createElement(MenuRowPC, {
    name: "B",
    value: counts.zam_B,
    onChange: v => setCounts({
      ...counts,
      zam_B: v
    })
  })))), /*#__PURE__*/React.createElement("div", {
    className: "zp-meal zp-meal--locked"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-meal-head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-meal-icon"
  }, /*#__PURE__*/React.createElement(OPApple, null)), /*#__PURE__*/React.createElement("div", {
    className: "zp-meal-title"
  }, "Olovrant", /*#__PURE__*/React.createElement("span", {
    className: "zp-meal-sub"
  }, "Term\xEDn uplynul o 9:00")), /*#__PURE__*/React.createElement("div", {
    className: "zp-switch",
    role: "switch",
    "aria-checked": "false",
    style: {
      opacity: 0.6
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "zp-banner zp-banner--locked",
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(OPLock, null), " Term\xEDn uplynul \xB7 Objedn\xE1vka uzavret\xE1"))), /*#__PURE__*/React.createElement("div", {
    className: "pc-order-summary"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-summary"
  }, /*#__PURE__*/React.createElement("h3", null, /*#__PURE__*/React.createElement(OPFile, null), " R\xFDchle zhrnutie"), /*#__PURE__*/React.createElement("div", {
    className: "zp-summary-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "l"
  }, "D\xE1tum"), /*#__PURE__*/React.createElement("span", {
    className: "r",
    style: {
      textTransform: "capitalize"
    }
  }, day)), /*#__PURE__*/React.createElement("div", {
    className: "zp-summary-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "l"
  }, "Ra\u0148ajky"), /*#__PURE__*/React.createElement("span", {
    className: "r"
  }, breakfastOn ? counts.bA : "—")), /*#__PURE__*/React.createElement("div", {
    className: "zp-summary-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "l"
  }, "Obedy"), /*#__PURE__*/React.createElement("span", {
    className: "r"
  }, obedOn ? counts.ms_A + counts.ms_B + counts.ms_V + counts.zam_A + counts.zam_B : "—", (sumDiets || dietCount) > 0 && /*#__PURE__*/React.createElement("small", null, "(", sumDiets || dietCount, " di\xE9ty)"))), /*#__PURE__*/React.createElement("div", {
    className: "zp-summary-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "l"
  }, "Olovranty"), /*#__PURE__*/React.createElement("span", {
    className: "r",
    style: {
      color: "var(--ink-mute)"
    }
  }, "\u2014")), /*#__PURE__*/React.createElement("div", {
    className: "zp-summary-total"
  }, /*#__PURE__*/React.createElement("span", {
    className: "l"
  }, "Spolu porci\xED"), /*#__PURE__*/React.createElement("span", {
    className: "r"
  }, total, /*#__PURE__*/React.createElement("small", null, "ks"))), /*#__PURE__*/React.createElement("button", {
    className: "zp-btn zp-btn--primary zp-btn--block zp-btn--lg",
    onClick: submit
  }, "Odosla\u0165 objedn\xE1vku"), /*#__PURE__*/React.createElement("button", {
    className: "zp-btn zp-btn--danger zp-btn--block",
    style: {
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement(OPEraser, {
    w: 14
  }), " Vynulova\u0165 objedn\xE1vku")), /*#__PURE__*/React.createElement("p", {
    className: "zp-thanks"
  }, "\u010Eakujeme za Va\u0161u objedn\xE1vku", /*#__PURE__*/React.createElement("small", null, "Posielame ju priamo do na\u0161ej kuchyne. Janka & Vlado")))), sheetOpen && /*#__PURE__*/React.createElement("div", {
    className: "pc-modal-scrim",
    onClick: () => setSheetOpen(false)
  }, /*#__PURE__*/React.createElement("div", {
    className: "pc-modal",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "pc-modal-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", null, "Di\xE9ty \xB7 Matersk\xE1 \u0161kola"), /*#__PURE__*/React.createElement("p", {
    className: "sub"
  }, "Dostupn\xE9: ", /*#__PURE__*/React.createElement("span", {
    className: "num"
  }, Math.max(0, counts.ms_A - sumDiets)), " z ", counts.ms_A, " porci\xED Menu A")), /*#__PURE__*/React.createElement("button", {
    className: "zp-sheet-close",
    "aria-label": "Zavrie\u0165",
    onClick: () => setSheetOpen(false)
  }, /*#__PURE__*/React.createElement(OPX, null))), /*#__PURE__*/React.createElement("div", {
    className: "pc-modal-body"
  }, [{
    k: "vege",
    l: "VEGE",
    s: "Vegetariánska"
  }, {
    k: "nomilk",
    l: "NO MILK",
    s: "Bez mliečnych výrobkov"
  }, {
    k: "nogluten",
    l: "NO GLUTEN",
    s: "Bezlepková"
  }, {
    k: "nomilknogluten",
    l: "NO MILK / NO GLUTEN",
    s: "Bez mlieka a lepku"
  }, {
    k: "nono",
    l: "NONONO",
    s: "Bez mlieka, lepku a vajec"
  }].map(d => /*#__PURE__*/React.createElement("div", {
    key: d.k,
    className: "zp-diet-row" + (diets[d.k] > 0 ? " active" : "")
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "zp-diet-label"
  }, d.l), /*#__PURE__*/React.createElement("span", {
    className: "sublabel"
  }, d.s)), /*#__PURE__*/React.createElement(CounterPC, {
    value: diets[d.k],
    onChange: v => setDiets({
      ...diets,
      [d.k]: v
    }),
    max: counts.ms_A
  })))), /*#__PURE__*/React.createElement("div", {
    className: "pc-modal-foot"
  }, /*#__PURE__*/React.createElement("button", {
    className: "zp-btn zp-btn--primary zp-btn--block zp-btn--lg",
    onClick: () => setSheetOpen(false)
  }, /*#__PURE__*/React.createElement(OPCheck, {
    w: 16
  }), " Hotovo")))));
}
window.OrderPC = OrderPC;
})(); } catch (e) { __ds_ns.__errors.push({ path: "client_pc/OrderPC.jsx", error: String((e && e.message) || e) }); }

// client_pc/SettingsPC.jsx
try { (() => {
/* global React */
const {
  User: STPUser,
  ChevronRight: STPChev,
  Utensils: STPUtensils,
  Apple: STPApple,
  Bell: STPBell,
  LogOut: STPLogOut,
  Info: STPInfo,
  Mail: STPMail,
  Phone: STPPhone,
  Users: STPUsers,
  Lock: STPLock
} = window.ZpIcons;

/* ============================================================
 * SettingsPC — desktop. Left sub-nav + content panel.
 * Sections: Účet · Dostupné porcie · Dostupné diéty · Podpora
 * ============================================================ */

const PC_PORTIONS = [{
  id: "ms",
  title: "Materská škola",
  desc: "Pre deti vo veku 3–6 rokov. Menšie porcie, jemnejšie korenenie, ovocie a zelenina krájané na drobno.",
  coef: 1.0
}, {
  id: "zs",
  title: "Základná škola",
  desc: "Pre deti vo veku 7–11 rokov. Stredne veľké porcie s vyššou energiou.",
  coef: 1.15
}, {
  id: "zam",
  title: "Zamestnanci",
  desc: "Dospelé porcie. Plnohodnotné množstvo, štandardné korenenie.",
  coef: 1.35
}];
const PC_DIETS = [{
  code: "VEGGIE",
  name: "Vegetariánska",
  desc: "Bez mäsa. Zachované mliečne výrobky a vajcia."
}, {
  code: "NO MILK",
  name: "Bez mliečnych výrobkov",
  desc: "Vynechané všetky mliečne výrobky, vrátane masla a smotany."
}, {
  code: "NO GLUTEN",
  name: "Bezlepková",
  desc: "Bez pšenice, žita, jačmeňa a ovsa. Vhodné pri celiakii."
}, {
  code: "NO MILK / NO GLUTEN",
  name: "Bez mlieka a lepku",
  desc: "Kombinácia oboch obmedzení."
}, {
  code: "NONONO",
  name: "Bez mlieka, lepku a vajec",
  desc: "Najprísnejší variant pri kombinovaných alergiách."
}, {
  code: "HISTAMIN",
  name: "Nízkohistamínová",
  desc: "Bez fermentovaných potravín a zrelých syrov."
}, {
  code: "NO ORECH",
  name: "Bez orechov",
  desc: "Vynechané všetky druhy orechov a arašidov."
}, {
  code: "NO PARADAJKA",
  name: "Bez paradajok",
  desc: "Bez paradajok v akejkoľvek forme (čerstvé, pretlak, omáčka)."
}, {
  code: "NO FISH",
  name: "Bez rýb",
  desc: "Bez rýb a morských plodov."
}, {
  code: "NO EGG",
  name: "Bez vajec",
  desc: "Vynechané vajcia aj ako prísada do cesta a omáčok."
}, {
  code: "NO ZEMIAK",
  name: "Bez zemiakov",
  desc: "Bez zemiakov v hlavnom jedle a prílohách."
}, {
  code: "NO SOJA",
  name: "Bez sóje",
  desc: "Bez sóje a sójových produktov."
}, {
  code: "NO ZELER",
  name: "Bez zeleru",
  desc: "Vynechaný zeler vo všetkých formách (vňať, hľuza, sušený)."
}];
function AccountPanel({
  navigate
}) {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "zp-settings-section"
  }, /*#__PURE__*/React.createElement("h2", null, "\xDA\u010Det"), /*#__PURE__*/React.createElement("div", {
    className: "zp-settings-list"
  }, /*#__PURE__*/React.createElement("button", {
    className: "zp-settings-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ic"
  }, /*#__PURE__*/React.createElement(STPUser, null)), /*#__PURE__*/React.createElement("span", {
    className: "body"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ttl"
  }, "Janka L\xFAkov\xE1"), /*#__PURE__*/React.createElement("span", {
    className: "sub"
  }, "Matersk\xE1 \u0161kola L\xFAka"), /*#__PURE__*/React.createElement("span", {
    className: "sub"
  }, "janka@skolka-luka.sk")), /*#__PURE__*/React.createElement("span", {
    className: "chev"
  }, /*#__PURE__*/React.createElement(STPChev, {
    w: 18
  }))), /*#__PURE__*/React.createElement("button", {
    className: "zp-settings-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ic"
  }, /*#__PURE__*/React.createElement(STPBell, null)), /*#__PURE__*/React.createElement("span", {
    className: "body"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ttl"
  }, "Upozornenia"), /*#__PURE__*/React.createElement("span", {
    className: "sub"
  }, "Pripomienky a nede\u013En\xE9 notifik\xE1cie")), /*#__PURE__*/React.createElement("span", {
    className: "chev"
  }, /*#__PURE__*/React.createElement(STPChev, {
    w: 18
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "zp-settings-section"
  }, /*#__PURE__*/React.createElement("h2", null, "Podpora"), /*#__PURE__*/React.createElement("div", {
    className: "zp-settings-list"
  }, /*#__PURE__*/React.createElement("button", {
    className: "zp-settings-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ic"
  }, /*#__PURE__*/React.createElement(STPInfo, null)), /*#__PURE__*/React.createElement("span", {
    className: "body"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ttl"
  }, "O aplik\xE1cii"), /*#__PURE__*/React.createElement("span", {
    className: "sub"
  }, "Verzia 2.1 \xB7 Zdrav\xFD projekt s. r. o.")), /*#__PURE__*/React.createElement("span", {
    className: "chev"
  }, /*#__PURE__*/React.createElement(STPChev, {
    w: 18
  }))), /*#__PURE__*/React.createElement("button", {
    className: "zp-settings-row",
    onClick: () => navigate("login")
  }, /*#__PURE__*/React.createElement("span", {
    className: "ic",
    style: {
      background: "rgba(201,46,82,0.1)",
      color: "var(--coral-600)"
    }
  }, /*#__PURE__*/React.createElement(STPLogOut, null)), /*#__PURE__*/React.createElement("span", {
    className: "body"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ttl",
    style: {
      color: "var(--coral-600)"
    }
  }, "Odhl\xE1si\u0165 sa"), /*#__PURE__*/React.createElement("span", {
    className: "sub"
  }, "Vr\xE1tite sa na prihl\xE1senie"))))));
}
function PortionsPanel() {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "zp-readonly-banner"
  }, /*#__PURE__*/React.createElement(STPLock, null), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("strong", null, "Iba na \u010D\xEDtanie."), " Povolen\xE9 typy porci\xED nastavujeme v Zdravom projekte. Ak chcete prida\u0165 alebo upravi\u0165 typ porcie, ozvite sa n\xE1m.")), /*#__PURE__*/React.createElement("div", {
    className: "pc-rdgrid-3",
    style: {
      marginBottom: 16
    }
  }, PC_PORTIONS.map(p => /*#__PURE__*/React.createElement("div", {
    className: "zp-portion-card",
    key: p.id,
    style: {
      flexDirection: "column",
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ic"
  }, /*#__PURE__*/React.createElement(STPUsers, null)), /*#__PURE__*/React.createElement("div", {
    className: "body",
    style: {
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ttl"
  }, p.title), /*#__PURE__*/React.createElement("div", {
    className: "desc"
  }, p.desc), /*#__PURE__*/React.createElement("span", {
    className: "coef"
  }, "Koeficient \xB7 ", p.coef.toFixed(2), "\xD7 M\u0160"))))), /*#__PURE__*/React.createElement("div", {
    className: "zp-contact-card"
  }, /*#__PURE__*/React.createElement("span", {
    className: "eye"
  }, "Potrebujete zmenu?"), /*#__PURE__*/React.createElement("h4", null, "Kontakt pre \xFApravu povolen\xFDch porci\xED"), /*#__PURE__*/React.createElement("p", null, "Pre roz\u0161\xEDrenie alebo zmenu typov porci\xED kontaktujte zodpovedn\xFA osobu v Zdravom projekte."), /*#__PURE__*/React.createElement("div", {
    className: "contact-row"
  }, /*#__PURE__*/React.createElement(STPUser, {
    w: 14
  }), " Vlado Kov\xE1\u010D \xB7 prev\xE1dzkov\xFD riadite\u013E"), /*#__PURE__*/React.createElement("div", {
    className: "contact-row"
  }, /*#__PURE__*/React.createElement(STPMail, {
    w: 14
  }), " vlado@zdravyprojekt.sk"), /*#__PURE__*/React.createElement("div", {
    className: "contact-row"
  }, /*#__PURE__*/React.createElement(STPPhone, {
    w: 14
  }), " +421 905 123 456")));
}
function DietsPanel() {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "zp-readonly-banner"
  }, /*#__PURE__*/React.createElement(STPLock, null), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("strong", null, "Iba na \u010D\xEDtanie."), " Zoznam di\xE9t spravujeme v Zdravom projekte. Ak chcete prida\u0165 alebo upravi\u0165 di\xE9tu, ozvite sa n\xE1m.")), /*#__PURE__*/React.createElement("div", {
    className: "pc-rdgrid",
    style: {
      marginBottom: 16
    }
  }, PC_DIETS.map(d => /*#__PURE__*/React.createElement("div", {
    className: "zp-diet-readonly",
    key: d.code
  }, /*#__PURE__*/React.createElement("span", {
    className: "badge"
  }, d.code), /*#__PURE__*/React.createElement("div", {
    className: "body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "name"
  }, d.name), /*#__PURE__*/React.createElement("div", {
    className: "desc"
  }, d.desc))))), /*#__PURE__*/React.createElement("div", {
    className: "zp-contact-card"
  }, /*#__PURE__*/React.createElement("span", {
    className: "eye"
  }, "Ch\xFDba v\xE1m nie\u010Do?"), /*#__PURE__*/React.createElement("h4", null, "Kontakt pre pridanie / \xFApravu di\xE9ty"), /*#__PURE__*/React.createElement("p", null, "Ak potrebujete nov\xFA di\xE9tu, ktor\xE1 tu nie je, kontaktujte zodpovedn\xFA osobu."), /*#__PURE__*/React.createElement("div", {
    className: "contact-row"
  }, /*#__PURE__*/React.createElement(STPUser, {
    w: 14
  }), " Janka Adamcov\xE1 \xB7 dietologi\u010Dka"), /*#__PURE__*/React.createElement("div", {
    className: "contact-row"
  }, /*#__PURE__*/React.createElement(STPMail, {
    w: 14
  }), " janka@zdravyprojekt.sk"), /*#__PURE__*/React.createElement("div", {
    className: "contact-row"
  }, /*#__PURE__*/React.createElement(STPPhone, {
    w: 14
  }), " +421 905 234 567")));
}
function SettingsPC({
  navigate,
  params
}) {
  const [tab, setTab] = React.useState(params && params.tab || "account");
  React.useEffect(() => {
    if (params && params.tab) setTab(params.tab);
  }, [params && params.tab]);
  const tabs = [{
    k: "account",
    l: "Účet",
    icon: /*#__PURE__*/React.createElement(STPUser, null)
  }, {
    k: "portions",
    l: "Dostupné porcie",
    icon: /*#__PURE__*/React.createElement(STPUsers, null)
  }, {
    k: "diets",
    l: "Dostupné diéty",
    icon: /*#__PURE__*/React.createElement(STPApple, null)
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "pc-wrap",
    "data-screen-label": "Nastavenia"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pc-settings-grid"
  }, /*#__PURE__*/React.createElement("aside", {
    className: "pc-settings-side"
  }, tabs.map(t => /*#__PURE__*/React.createElement("button", {
    key: t.k,
    className: tab === t.k ? "active" : "",
    onClick: () => setTab(t.k)
  }, t.icon, /*#__PURE__*/React.createElement("span", null, t.l)))), /*#__PURE__*/React.createElement("div", null, tab === "account" && /*#__PURE__*/React.createElement(AccountPanel, {
    navigate: navigate
  }), tab === "portions" && /*#__PURE__*/React.createElement(PortionsPanel, null), tab === "diets" && /*#__PURE__*/React.createElement(DietsPanel, null))));
}
window.SettingsPC = SettingsPC;
})(); } catch (e) { __ds_ns.__errors.push({ path: "client_pc/SettingsPC.jsx", error: String((e && e.message) || e) }); }

// client_pc/SuccessPC.jsx
try { (() => {
/* global React */
const {
  Check: SPCheck,
  Home: SPHome,
  Calendar: SPCal
} = window.ZpIcons;

/* ============================================================
 * SuccessPC — confirmation, desktop centered.
 * ============================================================ */
function SuccessPC({
  navigate,
  params
}) {
  const day = params && params.day || "streda, 28. mája";
  const total = params && params.total || 0;
  const dietCount = params && params.dietCount || 0;
  const [remaining, setRemaining] = React.useState(4);
  React.useEffect(() => {
    if (remaining <= 0) {
      navigate("home");
      return;
    }
    const t = setTimeout(() => setRemaining(remaining - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining]);
  return /*#__PURE__*/React.createElement("div", {
    className: "pc-success",
    "data-screen-label": "Objedn\xE1vka odoslan\xE1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "badge"
  }, /*#__PURE__*/React.createElement(SPCheck, null)), /*#__PURE__*/React.createElement("h2", null, "Objedn\xE1vka odoslan\xE1"), /*#__PURE__*/React.createElement("p", null, "\u010Eakujeme za Va\u0161u objedn\xE1vku. Priprav\xEDme ju presne tak, ako ste si \u017Eelali."), /*#__PURE__*/React.createElement("div", {
    className: "receipt"
  }, /*#__PURE__*/React.createElement("div", {
    className: "when"
  }, day), /*#__PURE__*/React.createElement("div", {
    className: "chips"
  }, /*#__PURE__*/React.createElement("span", {
    className: "zp-mchip zp-mchip--lunch"
  }, total, " porci\xED"), dietCount > 0 && /*#__PURE__*/React.createElement("span", {
    className: "zp-mchip zp-mchip--olovrant"
  }, dietCount, " di\xE9ty"))), /*#__PURE__*/React.createElement("div", {
    className: "pc-success-actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "zp-btn zp-btn--primary zp-btn--lg",
    onClick: () => navigate("home")
  }, /*#__PURE__*/React.createElement(SPHome, {
    w: 16
  }), " Sp\xE4\u0165 na domov (", remaining, "s)"), /*#__PURE__*/React.createElement("button", {
    className: "zp-btn zp-btn--secondary zp-btn--lg",
    onClick: () => {
      setRemaining(999);
      navigate("order", {
        day
      });
    }
  }, /*#__PURE__*/React.createElement(SPCal, {
    w: 16
  }), " Zobrazi\u0165 objedn\xE1vku")));
}
window.SuccessPC = SuccessPC;
})(); } catch (e) { __ds_ns.__errors.push({ path: "client_pc/SuccessPC.jsx", error: String((e && e.message) || e) }); }

// client_pc/icons.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* global React */
// Small set of lucide-style icons used across the client screens.

const Icon = ({
  d,
  w = 20,
  sw = 1.8,
  fill = "none"
}) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 24 24",
  width: w,
  height: w,
  fill: fill,
  stroke: "currentColor",
  strokeWidth: sw,
  strokeLinecap: "round",
  strokeLinejoin: "round"
}, /*#__PURE__*/React.createElement("path", {
  d: d
}));
window.ZpIcons = {
  User: p => /*#__PURE__*/React.createElement(Icon, _extends({}, p, {
    d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
  })),
  Settings: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
  })),
  Plus: p => /*#__PURE__*/React.createElement(Icon, _extends({}, p, {
    d: "M12 5v14 M5 12h14"
  })),
  Minus: p => /*#__PURE__*/React.createElement(Icon, _extends({}, p, {
    d: "M5 12h14"
  })),
  Calendar: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "4",
    width: "18",
    height: "18",
    rx: "2",
    ry: "2"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "16",
    y1: "2",
    x2: "16",
    y2: "6"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "8",
    y1: "2",
    x2: "8",
    y2: "6"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "3",
    y1: "10",
    x2: "21",
    y2: "10"
  })),
  CalendarDays: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "4",
    width: "18",
    height: "18",
    rx: "2"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "16",
    y1: "2",
    x2: "16",
    y2: "6"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "8",
    y1: "2",
    x2: "8",
    y2: "6"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "3",
    y1: "10",
    x2: "21",
    y2: "10"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "8",
    y1: "14",
    x2: "8.01",
    y2: "14"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "14",
    x2: "12.01",
    y2: "14"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "16",
    y1: "14",
    x2: "16.01",
    y2: "14"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "8",
    y1: "18",
    x2: "8.01",
    y2: "18"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "18",
    x2: "12.01",
    y2: "18"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "16",
    y1: "18",
    x2: "16.01",
    y2: "18"
  })),
  Clock: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "12 6 12 12 16 14"
  })),
  History: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3 3v5h5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 7v5l4 2"
  })),
  Coffee: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M17 8h1a4 4 0 1 1 0 8h-1"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "6",
    y1: "2",
    x2: "6",
    y2: "4"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "10",
    y1: "2",
    x2: "10",
    y2: "4"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "14",
    y1: "2",
    x2: "14",
    y2: "4"
  })),
  Utensils: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M3 2v7c0 1.1.9 2 2 2h0a2 2 0 0 0 2-2V2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5 11v11"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M14 21V7c0-3 2-5 5-5v19"
  })),
  Apple: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M19 12.5C19 15.5 17 19 14.5 19c-1.5 0-2-1-2.5-1s-1 1-2.5 1C7 19 5 15.5 5 12.5 5 9.5 7 7 9.5 7c1.5 0 2 1 2.5 1s1-1 2.5-1C17 7 19 9.5 19 12.5z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 8c-.5-1.5 0-3 2-4"
  })),
  ArrowLeft: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 2,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("line", {
    x1: "19",
    y1: "12",
    x2: "5",
    y2: "12"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "12 19 5 12 12 5"
  })),
  ChevronLeft: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 2,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "15 18 9 12 15 6"
  })),
  ChevronRight: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 2,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "9 18 15 12 9 6"
  })),
  Bot: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "11",
    width: "18",
    height: "10",
    rx: "2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "5",
    r: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 7v4"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "8",
    y1: "16",
    x2: "8",
    y2: "16"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "16",
    y1: "16",
    x2: "16",
    y2: "16"
  })),
  PenLine: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 20h9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
  })),
  XCircle: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "15",
    y1: "9",
    x2: "9",
    y2: "15"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "9",
    y1: "9",
    x2: "15",
    y2: "15"
  })),
  Lock: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "11",
    width: "18",
    height: "11",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M7 11V7a5 5 0 0 1 10 0v4"
  })),
  X: p => /*#__PURE__*/React.createElement(Icon, _extends({}, p, {
    d: "M18 6L6 18 M6 6l12 12",
    sw: 2
  })),
  Check: p => /*#__PURE__*/React.createElement(Icon, _extends({}, p, {
    d: "M20 6L9 17l-5-5",
    sw: 2
  })),
  Copy: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "9",
    y: "9",
    width: "13",
    height: "13",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
  })),
  Trash: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "3 6 5 6 21 6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
  })),
  Eraser: p => /*#__PURE__*/React.createElement(Icon, _extends({}, p, {
    d: "M20 20H8 M14.85 4.85l4.3 4.3a2 2 0 0 1 0 2.83L9.42 21.7a2 2 0 0 1-2.83 0l-4.3-4.3a2 2 0 0 1 0-2.83L12 4.85a2 2 0 0 1 2.83 0z"
  })),
  FileCheck: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "14 2 14 8 20 8"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9 14l2 2 4-4"
  })),
  Sparkles: p => /*#__PURE__*/React.createElement(Icon, _extends({}, p, {
    d: "M12 3v3 M12 18v3 M3 12h3 M18 12h3 M5.6 5.6l2.1 2.1 M16.3 16.3l2.1 2.1 M5.6 18.4l2.1-2.1 M16.3 7.7l2.1-2.1",
    sw: 2
  })),
  Mail: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "22,6 12,13 2,6"
  })),
  KeyRound: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M2 18v3h3l3-3v-2h2v-2h2l1.4-1.4a6 6 0 1 1 2.6-2.6L2 18z"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "16.5",
    cy: "7.5",
    r: "1.5"
  })),
  Sprout: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M7 20h10"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M10 20c5.5-2.5.8-6.4 3-10"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"
  })),
  Home: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "9 22 9 12 15 12 15 22"
  })),
  Book: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"
  })),
  Info: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "16",
    x2: "12",
    y2: "12"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "8",
    x2: "12.01",
    y2: "8"
  })),
  Phone: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72a2 2 0 0 1 1.72 2z"
  })),
  Users: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "9",
    cy: "7",
    r: "4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M23 21v-2a4 4 0 0 0-3-3.87"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M16 3.13a4 4 0 0 1 0 7.75"
  })),
  Bell: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M10.3 21a1.94 1.94 0 0 0 3.4 0"
  })),
  LogOut: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "16 17 21 12 16 7"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "21",
    y1: "12",
    x2: "9",
    y2: "12"
  })),
  Eye: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "3"
  })),
  PartyPopper: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M5.8 11.3 2 22l10.7-3.8"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M4 3h.01"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M22 8h.01"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M15 2h.01"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M22 20h.01"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M22 2 12.5 11.5 13 13"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M11 13l7 7"
  }))
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "client_pc/icons.jsx", error: String((e && e.message) || e) }); }

// slides/deck-stage.js
try { (() => {
/**
 * <deck-stage> — reusable web component for HTML decks.
 *
 * Handles:
 *  (a) speaker notes — reads <script type="application/json" id="speaker-notes">
 *      and posts {slideIndexChanged: N} to the parent window on nav.
 *  (b) keyboard navigation — ←/→, PgUp/PgDn, Space, Home/End, number keys.
 *      On touch devices, tapping the left/right half of the stage goes
 *      prev/next — taps on links, buttons and other interactive slide
 *      content are left alone.
 *  (c) press R to reset to slide 0 (with a tasteful keyboard hint).
 *  (d) bottom-center overlay showing slide count + hints, fades out on idle.
 *  (e) auto-scaling — inner canvas is a fixed design size (default 1920×1080)
 *      scaled with `transform: scale()` to fit the viewport, letterboxed.
 *      Set the `noscale` attribute to render at authored size (1:1) — the
 *      PPTX exporter sets this so its DOM capture sees unscaled geometry.
 *  (f) print — `@media print` lays every slide out as its own page at the
 *      design size, so the browser's Print → Save as PDF produces a clean
 *      one-page-per-slide PDF with no extra setup.
 *  (g) thumbnail rail — resizable left-hand column of per-slide thumbnails
 *      (static clones). Click to navigate; ↑/↓ with a thumbnail focused to
 *      step between slides; drag to reorder; right-click for
 *      Skip / Move up / Move down / Delete (opens a Cancel/Delete confirm
 *      dialog). Drag the rail's right edge to resize; width persists to
 *      localStorage. Skipped slides carry `data-deck-skip`, are dimmed in
 *      the rail, omitted from prev/next navigation, and hidden at print.
 *      The rail is suppressed in presenting mode, in the host's Preview
 *      mode (ViewerMode='none'), on `noscale`, on narrow viewports
 *      (≤640px), and via the `no-rail` attribute. Rail mutations dispatch
 *      a `deckchange`
 *      CustomEvent on the element: detail = {action, from, to, slide}.
 *
 * Slides are HIDDEN, not unmounted. Non-active slides stay in the DOM with
 * `visibility: hidden` + `opacity: 0`, so their state (videos, iframes,
 * form inputs, React trees) is preserved across navigation.
 *
 * Lifecycle event — the component dispatches a `slidechange` CustomEvent on
 * itself whenever the active slide changes (including the initial mount).
 * The event bubbles and composes out of shadow DOM, so you can listen on
 * the <deck-stage> element or on document:
 *
 *   document.querySelector('deck-stage').addEventListener('slidechange', (e) => {
 *     e.detail.index         // new 0-based index
 *     e.detail.previousIndex // previous index, or -1 on init
 *     e.detail.total         // total slide count
 *     e.detail.slide         // the new active slide element
 *     e.detail.previousSlide // the prior slide element, or null on init
 *     e.detail.reason        // 'init' | 'keyboard' | 'click' | 'tap' | 'api'
 *   });
 *
 * Persistence: none at the deck level. The host app keeps the current slide
 * in its own URL (?slide=) and re-delivers it via location.hash on load, so a
 * bare load with no hash always starts at slide 1.
 *
 * Usage:
 *   <style>deck-stage:not(:defined){visibility:hidden}</style>
 *   <deck-stage width="1920" height="1080">
 *     <section data-label="Title">...</section>
 *     <section data-label="Agenda">...</section>
 *   </deck-stage>
 *   <script src="deck-stage.js"></script>
 *
 * The :not(:defined) rule prevents a flash of the first slide at its
 * authored styles before this script runs and attaches the shadow root.
 *
 * Slides are the direct element children of <deck-stage>. Each slide is
 * automatically tagged with:
 *   - data-screen-label="NN Label"   (1-indexed, for comment flow)
 *   - data-om-validate="no_overflowing_text,no_overlapping_text,slide_sized_text"
 */

(() => {
  const DESIGN_W_DEFAULT = 1920;
  const DESIGN_H_DEFAULT = 1080;
  const OVERLAY_HIDE_MS = 1800;
  const VALIDATE_ATTR = 'no_overflowing_text,no_overlapping_text,slide_sized_text';
  const FINE_POINTER_MQ = matchMedia('(hover: hover) and (pointer: fine)');
  const NARROW_MQ = matchMedia('(max-width: 640px)');
  // Slide-authored controls that should keep a tap instead of it navigating.
  const INTERACTIVE_SEL = 'a[href], button, input, select, textarea, summary, label, video[controls], audio[controls], [role="button"], [onclick], [tabindex]:not([tabindex^="-"]), [contenteditable]:not([contenteditable="false" i])';
  const pad2 = n => String(n).padStart(2, '0');

  // Label precedence: data-label → data-screen-label (number stripped) → first heading → "Slide".
  const getSlideLabel = el => {
    const explicit = el.getAttribute('data-label');
    if (explicit) return explicit;
    const existing = el.getAttribute('data-screen-label');
    if (existing) return existing.replace(/^\s*\d+\s*/, '').trim() || existing;
    const h = el.querySelector('h1, h2, h3, [data-title]');
    const t = h && (h.textContent || '').trim().slice(0, 40);
    if (t) return t;
    return 'Slide';
  };
  const stylesheet = `
    :host {
      position: fixed;
      inset: 0;
      display: block;
      background: #000;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif;
      overflow: hidden;
      -webkit-tap-highlight-color: transparent;
    }
    /* connectedCallback holds this until document.fonts.ready (capped 2s) so
     * the first visible paint has the deck's real typography + final rail
     * layout. opacity (not visibility) so the active slide can't un-hide
     * itself via the ::slotted([data-deck-active]) visibility:visible rule.
     * Only the stage/rail hide — the black :host background stays, so the
     * iframe doesn't flash the page's default white. */
    :host([data-fonts-pending]) .stage,
    :host([data-fonts-pending]) .rail { opacity: 0; pointer-events: none; }

    .stage {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .canvas {
      position: relative;
      transform-origin: center center;
      flex-shrink: 0;
      background: #fff;
      will-change: transform;
    }

    /* Slides live in light DOM (via <slot>) so authored CSS still applies.
       We absolutely position each slotted child to stack them. */
    ::slotted(*) {
      position: absolute !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      box-sizing: border-box !important;
      overflow: hidden;
      opacity: 0;
      pointer-events: none;
      visibility: hidden;
    }
    ::slotted([data-deck-active]) {
      opacity: 1;
      pointer-events: auto;
      visibility: visible;
    }

    .overlay {
      position: fixed;
      left: 50%;
      bottom: 22px;
      transform: translate(-50%, 6px) scale(0.92);
      filter: blur(6px);
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px;
      background: #000;
      color: #fff;
      border-radius: 999px;
      font-size: 12px;
      font-feature-settings: "tnum" 1;
      letter-spacing: 0.01em;
      opacity: 0;
      pointer-events: none;
      transition: opacity 260ms ease, transform 260ms cubic-bezier(.2,.8,.2,1), filter 260ms ease;
      transform-origin: center bottom;
      z-index: 2147483000;
      user-select: none;
    }
    .overlay[data-visible] {
      opacity: 1;
      pointer-events: auto;
      transform: translate(-50%, 0) scale(1);
      filter: blur(0);
    }

    .btn {
      appearance: none;
      -webkit-appearance: none;
      background: transparent;
      border: 0;
      margin: 0;
      padding: 0;
      color: inherit;
      font: inherit;
      cursor: default;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 28px;
      min-width: 28px;
      border-radius: 999px;
      color: rgba(255,255,255,0.72);
      transition: background 140ms ease, color 140ms ease;
      -webkit-tap-highlight-color: transparent;
    }
    .btn:hover { background: rgba(255,255,255,0.12); color: #fff; }
    .btn:active { background: rgba(255,255,255,0.18); }
    .btn:focus { outline: none; }
    .btn:focus-visible { outline: none; }
    .btn::-moz-focus-inner { border: 0; }
    .btn svg { width: 14px; height: 14px; display: block; }
    .btn.reset {
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0.02em;
      padding: 0 10px 0 12px;
      gap: 6px;
      color: rgba(255,255,255,0.72);
    }
    .btn.reset .kbd {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
      font-size: 10px;
      line-height: 1;
      color: rgba(255,255,255,0.88);
      background: rgba(255,255,255,0.12);
      border-radius: 4px;
    }

    .count {
      font-variant-numeric: tabular-nums;
      color: #fff;
      font-weight: 500;
      padding: 0 8px;
      min-width: 42px;
      text-align: center;
      font-size: 12px;
    }
    .count .sep { color: rgba(255,255,255,0.45); margin: 0 3px; font-weight: 400; }
    .count .total { color: rgba(255,255,255,0.55); }

    .divider {
      width: 1px;
      height: 14px;
      background: rgba(255,255,255,0.18);
      margin: 0 2px;
    }

    /* ── Thumbnail rail ──────────────────────────────────────────────────
       Fixed column on the left; each thumbnail is a static deep-clone of
       the light-DOM slide scaled into a 16:9 (or design-aspect) frame. The
       stage re-fits around it (see _fit); hidden during present / noscale
       / print so capture geometry and fullscreen output are unchanged. */
    .rail {
      position: fixed;
      left: 0;
      top: 0;
      bottom: 0;
      width: var(--deck-rail-w, 188px);
      background: #141414;
      border-right: 1px solid rgba(255,255,255,0.08);
      overflow-y: auto;
      overflow-x: hidden;
      padding: 12px 10px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 12px;
      z-index: 2147482500;
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,0.18) transparent;
    }
    .rail::-webkit-scrollbar { width: 8px; }
    .rail::-webkit-scrollbar-track { background: transparent; margin: 2px; }
    .rail::-webkit-scrollbar-thumb {
      background: rgba(255,255,255,0.18);
      border-radius: 4px;
      border: 2px solid transparent;
      background-clip: content-box;
    }
    .rail::-webkit-scrollbar-thumb:hover {
      background: rgba(255,255,255,0.28);
      border: 2px solid transparent;
      background-clip: content-box;
    }
    :host([no-rail]) .rail,
    :host([noscale]) .rail { display: none; }
    .rail[data-presenting] { display: none; }
    @media (max-width: 640px) {
      .rail, .rail-resize { display: none; }
    }
    /* User-driven show/hide (the TweaksPanel toggle) slides instead of
       popping. Transitions are gated on :host([data-rail-anim]) — set only
       for the 200ms around the toggle — so window-resize and rail-width
       drag (which also call _fit) don't lag behind the cursor. */
    .rail[data-user-hidden] { transform: translateX(-100%); }
    :host([data-rail-anim]) .rail { transition: transform 200ms cubic-bezier(.3,.7,.4,1); }
    :host([data-rail-anim]) .stage { transition: left 200ms cubic-bezier(.3,.7,.4,1); }
    :host([data-rail-anim]) .canvas { transition: transform 200ms cubic-bezier(.3,.7,.4,1); }
    /* transition shorthand replaces rather than merges — repeat the base
       .overlay opacity/transform/filter transitions so visibility changes
       during the 200ms toggle window still fade instead of popping. */
    :host([data-rail-anim]) .overlay {
      transition: margin-left 200ms cubic-bezier(.3,.7,.4,1),
                  opacity 260ms ease,
                  transform 260ms cubic-bezier(.2,.8,.2,1),
                  filter 260ms ease;
    }

    .thumb {
      position: relative;
      display: flex;
      align-items: flex-start;
      gap: 8px;
      cursor: pointer;
      user-select: none;
    }
    .thumb .num {
      width: 16px;
      flex-shrink: 0;
      font-size: 11px;
      font-weight: 500;
      text-align: right;
      color: rgba(255,255,255,0.55);
      padding-top: 2px;
      font-variant-numeric: tabular-nums;
    }
    .thumb .frame {
      position: relative;
      flex: 1;
      min-width: 0;
      aspect-ratio: var(--deck-aspect);
      background: #fff;
      border-radius: 4px;
      outline: 2px solid transparent;
      outline-offset: 0;
      overflow: hidden;
      transition: outline-color 120ms ease;
    }
    .thumb:hover .frame { outline-color: rgba(255,255,255,0.25); }
    .thumb { outline: none; }
    .thumb:focus-visible .frame { outline-color: rgba(255,255,255,0.5); }
    .thumb[data-current] .num { color: #fff; }
    .thumb[data-current] .frame { outline-color: #D97757; }
    .thumb[data-dragging] { opacity: 0.35; }
    .thumb::before {
      content: '';
      position: absolute;
      left: 24px;
      right: 0;
      height: 3px;
      border-radius: 2px;
      background: #D97757;
      opacity: 0;
      pointer-events: none;
    }
    .thumb[data-drop="before"]::before { top: -8px; opacity: 1; }
    .thumb[data-drop="after"]::before { bottom: -8px; opacity: 1; }
    .thumb[data-skip] .frame { opacity: 0.35; }
    .thumb[data-skip] .frame::after {
      content: 'Skipped';
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.45);
      color: #fff;
      font-size: 10px;
      font-weight: 500;
      letter-spacing: 0.04em;
    }

    .ctxmenu {
      position: fixed;
      min-width: 150px;
      padding: 4px;
      background: #242424;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 7px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.45);
      z-index: 2147483100;
      display: none;
      font-size: 12px;
    }
    .ctxmenu[data-open] { display: block; }
    .ctxmenu button {
      display: block;
      width: 100%;
      appearance: none;
      border: 0;
      background: transparent;
      color: #e8e8e8;
      font: inherit;
      text-align: left;
      padding: 6px 10px;
      border-radius: 4px;
      cursor: pointer;
    }
    .ctxmenu button:hover:not(:disabled) { background: rgba(255,255,255,0.08); }
    .ctxmenu button:disabled { opacity: 0.35; cursor: default; }
    .ctxmenu hr {
      border: 0;
      border-top: 1px solid rgba(255,255,255,0.1);
      margin: 4px 2px;
    }

    .rail-resize {
      position: fixed;
      left: calc(var(--deck-rail-w, 188px) - 3px);
      top: 0;
      bottom: 0;
      width: 6px;
      cursor: col-resize;
      z-index: 2147482600;
      touch-action: none;
    }
    .rail-resize:hover,
    .rail-resize[data-dragging] { background: rgba(255,255,255,0.12); }
    :host([no-rail]) .rail-resize,
    :host([noscale]) .rail-resize,
    .rail[data-presenting] + .rail-resize,
    .rail[data-user-hidden] + .rail-resize { display: none; }

    /* Delete-confirm popup — matches the SPA's ConfirmDialog layout
       (title + message body, depressed footer with Cancel / Delete). */
    .confirm-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.45);
      z-index: 2147483200;
      display: none;
      align-items: center;
      justify-content: center;
    }
    .confirm-backdrop[data-open] { display: flex; }
    .confirm {
      width: 320px;
      max-width: calc(100vw - 32px);
      background: #2a2a2a;
      color: #e8e8e8;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 12px;
      box-shadow: 0 12px 32px rgba(0,0,0,0.5);
      overflow: hidden;
      font-family: inherit;
      animation: deck-confirm-in 0.18s ease;
    }
    @keyframes deck-confirm-in {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }
    .confirm .body { padding: 20px 20px 16px; }
    .confirm .title { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
    .confirm .msg { font-size: 13px; line-height: 1.5; color: rgba(255,255,255,0.65); }
    .confirm .footer {
      padding: 14px 20px;
      background: #1f1f1f;
      border-top: 1px solid rgba(255,255,255,0.08);
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .confirm button {
      appearance: none;
      font: inherit;
      font-size: 13px;
      font-weight: 500;
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
    }
    .confirm .cancel {
      background: transparent;
      border: 0;
      color: rgba(255,255,255,0.8);
    }
    .confirm .cancel:hover { background: rgba(255,255,255,0.08); }
    .confirm .danger {
      background: #c96442;
      border: 1px solid rgba(0,0,0,0.15);
      color: #fff;
      box-shadow: 0 1px 3px rgba(166,50,68,0.3), 0 2px 6px rgba(166,50,68,0.18);
    }
    .confirm .danger:hover { background: #b5563a; }

    /* ── Print: one page per slide, no chrome ────────────────────────────
       The screen layout stacks every slide at inset:0 inside a scaled
       canvas; for print we want them in document flow at the authored
       design size so the browser paginates one slide per sheet. The
       @page size is set from the width/height attributes via the inline
       <style id="deck-stage-print-page"> that connectedCallback injects
       into <head> (the @page at-rule has no effect inside shadow DOM). */
    @media print {
      :host {
        position: static;
        inset: auto;
        background: none;
        overflow: visible;
        color: inherit;
      }
      .stage { position: static; display: block; }
      .canvas {
        transform: none !important;
        width: auto !important;
        height: auto !important;
        background: none;
        will-change: auto;
      }
      ::slotted(*) {
        position: relative !important;
        inset: auto !important;
        width: var(--deck-design-w) !important;
        height: var(--deck-design-h) !important;
        box-sizing: border-box !important;
        opacity: 1 !important;
        visibility: visible !important;
        pointer-events: auto;
        break-after: page;
        page-break-after: always;
        break-inside: avoid;
        overflow: hidden;
      }
      /* :last-child alone isn't enough once data-deck-skip hides the
         trailing slide(s) — the last *visible* slide still carries
         break-after:page and prints a blank sheet. _markLastVisible()
         maintains data-deck-last-visible on the last non-skipped slide. */
      ::slotted(*:last-child),
      ::slotted([data-deck-last-visible]) {
        break-after: auto;
        page-break-after: auto;
      }
      ::slotted([data-deck-skip]) { display: none !important; }
      .overlay, .rail, .rail-resize, .ctxmenu, .confirm-backdrop { display: none !important; }
    }
  `;
  class DeckStage extends HTMLElement {
    static get observedAttributes() {
      return ['width', 'height', 'noscale', 'no-rail'];
    }
    constructor() {
      super();
      this._root = this.attachShadow({
        mode: 'open'
      });
      this._index = 0;
      this._slides = [];
      this._notes = [];
      this._hideTimer = null;
      this._mouseIdleTimer = null;
      this._menuIndex = -1;
      this._onKey = this._onKey.bind(this);
      this._onResize = this._onResize.bind(this);
      this._onSlotChange = this._onSlotChange.bind(this);
      this._onMouseMove = this._onMouseMove.bind(this);
      this._onTap = this._onTap.bind(this);
      this._onMessage = this._onMessage.bind(this);
      // Capture-phase close so a click anywhere dismisses the menu, but
      // ignore clicks that land inside the menu itself — otherwise the
      // capture handler runs before the menu's own (bubble) handler and
      // clears _menuIndex out from under it.
      this._onDocClick = e => {
        if (this._menu && e.composedPath && e.composedPath().includes(this._menu)) return;
        this._closeMenu();
      };
    }
    get designWidth() {
      return parseInt(this.getAttribute('width'), 10) || DESIGN_W_DEFAULT;
    }
    get designHeight() {
      return parseInt(this.getAttribute('height'), 10) || DESIGN_H_DEFAULT;
    }
    connectedCallback() {
      // Presenter-view popup loads deckUrl?_snthumb=...#N for its prev/cur/
      // next thumbnails — the rail has no business rendering inside those
      // (wrong scale, and it offsets the stage so the thumb shows a gutter).
      if (/[?&]_snthumb=/.test(location.search)) this.setAttribute('no-rail', '');
      this._render();
      this._loadNotes();
      this._syncPrintPageRule();
      window.addEventListener('keydown', this._onKey);
      window.addEventListener('resize', this._onResize);
      window.addEventListener('mousemove', this._onMouseMove, {
        passive: true
      });
      window.addEventListener('message', this._onMessage);
      window.addEventListener('click', this._onDocClick, true);
      this.addEventListener('click', this._onTap);
      // Initial collection + layout happens via slotchange, which fires on mount.
      this._enableRail();
      // Hold the stage hidden until webfonts are ready so the first visible
      // paint has the deck's real typography — the :not(:defined) guard in
      // the page HTML only covers custom-element upgrade, not font load.
      // Capped so a 404'd font URL can't blank the deck indefinitely.
      this.setAttribute('data-fonts-pending', '');
      const reveal = () => this.removeAttribute('data-fonts-pending');
      // rAF first: fonts.ready is a pre-resolved promise until layout has
      // resolved the slotted text's font-family and pushed a FontFace into
      // 'loading'. Reading it here in connectedCallback (parse-time) would
      // settle the race in a microtask before any font fetch starts.
      requestAnimationFrame(() => {
        Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise(r => setTimeout(r, 2000))]).then(reveal, reveal);
      });
    }
    _enableRail() {
      // Idempotent — older host builds still post __omelette_rail_enabled.
      // no-rail guard keeps the observers/stylesheet walk off the cheap path
      // for presenter-popup thumbnail iframes (up to 9 per view).
      if (this._railEnabled || this.hasAttribute('no-rail')) return;
      this._railEnabled = true;
      // Per-viewer preference — restored alongside rail width. Default on;
      // only a stored '0' (from the TweaksPanel toggle) hides it.
      this._railVisible = true;
      try {
        if (localStorage.getItem('deck-stage.railVisible') === '0') this._railVisible = false;
      } catch (e) {}
      // Live thumbnail updates: watch the light-DOM slides for content
      // edits and re-clone just the affected thumb(s), debounced. Ignore
      // the data-deck-* / data-screen-label / data-om-validate attributes
      // this component itself writes so nav and skip don't trigger
      // spurious refreshes.
      const OWN_ATTRS = /^data-(deck-|screen-label$|om-validate$)/;
      this._liveDirty = new Set();
      this._liveObserver = new MutationObserver(records => {
        for (const r of records) {
          if (r.type === 'attributes' && OWN_ATTRS.test(r.attributeName || '')) continue;
          let n = r.target;
          while (n && n.parentElement !== this) n = n.parentElement;
          if (n && this._slideSet && this._slideSet.has(n)) this._liveDirty.add(n);
        }
        if (this._liveDirty.size && !this._liveTimer) {
          this._liveTimer = setTimeout(() => {
            this._liveTimer = null;
            this._liveDirty.forEach(s => this._refreshThumb(s));
            this._liveDirty.clear();
          }, 200);
        }
      });
      this._liveObserver.observe(this, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true
      });
      // Lazy thumbnail materialization — clone the slide only when its
      // frame scrolls into (or near) the rail viewport. rootMargin gives
      // ~4 thumbs of pre-load so fast scrolling doesn't flash blanks.
      this._railObserver = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting && e.target.__deckThumb) {
            this._materialize(e.target.__deckThumb);
          }
        });
      }, {
        root: this._rail,
        rootMargin: '400px 0px'
      });
      // Tweaks typically change CSS vars / attrs OUTSIDE <deck-stage>
      // (on <html>, <body>, a wrapper div, or a <style> tag), which
      // _liveObserver can't see. Re-snapshot author CSS (constructable
      // sheet is shared by reference, so one replaceSync updates every
      // thumb shadow root) and re-sync each thumb host's attrs + custom
      // properties. In-slide DOM mutations are _liveObserver's job.
      // Debounced so slider drags don't thrash.
      this._onTweakChange = () => {
        clearTimeout(this._tweakTimer);
        this._tweakTimer = setTimeout(() => {
          this._snapshotAuthorCss();
          // One getComputedStyle for the whole batch — each
          // getPropertyValue read below reuses the same computed style
          // as long as nothing invalidates layout between thumbs.
          const cs = getComputedStyle(this);
          (this._thumbs || []).forEach(t => {
            if (t.host) this._syncThumbHostAttrs(t.host, cs);
          });
        }, 120);
      };
      window.addEventListener('tweakchange', this._onTweakChange);
      this._snapshotAuthorCss();
      // Build the rail now that it's enabled — slotchange already fired,
      // so _renderRail's early-return skipped the initial build.
      this._syncRailHidden();
      this._renderRail();
      this._fit();
    }

    /** Snapshot document stylesheets into a constructable sheet that each
     *  thumbnail's nested shadow root adopts — so author CSS styles the
     *  cloned slide content without touching this component's chrome.
     *  Cross-origin sheets throw on .cssRules — skip them. Re-callable:
     *  the existing constructable sheet is reused via replaceSync so every
     *  already-adopted shadow root picks up the fresh CSS without re-adopt. */
    _snapshotAuthorCss() {
      // :root in an adopted sheet inside a shadow root matches nothing
      // (only the document root qualifies), so author rules like
      // `:root[data-voice="modern"] .serif` never reach the clones.
      // Rewrite :root → :host and mirror <html>'s data-*/class/lang onto
      // each thumb host (see _syncThumbHostAttrs) so the same selectors
      // match inside the thumbnail's shadow tree.
      const authorCss = Array.from(document.styleSheets).map(sh => {
        try {
          return Array.from(sh.cssRules).map(r => r.cssText).join('\n');
        } catch (e) {
          return '';
        }
      }).join('\n')
      // The shadow host is featureless outside the functional :host(...)
      // form, so any compound on :root — [attr], .class, #id, :pseudo —
      // must become :host(<compound>) not :host<compound>. Same for the
      // html type selector (Tailwind class-strategy dark mode emits
      // html.dark; Pico uses html[data-theme]), which has nothing to
      // match inside the thumb's shadow tree.
      .replace(/:root((?:\[[^\]]*\]|[.#][-\w]+|:[-\w]+(?:\([^)]*\))?)+)/g, ':host($1)').replace(/:root\b/g, ':host').replace(/(^|[\s,>~+(}])html((?:\[[^\]]*\]|[.#][-\w]+|:[-\w]+(?:\([^)]*\))?)+)(?![-\w])/g, '$1:host($2)').replace(/(^|[\s,>~+(}])html(?![-\w])/g, '$1:host');
      // Every custom property the author references. _syncThumbHostAttrs
      // mirrors each one's *computed* value at <deck-stage> onto the
      // thumb host so the live value wins over the :host default above
      // regardless of which ancestor the tweak wrote to (<html>, <body>,
      // a wrapper div, or the deck-stage element itself all inherit
      // down to getComputedStyle(this)).
      this._authorVars = new Set(authorCss.match(/--[\w-]+/g) || []);
      try {
        if (!this._adoptedSheet) this._adoptedSheet = new CSSStyleSheet();
        this._adoptedSheet.replaceSync(authorCss);
      } catch (e) {
        this._adoptedSheet = null;
        this._authorCss = authorCss;
      }
    }
    _syncThumbHostAttrs(host, cs) {
      const de = document.documentElement;
      // setAttribute overwrites but can't delete — an attr removed from
      // <html> (toggleAttribute off, classList emptied) would linger on
      // the host and :host([data-*]) / :host(.foo) rules would keep
      // matching. Remove stale mirrored attrs first; iterate backward
      // because removeAttribute mutates the live NamedNodeMap.
      for (let i = host.attributes.length - 1; i >= 0; i--) {
        const n = host.attributes[i].name;
        if ((n.startsWith('data-') || n === 'class' || n === 'lang') && !de.hasAttribute(n)) {
          host.removeAttribute(n);
        }
      }
      for (const a of de.attributes) {
        if (a.name.startsWith('data-') || a.name === 'class' || a.name === 'lang') {
          host.setAttribute(a.name, a.value);
        }
      }
      // The :root→:host rewrite in _snapshotAuthorCss pins each custom
      // property to its stylesheet default on the thumb host, shadowing
      // the live value that would otherwise inherit. Tweaks can write the
      // live value on any ancestor — <html>, <body>, a wrapper div, the
      // deck-stage element — so read it as the *computed* value at
      // <deck-stage> (which sees the whole inheritance chain) rather than
      // trying to guess which element the author wrote to. Inline on the
      // host beats the :host{} rule. remove-stale covers vars dropped
      // from the stylesheet between snapshots.
      const vars = this._authorVars || new Set();
      for (let i = host.style.length - 1; i >= 0; i--) {
        const p = host.style[i];
        if (p.startsWith('--') && !vars.has(p)) host.style.removeProperty(p);
      }
      const live = cs || getComputedStyle(this);
      vars.forEach(p => {
        const v = live.getPropertyValue(p);
        if (v) host.style.setProperty(p, v.trim());else host.style.removeProperty(p);
      });
    }
    disconnectedCallback() {
      window.removeEventListener('keydown', this._onKey);
      window.removeEventListener('resize', this._onResize);
      window.removeEventListener('mousemove', this._onMouseMove);
      window.removeEventListener('message', this._onMessage);
      window.removeEventListener('click', this._onDocClick, true);
      this.removeEventListener('click', this._onTap);
      if (this._hideTimer) clearTimeout(this._hideTimer);
      if (this._mouseIdleTimer) clearTimeout(this._mouseIdleTimer);
      if (this._liveTimer) clearTimeout(this._liveTimer);
      if (this._tweakTimer) clearTimeout(this._tweakTimer);
      if (this._railAnimTimer) clearTimeout(this._railAnimTimer);
      if (this._scaleRaf) cancelAnimationFrame(this._scaleRaf);
      if (this._liveObserver) this._liveObserver.disconnect();
      if (this._railObserver) this._railObserver.disconnect();
      if (this._onTweakChange) window.removeEventListener('tweakchange', this._onTweakChange);
    }
    attributeChangedCallback() {
      if (this._canvas) {
        this._canvas.style.width = this.designWidth + 'px';
        this._canvas.style.height = this.designHeight + 'px';
        this._canvas.style.setProperty('--deck-design-w', this.designWidth + 'px');
        this._canvas.style.setProperty('--deck-design-h', this.designHeight + 'px');
        if (this._rail) {
          this._rail.style.setProperty('--deck-aspect', this.designWidth + '/' + this.designHeight);
        }
        this._fit();
        this._scaleThumbs();
        this._syncPrintPageRule();
      }
    }
    _render() {
      const style = document.createElement('style');
      style.textContent = stylesheet;
      const stage = document.createElement('div');
      stage.className = 'stage';
      const canvas = document.createElement('div');
      canvas.className = 'canvas';
      canvas.style.width = this.designWidth + 'px';
      canvas.style.height = this.designHeight + 'px';
      canvas.style.setProperty('--deck-design-w', this.designWidth + 'px');
      canvas.style.setProperty('--deck-design-h', this.designHeight + 'px');
      const slot = document.createElement('slot');
      slot.addEventListener('slotchange', this._onSlotChange);
      canvas.appendChild(slot);
      stage.appendChild(canvas);

      // Overlay: compact, solid black, with clickable controls.
      const overlay = document.createElement('div');
      overlay.className = 'overlay export-hidden';
      overlay.setAttribute('role', 'toolbar');
      overlay.setAttribute('aria-label', 'Deck controls');
      overlay.setAttribute('data-omelette-chrome', '');
      overlay.innerHTML = `
        <button class="btn prev" type="button" aria-label="Previous slide" title="Previous (←)">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 3L5 8l5 5"/></svg>
        </button>
        <span class="count" aria-live="polite"><span class="current">1</span><span class="sep">/</span><span class="total">1</span></span>
        <button class="btn next" type="button" aria-label="Next slide" title="Next (→)">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3l5 5-5 5"/></svg>
        </button>
        <span class="divider"></span>
        <button class="btn reset" type="button" aria-label="Reset to first slide" title="Reset (R)">Reset<span class="kbd">R</span></button>
      `;
      overlay.querySelector('.prev').addEventListener('click', () => this._advance(-1, 'click'));
      overlay.querySelector('.next').addEventListener('click', () => this._advance(1, 'click'));
      overlay.querySelector('.reset').addEventListener('click', () => this._go(0, 'click'));

      // Thumbnail rail + context menu. Thumbnails are populated in
      // _renderRail() after _collectSlides().
      const rail = document.createElement('div');
      rail.className = 'rail export-hidden';
      rail.setAttribute('data-omelette-chrome', '');
      rail.style.setProperty('--deck-aspect', this.designWidth + '/' + this.designHeight);
      // Edge auto-scroll while dragging a thumb near the rail's top/bottom
      // so off-screen drop targets are reachable. Native dragover fires
      // continuously while the pointer is stationary, so a per-event nudge
      // (ramped by edge proximity) is enough — no rAF loop needed.
      rail.addEventListener('dragover', e => {
        if (this._dragFrom == null) return;
        const r = rail.getBoundingClientRect();
        const EDGE = 40;
        const dt = e.clientY - r.top;
        const db = r.bottom - e.clientY;
        if (dt < EDGE) rail.scrollTop -= Math.ceil((EDGE - dt) / 3);else if (db < EDGE) rail.scrollTop += Math.ceil((EDGE - db) / 3);
      });
      const menu = document.createElement('div');
      menu.className = 'ctxmenu export-hidden';
      menu.setAttribute('data-omelette-chrome', '');
      menu.innerHTML = `
        <button type="button" data-act="skip">Skip slide</button>
        <button type="button" data-act="up">Move up</button>
        <button type="button" data-act="down">Move down</button>
        <hr>
        <button type="button" data-act="delete">Delete slide</button>
      `;
      menu.addEventListener('click', e => {
        const act = e.target && e.target.getAttribute && e.target.getAttribute('data-act');
        if (!act) return;
        const i = this._menuIndex;
        this._closeMenu();
        if (act === 'skip') this._toggleSkip(i);else if (act === 'up') this._moveSlide(i, i - 1);else if (act === 'down') this._moveSlide(i, i + 1);else if (act === 'delete') this._openConfirm(i);
      });
      menu.addEventListener('contextmenu', e => e.preventDefault());

      // Rail resize handle — drag to set --deck-rail-w, persisted to
      // localStorage so the width survives reloads.
      const resize = document.createElement('div');
      resize.className = 'rail-resize export-hidden';
      resize.setAttribute('data-omelette-chrome', '');
      resize.addEventListener('pointerdown', e => {
        e.preventDefault();
        resize.setPointerCapture(e.pointerId);
        resize.setAttribute('data-dragging', '');
        const move = ev => this._setRailWidth(ev.clientX);
        const up = () => {
          resize.removeEventListener('pointermove', move);
          resize.removeEventListener('pointerup', up);
          resize.removeEventListener('pointercancel', up);
          resize.removeAttribute('data-dragging');
          try {
            localStorage.setItem('deck-stage.railWidth', String(this._railPx));
          } catch (err) {}
        };
        resize.addEventListener('pointermove', move);
        resize.addEventListener('pointerup', up);
        resize.addEventListener('pointercancel', up);
      });

      // Delete-confirm dialog — mirrors the SPA's ConfirmDialog layout.
      const confirm = document.createElement('div');
      confirm.className = 'confirm-backdrop export-hidden';
      confirm.setAttribute('data-omelette-chrome', '');
      confirm.innerHTML = `
        <div class="confirm" role="dialog" aria-modal="true">
          <div class="body">
            <div class="title">Delete slide?</div>
            <div class="msg">This slide will be removed from the deck.</div>
          </div>
          <div class="footer">
            <button type="button" class="cancel">Cancel</button>
            <button type="button" class="danger">Delete</button>
          </div>
        </div>
      `;
      confirm.addEventListener('click', e => {
        if (e.target === confirm) this._closeConfirm();
      });
      confirm.querySelector('.cancel').addEventListener('click', () => this._closeConfirm());
      confirm.querySelector('.danger').addEventListener('click', () => {
        const i = this._confirmIndex;
        this._closeConfirm();
        this._deleteSlide(i);
      });
      this._root.append(style, rail, resize, stage, overlay, menu, confirm);
      this._canvas = canvas;
      this._stage = stage;
      this._slot = slot;
      this._overlay = overlay;
      this._rail = rail;
      this._resize = resize;
      this._menu = menu;
      this._confirm = confirm;
      this._countEl = overlay.querySelector('.current');
      this._totalEl = overlay.querySelector('.total');

      // Restore persisted rail width.
      let rw = 188;
      try {
        const s = localStorage.getItem('deck-stage.railWidth');
        if (s) rw = parseInt(s, 10) || rw;
      } catch (err) {}
      this._setRailWidth(rw);
      this._syncRailHidden();
    }
    _setRailWidth(px) {
      const w = Math.max(120, Math.min(360, Math.round(px)));
      this._railPx = w;
      this.style.setProperty('--deck-rail-w', w + 'px');
      this._fit();
      // _scaleThumbs forces a sync layout (frame.offsetWidth) then writes
      // N transforms. During a resize drag this runs per-pointermove;
      // coalesce to one per frame.
      if (!this._scaleRaf) {
        this._scaleRaf = requestAnimationFrame(() => {
          this._scaleRaf = null;
          this._scaleThumbs();
        });
      }
    }

    /** @page must live in the document stylesheet — it's a no-op inside
     *  shadow DOM. Inject/update a single <head> style tag so the print
     *  sheet matches the design size and Save-as-PDF yields one slide per
     *  page with no margins. */
    _syncPrintPageRule() {
      const id = 'deck-stage-print-page';
      let tag = document.getElementById(id);
      if (!tag) {
        tag = document.createElement('style');
        tag.id = id;
        document.head.appendChild(tag);
      }
      tag.textContent = '@page { size: ' + this.designWidth + 'px ' + this.designHeight + 'px; margin: 0; } ' + '@media print { html, body { margin: 0 !important; padding: 0 !important; background: none !important; overflow: visible !important; height: auto !important; } ' + '* { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }';
    }
    _onSlotChange() {
      // Rail mutations (delete/move) already reconcile synchronously and
      // emit slidechange with reason 'api'; skip the async slotchange that
      // would otherwise re-broadcast with reason 'init'.
      if (this._squelchSlotChange) {
        this._squelchSlotChange = false;
        return;
      }
      this._collectSlides();
      this._restoreIndex();
      this._applyIndex({
        showOverlay: false,
        broadcast: true,
        reason: 'init'
      });
      this._fit();
    }
    _collectSlides() {
      const assigned = this._slot.assignedElements({
        flatten: true
      });
      this._slides = assigned.filter(el => {
        // Skip template/style/script nodes even if someone slots them.
        const tag = el.tagName;
        return tag !== 'TEMPLATE' && tag !== 'SCRIPT' && tag !== 'STYLE';
      });
      this._slideSet = new Set(this._slides);
      this._slides.forEach((slide, i) => {
        const n = i + 1;
        slide.setAttribute('data-screen-label', `${pad2(n)} ${getSlideLabel(slide)}`);

        // Validation attribute for comment flow / auto-checks.
        if (!slide.hasAttribute('data-om-validate')) {
          slide.setAttribute('data-om-validate', VALIDATE_ATTR);
        }
        slide.setAttribute('data-deck-slide', String(i));
      });
      if (this._totalEl) this._totalEl.textContent = String(this._slides.length || 1);
      if (this._index >= this._slides.length) this._index = Math.max(0, this._slides.length - 1);
      this._markLastVisible();
      this._renderRail();
    }

    /** Tag the last non-skipped slide so print CSS can drop its
     *  break-after (see the @media print comment above — :last-child
     *  alone matches a hidden skipped slide). */
    _markLastVisible() {
      let last = null;
      this._slides.forEach(s => {
        s.removeAttribute('data-deck-last-visible');
        if (!s.hasAttribute('data-deck-skip')) last = s;
      });
      if (last) last.setAttribute('data-deck-last-visible', '');
    }
    _loadNotes() {
      const tag = document.getElementById('speaker-notes');
      if (!tag) {
        this._notes = [];
        return;
      }
      try {
        const parsed = JSON.parse(tag.textContent || '[]');
        if (Array.isArray(parsed)) this._notes = parsed;
      } catch (e) {
        console.warn('[deck-stage] Failed to parse #speaker-notes JSON:', e);
        this._notes = [];
      }
    }
    _restoreIndex() {
      // The host's ?slide= param is delivered as a #<int> hash (1-indexed) on
      // the iframe src. No hash → slide 1; the deck itself keeps no position
      // state across loads.
      const h = (location.hash || '').match(/^#(\d+)$/);
      if (h) {
        const n = parseInt(h[1], 10) - 1;
        if (n >= 0 && n < this._slides.length) this._index = n;
      }
    }
    _applyIndex({
      showOverlay = true,
      broadcast = true,
      reason = 'init'
    } = {}) {
      if (!this._slides.length) return;
      const prev = this._prevIndex == null ? -1 : this._prevIndex;
      const curr = this._index;
      // Keep the iframe's own hash in sync so an in-iframe location.reload()
      // (reload banner path in viewer-handle.ts) lands on the current slide,
      // not the stale deep-link hash from initial load.
      try {
        history.replaceState(null, '', '#' + (curr + 1));
      } catch (e) {}
      this._slides.forEach((s, i) => {
        if (i === curr) s.setAttribute('data-deck-active', '');else s.removeAttribute('data-deck-active');
      });
      if (this._countEl) this._countEl.textContent = String(curr + 1);
      // Follow-scroll on every navigation (init deep-link, keyboard, click,
      // tap, external goTo) — the only time we *don't* want the rail to
      // track current is after a rail-internal mutation, where _renderRail
      // has already restored the user's scroll position and yanking back to
      // current would undo it.
      this._syncRail(reason !== 'mutation');
      if (broadcast) {
        // (1) Legacy: host-window postMessage for speaker-notes renderers.
        try {
          window.postMessage({
            slideIndexChanged: curr,
            deckTotal: this._slides.length,
            deckSkipped: this._skippedIndices()
          }, '*');
        } catch (e) {}

        // (2) In-page CustomEvent on the <deck-stage> element itself.
        //     Bubbles and composes out of shadow DOM so slide code can listen:
        //       document.querySelector('deck-stage').addEventListener('slidechange', e => {
        //         e.detail.index, e.detail.previousIndex, e.detail.total, e.detail.slide, e.detail.reason
        //       });
        const detail = {
          index: curr,
          previousIndex: prev,
          total: this._slides.length,
          slide: this._slides[curr] || null,
          previousSlide: prev >= 0 ? this._slides[prev] || null : null,
          reason: reason // 'init' | 'keyboard' | 'click' | 'tap' | 'api'
        };
        this.dispatchEvent(new CustomEvent('slidechange', {
          detail,
          bubbles: true,
          composed: true
        }));
      }
      this._prevIndex = curr;
      if (showOverlay) this._flashOverlay();
    }
    _flashOverlay() {
      // Host posts __omelette_presenting while in fullscreen/tab presentation
      // mode — suppress the nav footer entirely (both hover and slide-change
      // flash) so the audience sees clean slides.
      if (!this._overlay || this._presenting) return;
      this._overlay.setAttribute('data-visible', '');
      if (this._hideTimer) clearTimeout(this._hideTimer);
      this._hideTimer = setTimeout(() => {
        this._overlay.removeAttribute('data-visible');
      }, OVERLAY_HIDE_MS);
    }
    _railWidth() {
      // State-based, no offsetWidth: the first _fit() can run before the
      // rail has had layout on some load paths, and a 0 there paints the
      // slide full-width for one frame before the post-slotchange _fit()
      // corrects it.
      if (!this._railEnabled || !this._railVisible || this.hasAttribute('no-rail') || this.hasAttribute('noscale') || this._presenting || this._previewMode || NARROW_MQ.matches) return 0;
      return this._railPx || 0;
    }
    _fit() {
      if (!this._canvas) return;
      const stage = this._canvas.parentElement;
      // PPTX export sets noscale so the DOM capture sees authored-size
      // geometry — the scaled canvas is in shadow DOM, so the exporter's
      // resetTransformSelector can't reach .canvas.style.transform directly.
      if (this.hasAttribute('noscale')) {
        this._canvas.style.transform = 'none';
        if (stage) stage.style.left = '0';
        if (this._overlay) this._overlay.style.marginLeft = '0';
        return;
      }
      const rw = this._railWidth();
      if (stage) stage.style.left = rw + 'px';
      // Overlay is centred on the viewport via left:50% + translate(-50%);
      // marginLeft shifts the centre by rw/2 so it lands in the middle of
      // the [rw, innerWidth] stage region.
      if (this._overlay) this._overlay.style.marginLeft = rw / 2 + 'px';
      const vw = window.innerWidth - rw;
      const vh = window.innerHeight;
      const s = Math.min(vw / this.designWidth, vh / this.designHeight);
      this._canvas.style.transform = `scale(${s})`;
    }
    _onResize() {
      this._fit();
      // Crossing the narrow-viewport breakpoint reveals the rail — rerun the
      // thumbnail scale the same way _setRailWidth does.
      if (!this._scaleRaf) {
        this._scaleRaf = requestAnimationFrame(() => {
          this._scaleRaf = null;
          this._scaleThumbs();
        });
      }
    }
    _onMouseMove() {
      // Keep overlay visible while mouse moves; hide after idle.
      this._flashOverlay();
    }
    _onMessage(e) {
      const d = e.data;
      if (d && typeof d.__omelette_presenting === 'boolean') {
        this._presenting = d.__omelette_presenting;
        if (this._presenting && this._overlay) {
          this._overlay.removeAttribute('data-visible');
          if (this._hideTimer) clearTimeout(this._hideTimer);
        }
        this._syncRailHidden();
        this._closeMenu();
        this._closeConfirm();
        this._fit();
        this._scaleThumbs();
      }
      // Host's Preview segment (ViewerMode='none'): the rail's drag-reorder /
      // right-click skip-delete affordances are editing chrome, so hide it
      // while the user is just looking at the deck. Same hard-hide path as
      // presenting; independent of the user's _railVisible preference so
      // returning to Edit restores whatever they had.
      if (d && typeof d.__omelette_preview_mode === 'boolean') {
        if (d.__omelette_preview_mode === this._previewMode) return;
        this._previewMode = d.__omelette_preview_mode;
        this._syncRailHidden();
        this._closeMenu();
        this._closeConfirm();
        this._fit();
        this._scaleThumbs();
      }
      // Per-viewer show/hide, driven by the TweaksPanel's auto-injected
      // "Thumbnail rail" toggle (or any author script). Independent of
      // whether the Tweaks panel itself is open — closing the panel
      // doesn't change rail visibility. Persists alongside rail width.
      if (d && d.type === '__deck_rail_visible' && typeof d.on === 'boolean') {
        if (d.on === this._railVisible) return;
        this._railVisible = d.on;
        try {
          localStorage.setItem('deck-stage.railVisible', d.on ? '1' : '0');
        } catch (e) {}
        // Arm the transition, commit it, then flip state — otherwise the
        // browser coalesces both writes and nothing animates on show.
        this.setAttribute('data-rail-anim', '');
        void (this._rail && this._rail.offsetHeight);
        this._syncRailHidden();
        this._fit();
        this._scaleThumbs();
        clearTimeout(this._railAnimTimer);
        this._railAnimTimer = setTimeout(() => this.removeAttribute('data-rail-anim'), 220);
      }
      if (d && d.type === '__omelette_rail_enabled') this._enableRail();
    }
    _syncRailHidden() {
      if (!this._rail) return;
      // data-presenting is the hard hide (display:none) for flag-off,
      // presentation mode, and the host's Preview segment — instant, no
      // transition. data-user-hidden is the soft hide (translateX(-100%))
      // for the viewer's rail toggle, so show/hide slides under
      // :host([data-rail-anim]).
      const hard = !this._railEnabled || this._presenting || this._previewMode;
      if (hard) this._rail.setAttribute('data-presenting', '');else this._rail.removeAttribute('data-presenting');
      if (!this._railVisible) this._rail.setAttribute('data-user-hidden', '');else this._rail.removeAttribute('data-user-hidden');
      // translateX hide leaves thumbs (tabIndex=0) in the tab order —
      // inert keeps them unfocusable while the rail is off-screen.
      this._rail.inert = hard || !this._railVisible;
    }
    _onTap(e) {
      // Touch-only — keyboard + the overlay toolbar cover nav on desktop.
      if (FINE_POINTER_MQ.matches) return;
      // Only taps that land on the stage (slide content or letterbox); the
      // overlay / rail / menus are siblings with their own click handlers.
      const path = e.composedPath();
      if (!this._stage || !path.includes(this._stage)) return;
      // Let interactive slide content keep the tap. composedPath (not
      // e.target.closest) so we see through open shadow roots — a <button>
      // inside a slide-authored custom element retargets e.target to the
      // host but still appears in the composed path.
      if (e.defaultPrevented) return;
      for (const n of path) {
        if (n === this._stage) break;
        if (n.matches && n.matches(INTERACTIVE_SEL)) return;
      }
      e.preventDefault();
      const rw = this._railWidth();
      const mid = rw + (window.innerWidth - rw) / 2;
      this._advance(e.clientX < mid ? -1 : 1, 'tap');
    }
    _onKey(e) {
      // Ignore when the user is typing.
      const t = e.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      // Confirm dialog swallows nav keys while open; Escape cancels. Enter
      // is left to the focused button's native activation so Tab→Cancel
      // →Enter activates Cancel, not the window-level confirm path.
      if (this._confirm && this._confirm.hasAttribute('data-open')) {
        if (e.key === 'Escape') {
          this._closeConfirm();
          e.preventDefault();
        }
        return;
      }
      if (e.key === 'Escape' && this._menu && this._menu.hasAttribute('data-open')) {
        this._closeMenu();
        e.preventDefault();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key;
      let handled = true;
      if (key === 'ArrowRight' || key === 'PageDown' || key === ' ' || key === 'Spacebar') {
        this._advance(1, 'keyboard');
      } else if (key === 'ArrowLeft' || key === 'PageUp') {
        this._advance(-1, 'keyboard');
      } else if (key === 'Home') {
        this._go(0, 'keyboard');
      } else if (key === 'End') {
        this._go(this._slides.length - 1, 'keyboard');
      } else if (key === 'r' || key === 'R') {
        this._go(0, 'keyboard');
      } else if (/^[0-9]$/.test(key)) {
        // 1..9 jump to that slide; 0 jumps to 10.
        const n = key === '0' ? 9 : parseInt(key, 10) - 1;
        if (n < this._slides.length) this._go(n, 'keyboard');
      } else {
        handled = false;
      }
      if (handled) {
        e.preventDefault();
        this._flashOverlay();
      }
    }
    _go(i, reason = 'api') {
      if (!this._slides.length) return;
      const clamped = Math.max(0, Math.min(this._slides.length - 1, i));
      if (clamped === this._index) {
        this._flashOverlay();
        return;
      }
      this._index = clamped;
      this._applyIndex({
        showOverlay: true,
        broadcast: true,
        reason
      });
    }

    /** Step forward/back skipping any slide marked data-deck-skip. Falls
     *  back to _go's clamp-at-ends behaviour (flash overlay) when there's
     *  nothing further in that direction. */
    _advance(dir, reason) {
      if (!this._slides.length) return;
      let i = this._index + dir;
      while (i >= 0 && i < this._slides.length && this._slides[i].hasAttribute('data-deck-skip')) {
        i += dir;
      }
      if (i < 0 || i >= this._slides.length) {
        this._flashOverlay();
        return;
      }
      this._go(i, reason);
    }

    // ── Thumbnail rail ────────────────────────────────────────────────────
    //
    // Thumbs are keyed by slide element and reused across _renderRail()
    // calls, so a reorder/delete is an O(changed) DOM shuffle instead of an
    // O(N) teardown-and-re-clone. Each thumb starts as a lightweight shell
    // (num + empty frame); the clone is materialized lazily by an
    // IntersectionObserver when the frame scrolls into (or near) view, so
    // only visible-ish slides pay the clone + image-decode cost.

    _renderRail() {
      if (!this._rail || !this._railEnabled) {
        this._thumbs = [];
        return;
      }
      // FLIP: record each *materialized* thumb's top before the reconcile.
      // Off-screen (non-materialized) thumbs don't need the animation and
      // skipping their getBoundingClientRect saves a forced layout per
      // off-screen thumb on large decks.
      const prevTops = new Map();
      (this._thumbs || []).forEach(({
        thumb,
        slide,
        host
      }) => {
        if (host) prevTops.set(slide, thumb.getBoundingClientRect().top);
      });
      const st = this._rail.scrollTop;

      // Reconcile: reuse thumbs that already exist for a slide, create
      // shells for new slides, drop thumbs for removed slides.
      const bySlide = new Map();
      (this._thumbs || []).forEach(t => bySlide.set(t.slide, t));
      const next = [];
      this._slides.forEach(slide => {
        let t = bySlide.get(slide);
        if (t) bySlide.delete(slide);else t = this._makeThumb(slide);
        next.push(t);
      });
      // Orphans — slides removed since last render.
      bySlide.forEach(t => {
        if (this._railObserver) this._railObserver.unobserve(t.frame);
        t.thumb.remove();
      });
      // Put thumbs into document order to match _slides. insertBefore on
      // an already-correctly-placed node is a no-op, so this is cheap
      // when nothing moved.
      next.forEach((t, i) => {
        const want = t.thumb;
        const at = this._rail.children[i];
        if (at !== want) this._rail.insertBefore(want, at || null);
        t.i = i;
        t.num.textContent = String(i + 1);
        if (t.slide.hasAttribute('data-deck-skip')) t.thumb.setAttribute('data-skip', '');else t.thumb.removeAttribute('data-skip');
      });
      this._thumbs = next;
      this._rail.scrollTop = st;
      if (prevTops.size) {
        const moved = [];
        this._thumbs.forEach(({
          thumb,
          slide
        }) => {
          const old = prevTops.get(slide);
          if (old == null) return;
          const dy = old - thumb.getBoundingClientRect().top;
          if (Math.abs(dy) < 1) return;
          thumb.style.transition = 'none';
          thumb.style.transform = `translateY(${dy}px)`;
          moved.push(thumb);
        });
        if (moved.length) {
          // Commit the inverted positions before flipping the transition
          // on — otherwise the browser coalesces both style writes and
          // nothing animates.
          void this._rail.offsetHeight;
          moved.forEach(t => {
            t.style.transition = 'transform 180ms cubic-bezier(.2,.7,.3,1)';
            t.style.transform = '';
          });
          setTimeout(() => moved.forEach(t => {
            t.style.transition = '';
          }), 220);
        }
      }
      requestAnimationFrame(() => this._scaleThumbs());
      this._syncRail(false);
    }

    /** Create a lightweight thumb shell for one slide. The clone is
     *  materialized later by the IntersectionObserver. Event handlers
     *  look up the thumb's *current* index (via _thumbs.indexOf) so the
     *  same element can be reused across reorders. */
    _makeThumb(slide) {
      const thumb = document.createElement('div');
      thumb.className = 'thumb';
      thumb.tabIndex = 0;
      const num = document.createElement('div');
      num.className = 'num';
      const frame = document.createElement('div');
      frame.className = 'frame';
      thumb.append(num, frame);
      const entry = {
        thumb,
        num,
        frame,
        slide,
        clone: null,
        host: null,
        i: -1
      };
      // entry.i is refreshed on every _renderRail reconcile pass, so
      // handlers read the thumb's current position without an O(N) scan.
      const idx = () => entry.i;
      thumb.addEventListener('click', () => this._go(idx(), 'click'));
      // ↑/↓ step through the rail when a thumb has focus. _go clamps at the
      // ends and _applyIndex→_syncRail scrolls the new current thumb into
      // view; we move focus to it (preventScroll — _syncRail already
      // scrolled) so a held key walks the whole list. stopPropagation keeps
      // this out of the window-level _onKey nav handler.
      thumb.addEventListener('keydown', e => {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        e.preventDefault();
        e.stopPropagation();
        this._go(idx() + (e.key === 'ArrowDown' ? 1 : -1), 'keyboard');
        const cur = this._thumbs && this._thumbs[this._index];
        if (cur) cur.thumb.focus({
          preventScroll: true
        });
      });
      thumb.addEventListener('contextmenu', e => {
        e.preventDefault();
        this._openMenu(idx(), e.clientX, e.clientY);
      });
      thumb.draggable = true;
      thumb.addEventListener('dragstart', e => {
        this._dragFrom = idx();
        thumb.setAttribute('data-dragging', '');
        e.dataTransfer.effectAllowed = 'move';
        try {
          e.dataTransfer.setData('text/plain', String(this._dragFrom));
        } catch (err) {}
      });
      thumb.addEventListener('dragend', () => {
        thumb.removeAttribute('data-dragging');
        this._clearDrop();
        this._dragFrom = null;
      });
      thumb.addEventListener('dragover', e => {
        if (this._dragFrom == null) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const r = thumb.getBoundingClientRect();
        this._setDrop(idx(), e.clientY < r.top + r.height / 2 ? 'before' : 'after');
      });
      thumb.addEventListener('drop', e => {
        if (this._dragFrom == null) return;
        e.preventDefault();
        const i = idx();
        const r = thumb.getBoundingClientRect();
        let to = e.clientY >= r.top + r.height / 2 ? i + 1 : i;
        if (this._dragFrom < to) to--;
        const from = this._dragFrom;
        this._clearDrop();
        this._dragFrom = null;
        if (to !== from) this._moveSlide(from, to);
      });
      if (this._railObserver) this._railObserver.observe(frame);
      frame.__deckThumb = entry;
      return entry;
    }

    /** Lazily build the clone for a thumb that has scrolled into view. */
    _materialize(entry) {
      if (entry.host) return;
      const dw = this.designWidth,
        dh = this.designHeight;
      let clone = entry.slide.cloneNode(true);
      clone.removeAttribute('id');
      clone.removeAttribute('data-deck-active');
      clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
      // Neuter heavy media; replace <video> with its poster so the box
      // keeps a visual. <iframe>/<audio> become empty placeholders.
      clone.querySelectorAll('iframe, audio, object, embed').forEach(el => {
        el.removeAttribute('src');
        el.removeAttribute('srcdoc');
        el.removeAttribute('data');
        el.innerHTML = '';
      });
      clone.querySelectorAll('video').forEach(el => {
        if (!el.poster) {
          el.removeAttribute('src');
          el.innerHTML = '';
          return;
        }
        const img = document.createElement('img');
        img.src = el.poster;
        img.alt = '';
        img.style.cssText = el.style.cssText + ';object-fit:cover;width:100%;height:100%;';
        img.className = el.className;
        el.replaceWith(img);
      });
      // Images: defer decode and let the browser pick the smallest
      // srcset candidate for the ~140px thumb. Same-URL clones reuse the
      // slide's decoded bitmap (URL-keyed cache), so the remaining cost
      // is paint/composite — lazy+async keeps that off the main thread.
      clone.querySelectorAll('img').forEach(el => {
        el.loading = 'lazy';
        el.decoding = 'async';
        if (el.srcset) el.sizes = (this._railPx || 188) + 'px';
      });
      // Custom elements inside the slide would have their
      // connectedCallback fire when the clone is appended. Replace them
      // with inert boxes so a component-heavy deck doesn't run N copies
      // of each component's mount logic in the rail. Children are
      // preserved so layout-wrapper elements (<my-column><h2>…</h2>)
      // still show their authored content; the querySelectorAll NodeList
      // is static, so nested custom elements in the moved subtree are
      // still visited on later iterations.
      const neuter = el => {
        const box = document.createElement('div');
        box.style.cssText = (el.getAttribute('style') || '') + ';background:rgba(0,0,0,0.06);border:1px dashed rgba(0,0,0,0.15);';
        box.className = el.className;
        // Preserve theming/i18n hooks so [data-*] / :lang() / [dir]
        // descendant selectors still match the neutered root.
        for (const a of el.attributes) {
          const n = a.name;
          if (n.startsWith('data-') || n.startsWith('aria-') || n === 'lang' || n === 'dir' || n === 'role' || n === 'title') {
            box.setAttribute(n, a.value);
          }
        }
        while (el.firstChild) box.appendChild(el.firstChild);
        return box;
      };
      // querySelectorAll('*') returns descendants only — a custom-element
      // slide root (<my-slide>…</my-slide>) would slip through and upgrade
      // on append. Swap the root first.
      if (clone.tagName.includes('-')) clone = neuter(clone);
      clone.querySelectorAll('*').forEach(el => {
        if (el.tagName.includes('-')) el.replaceWith(neuter(el));
      });
      clone.style.cssText += ';position:absolute;top:0;left:0;transform-origin:0 0;' + 'pointer-events:none;width:' + dw + 'px;height:' + dh + 'px;' + 'box-sizing:border-box;overflow:hidden;visibility:visible;opacity:1;';
      const host = document.createElement('div');
      host.style.cssText = 'position:absolute;inset:0;';
      this._syncThumbHostAttrs(host);
      const sr = host.attachShadow({
        mode: 'open'
      });
      if (this._adoptedSheet) sr.adoptedStyleSheets = [this._adoptedSheet];else {
        const st = document.createElement('style');
        st.textContent = this._authorCss || '';
        sr.appendChild(st);
      }
      sr.appendChild(clone);
      entry.frame.appendChild(host);
      entry.host = host;
      entry.clone = clone;
      if (this._thumbScale) clone.style.transform = 'scale(' + this._thumbScale + ')';
      // Once materialized the IO callback is a no-op early-return —
      // unobserve so scroll doesn't keep firing it.
      if (this._railObserver) this._railObserver.unobserve(entry.frame);
    }

    /** Re-clone a single thumb (live-update path). No-op if the thumb
     *  hasn't been materialized yet — it'll pick up current content when
     *  it scrolls into view. */
    _refreshThumb(slide) {
      const entry = (this._thumbs || []).find(t => t.slide === slide);
      if (!entry || !entry.host) return;
      entry.host.remove();
      entry.host = entry.clone = null;
      this._materialize(entry);
    }
    _scaleThumbs() {
      if (!this._thumbs || !this._thumbs.length) return;
      // Every frame is the same width; if it reads 0 the rail is
      // display:none (noscale / no-rail / presenting / print) — leave the
      // clones as-is and re-run when the rail is revealed.
      const fw = this._thumbs[0].frame.offsetWidth;
      if (!fw) return;
      this._thumbScale = fw / this.designWidth;
      this._thumbs.forEach(({
        clone
      }) => {
        if (clone) clone.style.transform = 'scale(' + this._thumbScale + ')';
      });
    }
    _setDrop(i, where) {
      // dragover fires at pointer-event rate; touch only the previous
      // and new target rather than sweeping all N thumbs.
      const t = this._thumbs && this._thumbs[i];
      if (this._dropOn && this._dropOn !== t) {
        this._dropOn.thumb.removeAttribute('data-drop');
      }
      if (t) t.thumb.setAttribute('data-drop', where);
      this._dropOn = t || null;
    }
    _clearDrop() {
      if (this._dropOn) this._dropOn.thumb.removeAttribute('data-drop');
      this._dropOn = null;
    }
    _syncRail(follow) {
      if (!this._thumbs) return;
      this._thumbs.forEach(({
        thumb
      }, i) => {
        if (i === this._index) {
          thumb.setAttribute('data-current', '');
          if (follow && typeof thumb.scrollIntoView === 'function') {
            thumb.scrollIntoView({
              block: 'nearest'
            });
          }
        } else {
          thumb.removeAttribute('data-current');
        }
      });
    }
    _openMenu(i, x, y) {
      if (!this._menu) return;
      this._menuIndex = i;
      const slide = this._slides[i];
      const skip = slide && slide.hasAttribute('data-deck-skip');
      this._menu.querySelector('[data-act="skip"]').textContent = skip ? 'Unskip slide' : 'Skip slide';
      this._menu.querySelector('[data-act="up"]').disabled = i <= 0;
      this._menu.querySelector('[data-act="down"]').disabled = i >= this._slides.length - 1;
      this._menu.querySelector('[data-act="delete"]').disabled = this._slides.length <= 1;
      // Place, then clamp to viewport after it's measurable.
      this._menu.style.left = x + 'px';
      this._menu.style.top = y + 'px';
      this._menu.setAttribute('data-open', '');
      const r = this._menu.getBoundingClientRect();
      const nx = Math.min(x, window.innerWidth - r.width - 4);
      const ny = Math.min(y, window.innerHeight - r.height - 4);
      this._menu.style.left = Math.max(4, nx) + 'px';
      this._menu.style.top = Math.max(4, ny) + 'px';
    }
    _closeMenu() {
      if (this._menu) this._menu.removeAttribute('data-open');
      this._menuIndex = -1;
    }
    _openConfirm(i) {
      if (!this._confirm) return;
      this._confirmIndex = i;
      this._confirm.querySelector('.title').textContent = 'Delete slide ' + (i + 1) + '?';
      this._confirm.setAttribute('data-open', '');
      const btn = this._confirm.querySelector('.danger');
      if (btn && btn.focus) btn.focus();
    }
    _closeConfirm() {
      if (this._confirm) this._confirm.removeAttribute('data-open');
      this._confirmIndex = -1;
    }
    _emitDeckChange(detail) {
      this.dispatchEvent(new CustomEvent('deckchange', {
        detail,
        bubbles: true,
        composed: true
      }));
    }
    _deleteSlide(i) {
      const slide = this._slides[i];
      if (!slide || this._slides.length <= 1) return;
      const wasCurrent = i === this._index;
      if (i < this._index || wasCurrent && i === this._slides.length - 1) this._index--;
      this._squelchSlotChange = true;
      slide.remove();
      this._emitDeckChange({
        action: 'delete',
        from: i,
        slide
      });
      this._collectSlides();
      this._applyIndex({
        showOverlay: true,
        broadcast: true,
        reason: 'mutation'
      });
    }
    _toggleSkip(i) {
      const slide = this._slides[i];
      if (!slide) return;
      const on = !slide.hasAttribute('data-deck-skip');
      if (on) slide.setAttribute('data-deck-skip', '');else slide.removeAttribute('data-deck-skip');
      if (this._thumbs && this._thumbs[i]) {
        if (on) this._thumbs[i].thumb.setAttribute('data-skip', '');else this._thumbs[i].thumb.removeAttribute('data-skip');
      }
      this._markLastVisible();
      this._emitDeckChange({
        action: on ? 'skip' : 'unskip',
        from: i,
        slide
      });
      // Re-broadcast so the presenter popup's prev/next thumbnails re-pick
      // the nearest non-skipped slide without waiting for a nav event.
      try {
        window.postMessage({
          slideIndexChanged: this._index,
          deckTotal: this._slides.length,
          deckSkipped: this._skippedIndices()
        }, '*');
      } catch (e) {}
    }
    _skippedIndices() {
      const out = [];
      for (let i = 0; i < this._slides.length; i++) {
        if (this._slides[i].hasAttribute('data-deck-skip')) out.push(i);
      }
      return out;
    }
    _moveSlide(i, j) {
      if (j < 0 || j >= this._slides.length || j === i) return;
      const slide = this._slides[i];
      const ref = j < i ? this._slides[j] : this._slides[j].nextSibling;
      // Track the active slide across the reorder so the same content
      // stays on screen.
      const cur = this._index;
      if (cur === i) this._index = j;else if (i < cur && j >= cur) this._index = cur - 1;else if (i > cur && j <= cur) this._index = cur + 1;
      this._squelchSlotChange = true;
      this.insertBefore(slide, ref);
      this._emitDeckChange({
        action: 'move',
        from: i,
        to: j,
        slide
      });
      this._collectSlides();
      this._applyIndex({
        showOverlay: false,
        broadcast: true,
        reason: 'mutation'
      });
    }

    // Public API ------------------------------------------------------------

    /** Current slide index (0-based). */
    get index() {
      return this._index;
    }
    /** Total slide count. */
    get length() {
      return this._slides.length;
    }
    /** Programmatically navigate. */
    goTo(i) {
      this._go(i, 'api');
    }
    next() {
      this._advance(1, 'api');
    }
    prev() {
      this._advance(-1, 'api');
    }
    reset() {
      this._go(0, 'api');
    }
  }
  if (!customElements.get('deck-stage')) {
    customElements.define('deck-stage', DeckStage);
  }
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "slides/deck-stage.js", error: String((e && e.message) || e) }); }

// ui_kits/client_app/App.jsx
try { (() => {
/* global React */
const {
  Home: NavHome,
  Book: NavBook,
  Settings: NavSettings
} = window.ZpIcons;

/* ============================================================
 * App.jsx — router shell, phone frame, bottom tab nav.
 *
 * State-based router:
 *   route: "login" | "home" | "order" | "success" | "menu"
 *          | "settings" | "portions" | "diets"
 * ============================================================ */

function PhoneFrame({
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "zp-phone",
    id: "zp-phone"
  }, children);
}
function TabBar({
  route,
  navigate
}) {
  // Visible only on tab-rooted pages
  const tabRoutes = ["home", "menu", "settings"];
  const visible = tabRoutes.includes(route);
  if (!visible) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "zp-tabbar"
  }, /*#__PURE__*/React.createElement("button", {
    className: "zp-tab" + (route === "home" ? " zp-tab--active" : ""),
    onClick: () => navigate("home")
  }, /*#__PURE__*/React.createElement(NavHome, null), /*#__PURE__*/React.createElement("span", null, "Domov")), /*#__PURE__*/React.createElement("button", {
    className: "zp-tab" + (route === "menu" ? " zp-tab--active" : ""),
    onClick: () => navigate("menu")
  }, /*#__PURE__*/React.createElement(NavBook, null), /*#__PURE__*/React.createElement("span", null, "Jed\xE1lni\u010Dek")), /*#__PURE__*/React.createElement("button", {
    className: "zp-tab" + (route === "settings" ? " zp-tab--active" : ""),
    onClick: () => navigate("settings")
  }, /*#__PURE__*/React.createElement(NavSettings, null), /*#__PURE__*/React.createElement("span", null, "Nastavenia")));
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
  if (route === "login") screen = /*#__PURE__*/React.createElement(window.LoginScreen, {
    onLogin: () => navigate("home")
  });else if (route === "home") screen = /*#__PURE__*/React.createElement(window.HomeScreen, {
    navigate: navigate
  });else if (route === "order") screen = /*#__PURE__*/React.createElement(window.OrderScreen, {
    navigate: navigate,
    params: params
  });else if (route === "success") screen = /*#__PURE__*/React.createElement(window.SuccessScreen, {
    navigate: navigate,
    params: params
  });else if (route === "menu") screen = /*#__PURE__*/React.createElement(window.MenuScreen, {
    navigate: navigate
  });else if (route === "settings") screen = /*#__PURE__*/React.createElement(window.SettingsScreen, {
    navigate: navigate
  });else if (route === "portions") screen = /*#__PURE__*/React.createElement(window.PortionsScreen, {
    navigate: navigate
  });else if (route === "diets") screen = /*#__PURE__*/React.createElement(window.DietsScreen, {
    navigate: navigate
  });
  const tabRoutes = ["home", "menu", "settings"];
  const onTab = tabRoutes.includes(route);
  return /*#__PURE__*/React.createElement(PhoneFrame, null, /*#__PURE__*/React.createElement("div", {
    className: "zp-route-body" + (onTab ? "" : " zp-route-body--notab")
  }, screen), /*#__PURE__*/React.createElement(TabBar, {
    route: route,
    navigate: navigate
  }));
}
window.App = App;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/client_app/App.jsx", error: String((e && e.message) || e) }); }

// ui_kits/client_app/HomeScreen.jsx
try { (() => {
/* global React */
const {
  User: HUser,
  Settings: HSettings,
  Plus: HPlus,
  Calendar: HCalendar,
  CalendarDays: HCalendarDays,
  Clock: HClock,
  History: HHistory,
  Bot: HBot,
  PenLine: HPenLine,
  XCircle: HXCircle,
  ChevronRight: HChevronRight,
  Sparkles: HSparkles
} = window.ZpIcons;

/* ============================================================
 * HomeScreen — connected to nav context
 *  - disclaimer under hero CTA
 *  - monthly summary card under planned orders
 * ============================================================ */
function HomeScreen({
  navigate
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "zp-app"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-grain",
    style: {
      minHeight: "100%"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-topbar"
  }, /*#__PURE__*/React.createElement("img", {
    src: "logo-zdravy-projekt.png",
    alt: "Zdrav\xFD projekt",
    style: {
      height: 32,
      width: "auto",
      display: "block"
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "zp-greeting"
  }, /*#__PURE__*/React.createElement("span", {
    className: "zp-eyebrow"
  }, "Utorok \xB7 27. m\xE1j"), /*#__PURE__*/React.createElement("h1", null, "Dobr\xE9 r\xE1no, Janka."), /*#__PURE__*/React.createElement("p", null, "Tu je v\xE1\u0161 t\xFD\u017Ede\u0148 v Zdravom projekte.")), /*#__PURE__*/React.createElement("a", {
    className: "zp-hero-cta",
    href: "#",
    onClick: e => {
      e.preventDefault();
      navigate("order", {
        day: "streda, 28. mája"
      });
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "icon-bubble"
  }, /*#__PURE__*/React.createElement(HPlus, {
    w: 26
  })), /*#__PURE__*/React.createElement("span", {
    className: "body"
  }, /*#__PURE__*/React.createElement("span", {
    className: "eye"
  }, "Pripravte nov\xFA"), /*#__PURE__*/React.createElement("h3", null, "Nov\xE1 objedn\xE1vka"), /*#__PURE__*/React.createElement("span", {
    className: "when"
  }, "streda, 28. m\xE1ja")), /*#__PURE__*/React.createElement("span", {
    className: "chev"
  }, /*#__PURE__*/React.createElement(HChevronRight, {
    w: 22
  }))), /*#__PURE__*/React.createElement("p", {
    className: "zp-disclaimer"
  }, "Objedn\xE1vky sa automaticky prekl\xE1paj\xFA na \u010Fal\u0161\xED de\u0148, pokia\u013E ich manu\xE1lne neuprav\xEDte."), /*#__PURE__*/React.createElement("div", {
    className: "zp-section"
  }, /*#__PURE__*/React.createElement("h2", null, /*#__PURE__*/React.createElement(HClock, {
    w: 18
  }), " Dne\u0161n\xE1 objedn\xE1vka"), /*#__PURE__*/React.createElement("div", {
    className: "zp-day zp-day--today",
    onClick: () => navigate("order", {
      day: "ut, 27. máj",
      today: true
    }),
    role: "button"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-day-top"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-day-left"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-day-icon"
  }, /*#__PURE__*/React.createElement(HClock, null)), /*#__PURE__*/React.createElement("div", {
    className: "flex1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-day-title"
  }, "ut, 27. m\xE1j", /*#__PURE__*/React.createElement("span", {
    className: "pill-today"
  }, "DNES")), /*#__PURE__*/React.createElement("span", {
    className: "zp-pill zp-pill--deadline"
  }, /*#__PURE__*/React.createElement(HClock, null), " Upravi\u0165 do 10:00"))), /*#__PURE__*/React.createElement("div", {
    className: "zp-day-count"
  }, "32", /*#__PURE__*/React.createElement("small", null, "porci\xED"))), /*#__PURE__*/React.createElement("div", {
    className: "zp-meal-chips"
  }, /*#__PURE__*/React.createElement("span", {
    className: "zp-mchip zp-mchip--breakfast"
  }, "Ra\u0148ajky \xB7 8"), /*#__PURE__*/React.createElement("span", {
    className: "zp-mchip zp-mchip--lunch"
  }, "Obed \xB7 18"), /*#__PURE__*/React.createElement("span", {
    className: "zp-mchip zp-mchip--olovrant"
  }, "Olovrant \xB7 6")))), /*#__PURE__*/React.createElement("div", {
    className: "zp-section"
  }, /*#__PURE__*/React.createElement("h2", null, /*#__PURE__*/React.createElement(HCalendarDays, {
    w: 18
  }), " Pl\xE1novan\xE9 objedn\xE1vky"), /*#__PURE__*/React.createElement("div", {
    className: "zp-day",
    onClick: () => navigate("order", {
      day: "streda, 28. máj"
    })
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-day-top"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-day-left"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-day-icon"
  }, /*#__PURE__*/React.createElement(HBot, null)), /*#__PURE__*/React.createElement("div", {
    className: "flex1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-day-title"
  }, "streda, 28. m\xE1j"), /*#__PURE__*/React.createElement("span", {
    className: "zp-pill zp-pill--auto"
  }, /*#__PURE__*/React.createElement(HSparkles, {
    w: 11,
    sw: 2.2
  }), " Automatick\xE1"))), /*#__PURE__*/React.createElement("div", {
    className: "zp-day-count"
  }, "30", /*#__PURE__*/React.createElement("small", null, "porci\xED"))), /*#__PURE__*/React.createElement("div", {
    className: "zp-meal-chips"
  }, /*#__PURE__*/React.createElement("span", {
    className: "zp-mchip zp-mchip--breakfast"
  }, "Ra\u0148ajky \xB7 8"), /*#__PURE__*/React.createElement("span", {
    className: "zp-mchip zp-mchip--lunch"
  }, "Obed \xB7 16"), /*#__PURE__*/React.createElement("span", {
    className: "zp-mchip zp-mchip--olovrant"
  }, "Olovrant \xB7 6"))), /*#__PURE__*/React.createElement("div", {
    className: "zp-day",
    onClick: () => navigate("order", {
      day: "štvrtok, 29. máj"
    })
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-day-top"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-day-left"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-day-icon"
  }, /*#__PURE__*/React.createElement(HPenLine, null)), /*#__PURE__*/React.createElement("div", {
    className: "flex1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-day-title"
  }, "\u0161tvrtok, 29. m\xE1j"), /*#__PURE__*/React.createElement("span", {
    className: "zp-pill zp-pill--manual"
  }, /*#__PURE__*/React.createElement(HPenLine, {
    w: 11,
    sw: 2.2
  }), " Manu\xE1lna"))), /*#__PURE__*/React.createElement("div", {
    className: "zp-day-count"
  }, "28", /*#__PURE__*/React.createElement("small", null, "porci\xED"))), /*#__PURE__*/React.createElement("div", {
    className: "zp-meal-chips"
  }, /*#__PURE__*/React.createElement("span", {
    className: "zp-mchip zp-mchip--lunch"
  }, "Obed \xB7 22"), /*#__PURE__*/React.createElement("span", {
    className: "zp-mchip zp-mchip--olovrant"
  }, "Olovrant \xB7 6"))), /*#__PURE__*/React.createElement("div", {
    className: "zp-day zp-day--empty",
    onClick: () => navigate("order", {
      day: "piatok, 30. máj"
    })
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-day-top"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-day-left"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-day-icon"
  }, /*#__PURE__*/React.createElement(HXCircle, null)), /*#__PURE__*/React.createElement("div", {
    className: "flex1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-day-title"
  }, "piatok, 30. m\xE1j"), /*#__PURE__*/React.createElement("span", {
    className: "zp-pill zp-pill--empty"
  }, /*#__PURE__*/React.createElement(HXCircle, {
    w: 11,
    sw: 2.2
  }), " Manu\xE1lna \xB7 nulov\xE1"))), /*#__PURE__*/React.createElement("div", {
    className: "zp-day-count",
    style: {
      color: "var(--ink-mute)"
    }
  }, "0", /*#__PURE__*/React.createElement("small", null, "porci\xED"))), /*#__PURE__*/React.createElement("div", {
    className: "zp-day-hint"
  }, "Bez objedn\xE1vky \u2014 vo\u013En\xFD de\u0148 pre kuchy\u0148u."))), /*#__PURE__*/React.createElement("div", {
    className: "zp-section"
  }, /*#__PURE__*/React.createElement("h2", null, /*#__PURE__*/React.createElement(HCalendarDays, {
    w: 18
  }), " Mesa\u010Dn\xFD s\xFAhrn")), /*#__PURE__*/React.createElement("div", {
    className: "zp-monthly"
  }, /*#__PURE__*/React.createElement("div", {
    className: "eye"
  }, "Tento mesiac"), /*#__PURE__*/React.createElement("h3", null, "Mesa\u010Dn\xFD s\xFAhrn", /*#__PURE__*/React.createElement("small", null, "m\xE1j 2026 \xB7 doteraz odoberan\xE9")), /*#__PURE__*/React.createElement("div", {
    className: "zp-monthly-grid"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-monthly-stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "num"
  }, "142\xD7"), /*#__PURE__*/React.createElement("div", {
    className: "lbl"
  }, "Menu A")), /*#__PURE__*/React.createElement("div", {
    className: "zp-monthly-stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "num"
  }, "38\xD7"), /*#__PURE__*/React.createElement("div", {
    className: "lbl"
  }, "Menu B")), /*#__PURE__*/React.createElement("div", {
    className: "zp-monthly-stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "num"
  }, "96\xD7"), /*#__PURE__*/React.createElement("div", {
    className: "lbl"
  }, "Ra\u0148ajky")), /*#__PURE__*/React.createElement("div", {
    className: "zp-monthly-stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "num"
  }, "68\xD7"), /*#__PURE__*/React.createElement("div", {
    className: "lbl"
  }, "Olovrant"))), /*#__PURE__*/React.createElement("div", {
    className: "zp-monthly-foot"
  }, /*#__PURE__*/React.createElement("span", null, "Spolu"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("strong", null, "344"), " porci\xED \xB7 18 dn\xED"))), /*#__PURE__*/React.createElement("div", {
    className: "zp-section"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "with-action"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(HHistory, {
    w: 18
  }), " Hist\xF3ria"), /*#__PURE__*/React.createElement("span", {
    className: "action"
  }, "Viac \u2192")), [{
    d: "po, 26. máj",
    n: 32
  }, {
    d: "pi, 23. máj",
    n: 28
  }, {
    d: "št, 22. máj",
    n: 30
  }].map(o => /*#__PURE__*/React.createElement("div", {
    key: o.d,
    className: "zp-day",
    style: {
      background: "var(--bg-cream-soft)",
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-day-top"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-day-left"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-day-icon",
    style: {
      background: "rgba(114,136,75,0.12)",
      color: "var(--green-700)"
    }
  }, /*#__PURE__*/React.createElement(HCalendar, null)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "zp-day-title"
  }, o.d), /*#__PURE__*/React.createElement("span", {
    className: "zp-pill",
    style: {
      background: "rgba(114,136,75,0.16)",
      color: "var(--green-700)"
    }
  }, "Vybaven\xE1"))), /*#__PURE__*/React.createElement("div", {
    className: "zp-day-count",
    style: {
      fontSize: 19
    }
  }, o.n, /*#__PURE__*/React.createElement("small", null, "porci\xED"))))))));
}
window.HomeScreen = HomeScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/client_app/HomeScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/client_app/LoginScreen.jsx
try { (() => {
/* global React */
const {
  Mail: LMail
} = window.ZpIcons;

/* ============================================================
 * LoginScreen — uses brand-equation logo image
 * (no tagline, no "Stará sa o vás" footer)
 * Adds note that registration is handled by the provider.
 * ============================================================ */
function LoginScreen({
  onLogin
}) {
  const [email, setEmail] = React.useState("janka@skolka-luka.sk");
  const [pwd, setPwd] = React.useState("");
  function submit(e) {
    e && e.preventDefault();
    onLogin && onLogin();
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "zp-app"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-login"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-login-brand"
  }, /*#__PURE__*/React.createElement("img", {
    className: "logoimg",
    src: "logo-zdravy-projekt.png",
    alt: "Zdrav\xFD projekt"
  })), /*#__PURE__*/React.createElement("form", {
    className: "zp-login-card",
    onSubmit: submit
  }, /*#__PURE__*/React.createElement("h2", null, "Vitajte sp\xE4\u0165"), /*#__PURE__*/React.createElement("p", {
    className: "sub"
  }, "Prihl\xE1ste sa, pros\xEDm, do svojho \xFA\u010Dtu."), /*#__PURE__*/React.createElement("div", {
    className: "zp-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "zp-label"
  }, "Email"), /*#__PURE__*/React.createElement("input", {
    className: "zp-input",
    type: "email",
    value: email,
    onChange: e => setEmail(e.target.value),
    placeholder: "vase@meno.sk"
  })), /*#__PURE__*/React.createElement("div", {
    className: "zp-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "zp-label"
  }, "Heslo"), /*#__PURE__*/React.createElement("input", {
    className: "zp-input",
    type: "password",
    value: pwd,
    onChange: e => setPwd(e.target.value),
    placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "right",
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement("a", {
    className: "zp-link",
    href: "#",
    onClick: e => e.preventDefault()
  }, "Zabudli ste heslo?"))), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    className: "zp-btn zp-btn--primary zp-btn--block zp-btn--lg",
    style: {
      marginTop: 8
    }
  }, "Prihl\xE1si\u0165 sa"), /*#__PURE__*/React.createElement("div", {
    className: "zp-divider"
  }, "Nem\xE1te \xFA\u010Det?"), /*#__PURE__*/React.createElement("div", {
    className: "zp-login-info"
  }, /*#__PURE__*/React.createElement("strong", null, "Registr\xE1ciu vykon\xE1va poskytovate\u013E."), /*#__PURE__*/React.createElement("br", null), "Ak m\xE1te z\xE1ujem o slu\u017Ebu, nap\xED\u0161te n\xE1m na", " ", /*#__PURE__*/React.createElement("a", {
    href: "mailto:info@zdravyprojekt.sk"
  }, "info@zdravyprojekt.sk"), " ", "a my V\xE1m vytvor\xEDme pr\xEDstup.")), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 24
    }
  })));
}
window.LoginScreen = LoginScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/client_app/LoginScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/client_app/MenuScreen.jsx
try { (() => {
/* global React */
const {
  ArrowLeft: MArrowLeft,
  ChevronLeft: MChevLeft,
  ChevronRight: MChevRight,
  Coffee: MCoffee,
  Utensils: MUtensils,
  Apple: MApple,
  Calendar: MCalendar
} = window.ZpIcons;

/* ============================================================
 * MenuScreen — Current week's menu, read-only.
 * Days are scrollable horizontally as tabs.
 * ============================================================ */

const WEEK = [{
  date: "po, 26. máj",
  label: "Pondelok",
  meals: {
    ranajky: {
      gram: "200/150 g",
      items: [{
        l: "A",
        t: "Krupicová kaša s ovocím",
        d: "Pšeničná krupica, mlieko, lesné ovocie, med."
      }]
    },
    obed: {
      gram: "Polievka 200ml · 250/150g",
      items: [{
        l: "A",
        t: "Kurací vývar · Kuracie soté so zeleninou, ryža",
        d: "Kurča, paprika, brokolica, cuketa, dusená ryža."
      }, {
        l: "B",
        t: "Kurací vývar · Šošovicový prívarok, vajce, chlieb",
        d: "Šošovica, vajce v cestíčku, celozrnný chlieb."
      }, {
        l: "V",
        t: "Zeleninová · Tofu so zeleninou, ryža",
        d: "Hľadkový tofu, paprika, mrkva, kel, ryža."
      }]
    },
    olovrant: {
      gram: "150 g",
      items: [{
        l: "A",
        t: "Ovocný šalát s tvarohom",
        d: "Jablko, hruška, banán, tvaroh, škorica."
      }]
    }
  }
}, {
  date: "ut, 27. máj",
  label: "Utorok",
  active: true,
  meals: {
    ranajky: {
      gram: "200/150 g",
      items: [{
        l: "A",
        t: "Ovsené vločky s jablkom",
        d: "Ovsené vločky, jablko, mlieko, škorica, hrozienka."
      }]
    },
    obed: {
      gram: "Polievka 200ml · 250/150g",
      items: [{
        l: "A",
        t: "Hrachová polievka · Hovädzí guláš, halušky",
        d: "Hovädzie pliecko, cibuľa, paprika, zemiakové halušky."
      }, {
        l: "B",
        t: "Hrachová · Cestoviny s tekvicou a fetou",
        d: "Penne, pečená tekvica hokkaido, feta syr, bylinky."
      }, {
        l: "V",
        t: "Hrachová · Šošovicové karbonátky, zemiaková kaša",
        d: "Červená šošovica, mrkva, ovos, kaša."
      }]
    },
    olovrant: {
      gram: "150 g",
      items: [{
        l: "A",
        t: "Domáce müsli tyčinky",
        d: "Ovsené vločky, med, sušené ovocie, slnečnica."
      }]
    }
  }
}, {
  date: "st, 28. máj",
  label: "Streda",
  meals: {
    ranajky: {
      gram: "200/150 g",
      items: [{
        l: "A",
        t: "Bryndzové nátierky",
        d: "Bryndza, smotana, žemľa, cherry paradajky."
      }]
    },
    obed: {
      gram: "Polievka 200ml · 250/150g",
      items: [{
        l: "A",
        t: "Špargľová · Pečené kuracie stehno, opekané zemiaky",
        d: "Kuracie stehno, rozmarín, zemiaky."
      }, {
        l: "B",
        t: "Špargľová · Špenátové gnocchi s parmezánom",
        d: "Špenátové gnocchi, parmezán, maslo."
      }, {
        l: "V",
        t: "Špargľová · Falafel, hummus, pita",
        d: "Cícer, sezam, koriander, pita chlieb."
      }]
    },
    olovrant: {
      gram: "150 g",
      items: [{
        l: "A",
        t: "Mliečne smoothie",
        d: "Mlieko, banán, lesné ovocie, ovsené vločky."
      }]
    }
  }
}];
function MenuScreen({
  navigate
}) {
  const [dayIdx, setDayIdx] = React.useState(1);
  const day = WEEK[dayIdx];
  return /*#__PURE__*/React.createElement("div", {
    className: "zp-app"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-pageheader"
  }, /*#__PURE__*/React.createElement("button", {
    className: "zp-iconbtn",
    onClick: () => navigate("home")
  }, /*#__PURE__*/React.createElement(MArrowLeft, {
    w: 18,
    sw: 2
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, "Jed\xE1lni\u010Dek"), /*#__PURE__*/React.createElement("p", null, "T\xFD\u017Ede\u0148 26. \u2013 30. m\xE1ja 2026"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      padding: "6px 20px 16px",
      overflowX: "auto"
    }
  }, WEEK.map((d, i) => /*#__PURE__*/React.createElement("button", {
    key: d.date,
    onClick: () => setDayIdx(i),
    className: "zp-pill " + (i === dayIdx ? "zp-pill--manual" : ""),
    style: {
      padding: "8px 14px",
      background: i === dayIdx ? "var(--green-700)" : "var(--bg-cream-warm)",
      color: i === dayIdx ? "var(--bg-cream)" : "var(--ink-2)",
      border: "1px solid " + (i === dayIdx ? "var(--green-700)" : "var(--line-soft)"),
      fontSize: 12,
      fontWeight: 600,
      cursor: "pointer",
      flexShrink: 0
    }
  }, d.label))), /*#__PURE__*/React.createElement("div", {
    className: "zp-menu-day"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-menu-day-head"
  }, /*#__PURE__*/React.createElement("h3", null, day.label), /*#__PURE__*/React.createElement("span", {
    className: "when"
  }, day.date)), /*#__PURE__*/React.createElement("div", {
    className: "zp-menu-meal"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-menu-meal-head"
  }, /*#__PURE__*/React.createElement(MCoffee, null), /*#__PURE__*/React.createElement("span", {
    className: "name"
  }, "Ra\u0148ajky"), /*#__PURE__*/React.createElement("span", {
    className: "gram"
  }, day.meals.ranajky.gram)), day.meals.ranajky.items.map((m, i) => /*#__PURE__*/React.createElement("div", {
    className: "zp-menu-item",
    key: i
  }, /*#__PURE__*/React.createElement("span", {
    className: "letter " + m.l.toLowerCase()
  }, m.l), /*#__PURE__*/React.createElement("div", {
    className: "body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ttl"
  }, m.t), /*#__PURE__*/React.createElement("div", {
    className: "desc"
  }, m.d))))), /*#__PURE__*/React.createElement("div", {
    className: "zp-menu-meal"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-menu-meal-head"
  }, /*#__PURE__*/React.createElement(MUtensils, null), /*#__PURE__*/React.createElement("span", {
    className: "name"
  }, "Obed"), /*#__PURE__*/React.createElement("span", {
    className: "gram"
  }, day.meals.obed.gram)), day.meals.obed.items.map((m, i) => /*#__PURE__*/React.createElement("div", {
    className: "zp-menu-item",
    key: i
  }, /*#__PURE__*/React.createElement("span", {
    className: "letter " + m.l.toLowerCase()
  }, m.l), /*#__PURE__*/React.createElement("div", {
    className: "body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ttl"
  }, m.t), /*#__PURE__*/React.createElement("div", {
    className: "desc"
  }, m.d), i === 1 && /*#__PURE__*/React.createElement("div", {
    className: "allergens"
  }, /*#__PURE__*/React.createElement("span", null, "1 lepok"), /*#__PURE__*/React.createElement("span", null, "3 vajce"), /*#__PURE__*/React.createElement("span", null, "7 mlieko")))))), /*#__PURE__*/React.createElement("div", {
    className: "zp-menu-meal"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-menu-meal-head"
  }, /*#__PURE__*/React.createElement(MApple, null), /*#__PURE__*/React.createElement("span", {
    className: "name"
  }, "Olovrant"), /*#__PURE__*/React.createElement("span", {
    className: "gram"
  }, day.meals.olovrant.gram)), day.meals.olovrant.items.map((m, i) => /*#__PURE__*/React.createElement("div", {
    className: "zp-menu-item",
    key: i
  }, /*#__PURE__*/React.createElement("span", {
    className: "letter " + m.l.toLowerCase()
  }, m.l), /*#__PURE__*/React.createElement("div", {
    className: "body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ttl"
  }, m.t), /*#__PURE__*/React.createElement("div", {
    className: "desc"
  }, m.d)))))));
}
window.MenuScreen = MenuScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/client_app/MenuScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/client_app/OrderScreen.jsx
try { (() => {
/* global React */
const {
  ArrowLeft: OArrowLeft,
  ChevronLeft: OChevronLeft,
  ChevronRight: OChevronRight,
  Coffee: OCoffee,
  Utensils: OUtensils,
  Apple: OApple,
  Calendar: OCalendar,
  Copy: OCopy,
  Trash: OTrash,
  FileCheck: OFileCheck,
  Lock: OLock,
  Eraser: OEraser,
  Plus: OPlus,
  Minus: OMinus,
  Sparkles: OSparkles,
  X: OX,
  Check: OCheck
} = window.ZpIcons;

/* ============================================================
 * OrderScreen — connected. Submit → success screen → home.
 *
 * Adds:
 *  - Top context strip "Na {datum} máte objednané N porcií"
 *  - Footer thank-you note "Ďakujeme za Vašu objednávku"
 *  - Real diet sheet open/close
 *  - Submit handler
 * ============================================================ */

function Counter({
  value,
  onChange,
  max = 99,
  plusActive = true
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "zp-counter"
  }, /*#__PURE__*/React.createElement("button", {
    disabled: value <= 0,
    "aria-label": "\u2212",
    onClick: () => onChange && onChange(Math.max(0, value - 1))
  }, /*#__PURE__*/React.createElement(OMinus, {
    w: 14,
    sw: 2.5
  })), /*#__PURE__*/React.createElement("span", {
    className: "count" + (value <= 0 ? " zero" : "")
  }, value), /*#__PURE__*/React.createElement("button", {
    className: "plus",
    disabled: !plusActive || value >= max,
    "aria-label": "+",
    onClick: () => onChange && onChange(Math.min(max, value + 1))
  }, /*#__PURE__*/React.createElement(OPlus, {
    w: 14,
    sw: 2.5
  })));
}
function MenuRow({
  name,
  value,
  onChange,
  withDiets,
  dietCount = 0,
  onOpenDiets
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "zp-menurow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "name"
  }, "Menu ", name), withDiets && /*#__PURE__*/React.createElement("button", {
    className: "diet-trigger",
    onClick: onOpenDiets
  }, /*#__PURE__*/React.createElement(OUtensils, {
    w: 10,
    sw: 2.5
  }), dietCount > 0 ? `${dietCount} diét` : "Diéty"), /*#__PURE__*/React.createElement("span", {
    className: "spacer"
  }), /*#__PURE__*/React.createElement(Counter, {
    value: value,
    onChange: onChange
  }));
}
function OrderScreen({
  navigate,
  params
}) {
  const day = params && params.day || "streda, 28. mája";
  const isToday = !!(params && params.today);

  // Local mutable counts
  const [counts, setCounts] = React.useState({
    bA: 8,
    // breakfast (one row)
    ms_A: 8,
    ms_B: 3,
    ms_V: 1,
    zam_A: 4,
    zam_B: 0
  });
  const [dietCount, setDietCount] = React.useState(2); // 2 diets on Menu A (MŠ)
  const [breakfastOn, setBreakfastOn] = React.useState(true);
  const [obedOn, setObedOn] = React.useState(true);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [diets, setDiets] = React.useState({
    vege: 1,
    nomilk: 1,
    nogluten: 0,
    nomilknogluten: 0,
    nono: 0
  });
  const total = (breakfastOn ? counts.bA : 0) + (obedOn ? counts.ms_A + counts.ms_B + counts.ms_V + counts.zam_A + counts.zam_B : 0);
  const sumDiets = Object.values(diets).reduce((a, b) => a + b, 0);
  function submit() {
    navigate("success", {
      day,
      total,
      dietCount: sumDiets || dietCount
    });
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "zp-app"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-orderpage"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-orderbar"
  }, /*#__PURE__*/React.createElement("button", {
    className: "zp-iconbtn",
    "aria-label": "Sp\xE4\u0165",
    onClick: () => navigate("home")
  }, /*#__PURE__*/React.createElement(OArrowLeft, {
    w: 18,
    sw: 2
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, "Objedn\xE1vka"), /*#__PURE__*/React.createElement("p", null, isToday ? "Detail dnešnej objednávky" : "Príprava na vybraný deň"))), /*#__PURE__*/React.createElement("div", {
    className: "zp-order-context"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ic"
  }, /*#__PURE__*/React.createElement(OCalendar, null)), /*#__PURE__*/React.createElement("div", {
    className: "body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, "Na ", day), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, "m\xE1te objednan\xE9 ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--green-700)"
    }
  }, total), " porci\xED"))), /*#__PURE__*/React.createElement("div", {
    className: "zp-daysel"
  }, /*#__PURE__*/React.createElement("button", {
    className: "zp-daysel-nav",
    "aria-label": "Predch\xE1dzaj\xFAci de\u0148"
  }, /*#__PURE__*/React.createElement(OChevronLeft, null)), /*#__PURE__*/React.createElement("div", {
    className: "zp-daysel-mid"
  }, /*#__PURE__*/React.createElement("span", {
    className: "eye"
  }, "D\xE1tum objedn\xE1vky"), /*#__PURE__*/React.createElement("h3", null, day)), /*#__PURE__*/React.createElement("button", {
    className: "zp-daysel-nav",
    "aria-label": "\u010Eal\u0161\xED de\u0148"
  }, /*#__PURE__*/React.createElement(OChevronRight, null))), /*#__PURE__*/React.createElement("div", {
    className: "zp-meal" + (breakfastOn ? " zp-meal--active" : "")
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-meal-head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-meal-icon"
  }, /*#__PURE__*/React.createElement(OCoffee, null)), /*#__PURE__*/React.createElement("div", {
    className: "zp-meal-title"
  }, "Ra\u0148ajky", /*#__PURE__*/React.createElement("span", {
    className: "zp-meal-sub"
  }, breakfastOn ? `${counts.bA} porcií` : "Vypnuté", " \xB7 term\xEDn 7:30")), /*#__PURE__*/React.createElement("div", {
    className: "zp-switch" + (breakfastOn ? " zp-switch--on" : ""),
    role: "switch",
    "aria-checked": breakfastOn,
    onClick: () => setBreakfastOn(!breakfastOn)
  })), breakfastOn && /*#__PURE__*/React.createElement("div", {
    className: "zp-meal-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-cat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-cat-head"
  }, "Matersk\xE1 \u0161kola"), /*#__PURE__*/React.createElement(MenuRow, {
    name: "A",
    value: counts.bA,
    onChange: v => setCounts({
      ...counts,
      bA: v
    })
  })))), /*#__PURE__*/React.createElement("div", {
    className: "zp-meal" + (obedOn ? " zp-meal--active" : "")
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-meal-head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-meal-icon"
  }, /*#__PURE__*/React.createElement(OUtensils, null)), /*#__PURE__*/React.createElement("div", {
    className: "zp-meal-title"
  }, "Obed", /*#__PURE__*/React.createElement("span", {
    className: "zp-meal-sub"
  }, obedOn ? `${counts.ms_A + counts.ms_B + counts.ms_V + counts.zam_A + counts.zam_B} porcií` : "Vypnuté", " \xB7 term\xEDn 10:00")), /*#__PURE__*/React.createElement("div", {
    className: "zp-switch" + (obedOn ? " zp-switch--on" : ""),
    role: "switch",
    "aria-checked": obedOn,
    onClick: () => setObedOn(!obedOn)
  })), obedOn && /*#__PURE__*/React.createElement("div", {
    className: "zp-meal-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-copybar"
  }, /*#__PURE__*/React.createElement("button", {
    className: "zp-btn zp-btn--secondary zp-btn--sm",
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(OCopy, {
    w: 12
  }), " Kop\xEDrova\u0165 z v\u010Deraj\u0161ka"), /*#__PURE__*/React.createElement("button", {
    className: "zp-btn zp-btn--danger zp-btn--sm",
    onClick: () => setCounts({
      ...counts,
      ms_A: 0,
      ms_B: 0,
      ms_V: 0,
      zam_A: 0,
      zam_B: 0
    })
  }, /*#__PURE__*/React.createElement(OTrash, {
    w: 12
  }), " Vymaza\u0165")), /*#__PURE__*/React.createElement("div", {
    className: "zp-cat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-cat-head"
  }, "Matersk\xE1 \u0161kola \xB7 3\u20136 rokov"), /*#__PURE__*/React.createElement(MenuRow, {
    name: "A",
    value: counts.ms_A,
    onChange: v => setCounts({
      ...counts,
      ms_A: v
    }),
    withDiets: true,
    dietCount: sumDiets || dietCount,
    onOpenDiets: () => setSheetOpen(true)
  }), /*#__PURE__*/React.createElement(MenuRow, {
    name: "B",
    value: counts.ms_B,
    onChange: v => setCounts({
      ...counts,
      ms_B: v
    })
  }), /*#__PURE__*/React.createElement(MenuRow, {
    name: "V",
    value: counts.ms_V,
    onChange: v => setCounts({
      ...counts,
      ms_V: v
    })
  })), /*#__PURE__*/React.createElement("div", {
    className: "zp-cat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-cat-head"
  }, "Zamestnanci"), /*#__PURE__*/React.createElement(MenuRow, {
    name: "A",
    value: counts.zam_A,
    onChange: v => setCounts({
      ...counts,
      zam_A: v
    })
  }), /*#__PURE__*/React.createElement(MenuRow, {
    name: "B",
    value: counts.zam_B,
    onChange: v => setCounts({
      ...counts,
      zam_B: v
    })
  })))), /*#__PURE__*/React.createElement("div", {
    className: "zp-meal zp-meal--locked"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-meal-head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-meal-icon"
  }, /*#__PURE__*/React.createElement(OApple, null)), /*#__PURE__*/React.createElement("div", {
    className: "zp-meal-title"
  }, "Olovrant", /*#__PURE__*/React.createElement("span", {
    className: "zp-meal-sub"
  }, "Term\xEDn uplynul o 9:00")), /*#__PURE__*/React.createElement("div", {
    className: "zp-switch",
    role: "switch",
    "aria-checked": "false",
    style: {
      opacity: 0.6
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "zp-banner zp-banner--locked",
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(OLock, null), " Term\xEDn uplynul \xB7 Objedn\xE1vka uzavret\xE1")), /*#__PURE__*/React.createElement("div", {
    className: "zp-summary"
  }, /*#__PURE__*/React.createElement("h3", null, /*#__PURE__*/React.createElement(OFileCheck, null), " R\xFDchle zhrnutie"), /*#__PURE__*/React.createElement("div", {
    className: "zp-summary-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "l"
  }, "D\xE1tum"), /*#__PURE__*/React.createElement("span", {
    className: "r",
    style: {
      textTransform: "capitalize"
    }
  }, day)), /*#__PURE__*/React.createElement("div", {
    className: "zp-summary-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "l"
  }, "Ra\u0148ajky"), /*#__PURE__*/React.createElement("span", {
    className: "r"
  }, breakfastOn ? counts.bA : "—")), /*#__PURE__*/React.createElement("div", {
    className: "zp-summary-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "l"
  }, "Obedy"), /*#__PURE__*/React.createElement("span", {
    className: "r"
  }, obedOn ? counts.ms_A + counts.ms_B + counts.ms_V + counts.zam_A + counts.zam_B : "—", (sumDiets || dietCount) > 0 && /*#__PURE__*/React.createElement("small", null, "(", sumDiets || dietCount, " di\xE9ty)"))), /*#__PURE__*/React.createElement("div", {
    className: "zp-summary-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "l"
  }, "Olovranty"), /*#__PURE__*/React.createElement("span", {
    className: "r",
    style: {
      color: "var(--ink-mute)"
    }
  }, "\u2014")), /*#__PURE__*/React.createElement("div", {
    className: "zp-summary-total"
  }, /*#__PURE__*/React.createElement("span", {
    className: "l"
  }, "Spolu porci\xED"), /*#__PURE__*/React.createElement("span", {
    className: "r"
  }, total, /*#__PURE__*/React.createElement("small", null, "ks"))), /*#__PURE__*/React.createElement("button", {
    className: "zp-btn zp-btn--primary zp-btn--block zp-btn--lg",
    onClick: submit
  }, "Odosla\u0165 objedn\xE1vku"), /*#__PURE__*/React.createElement("button", {
    className: "zp-btn zp-btn--danger zp-btn--block",
    style: {
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement(OEraser, {
    w: 14
  }), " Vynulova\u0165 objedn\xE1vku")), /*#__PURE__*/React.createElement("p", {
    className: "zp-thanks"
  }, "\u010Eakujeme za Va\u0161u objedn\xE1vku", /*#__PURE__*/React.createElement("small", null, "Posielame ju priamo do na\u0161ej kuchyne. Janka & Vlado"))), sheetOpen && /*#__PURE__*/React.createElement("div", {
    className: "zp-sheet-scrim",
    onClick: () => setSheetOpen(false)
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-sheet",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-sheet-grab"
  }), /*#__PURE__*/React.createElement("div", {
    className: "zp-sheet-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", null, "Di\xE9ty \xB7 Matersk\xE1 \u0161kola"), /*#__PURE__*/React.createElement("p", {
    className: "sub"
  }, "Dostupn\xE9: ", /*#__PURE__*/React.createElement("span", {
    className: "num"
  }, Math.max(0, counts.ms_A - sumDiets)), " z ", counts.ms_A, " porci\xED Menu A")), /*#__PURE__*/React.createElement("button", {
    className: "zp-sheet-close",
    "aria-label": "Zavrie\u0165",
    onClick: () => setSheetOpen(false)
  }, /*#__PURE__*/React.createElement(OX, null))), /*#__PURE__*/React.createElement("div", {
    className: "zp-sheet-body"
  }, [{
    k: "vege",
    l: "VEGE",
    s: "Vegetariánska"
  }, {
    k: "nomilk",
    l: "NO MILK",
    s: "Bez mliečnych výrobkov"
  }, {
    k: "nogluten",
    l: "NO GLUTEN",
    s: "Bezlepková"
  }, {
    k: "nomilknogluten",
    l: "NO MILK / NO GLUTEN",
    s: "Bez mlieka a lepku"
  }, {
    k: "nono",
    l: "NONONO",
    s: "Bez mlieka, lepku a vajec"
  }].map(d => /*#__PURE__*/React.createElement("div", {
    key: d.k,
    className: "zp-diet-row" + (diets[d.k] > 0 ? " active" : "")
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "zp-diet-label"
  }, d.l), /*#__PURE__*/React.createElement("span", {
    className: "sublabel"
  }, d.s)), /*#__PURE__*/React.createElement(Counter, {
    value: diets[d.k],
    onChange: v => setDiets({
      ...diets,
      [d.k]: v
    }),
    max: counts.ms_A
  })))), /*#__PURE__*/React.createElement("div", {
    className: "zp-sheet-foot"
  }, /*#__PURE__*/React.createElement("button", {
    className: "zp-btn zp-btn--primary zp-btn--block zp-btn--lg",
    onClick: () => setSheetOpen(false)
  }, /*#__PURE__*/React.createElement(OCheck, {
    w: 16
  }), " Hotovo")))));
}
window.OrderScreen = OrderScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/client_app/OrderScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/client_app/SettingsScreens.jsx
try { (() => {
/* global React */
const {
  ArrowLeft: STArrowLeft,
  ChevronRight: STChevronRight,
  User: STUser,
  Utensils: STUtensils,
  Apple: STApple,
  Bell: STBell,
  LogOut: STLogOut,
  Info: STInfo,
  Mail: STMail,
  Phone: STPhone,
  Users: STUsers,
  Lock: STLock,
  Book: STBook
} = window.ZpIcons;

/* ============================================================
 * Settings — landing page
 * ============================================================ */
function SettingsScreen({
  navigate
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "zp-app"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-pageheader"
  }, /*#__PURE__*/React.createElement("button", {
    className: "zp-iconbtn",
    onClick: () => navigate("home")
  }, /*#__PURE__*/React.createElement(STArrowLeft, {
    w: 18,
    sw: 2
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, "Nastavenia"), /*#__PURE__*/React.createElement("p", null, "\xDA\u010Det, povolen\xE9 porcie, di\xE9ty"))), /*#__PURE__*/React.createElement("div", {
    className: "zp-settings-section"
  }, /*#__PURE__*/React.createElement("h2", null, "\xDA\u010Det"), /*#__PURE__*/React.createElement("div", {
    className: "zp-settings-list"
  }, /*#__PURE__*/React.createElement("button", {
    className: "zp-settings-row",
    onClick: () => {}
  }, /*#__PURE__*/React.createElement("span", {
    className: "ic"
  }, /*#__PURE__*/React.createElement(STUser, null)), /*#__PURE__*/React.createElement("span", {
    className: "body"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ttl"
  }, "Janka L\xFAkov\xE1"), /*#__PURE__*/React.createElement("span", {
    className: "sub"
  }, "Matersk\xE1 \u0161kola L\xFAka"), /*#__PURE__*/React.createElement("span", {
    className: "sub"
  }, "janka@skolka-luka.sk")), /*#__PURE__*/React.createElement("span", {
    className: "chev"
  }, /*#__PURE__*/React.createElement(STChevronRight, {
    w: 18
  }))), /*#__PURE__*/React.createElement("button", {
    className: "zp-settings-row",
    onClick: () => {}
  }, /*#__PURE__*/React.createElement("span", {
    className: "ic"
  }, /*#__PURE__*/React.createElement(STBell, null)), /*#__PURE__*/React.createElement("span", {
    className: "body"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ttl"
  }, "Upozornenia"), /*#__PURE__*/React.createElement("span", {
    className: "sub"
  }, "Pripomienky a nede\u013En\xE9 notifik\xE1cie")), /*#__PURE__*/React.createElement("span", {
    className: "chev"
  }, /*#__PURE__*/React.createElement(STChevronRight, {
    w: 18
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "zp-settings-section"
  }, /*#__PURE__*/React.createElement("h2", null, "Stravovanie"), /*#__PURE__*/React.createElement("div", {
    className: "zp-settings-list"
  }, /*#__PURE__*/React.createElement("button", {
    className: "zp-settings-row",
    onClick: () => navigate("portions")
  }, /*#__PURE__*/React.createElement("span", {
    className: "ic"
  }, /*#__PURE__*/React.createElement(STUsers, null)), /*#__PURE__*/React.createElement("span", {
    className: "body"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ttl"
  }, "Dostupn\xE9 porcie"), /*#__PURE__*/React.createElement("span", {
    className: "sub"
  }, "3 typy \xB7 M\u0160, Z\u0160, Zamestnanci")), /*#__PURE__*/React.createElement("span", {
    className: "chev"
  }, /*#__PURE__*/React.createElement(STChevronRight, {
    w: 18
  }))), /*#__PURE__*/React.createElement("button", {
    className: "zp-settings-row",
    onClick: () => navigate("diets")
  }, /*#__PURE__*/React.createElement("span", {
    className: "ic"
  }, /*#__PURE__*/React.createElement(STApple, null)), /*#__PURE__*/React.createElement("span", {
    className: "body"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ttl"
  }, "Dostupn\xE9 di\xE9ty"), /*#__PURE__*/React.createElement("span", {
    className: "sub"
  }, "13 di\xE9t \xB7 popis a alerg\xE9ny")), /*#__PURE__*/React.createElement("span", {
    className: "chev"
  }, /*#__PURE__*/React.createElement(STChevronRight, {
    w: 18
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "zp-settings-section"
  }, /*#__PURE__*/React.createElement("h2", null, "Podpora"), /*#__PURE__*/React.createElement("div", {
    className: "zp-settings-list"
  }, /*#__PURE__*/React.createElement("button", {
    className: "zp-settings-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ic"
  }, /*#__PURE__*/React.createElement(STInfo, null)), /*#__PURE__*/React.createElement("span", {
    className: "body"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ttl"
  }, "O aplik\xE1cii"), /*#__PURE__*/React.createElement("span", {
    className: "sub"
  }, "Verzia 2.1 \xB7 Zdrav\xFD projekt s. r. o.")), /*#__PURE__*/React.createElement("span", {
    className: "chev"
  }, /*#__PURE__*/React.createElement(STChevronRight, {
    w: 18
  }))), /*#__PURE__*/React.createElement("button", {
    className: "zp-settings-row",
    onClick: () => navigate("login")
  }, /*#__PURE__*/React.createElement("span", {
    className: "ic",
    style: {
      background: "rgba(201,46,82,0.1)",
      color: "var(--coral-600)"
    }
  }, /*#__PURE__*/React.createElement(STLogOut, null)), /*#__PURE__*/React.createElement("span", {
    className: "body"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ttl",
    style: {
      color: "var(--coral-600)"
    }
  }, "Odhl\xE1si\u0165 sa"), /*#__PURE__*/React.createElement("span", {
    className: "sub"
  }, "Vr\xE1tite sa na prihl\xE1senie"))))));
}
window.SettingsScreen = SettingsScreen;

/* ============================================================
 * PortionsScreen — read-only allowed portion types
 * Configured by admin. Coefficients shown.
 * ============================================================ */
const PORTIONS = [{
  id: "ms",
  title: "Materská škola",
  desc: "Pre deti vo veku 3–6 rokov. Menšie porcie, jemnejšie korenenie, ovocie a zelenina krájané na drobno.",
  coef: 1.0
}, {
  id: "zs",
  title: "Základná škola",
  desc: "Pre deti vo veku 7–11 rokov. Stredne veľké porcie s vyššou energiou.",
  coef: 1.15
}, {
  id: "zam",
  title: "Zamestnanci",
  desc: "Dospelé porcie. Plnohodnotné množstvo, štandardné korenenie.",
  coef: 1.35
}];
function PortionsScreen({
  navigate
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "zp-app"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-pageheader"
  }, /*#__PURE__*/React.createElement("button", {
    className: "zp-iconbtn",
    onClick: () => navigate("settings")
  }, /*#__PURE__*/React.createElement(STArrowLeft, {
    w: 18,
    sw: 2
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, "Dostupn\xE9 porcie"), /*#__PURE__*/React.createElement("p", null, "3 typy aktivovan\xE9 pre v\xE1s"))), /*#__PURE__*/React.createElement("div", {
    className: "zp-readonly-banner"
  }, /*#__PURE__*/React.createElement(STLock, null), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("strong", null, "Iba na \u010D\xEDtanie."), " Povolen\xE9 typy porci\xED nastavujeme v Zdravom Bru\u0161ku. Ak chcete prida\u0165 alebo upravi\u0165 typ porcie, ozvite sa n\xE1m.")), PORTIONS.map(p => /*#__PURE__*/React.createElement("div", {
    className: "zp-portion-card",
    key: p.id
  }, /*#__PURE__*/React.createElement("div", {
    className: "ic"
  }, /*#__PURE__*/React.createElement(STUsers, null)), /*#__PURE__*/React.createElement("div", {
    className: "body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ttl"
  }, p.title), /*#__PURE__*/React.createElement("div", {
    className: "desc"
  }, p.desc), /*#__PURE__*/React.createElement("span", {
    className: "coef"
  }, "Koeficient \xB7 ", p.coef.toFixed(2), "\xD7 M\u0160")))), /*#__PURE__*/React.createElement("div", {
    className: "zp-contact-card"
  }, /*#__PURE__*/React.createElement("span", {
    className: "eye"
  }, "Potrebujete zmenu?"), /*#__PURE__*/React.createElement("h4", null, "Kontakt pre \xFApravu povolen\xFDch porci\xED"), /*#__PURE__*/React.createElement("p", null, "Pre roz\u0161\xEDrenie alebo zmenu typov porci\xED kontaktujte zodpovedn\xFA osobu v Zdravom projekte."), /*#__PURE__*/React.createElement("div", {
    className: "contact-row"
  }, /*#__PURE__*/React.createElement(STUser, {
    w: 14
  }), " Vlado Kov\xE1\u010D \xB7 prev\xE1dzkov\xFD riadite\u013E"), /*#__PURE__*/React.createElement("div", {
    className: "contact-row"
  }, /*#__PURE__*/React.createElement(STMail, {
    w: 14
  }), " vlado@zdravyprojekt.sk"), /*#__PURE__*/React.createElement("div", {
    className: "contact-row"
  }, /*#__PURE__*/React.createElement(STPhone, {
    w: 14
  }), " +421 905 123 456")));
}
window.PortionsScreen = PortionsScreen;

/* ============================================================
 * DietsScreen — read-only list of allowed diets w/ description
 * ============================================================ */
const DIETS = [{
  code: "VEGGIE",
  name: "Vegetariánska",
  desc: "Bez mäsa. Zachované mliečne výrobky a vajcia."
}, {
  code: "NO MILK",
  name: "Bez mliečnych výrobkov",
  desc: "Vynechané všetky mliečne výrobky, vrátane masla a smotany."
}, {
  code: "NO GLUTEN",
  name: "Bezlepková",
  desc: "Bez pšenice, žita, jačmeňa a ovsa. Vhodné pri celiakii."
}, {
  code: "NO MILK / NO GLUTEN",
  name: "Bez mlieka a lepku",
  desc: "Kombinácia oboch obmedzení."
}, {
  code: "NONONO",
  name: "Bez mlieka, lepku a vajec",
  desc: "Najprísnejší variant pri kombinovaných alergiách."
}, {
  code: "HISTAMIN",
  name: "Nízkohistamínová",
  desc: "Bez fermentovaných potravín a zrelých syrov."
}, {
  code: "NO ORECH",
  name: "Bez orechov",
  desc: "Vynechané všetky druhy orechov a arašidov."
}, {
  code: "NO PARADAJKA",
  name: "Bez paradajok",
  desc: "Bez paradajok v akejkoľvek forme (čerstvé, pretlak, omáčka)."
}, {
  code: "NO FISH",
  name: "Bez rýb",
  desc: "Bez rýb a morských plodov."
}, {
  code: "NO EGG",
  name: "Bez vajec",
  desc: "Vynechané vajcia aj ako prísada do cesta a omáčok."
}, {
  code: "NO ZEMIAK",
  name: "Bez zemiakov",
  desc: "Bez zemiakov v hlavnom jedle a prílohách."
}, {
  code: "NO SOJA",
  name: "Bez sóje",
  desc: "Bez sóje a sójových produktov."
}, {
  code: "NO ZELER",
  name: "Bez zeleru",
  desc: "Vynechaný zeler vo všetkých formách (vňať, hľuza, sušený)."
}];
function DietsScreen({
  navigate
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "zp-app"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-pageheader"
  }, /*#__PURE__*/React.createElement("button", {
    className: "zp-iconbtn",
    onClick: () => navigate("settings")
  }, /*#__PURE__*/React.createElement(STArrowLeft, {
    w: 18,
    sw: 2
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, "Dostupn\xE9 di\xE9ty"), /*#__PURE__*/React.createElement("p", null, DIETS.length, " di\xE9t \xB7 popis a alerg\xE9ny"))), /*#__PURE__*/React.createElement("div", {
    className: "zp-readonly-banner"
  }, /*#__PURE__*/React.createElement(STLock, null), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("strong", null, "Iba na \u010D\xEDtanie."), " Zoznam di\xE9t spravujeme v Zdravom Bru\u0161ku. Ak chcete prida\u0165 alebo upravi\u0165 di\xE9tu, ozvite sa n\xE1m.")), DIETS.map(d => /*#__PURE__*/React.createElement("div", {
    className: "zp-diet-readonly",
    key: d.code
  }, /*#__PURE__*/React.createElement("span", {
    className: "badge"
  }, d.code), /*#__PURE__*/React.createElement("div", {
    className: "body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "name"
  }, d.name), /*#__PURE__*/React.createElement("div", {
    className: "desc"
  }, d.desc)))), /*#__PURE__*/React.createElement("div", {
    className: "zp-contact-card"
  }, /*#__PURE__*/React.createElement("span", {
    className: "eye"
  }, "Ch\xFDba v\xE1m nie\u010Do?"), /*#__PURE__*/React.createElement("h4", null, "Kontakt pre pridanie / \xFApravu di\xE9ty"), /*#__PURE__*/React.createElement("p", null, "Ak potrebujete nov\xFA di\xE9tu, ktor\xE1 tu nie je, kontaktujte zodpovedn\xFA osobu."), /*#__PURE__*/React.createElement("div", {
    className: "contact-row"
  }, /*#__PURE__*/React.createElement(STUser, {
    w: 14
  }), " Janka Adamcov\xE1 \xB7 dietologi\u010Dka"), /*#__PURE__*/React.createElement("div", {
    className: "contact-row"
  }, /*#__PURE__*/React.createElement(STMail, {
    w: 14
  }), " janka@zdravyprojekt.sk"), /*#__PURE__*/React.createElement("div", {
    className: "contact-row"
  }, /*#__PURE__*/React.createElement(STPhone, {
    w: 14
  }), " +421 905 234 567")));
}
window.DietsScreen = DietsScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/client_app/SettingsScreens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/client_app/SuccessScreen.jsx
try { (() => {
/* global React */
const {
  Check: SCheck,
  Home: SHome,
  Calendar: SCalendar
} = window.ZpIcons;

/* ============================================================
 * SuccessScreen — confirmation after order submission.
 * ============================================================ */
function SuccessScreen({
  navigate,
  params
}) {
  const day = params && params.day || "streda, 28. mája";
  const total = params && params.total || 0;
  const dietCount = params && params.dietCount || 0;
  const [remaining, setRemaining] = React.useState(3);
  React.useEffect(() => {
    if (remaining <= 0) {
      navigate("home");
      return;
    }
    const t = setTimeout(() => setRemaining(remaining - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining]);
  return /*#__PURE__*/React.createElement("div", {
    className: "zp-app",
    style: {
      height: "100%"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "zp-success",
    style: {
      height: "100%"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "badge"
  }, /*#__PURE__*/React.createElement(SCheck, null)), /*#__PURE__*/React.createElement("h2", null, "Objedn\xE1vka odoslan\xE1"), /*#__PURE__*/React.createElement("p", null, "\u010Eakujeme za Va\u0161u objedn\xE1vku. Priprav\xEDme ju presne tak, ako ste si \u017Eelali."), /*#__PURE__*/React.createElement("div", {
    className: "receipt"
  }, /*#__PURE__*/React.createElement("div", {
    className: "when"
  }, day), /*#__PURE__*/React.createElement("div", {
    className: "chips"
  }, /*#__PURE__*/React.createElement("span", {
    className: "zp-mchip zp-mchip--lunch"
  }, total, " porci\xED"), dietCount > 0 && /*#__PURE__*/React.createElement("span", {
    className: "zp-mchip zp-mchip--olovrant"
  }, dietCount, " di\xE9ty"))), /*#__PURE__*/React.createElement("div", {
    className: "zp-success-actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "zp-btn zp-btn--primary zp-btn--block zp-btn--lg",
    onClick: () => navigate("home")
  }, /*#__PURE__*/React.createElement(SHome, {
    w: 16
  }), " Sp\xE4\u0165 na domov (", remaining, "s)"), /*#__PURE__*/React.createElement("button", {
    className: "zp-btn zp-btn--ghost zp-btn--block",
    onClick: () => {
      setRemaining(999);
      navigate("order", {
        day
      });
    }
  }, /*#__PURE__*/React.createElement(SCalendar, {
    w: 16
  }), " Zobrazi\u0165 objedn\xE1vku"))));
}
window.SuccessScreen = SuccessScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/client_app/SuccessScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/client_app/design-canvas.jsx
try { (() => {
// DesignCanvas.jsx — Figma-ish design canvas wrapper
// Warm gray grid bg + Sections + Artboards + PostIt notes.
// Artboards are reorderable (grip-drag), deletable, labels/titles are
// inline-editable, and any artboard can be opened in a fullscreen focus
// overlay (←/→/Esc). State persists to a .design-canvas.state.json sidecar
// via the host bridge. No assets, no deps.
//
// Usage:
//   <DesignCanvas>
//     <DCSection id="onboarding" title="Onboarding" subtitle="First-run variants">
//       <DCArtboard id="a" label="A · Dusk" width={260} height={480}>…</DCArtboard>
//       <DCArtboard id="b" label="B · Minimal" width={260} height={480}>…</DCArtboard>
//     </DCSection>
//   </DesignCanvas>

const DC = {
  bg: '#f0eee9',
  grid: 'rgba(0,0,0,0.06)',
  label: 'rgba(60,50,40,0.7)',
  title: 'rgba(40,30,20,0.85)',
  subtitle: 'rgba(60,50,40,0.6)',
  postitBg: '#fef4a8',
  postitText: '#5a4a2a',
  font: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'
};

// One-time CSS injection (classes are dc-prefixed so they don't collide with
// the hosted design's own styles).
if (typeof document !== 'undefined' && !document.getElementById('dc-styles')) {
  const s = document.createElement('style');
  s.id = 'dc-styles';
  s.textContent = ['.dc-editable{cursor:text;outline:none;white-space:nowrap;border-radius:3px;padding:0 2px;margin:0 -2px}', '.dc-editable:focus{background:#fff;box-shadow:0 0 0 1.5px #c96442}', '[data-dc-slot]{transition:transform .18s cubic-bezier(.2,.7,.3,1)}', '[data-dc-slot].dc-dragging{transition:none;z-index:10;pointer-events:none}', '[data-dc-slot].dc-dragging .dc-card{box-shadow:0 12px 40px rgba(0,0,0,.25),0 0 0 2px #c96442;transform:scale(1.02)}',
  // isolation:isolate contains artboard content's z-indexes so a
  // z-indexed child (sticky navbar etc.) can't paint over .dc-header or
  // the .dc-menu popover that drops into the top of the card.
  '.dc-card{isolation:isolate;transition:box-shadow .15s,transform .15s}', '.dc-card *{scrollbar-width:none}', '.dc-card *::-webkit-scrollbar{display:none}',
  // Per-artboard header: grip + label on the left, delete/expand on the
  // right. Single flex row; when the artboard's on-screen width is too
  // narrow for both the label yields (ellipsis, then hidden entirely below
  // ~4ch via the container query) and the buttons stay on the row.
  '.dc-header{position:absolute;bottom:100%;left:-4px;margin-bottom:calc(4px * var(--dc-inv-zoom,1));z-index:2;', '  display:flex;align-items:center;container-type:inline-size}', '.dc-labelrow{display:flex;align-items:center;gap:4px;height:24px;flex:1 1 auto;min-width:0}', '.dc-grip{flex:0 0 auto;cursor:grab;display:flex;align-items:center;padding:5px 4px;border-radius:4px;transition:background .12s,opacity .12s}', '.dc-grip:hover{background:rgba(0,0,0,.08)}', '.dc-grip:active{cursor:grabbing}', '.dc-labeltext{flex:1 1 auto;min-width:0;cursor:pointer;border-radius:4px;padding:3px 6px;', '  display:flex;align-items:center;transition:background .12s;overflow:hidden}',
  // Below ~4ch of label room: hide the label entirely, and drop the grip to
  // hover-only (same reveal rule as .dc-btns) so a narrow header is clean
  // until the card is moused.
  '@container (max-width: 110px){', '  .dc-labeltext{display:none}', '  .dc-grip{opacity:0}', '  [data-dc-slot]:hover .dc-grip{opacity:1}', '}', '.dc-labeltext:hover{background:rgba(0,0,0,.05)}', '.dc-labeltext .dc-editable{overflow:hidden;text-overflow:ellipsis;max-width:100%}', '.dc-labeltext .dc-editable:focus{overflow:visible;text-overflow:clip}', '.dc-btns{flex:0 0 auto;margin-left:auto;display:flex;gap:2px;opacity:0;transition:opacity .12s}', '[data-dc-slot]:hover .dc-btns,.dc-btns:has(.dc-menu){opacity:1}', '.dc-expand,.dc-kebab{width:22px;height:22px;border-radius:5px;border:none;cursor:pointer;padding:0;', '  background:transparent;color:rgba(60,50,40,.7);display:flex;align-items:center;justify-content:center;', '  font:inherit;transition:background .12s,color .12s}', '.dc-expand:hover,.dc-kebab:hover{background:rgba(0,0,0,.06);color:#2a251f}',
  // Slot hosting an open menu floats above later siblings (which otherwise
  // paint on top — same z-index:auto, later DOM order) so the popup isn't
  // clipped by the next card.
  '[data-dc-slot]:has(.dc-menu){z-index:10}', '.dc-menu{position:absolute;top:100%;right:0;margin-top:4px;background:#fff;border-radius:8px;', '  box-shadow:0 8px 28px rgba(0,0,0,.18),0 0 0 1px rgba(0,0,0,.05);padding:4px;min-width:160px;z-index:10}', '.dc-menu button{display:block;width:100%;padding:7px 10px;border:0;background:transparent;', '  border-radius:5px;font-family:inherit;font-size:13px;font-weight:500;line-height:1.2;', '  color:#29261b;cursor:pointer;text-align:left;transition:background .12s;white-space:nowrap}', '.dc-menu button:hover{background:rgba(0,0,0,.05)}', '.dc-menu hr{border:0;border-top:1px solid rgba(0,0,0,.08);margin:4px 2px}', '.dc-menu .dc-danger{color:#c96442}', '.dc-menu .dc-danger:hover{background:rgba(201,100,66,.1)}',
  // Chrome (titles / labels / buttons) counter-scales against the viewport
  // zoom so it stays a constant on-screen size. --dc-inv-zoom is set by
  // DCViewport on every transform update and inherits to all descendants —
  // any overlay inside the world (e.g. a TweaksPanel on an artboard) can use
  // it the same way.
  //
  // The header uses transform:scale (out-of-flow, so layout impact doesn't
  // matter) with its world-space width set to card-width / inv-zoom so that
  // after counter-scaling its on-screen width exactly matches the card's —
  // that's what lets the container query + text-overflow behave against the
  // card's visible edge at every zoom level.
  //
  // The section head uses CSS zoom instead of transform so its layout box
  // grows with the counter-scale, pushing the card row down — otherwise the
  // constant-screen-size title would overflow into the (shrinking) world-
  // space gap and overlap the artboard headers at low zoom.
  '.dc-header{width:calc((100% + 4px) / var(--dc-inv-zoom,1));', '  transform:scale(var(--dc-inv-zoom,1));transform-origin:bottom left}', '.dc-sectionhead{zoom:var(--dc-inv-zoom,1)}'].join('\n');
  document.head.appendChild(s);
}
const DCCtx = React.createContext(null);

// Recursively unwrap React.Fragment so <>…</> grouping doesn't hide
// DCSection/DCArtboard children from the type-based walks below.
function dcFlatten(children) {
  const out = [];
  React.Children.forEach(children, c => {
    if (c && c.type === React.Fragment) out.push(...dcFlatten(c.props.children));else out.push(c);
  });
  return out;
}

// ─────────────────────────────────────────────────────────────
// DesignCanvas — stateful wrapper around the pan/zoom viewport.
// Owns runtime state (per-section order, renamed titles/labels, hidden
// artboards, focused artboard). Order/titles/labels/hidden persist to a
// .design-canvas.state.json
// sidecar next to the HTML. Reads go via plain fetch() so the saved
// arrangement is visible anywhere the HTML + sidecar are served together
// (omelette preview, direct link, downloaded zip). Writes go through the
// host's window.omelette bridge — editing requires the omelette runtime.
// Focus is ephemeral.
// ─────────────────────────────────────────────────────────────
const DC_STATE_FILE = '.design-canvas.state.json';
function DesignCanvas({
  children,
  minScale,
  maxScale,
  style
}) {
  const [state, setState] = React.useState({
    sections: {},
    focus: null
  });
  // Hold rendering until the sidecar read settles so the saved order/titles
  // appear on first paint (no source-order flash). didRead gates writes until
  // the read settles so the empty initial state can't clobber a slow read;
  // skipNextWrite suppresses the one echo-write that would otherwise follow
  // hydration.
  const [ready, setReady] = React.useState(false);
  const didRead = React.useRef(false);
  const skipNextWrite = React.useRef(false);
  React.useEffect(() => {
    let off = false;
    fetch('./' + DC_STATE_FILE).then(r => r.ok ? r.json() : null).then(saved => {
      if (off || !saved || !saved.sections) return;
      skipNextWrite.current = true;
      setState(s => ({
        ...s,
        sections: saved.sections
      }));
    }).catch(() => {}).finally(() => {
      didRead.current = true;
      if (!off) setReady(true);
    });
    const t = setTimeout(() => {
      if (!off) setReady(true);
    }, 150);
    return () => {
      off = true;
      clearTimeout(t);
    };
  }, []);
  React.useEffect(() => {
    if (!didRead.current) return;
    if (skipNextWrite.current) {
      skipNextWrite.current = false;
      return;
    }
    const t = setTimeout(() => {
      window.omelette?.writeFile(DC_STATE_FILE, JSON.stringify({
        sections: state.sections
      })).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [state.sections]);

  // Build registries synchronously from children so FocusOverlay can read
  // them in the same render. Fragments are flattened; wrapping in other
  // elements still opts out of focus/reorder.
  const registry = {}; // slotId -> { sectionId, artboard }
  const sectionMeta = {}; // sectionId -> { title, subtitle, slotIds[] }
  const sectionOrder = [];
  dcFlatten(children).forEach(sec => {
    if (!sec || sec.type !== DCSection) return;
    const sid = sec.props.id ?? sec.props.title;
    if (!sid) return;
    sectionOrder.push(sid);
    const persisted = state.sections[sid] || {};
    const abs = [];
    dcFlatten(sec.props.children).forEach(ab => {
      if (!ab || ab.type !== DCArtboard) return;
      const aid = ab.props.id ?? ab.props.label;
      if (aid) abs.push([aid, ab]);
    });
    // hidden is scoped to one source revision — when the agent regenerates
    // (artboard-ID set changes), prior deletes don't apply to new content.
    const srcKey = abs.map(([k]) => k).join('\x1f');
    const hidden = persisted.srcKey === srcKey ? persisted.hidden || [] : [];
    const srcIds = [];
    abs.forEach(([aid, ab]) => {
      if (hidden.includes(aid)) return;
      registry[`${sid}/${aid}`] = {
        sectionId: sid,
        artboard: ab
      };
      srcIds.push(aid);
    });
    const kept = (persisted.order || []).filter(k => srcIds.includes(k));
    sectionMeta[sid] = {
      title: persisted.title ?? sec.props.title,
      subtitle: sec.props.subtitle,
      slotIds: [...kept, ...srcIds.filter(k => !kept.includes(k))]
    };
  });
  const api = React.useMemo(() => ({
    state,
    section: id => state.sections[id] || {},
    patchSection: (id, p) => setState(s => ({
      ...s,
      sections: {
        ...s.sections,
        [id]: {
          ...s.sections[id],
          ...(typeof p === 'function' ? p(s.sections[id] || {}) : p)
        }
      }
    })),
    setFocus: slotId => setState(s => ({
      ...s,
      focus: slotId
    }))
  }), [state]);

  // Esc exits focus; any outside pointerdown commits an in-progress rename.
  React.useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') api.setFocus(null);
    };
    const onPd = e => {
      const ae = document.activeElement;
      if (ae && ae.isContentEditable && !ae.contains(e.target)) ae.blur();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPd, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPd, true);
    };
  }, [api]);
  return /*#__PURE__*/React.createElement(DCCtx.Provider, {
    value: api
  }, /*#__PURE__*/React.createElement(DCViewport, {
    minScale: minScale,
    maxScale: maxScale,
    style: style
  }, ready && children), state.focus && registry[state.focus] && /*#__PURE__*/React.createElement(DCFocusOverlay, {
    entry: registry[state.focus],
    sectionMeta: sectionMeta,
    sectionOrder: sectionOrder
  }));
}

// ─────────────────────────────────────────────────────────────
// DCViewport — transform-based pan/zoom (internal)
//
// Input mapping (Figma-style):
//   • trackpad pinch  → zoom   (ctrlKey wheel; Safari gesture* events)
//   • trackpad scroll → pan    (two-finger)
//   • mouse wheel     → zoom   (notched; distinguished from trackpad scroll)
//   • middle-drag / primary-drag-on-bg → pan
//
// Transform state lives in a ref and is written straight to the DOM
// (translate3d + will-change) so wheel ticks don't go through React —
// keeps pans at 60fps on dense canvases.
// ─────────────────────────────────────────────────────────────
function DCViewport({
  children,
  minScale = 0.1,
  maxScale = 8,
  style = {}
}) {
  const vpRef = React.useRef(null);
  const worldRef = React.useRef(null);
  const tf = React.useRef({
    x: 0,
    y: 0,
    scale: 1
  });
  // Persist viewport across reloads so the user lands back where they were
  // after an agent edit or browser refresh. The sandbox origin is already
  // per-project; pathname keeps multiple canvas files in one project apart.
  const tfKey = 'dc-viewport:' + location.pathname;
  const saveT = React.useRef(0);
  const lastPostedScale = React.useRef();
  const apply = React.useCallback(() => {
    const {
      x,
      y,
      scale
    } = tf.current;
    const el = worldRef.current;
    if (!el) return;
    el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
    // Exposed for zoom-invariant chrome (labels, buttons, TweaksPanel).
    el.style.setProperty('--dc-inv-zoom', String(1 / scale));
    // Keep the host toolbar's % readout in sync with the canvas scale. Pan
    // ticks leave scale unchanged — skip the cross-frame post for those.
    if (lastPostedScale.current !== scale) {
      lastPostedScale.current = scale;
      window.parent.postMessage({
        type: '__dc_zoom',
        scale
      }, '*');
    }
    clearTimeout(saveT.current);
    saveT.current = setTimeout(() => {
      try {
        localStorage.setItem(tfKey, JSON.stringify(tf.current));
      } catch {}
    }, 200);
  }, [tfKey]);
  React.useLayoutEffect(() => {
    const flush = () => {
      clearTimeout(saveT.current);
      try {
        localStorage.setItem(tfKey, JSON.stringify(tf.current));
      } catch {}
    };
    try {
      const s = JSON.parse(localStorage.getItem(tfKey) || 'null');
      if (s && Number.isFinite(s.x) && Number.isFinite(s.y) && Number.isFinite(s.scale)) {
        tf.current = {
          x: s.x,
          y: s.y,
          scale: Math.min(maxScale, Math.max(minScale, s.scale))
        };
        apply();
      }
    } catch {}
    // Flush on pagehide and unmount so a reload within the 200ms debounce
    // window doesn't drop the last pan/zoom.
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, []);
  React.useEffect(() => {
    const vp = vpRef.current;
    if (!vp) return;
    const zoomAt = (cx, cy, factor) => {
      const r = vp.getBoundingClientRect();
      const px = cx - r.left,
        py = cy - r.top;
      const t = tf.current;
      const next = Math.min(maxScale, Math.max(minScale, t.scale * factor));
      const k = next / t.scale;
      // --dc-inv-zoom consumers (.dc-sectionhead's CSS zoom, each section's
      // marginBottom) reflow on every scale change, vertically shifting the
      // world layout — so a world point mathematically pinned under the cursor
      // drifts as you zoom (content creeps up on zoom-in, down on zoom-out).
      // Anchor the DOM element under the cursor instead: record its screen Y,
      // apply the transform + --dc-inv-zoom, then cancel whatever vertical
      // drift the reflow introduced so it stays put on screen.
      let marker = null,
        markerY0 = 0;
      if (k !== 1) {
        const hit = document.elementFromPoint(cx, cy);
        marker = hit && hit.closest ? hit.closest('[data-dc-slot],[data-dc-section]') : null;
        if (marker) markerY0 = marker.getBoundingClientRect().top;
      }
      // keep the world point under the cursor fixed
      t.x = px - (px - t.x) * k;
      t.y = py - (py - t.y) * k;
      t.scale = next;
      apply();
      if (marker) {
        // A pure zoom around (cx, cy) maps screen Y → cy + (Y - cy) * k. Any
        // departure after the --dc-inv-zoom reflow is the layout drift.
        const drift = marker.getBoundingClientRect().top - (cy + (markerY0 - cy) * k);
        if (Math.abs(drift) > 0.1) {
          t.y -= drift;
          apply();
        }
      }
    };

    // Mouse-wheel vs trackpad-scroll heuristic. A physical wheel sends
    // line-mode deltas (Firefox) or large integer pixel deltas with no X
    // component (Chrome/Safari, typically multiples of 100/120). Trackpad
    // two-finger scroll sends small/fractional pixel deltas, often with
    // non-zero deltaX. ctrlKey is set by the browser for trackpad pinch.
    const isMouseWheel = e => e.deltaMode !== 0 || e.deltaX === 0 && Number.isInteger(e.deltaY) && Math.abs(e.deltaY) >= 40;
    const onWheel = e => {
      e.preventDefault();
      if (isGesturing) return; // Safari: gesture* owns the pinch — discard concurrent wheels
      if ((e.ctrlKey || e.metaKey) && !isMouseWheel(e)) {
        // trackpad pinch, or ctrl/cmd + smooth-scroll mouse. Notched
        // wheels fall through to the fixed-step branch below.
        zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.01));
      } else if (isMouseWheel(e)) {
        // notched mouse wheel — fixed-ratio step per click
        zoomAt(e.clientX, e.clientY, Math.exp(-Math.sign(e.deltaY) * 0.18));
      } else {
        // trackpad two-finger scroll — pan
        tf.current.x -= e.deltaX;
        tf.current.y -= e.deltaY;
        apply();
      }
    };

    // Safari sends native gesture* events for trackpad pinch with a smooth
    // e.scale; preferring these over the ctrl+wheel fallback gives a much
    // better feel there. No-ops on other browsers. Safari also fires
    // ctrlKey wheel events during the same pinch — isGesturing makes
    // onWheel drop those entirely so they neither zoom nor pan.
    let gsBase = 1;
    let isGesturing = false;
    const onGestureStart = e => {
      e.preventDefault();
      isGesturing = true;
      gsBase = tf.current.scale;
    };
    const onGestureChange = e => {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, gsBase * e.scale / tf.current.scale);
    };
    const onGestureEnd = e => {
      e.preventDefault();
      isGesturing = false;
    };

    // Drag-pan: middle button anywhere, or primary button on canvas
    // background (anything that isn't an artboard or an inline editor).
    let drag = null;
    const onPointerDown = e => {
      const onBg = !e.target.closest('[data-dc-slot], .dc-editable');
      if (!(e.button === 1 || e.button === 0 && onBg)) return;
      e.preventDefault();
      vp.setPointerCapture(e.pointerId);
      drag = {
        id: e.pointerId,
        lx: e.clientX,
        ly: e.clientY
      };
      vp.style.cursor = 'grabbing';
    };
    const onPointerMove = e => {
      if (!drag || e.pointerId !== drag.id) return;
      tf.current.x += e.clientX - drag.lx;
      tf.current.y += e.clientY - drag.ly;
      drag.lx = e.clientX;
      drag.ly = e.clientY;
      apply();
    };
    const onPointerUp = e => {
      if (!drag || e.pointerId !== drag.id) return;
      vp.releasePointerCapture(e.pointerId);
      drag = null;
      vp.style.cursor = '';
    };

    // Host-driven zoom (toolbar % menu). Zooms around viewport centre so the
    // visible midpoint stays fixed — matching the host's iframe-zoom feel.
    const onHostMsg = e => {
      const d = e.data;
      if (d && d.type === '__dc_set_zoom' && typeof d.scale === 'number') {
        const r = vp.getBoundingClientRect();
        zoomAt(r.left + r.width / 2, r.top + r.height / 2, d.scale / tf.current.scale);
      } else if (d && d.type === '__dc_probe') {
        // Host's [readyGen] reset asks whether a canvas is present; it
        // fires on the iframe's native 'load', which for canvases with
        // images/fonts is after our mount-time announce, so re-announce.
        // Clear the pan-tick guard so apply() re-posts the current scale
        // even if it's unchanged — the host just reset dcScale to 1.
        window.parent.postMessage({
          type: '__dc_present'
        }, '*');
        lastPostedScale.current = undefined;
        apply();
      }
    };
    window.addEventListener('message', onHostMsg);
    // Announce canvas mode so the host toolbar proxies its % control here
    // instead of scaling the iframe element (which would just shrink the
    // viewport window of an infinite canvas). The apply() that follows emits
    // the initial __dc_zoom so the toolbar % is correct before first pinch.
    // lastPostedScale reset mirrors the __dc_probe handler: the layout
    // effect's restore-path apply() may already have posted the restored
    // scale (before __dc_present), so clear the guard to re-post it in order.
    window.parent.postMessage({
      type: '__dc_present'
    }, '*');
    lastPostedScale.current = undefined;
    apply();
    vp.addEventListener('wheel', onWheel, {
      passive: false
    });
    vp.addEventListener('gesturestart', onGestureStart, {
      passive: false
    });
    vp.addEventListener('gesturechange', onGestureChange, {
      passive: false
    });
    vp.addEventListener('gestureend', onGestureEnd, {
      passive: false
    });
    vp.addEventListener('pointerdown', onPointerDown);
    vp.addEventListener('pointermove', onPointerMove);
    vp.addEventListener('pointerup', onPointerUp);
    vp.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('message', onHostMsg);
      vp.removeEventListener('wheel', onWheel);
      vp.removeEventListener('gesturestart', onGestureStart);
      vp.removeEventListener('gesturechange', onGestureChange);
      vp.removeEventListener('gestureend', onGestureEnd);
      vp.removeEventListener('pointerdown', onPointerDown);
      vp.removeEventListener('pointermove', onPointerMove);
      vp.removeEventListener('pointerup', onPointerUp);
      vp.removeEventListener('pointercancel', onPointerUp);
    };
  }, [apply, minScale, maxScale]);
  const gridSvg = `url("data:image/svg+xml,%3Csvg width='120' height='120' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M120 0H0v120' fill='none' stroke='${encodeURIComponent(DC.grid)}' stroke-width='1'/%3E%3C/svg%3E")`;
  return /*#__PURE__*/React.createElement("div", {
    ref: vpRef,
    className: "design-canvas",
    style: {
      height: '100vh',
      width: '100vw',
      background: DC.bg,
      overflow: 'hidden',
      overscrollBehavior: 'none',
      touchAction: 'none',
      position: 'relative',
      fontFamily: DC.font,
      boxSizing: 'border-box',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: worldRef,
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      transformOrigin: '0 0',
      willChange: 'transform',
      width: 'max-content',
      minWidth: '100%',
      minHeight: '100%',
      padding: '60px 0 80px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: -6000,
      backgroundImage: gridSvg,
      backgroundSize: '120px 120px',
      pointerEvents: 'none',
      zIndex: -1
    }
  }), children));
}

// ─────────────────────────────────────────────────────────────
// DCSection — editable title + h-row of artboards in persisted order
// ─────────────────────────────────────────────────────────────
function DCSection({
  id,
  title,
  subtitle,
  children,
  gap = 48
}) {
  const ctx = React.useContext(DCCtx);
  const sid = id ?? title;
  const all = React.Children.toArray(dcFlatten(children));
  const artboards = all.filter(c => c && c.type === DCArtboard);
  const rest = all.filter(c => !(c && c.type === DCArtboard));
  const sec = ctx && sid && ctx.section(sid) || {};
  // Must match DesignCanvas's srcKey computation exactly (it filters falsy
  // IDs), or onDelete persists a srcKey that DesignCanvas never recognizes.
  const allIds = artboards.map(a => a.props.id ?? a.props.label).filter(Boolean);
  const srcKey = allIds.join('\x1f');
  const hidden = sec.srcKey === srcKey ? sec.hidden || [] : [];
  const srcOrder = allIds.filter(k => !hidden.includes(k));
  const order = React.useMemo(() => {
    const kept = (sec.order || []).filter(k => srcOrder.includes(k));
    return [...kept, ...srcOrder.filter(k => !kept.includes(k))];
  }, [sec.order, srcOrder.join('|')]);
  const byId = Object.fromEntries(artboards.map(a => [a.props.id ?? a.props.label, a]));

  // marginBottom counter-scales so the on-screen gap between sections stays
  // constant — otherwise at low zoom the (world-space) gap collapses while
  // the screen-constant sectionhead below it doesn't, and the title reads as
  // belonging to the section above. paddingBottom below is just enough for
  // the 24px artboard-header (abs-positioned above each card) plus ~8px, so
  // the title sits tight against its own row at every zoom.
  return /*#__PURE__*/React.createElement("div", {
    "data-dc-section": sid,
    style: {
      marginBottom: 'calc(80px * var(--dc-inv-zoom, 1))',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 60px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "dc-sectionhead",
    style: {
      paddingBottom: 36
    }
  }, /*#__PURE__*/React.createElement(DCEditable, {
    tag: "div",
    value: sec.title ?? title,
    onChange: v => ctx && sid && ctx.patchSection(sid, {
      title: v
    }),
    style: {
      fontSize: 28,
      fontWeight: 600,
      color: DC.title,
      letterSpacing: -0.4,
      marginBottom: 6,
      display: 'inline-block'
    }
  }), subtitle && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      color: DC.subtitle
    }
  }, subtitle))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap,
      padding: '0 60px',
      alignItems: 'flex-start',
      width: 'max-content'
    }
  }, order.map(k => /*#__PURE__*/React.createElement(DCArtboardFrame, {
    key: k,
    sectionId: sid,
    artboard: byId[k],
    order: order,
    label: (sec.labels || {})[k] ?? byId[k].props.label,
    onRename: v => ctx && ctx.patchSection(sid, x => ({
      labels: {
        ...x.labels,
        [k]: v
      }
    })),
    onReorder: next => ctx && ctx.patchSection(sid, {
      order: next
    }),
    onDelete: () => ctx && ctx.patchSection(sid, x => ({
      hidden: [...(x.srcKey === srcKey ? x.hidden || [] : []), k],
      srcKey
    })),
    onFocus: () => ctx && ctx.setFocus(`${sid}/${k}`)
  }))), rest);
}

// DCArtboard — marker; rendered by DCArtboardFrame via DCSection.
function DCArtboard() {
  return null;
}

// Per-artboard export (kind: 'png' | 'html'). Both paths share the same
// self-contained clone: computed styles baked in, @font-face / <img> /
// inline-style background-image urls inlined as data URIs. PNG wraps the
// clone in foreignObject→canvas at 3× the artboard's natural width×height
// (same pipeline the host uses for page captures); HTML wraps it in a
// minimal standalone document. Both are independent of viewport zoom.
async function dcExport(node, w, h, name, kind) {
  try {
    await document.fonts.ready;
  } catch {}
  const toDataURL = url => fetch(url).then(r => r.blob()).then(b => new Promise(res => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = () => res(url);
    fr.readAsDataURL(b);
  })).catch(() => url);

  // Collect @font-face rules. ss.cssRules throws SecurityError on
  // cross-origin sheets (e.g. fonts.googleapis.com) — in that case fetch
  // the CSS text directly (those endpoints send ACAO:*) and regex-extract
  // the blocks. @import and @media/@supports are walked so nested
  // @font-face rules aren't missed.
  const fontRules = [],
    pending = [],
    seen = new Set();
  const scrapeCss = href => {
    if (seen.has(href)) return;
    seen.add(href);
    pending.push(fetch(href).then(r => r.text()).then(css => {
      for (const m of css.match(/@font-face\s*{[^}]*}/g) || []) fontRules.push({
        css: m,
        base: href
      });
      for (const m of css.matchAll(/@import\s+(?:url\()?['"]?([^'")\s;]+)/g)) scrapeCss(new URL(m[1], href).href);
    }).catch(() => {}));
  };
  const walk = (rules, base) => {
    for (const r of rules) {
      if (r.type === CSSRule.FONT_FACE_RULE) fontRules.push({
        css: r.cssText,
        base
      });else if (r.type === CSSRule.IMPORT_RULE && r.styleSheet) {
        const ibase = r.styleSheet.href || base;
        try {
          walk(r.styleSheet.cssRules, ibase);
        } catch {
          scrapeCss(ibase);
        }
      } else if (r.cssRules) walk(r.cssRules, base);
    }
  };
  for (const ss of document.styleSheets) {
    const base = ss.href || location.href;
    try {
      walk(ss.cssRules, base);
    } catch {
      if (ss.href) scrapeCss(ss.href);
    }
  }
  while (pending.length) await pending.shift();
  const fontCss = (await Promise.all(fontRules.map(async rule => {
    let out = rule.css,
      m;
    const re = /url\((['"]?)([^'")]+)\1\)/g;
    while (m = re.exec(rule.css)) {
      if (m[2].indexOf('data:') === 0) continue;
      let abs;
      try {
        abs = new URL(m[2], rule.base).href;
      } catch {
        continue;
      }
      out = out.split(m[0]).join('url("' + (await toDataURL(abs)) + '")');
    }
    return out;
  }))).join('\n');
  const cloneStyled = src => {
    if (src.nodeType === 8 || src.nodeType === 1 && src.tagName === 'SCRIPT') return document.createTextNode('');
    const dst = src.cloneNode(false);
    if (src.nodeType === 1) {
      const cs = getComputedStyle(src);
      let txt = '';
      for (let i = 0; i < cs.length; i++) txt += cs[i] + ':' + cs.getPropertyValue(cs[i]) + ';';
      dst.setAttribute('style', txt + 'animation:none;transition:none;');
      if (src.tagName === 'CANVAS') try {
        const im = document.createElement('img');
        im.src = src.toDataURL();
        im.setAttribute('style', txt);
        return im;
      } catch {}
    }
    for (let c = src.firstChild; c; c = c.nextSibling) dst.appendChild(cloneStyled(c));
    return dst;
  };
  const clone = cloneStyled(node);
  clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  // Drop the card's own shadow/radius so the export is a flush w×h rect;
  // the artboard's own background (if any) is already in the computed style.
  clone.style.boxShadow = 'none';
  clone.style.borderRadius = '0';
  const jobs = [];
  clone.querySelectorAll('img').forEach(el => {
    const s = el.getAttribute('src');
    if (s && s.indexOf('data:') !== 0) jobs.push(toDataURL(el.src).then(d => el.setAttribute('src', d)));
  });
  [clone, ...clone.querySelectorAll('*')].forEach(el => {
    const bg = el.style.backgroundImage;
    if (!bg) return;
    let m;
    const re = /url\(["']?([^"')]+)["']?\)/g;
    while (m = re.exec(bg)) {
      const tok = m[0],
        url = m[1];
      if (url.indexOf('data:') === 0) continue;
      jobs.push(toDataURL(url).then(d => {
        el.style.backgroundImage = el.style.backgroundImage.split(tok).join('url("' + d + '")');
      }));
    }
  });
  await Promise.all(jobs);
  const xml = new XMLSerializer().serializeToString(clone);
  const save = (blob, ext) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name + '.' + ext;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  if (kind === 'html') {
    const html = '<!doctype html><html><head><meta charset="utf-8"><title>' + name + '</title>' + (fontCss ? '<style>' + fontCss + '</style>' : '') + '</head><body style="margin:0">' + xml + '</body></html>';
    return save(new Blob([html], {
      type: 'text/html'
    }), 'html');
  }

  // PNG: the SVG's own width/height must be the output resolution — an
  // <img>-loaded SVG rasterizes at its intrinsic size, so sizing it at 1×
  // and ctx.scale()-ing up would just upscale a 1× bitmap. viewBox maps the
  // w×h foreignObject onto the px·w × px·h SVG canvas so the browser renders
  // the HTML at full resolution.
  const px = 3;
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w * px + '" height="' + h * px + '" viewBox="0 0 ' + w + ' ' + h + '"><foreignObject width="' + w + '" height="' + h + '">' + (fontCss ? '<style><![CDATA[' + fontCss + ']]></style>' : '') + xml + '</foreignObject></svg>';
  const img = new Image();
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = () => rej(new Error('svg load failed'));
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
  const cv = document.createElement('canvas');
  cv.width = w * px;
  cv.height = h * px;
  cv.getContext('2d').drawImage(img, 0, 0);
  cv.toBlob(blob => save(blob, 'png'), 'image/png');
}
function DCArtboardFrame({
  sectionId,
  artboard,
  label,
  order,
  onRename,
  onReorder,
  onFocus,
  onDelete
}) {
  const {
    id: rawId,
    label: rawLabel,
    width = 260,
    height = 480,
    children,
    style = {}
  } = artboard.props;
  const id = rawId ?? rawLabel;
  const ref = React.useRef(null);
  const cardRef = React.useRef(null);
  const menuRef = React.useRef(null);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);

  // ⋯ menu: close on any outside pointerdown. Two-click delete lives inside
  // the menu — first click arms the row, second commits; closing disarms.
  React.useEffect(() => {
    if (!menuOpen) {
      setConfirming(false);
      return;
    }
    const off = e => {
      if (!menuRef.current || !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', off, true);
    return () => document.removeEventListener('pointerdown', off, true);
  }, [menuOpen]);
  const doExport = kind => {
    setMenuOpen(false);
    if (!cardRef.current) return;
    const name = String(label || id || 'artboard').replace(/[^\w\s.-]+/g, '_');
    dcExport(cardRef.current, width, height, name, kind).catch(e => console.error('[design-canvas] export failed:', e));
  };

  // Live drag-reorder: dragged card sticks to cursor; siblings slide into
  // their would-be slots in real time via transforms. DOM order only
  // changes on drop.
  const onGripDown = e => {
    e.preventDefault();
    e.stopPropagation();
    const me = ref.current;
    // translateX is applied in local (pre-scale) space but pointer deltas and
    // getBoundingClientRect().left are screen-space — divide by the viewport's
    // current scale so the dragged card tracks the cursor at any zoom level.
    const scale = me.getBoundingClientRect().width / me.offsetWidth || 1;
    const peers = Array.from(document.querySelectorAll(`[data-dc-section="${sectionId}"] [data-dc-slot]`));
    const homes = peers.map(el => ({
      el,
      id: el.dataset.dcSlot,
      x: el.getBoundingClientRect().left
    }));
    const slotXs = homes.map(h => h.x);
    const startIdx = order.indexOf(id);
    const startX = e.clientX;
    let liveOrder = order.slice();
    me.classList.add('dc-dragging');
    const layout = () => {
      for (const h of homes) {
        if (h.id === id) continue;
        const slot = liveOrder.indexOf(h.id);
        h.el.style.transform = `translateX(${(slotXs[slot] - h.x) / scale}px)`;
      }
    };
    const move = ev => {
      const dx = ev.clientX - startX;
      me.style.transform = `translateX(${dx / scale}px)`;
      const cur = homes[startIdx].x + dx;
      let nearest = 0,
        best = Infinity;
      for (let i = 0; i < slotXs.length; i++) {
        const d = Math.abs(slotXs[i] - cur);
        if (d < best) {
          best = d;
          nearest = i;
        }
      }
      if (liveOrder.indexOf(id) !== nearest) {
        liveOrder = order.filter(k => k !== id);
        liveOrder.splice(nearest, 0, id);
        layout();
      }
    };
    const up = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      const finalSlot = liveOrder.indexOf(id);
      me.classList.remove('dc-dragging');
      me.style.transform = `translateX(${(slotXs[finalSlot] - homes[startIdx].x) / scale}px)`;
      // After the settle transition, kill transitions + clear transforms +
      // commit the reorder in the same frame so there's no visual snap-back.
      setTimeout(() => {
        for (const h of homes) {
          h.el.style.transition = 'none';
          h.el.style.transform = '';
        }
        if (liveOrder.join('|') !== order.join('|')) onReorder(liveOrder);
        requestAnimationFrame(() => requestAnimationFrame(() => {
          for (const h of homes) h.el.style.transition = '';
        }));
      }, 180);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement("div", {
    ref: ref,
    "data-dc-slot": id,
    style: {
      position: 'relative',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "dc-header",
    "data-omelette-chrome": "",
    style: {
      color: DC.label
    },
    onPointerDown: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "dc-labelrow"
  }, /*#__PURE__*/React.createElement("div", {
    className: "dc-grip",
    onPointerDown: onGripDown,
    title: "Drag to reorder"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "9",
    height: "13",
    viewBox: "0 0 9 13",
    fill: "currentColor"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "2",
    cy: "2",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "7",
    cy: "2",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "2",
    cy: "6.5",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "7",
    cy: "6.5",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "2",
    cy: "11",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "7",
    cy: "11",
    r: "1.1"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "dc-labeltext",
    onClick: onFocus,
    title: "Click to focus"
  }, /*#__PURE__*/React.createElement(DCEditable, {
    value: label,
    onChange: onRename,
    onClick: e => e.stopPropagation(),
    style: {
      fontSize: 15,
      fontWeight: 500,
      color: DC.label,
      lineHeight: 1
    }
  }))), /*#__PURE__*/React.createElement("div", {
    className: "dc-btns"
  }, /*#__PURE__*/React.createElement("div", {
    ref: menuRef,
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "dc-kebab",
    title: "More",
    onClick: () => setMenuOpen(o => !o)
  }, /*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "12",
    viewBox: "0 0 12 12",
    fill: "currentColor"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "2.5",
    cy: "6",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "6",
    cy: "6",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "9.5",
    cy: "6",
    r: "1.1"
  }))), menuOpen && /*#__PURE__*/React.createElement("div", {
    className: "dc-menu",
    onPointerDown: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => doExport('png')
  }, "Download PNG"), /*#__PURE__*/React.createElement("button", {
    onClick: () => doExport('html')
  }, "Download HTML"), /*#__PURE__*/React.createElement("hr", null), /*#__PURE__*/React.createElement("button", {
    className: "dc-danger",
    onClick: () => {
      if (confirming) {
        setMenuOpen(false);
        onDelete();
      } else setConfirming(true);
    }
  }, confirming ? 'Click again to delete' : 'Delete'))), /*#__PURE__*/React.createElement("button", {
    className: "dc-expand",
    onClick: onFocus,
    title: "Focus"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "12",
    viewBox: "0 0 12 12",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.6",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M7 1h4v4M5 11H1V7M11 1L7.5 4.5M1 11l3.5-3.5"
  }))))), /*#__PURE__*/React.createElement("div", {
    ref: cardRef,
    className: "dc-card",
    style: {
      borderRadius: 2,
      boxShadow: '0 1px 3px rgba(0,0,0,.08),0 4px 16px rgba(0,0,0,.06)',
      overflow: 'hidden',
      width,
      height,
      background: '#fff',
      ...style
    }
  }, children || /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#bbb',
      fontSize: 13,
      fontFamily: DC.font
    }
  }, id)));
}

// Inline rename — commits on blur or Enter.
function DCEditable({
  value,
  onChange,
  style,
  tag = 'span',
  onClick
}) {
  const T = tag;
  return /*#__PURE__*/React.createElement(T, {
    className: "dc-editable",
    contentEditable: true,
    suppressContentEditableWarning: true,
    onClick: onClick,
    onPointerDown: e => e.stopPropagation(),
    onBlur: e => onChange && onChange(e.currentTarget.textContent),
    onKeyDown: e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.currentTarget.blur();
      }
    },
    style: style
  }, value);
}

// ─────────────────────────────────────────────────────────────
// Focus mode — overlay one artboard; ←/→ within section, ↑/↓ across
// sections, Esc or backdrop click to exit.
// ─────────────────────────────────────────────────────────────
function DCFocusOverlay({
  entry,
  sectionMeta,
  sectionOrder
}) {
  const ctx = React.useContext(DCCtx);
  const {
    sectionId,
    artboard
  } = entry;
  const sec = ctx.section(sectionId);
  const meta = sectionMeta[sectionId];
  const peers = meta.slotIds;
  const aid = artboard.props.id ?? artboard.props.label;
  const idx = peers.indexOf(aid);
  const secIdx = sectionOrder.indexOf(sectionId);
  const go = d => {
    const n = peers[(idx + d + peers.length) % peers.length];
    if (n) ctx.setFocus(`${sectionId}/${n}`);
  };
  const goSection = d => {
    // Sections whose artboards are all deleted have slotIds:[] — step past
    // them to the next non-empty section so ↑/↓ doesn't dead-end.
    const n = sectionOrder.length;
    for (let i = 1; i < n; i++) {
      const ns = sectionOrder[((secIdx + d * i) % n + n) % n];
      const first = sectionMeta[ns] && sectionMeta[ns].slotIds[0];
      if (first) {
        ctx.setFocus(`${ns}/${first}`);
        return;
      }
    }
  };
  React.useEffect(() => {
    const k = e => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        go(-1);
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        go(1);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        goSection(-1);
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        goSection(1);
      }
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  });
  const {
    width = 260,
    height = 480,
    children
  } = artboard.props;
  const [vp, setVp] = React.useState({
    w: window.innerWidth,
    h: window.innerHeight
  });
  React.useEffect(() => {
    const r = () => setVp({
      w: window.innerWidth,
      h: window.innerHeight
    });
    window.addEventListener('resize', r);
    return () => window.removeEventListener('resize', r);
  }, []);
  const scale = Math.max(0.1, Math.min((vp.w - 200) / width, (vp.h - 260) / height, 2));
  const [ddOpen, setDd] = React.useState(false);
  const Arrow = ({
    dir,
    onClick
  }) => /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      onClick();
    },
    style: {
      position: 'absolute',
      top: '50%',
      [dir]: 28,
      transform: 'translateY(-50%)',
      border: 'none',
      background: 'rgba(255,255,255,.08)',
      color: 'rgba(255,255,255,.9)',
      width: 44,
      height: 44,
      borderRadius: 22,
      fontSize: 18,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background .15s'
    },
    onMouseEnter: e => e.currentTarget.style.background = 'rgba(255,255,255,.18)',
    onMouseLeave: e => e.currentTarget.style.background = 'rgba(255,255,255,.08)'
  }, /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 18 18",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: dir === 'left' ? 'M11 3L5 9l6 6' : 'M7 3l6 6-6 6'
  })));

  // Portal to body so position:fixed is the real viewport regardless of any
  // transform on DesignCanvas's ancestors (including the canvas zoom itself).
  return ReactDOM.createPortal(/*#__PURE__*/React.createElement("div", {
    onClick: () => ctx.setFocus(null),
    onWheel: e => e.preventDefault(),
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      background: 'rgba(24,20,16,.6)',
      backdropFilter: 'blur(14px)',
      fontFamily: DC.font,
      color: '#fff'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 72,
      display: 'flex',
      alignItems: 'flex-start',
      padding: '16px 20px 0',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setDd(o => !o),
    style: {
      border: 'none',
      background: 'transparent',
      color: '#fff',
      cursor: 'pointer',
      padding: '6px 8px',
      borderRadius: 6,
      textAlign: 'left',
      fontFamily: 'inherit'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 18,
      fontWeight: 600,
      letterSpacing: -0.3
    }
  }, meta.title), /*#__PURE__*/React.createElement("svg", {
    width: "11",
    height: "11",
    viewBox: "0 0 11 11",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    style: {
      opacity: .7
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M2 4l3.5 3.5L9 4"
  }))), meta.subtitle && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 13,
      opacity: .6,
      fontWeight: 400,
      marginTop: 2
    }
  }, meta.subtitle)), ddOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: '100%',
      left: 0,
      marginTop: 4,
      background: '#2a251f',
      borderRadius: 8,
      boxShadow: '0 8px 32px rgba(0,0,0,.4)',
      padding: 4,
      minWidth: 200,
      zIndex: 10
    }
  }, sectionOrder.filter(sid => sectionMeta[sid].slotIds.length).map(sid => /*#__PURE__*/React.createElement("button", {
    key: sid,
    onClick: () => {
      setDd(false);
      const f = sectionMeta[sid].slotIds[0];
      if (f) ctx.setFocus(`${sid}/${f}`);
    },
    style: {
      display: 'block',
      width: '100%',
      textAlign: 'left',
      border: 'none',
      cursor: 'pointer',
      background: sid === sectionId ? 'rgba(255,255,255,.1)' : 'transparent',
      color: '#fff',
      padding: '8px 12px',
      borderRadius: 5,
      fontSize: 14,
      fontWeight: sid === sectionId ? 600 : 400,
      fontFamily: 'inherit'
    }
  }, sectionMeta[sid].title)))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => ctx.setFocus(null),
    onMouseEnter: e => e.currentTarget.style.background = 'rgba(255,255,255,.12)',
    onMouseLeave: e => e.currentTarget.style.background = 'transparent',
    style: {
      border: 'none',
      background: 'transparent',
      color: 'rgba(255,255,255,.7)',
      width: 32,
      height: 32,
      borderRadius: 16,
      fontSize: 20,
      cursor: 'pointer',
      lineHeight: 1,
      transition: 'background .12s'
    }
  }, "\xD7")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 64,
      bottom: 56,
      left: 100,
      right: 100,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      width: width * scale,
      height: height * scale,
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width,
      height,
      transform: `scale(${scale})`,
      transformOrigin: 'top left',
      background: '#fff',
      borderRadius: 2,
      overflow: 'hidden',
      boxShadow: '0 20px 80px rgba(0,0,0,.4)'
    }
  }, children || /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#bbb'
    }
  }, aid))), /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      fontSize: 14,
      fontWeight: 500,
      opacity: .85,
      textAlign: 'center'
    }
  }, (sec.labels || {})[aid] ?? artboard.props.label, /*#__PURE__*/React.createElement("span", {
    style: {
      opacity: .5,
      marginLeft: 10,
      fontVariantNumeric: 'tabular-nums'
    }
  }, idx + 1, " / ", peers.length))), /*#__PURE__*/React.createElement(Arrow, {
    dir: "left",
    onClick: () => go(-1)
  }), /*#__PURE__*/React.createElement(Arrow, {
    dir: "right",
    onClick: () => go(1)
  }), /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      position: 'absolute',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: 8
    }
  }, peers.map((p, i) => /*#__PURE__*/React.createElement("button", {
    key: p,
    onClick: () => ctx.setFocus(`${sectionId}/${p}`),
    style: {
      border: 'none',
      padding: 0,
      cursor: 'pointer',
      width: 6,
      height: 6,
      borderRadius: 3,
      background: i === idx ? '#fff' : 'rgba(255,255,255,.3)'
    }
  })))), document.body);
}

// ─────────────────────────────────────────────────────────────
// Post-it — absolute-positioned sticky note
// ─────────────────────────────────────────────────────────────
function DCPostIt({
  children,
  top,
  left,
  right,
  bottom,
  rotate = -2,
  width = 180
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top,
      left,
      right,
      bottom,
      width,
      background: DC.postitBg,
      padding: '14px 16px',
      fontFamily: '"Comic Sans MS", "Marker Felt", "Segoe Print", cursive',
      fontSize: 14,
      lineHeight: 1.4,
      color: DC.postitText,
      boxShadow: '0 2px 8px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',
      transform: `rotate(${rotate}deg)`,
      zIndex: 5
    }
  }, children);
}
Object.assign(window, {
  DesignCanvas,
  DCSection,
  DCArtboard,
  DCPostIt
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/client_app/design-canvas.jsx", error: String((e && e.message) || e) }); }

// ui_kits/client_app/icons.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* global React */
// Small set of lucide-style icons used across the client screens.

const Icon = ({
  d,
  w = 20,
  sw = 1.8,
  fill = "none"
}) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 24 24",
  width: w,
  height: w,
  fill: fill,
  stroke: "currentColor",
  strokeWidth: sw,
  strokeLinecap: "round",
  strokeLinejoin: "round"
}, /*#__PURE__*/React.createElement("path", {
  d: d
}));
window.ZpIcons = {
  User: p => /*#__PURE__*/React.createElement(Icon, _extends({}, p, {
    d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
  })),
  Settings: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
  })),
  Plus: p => /*#__PURE__*/React.createElement(Icon, _extends({}, p, {
    d: "M12 5v14 M5 12h14"
  })),
  Minus: p => /*#__PURE__*/React.createElement(Icon, _extends({}, p, {
    d: "M5 12h14"
  })),
  Calendar: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "4",
    width: "18",
    height: "18",
    rx: "2",
    ry: "2"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "16",
    y1: "2",
    x2: "16",
    y2: "6"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "8",
    y1: "2",
    x2: "8",
    y2: "6"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "3",
    y1: "10",
    x2: "21",
    y2: "10"
  })),
  CalendarDays: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "4",
    width: "18",
    height: "18",
    rx: "2"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "16",
    y1: "2",
    x2: "16",
    y2: "6"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "8",
    y1: "2",
    x2: "8",
    y2: "6"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "3",
    y1: "10",
    x2: "21",
    y2: "10"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "8",
    y1: "14",
    x2: "8.01",
    y2: "14"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "14",
    x2: "12.01",
    y2: "14"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "16",
    y1: "14",
    x2: "16.01",
    y2: "14"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "8",
    y1: "18",
    x2: "8.01",
    y2: "18"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "18",
    x2: "12.01",
    y2: "18"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "16",
    y1: "18",
    x2: "16.01",
    y2: "18"
  })),
  Clock: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "12 6 12 12 16 14"
  })),
  History: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3 3v5h5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 7v5l4 2"
  })),
  Coffee: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M17 8h1a4 4 0 1 1 0 8h-1"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "6",
    y1: "2",
    x2: "6",
    y2: "4"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "10",
    y1: "2",
    x2: "10",
    y2: "4"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "14",
    y1: "2",
    x2: "14",
    y2: "4"
  })),
  Utensils: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M3 2v7c0 1.1.9 2 2 2h0a2 2 0 0 0 2-2V2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5 11v11"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M14 21V7c0-3 2-5 5-5v19"
  })),
  Apple: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M19 12.5C19 15.5 17 19 14.5 19c-1.5 0-2-1-2.5-1s-1 1-2.5 1C7 19 5 15.5 5 12.5 5 9.5 7 7 9.5 7c1.5 0 2 1 2.5 1s1-1 2.5-1C17 7 19 9.5 19 12.5z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 8c-.5-1.5 0-3 2-4"
  })),
  ArrowLeft: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 2,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("line", {
    x1: "19",
    y1: "12",
    x2: "5",
    y2: "12"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "12 19 5 12 12 5"
  })),
  ChevronLeft: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 2,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "15 18 9 12 15 6"
  })),
  ChevronRight: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 2,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "9 18 15 12 9 6"
  })),
  Bot: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "11",
    width: "18",
    height: "10",
    rx: "2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "5",
    r: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 7v4"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "8",
    y1: "16",
    x2: "8",
    y2: "16"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "16",
    y1: "16",
    x2: "16",
    y2: "16"
  })),
  PenLine: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 20h9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
  })),
  XCircle: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "15",
    y1: "9",
    x2: "9",
    y2: "15"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "9",
    y1: "9",
    x2: "15",
    y2: "15"
  })),
  Lock: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "11",
    width: "18",
    height: "11",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M7 11V7a5 5 0 0 1 10 0v4"
  })),
  X: p => /*#__PURE__*/React.createElement(Icon, _extends({}, p, {
    d: "M18 6L6 18 M6 6l12 12",
    sw: 2
  })),
  Check: p => /*#__PURE__*/React.createElement(Icon, _extends({}, p, {
    d: "M20 6L9 17l-5-5",
    sw: 2
  })),
  Copy: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "9",
    y: "9",
    width: "13",
    height: "13",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
  })),
  Trash: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "3 6 5 6 21 6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
  })),
  Eraser: p => /*#__PURE__*/React.createElement(Icon, _extends({}, p, {
    d: "M20 20H8 M14.85 4.85l4.3 4.3a2 2 0 0 1 0 2.83L9.42 21.7a2 2 0 0 1-2.83 0l-4.3-4.3a2 2 0 0 1 0-2.83L12 4.85a2 2 0 0 1 2.83 0z"
  })),
  FileCheck: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "14 2 14 8 20 8"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9 14l2 2 4-4"
  })),
  Sparkles: p => /*#__PURE__*/React.createElement(Icon, _extends({}, p, {
    d: "M12 3v3 M12 18v3 M3 12h3 M18 12h3 M5.6 5.6l2.1 2.1 M16.3 16.3l2.1 2.1 M5.6 18.4l2.1-2.1 M16.3 7.7l2.1-2.1",
    sw: 2
  })),
  Mail: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "22,6 12,13 2,6"
  })),
  KeyRound: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M2 18v3h3l3-3v-2h2v-2h2l1.4-1.4a6 6 0 1 1 2.6-2.6L2 18z"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "16.5",
    cy: "7.5",
    r: "1.5"
  })),
  Sprout: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M7 20h10"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M10 20c5.5-2.5.8-6.4 3-10"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"
  })),
  Home: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "9 22 9 12 15 12 15 22"
  })),
  Book: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"
  })),
  Info: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "16",
    x2: "12",
    y2: "12"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "8",
    x2: "12.01",
    y2: "8"
  })),
  Phone: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72a2 2 0 0 1 1.72 2z"
  })),
  Users: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "9",
    cy: "7",
    r: "4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M23 21v-2a4 4 0 0 0-3-3.87"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M16 3.13a4 4 0 0 1 0 7.75"
  })),
  Bell: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M10.3 21a1.94 1.94 0 0 0 3.4 0"
  })),
  LogOut: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "16 17 21 12 16 7"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "21",
    y1: "12",
    x2: "9",
    y2: "12"
  })),
  Eye: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "3"
  })),
  PartyPopper: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p?.w || 20,
    height: p?.w || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p?.sw || 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M5.8 11.3 2 22l10.7-3.8"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M4 3h.01"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M22 8h.01"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M15 2h.01"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M22 20h.01"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M22 2 12.5 11.5 13 13"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M11 13l7 7"
  }))
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/client_app/icons.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Audiences.jsx
try { (() => {
// Audiences.jsx — "Pre koho je Zdravý projekt?"
const Audiences = () => {
  const cards = [{
    badge: "B2B",
    title: "Škôlky a detské zariadenia",
    body: "Zabezpečujeme kompletné denné stravovanie — desiatu, obed aj olovrant. Jedlá pripravujeme tak, aby spĺňali nutričné potreby detí v rôznom veku.",
    cta: "Objednávka pre škôlky",
    accent: "var(--peach-400)",
    tint: "var(--bg-cream-warm)"
  }, {
    badge: "D2C",
    title: "Rodiny a jednotlivci",
    body: "Ponúkame zdravé obedy, hotové jedlá a špeciálne diétne riešenia, ktoré šetria čas a zároveň podporujú zdravie celej rodiny.",
    cta: "Objednávky pre domácnosti",
    accent: "var(--green-400)",
    tint: "var(--bg-cream-soft)"
  }];
  return /*#__PURE__*/React.createElement("section", {
    id: "audiences",
    style: {
      padding: "80px 48px",
      maxWidth: 1280,
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      marginBottom: 56
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 13,
      fontWeight: 600,
      color: "var(--green-600)",
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      marginBottom: 12
    }
  }, "Pre koho var\xEDme"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: "clamp(32px, 4vw, 56px)",
      color: "var(--green-900)",
      margin: 0,
      textWrap: "balance"
    }
  }, "Pre koho je Zdrav\xFD projekt?")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 24
    }
  }, cards.map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      background: c.tint,
      borderRadius: 32,
      padding: 40,
      boxShadow: "var(--shadow-sm)",
      display: "flex",
      flexDirection: "column",
      gap: 20,
      position: "relative",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: -40,
      right: -40,
      width: 180,
      height: 180,
      background: c.accent,
      borderRadius: "50%",
      opacity: 0.5
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 11,
      fontWeight: 700,
      color: "var(--green-700)",
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      background: "var(--bg-cream)",
      display: "inline-block",
      padding: "6px 12px",
      borderRadius: 999,
      alignSelf: "flex-start",
      position: "relative"
    }
  }, c.badge), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 36,
      lineHeight: 1.1,
      color: "var(--green-900)",
      margin: 0,
      position: "relative",
      maxWidth: "16ch"
    }
  }, c.title), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 16,
      lineHeight: 1.6,
      color: "var(--ink-2)",
      margin: 0,
      position: "relative"
    }
  }, c.body), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 14,
      fontWeight: 600,
      color: "var(--green-700)",
      textDecoration: "underline",
      textDecorationColor: "var(--peach-500)",
      textDecorationThickness: 2,
      textUnderlineOffset: 4,
      position: "relative",
      alignSelf: "flex-start"
    }
  }, c.cta, " \u2192")))));
};
Object.assign(window, {
  Audiences
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Audiences.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/DietPicker.jsx
try { (() => {
// DietPicker.jsx — 7 diet chips with a preview pane
const DIETS = [{
  id: "KLASIK",
  color: "var(--green-600)",
  fg: "#fff",
  note: "Klasické vyvážené menu — pestré, sezónne a chutné jedlá pre väčšinu detí."
}, {
  id: "VEGE",
  color: "var(--green-400)",
  fg: "var(--green-900)",
  note: "Vegetariánske varianty — bez mäsa, plné rastlinných bielkovín, strukovín a obilnín."
}, {
  id: "NO MILK",
  color: "var(--peach-400)",
  fg: "var(--green-900)",
  note: "Bez mliečnych výrobkov — pre deti s laktózovou intoleranciou alebo alergiou."
}, {
  id: "NO MILK / NO GLUTEN",
  color: "var(--honey-400)",
  fg: "var(--green-900)",
  note: "Dvojnásobne čisté: bez mlieka a bez lepku — pre deti s kombinovanou diétou."
}, {
  id: "NO GLUTEN",
  color: "var(--orange-500)",
  fg: "#fff",
  note: "Bezlepkové menu pripravené v oddelenom režime, aby sme úplne predišli kontaminácii."
}, {
  id: "NONONO",
  color: "var(--coral-600)",
  fg: "#fff",
  note: "Bez mlieka, bez lepku, bez vajec — najprísnejšia diéta v ponuke."
}, {
  id: "MONTE",
  color: "var(--teal-500)",
  fg: "#fff",
  note: "Špeciálne menu pre Montessori škôlky — pestrá, sezónna strava s dôrazom na samostatnosť detí."
}];
const DietPicker = () => {
  const [active, setActive] = React.useState(0);
  const a = DIETS[active];
  return /*#__PURE__*/React.createElement("section", {
    id: "diets",
    style: {
      padding: "80px 48px",
      background: "var(--bg-cream-soft)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1280,
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      marginBottom: 48,
      maxWidth: 720,
      margin: "0 auto 48px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 13,
      fontWeight: 600,
      color: "var(--green-600)",
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      marginBottom: 12
    }
  }, "Di\xE9ty pre \u0161k\xF4lky"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: "clamp(28px, 3.2vw, 44px)",
      color: "var(--green-900)",
      margin: 0,
      textWrap: "balance",
      lineHeight: 1.15
    }
  }, "Pon\xFAkame viacero typov di\xE9t pre \u0161k\xF4lky, aby ka\u017Ed\xE9 die\u0165a dostalo stravu prisp\xF4soben\xFA jeho potreb\xE1m.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 10,
      justifyContent: "center",
      marginBottom: 40
    }
  }, DIETS.map((d, i) => {
    const isActive = i === active;
    return /*#__PURE__*/React.createElement("button", {
      key: d.id,
      onClick: () => setActive(i),
      style: {
        background: isActive ? d.color : "var(--bg-cream)",
        color: isActive ? d.fg : "var(--green-800)",
        border: "none",
        borderRadius: 999,
        padding: "10px 20px",
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: "0.08em",
        cursor: "pointer",
        boxShadow: isActive ? "var(--shadow-sm)" : "none",
        transform: isActive ? "scale(1.04)" : "scale(1)",
        transition: "all 200ms ease"
      }
    }, d.id);
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--bg-cream-warm)",
      borderRadius: 32,
      padding: 40,
      boxShadow: "var(--shadow-md)",
      display: "grid",
      gridTemplateColumns: "1fr 1.4fr",
      gap: 40,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-block",
      background: a.color,
      color: a.fg,
      padding: "10px 24px",
      borderRadius: 999,
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 16,
      letterSpacing: "0.08em",
      marginBottom: 20
    }
  }, a.id), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 30,
      color: "var(--green-900)",
      margin: "0 0 16px",
      lineHeight: 1.2
    }
  }, "5-t\xFD\u017Ed\u0148ov\xFD pl\xE1n"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 16,
      lineHeight: 1.6,
      color: "var(--ink-2)",
      margin: "0 0 24px"
    }
  }, a.note), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 14,
      fontWeight: 600,
      color: "var(--green-700)",
      textDecoration: "underline",
      textDecorationColor: "var(--peach-500)",
      textDecorationThickness: 2,
      textUnderlineOffset: 4
    }
  }, "Stiahnu\u0165 5-t\xFD\u017Ed\u0148ov\xE9 menu (PDF) \u2192")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--bg-cream)",
      borderRadius: 22,
      padding: 24,
      aspectRatio: "16 / 11",
      display: "grid",
      gridTemplateColumns: "auto repeat(5, 1fr)",
      gridTemplateRows: "auto repeat(3, 1fr)",
      gap: 6,
      fontFamily: "var(--font-display)",
      fontSize: 11,
      color: "var(--green-800)"
    }
  }, /*#__PURE__*/React.createElement("div", null), ["Po", "Ut", "St", "Št", "Pi"].map(d => /*#__PURE__*/React.createElement("div", {
    key: d,
    style: {
      textAlign: "center",
      fontWeight: 700,
      letterSpacing: "0.06em",
      paddingBottom: 4
    }
  }, d)), ["Desiata", "Obed", "Olovrant"].map((meal, r) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: meal
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      color: "var(--ink-3)",
      display: "flex",
      alignItems: "center"
    }
  }, meal), [0, 1, 2, 3, 4].map(c => /*#__PURE__*/React.createElement("div", {
    key: c,
    style: {
      background: r === 1 ? a.color : `color-mix(in oklab, ${a.color} ${20 + (r * 5 + c) % 4 * 8}%, var(--bg-cream-soft))`,
      opacity: r === 1 ? 0.92 : 0.7,
      borderRadius: 10,
      minHeight: 36
    }
  }))))))));
};
Object.assign(window, {
  DietPicker
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/DietPicker.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Footer.jsx
try { (() => {
// Footer.jsx — about + contact + sub-brand chips
const Footer = () => /*#__PURE__*/React.createElement("footer", {
  style: {
    background: "var(--green-900)",
    color: "var(--bg-cream)",
    padding: "80px 48px 32px"
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    maxWidth: 1280,
    margin: "0 auto"
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr",
    gap: 64,
    marginBottom: 56
  }
}, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
  style: {
    fontFamily: "var(--font-marker)",
    fontSize: 36,
    color: "var(--bg-cream)",
    marginBottom: 18,
    lineHeight: 1
  }
}, "zdrav\xFD projekt"), /*#__PURE__*/React.createElement("h3", {
  style: {
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    fontSize: 26,
    color: "var(--bg-cream)",
    margin: "0 0 16px",
    lineHeight: 1.2
  }
}, "O n\xE1s"), /*#__PURE__*/React.createElement("p", {
  style: {
    fontFamily: "var(--font-sans)",
    fontSize: 15,
    lineHeight: 1.7,
    color: "rgba(251,247,228,0.78)",
    margin: "0 0 24px",
    maxWidth: "44ch"
  }
}, "Spojili sme to najlep\u0161ie z dvoch siln\xFDch zna\u010Diek, ktor\xE9 ste si ob\u013E\xFAbili, aby sme v\xE1m mohli prin\xE1\u0161a\u0165 e\u0161te viac kvality, odbornosti a starostlivosti o zdrav\xFA stravu va\u0161ich det\xED."), /*#__PURE__*/React.createElement("a", {
  href: "#",
  style: {
    fontFamily: "var(--font-display)",
    fontWeight: 600,
    fontSize: 14,
    color: "var(--peach-400)",
    textDecoration: "underline",
    textDecorationColor: "var(--peach-500)",
    textDecorationThickness: 2,
    textUnderlineOffset: 4
  }
}, "Viac o n\xE1s \u2192")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
  style: {
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    fontSize: 18,
    color: "var(--bg-cream)",
    margin: "0 0 18px"
  }
}, "Kontakt"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontFamily: "var(--font-sans)",
    fontSize: 15,
    lineHeight: 1.7,
    color: "rgba(251,247,228,0.78)"
  }
}, "Zdrav\xFD projekt s. r. o.", /*#__PURE__*/React.createElement("br", null), "\u010Eumbierska 11884/3G", /*#__PURE__*/React.createElement("br", null), "831 01 Bratislava", /*#__PURE__*/React.createElement("br", null))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
  style: {
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    fontSize: 18,
    color: "var(--bg-cream)",
    margin: "0 0 18px"
  }
}, "P\xF4vodn\xE9 zna\u010Dky"), /*#__PURE__*/React.createElement("div", {
  style: {
    display: "flex",
    flexDirection: "column",
    gap: 10
  }
}, /*#__PURE__*/React.createElement("a", {
  href: "https://zdravebrusko.sk",
  style: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "rgba(251,247,228,0.06)",
    padding: "10px 14px",
    borderRadius: 14,
    textDecoration: "none",
    color: "var(--bg-cream)"
  }
}, /*#__PURE__*/React.createElement("span", {
  style: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "var(--coral-logo)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "var(--font-marker)",
    fontSize: 16,
    color: "#fff"
  }
}, "z"), /*#__PURE__*/React.createElement("span", {
  style: {
    fontFamily: "var(--font-sans)",
    fontSize: 14
  }
}, "zdravebrusko.sk")), /*#__PURE__*/React.createElement("a", {
  href: "https://zdravy-dom.sk",
  style: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "rgba(251,247,228,0.06)",
    padding: "10px 14px",
    borderRadius: 14,
    textDecoration: "none",
    color: "var(--bg-cream)"
  }
}, /*#__PURE__*/React.createElement("span", {
  style: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "var(--green-logo)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "var(--font-marker)",
    fontSize: 16,
    color: "#fff"
  }
}, "z"), /*#__PURE__*/React.createElement("span", {
  style: {
    fontFamily: "var(--font-sans)",
    fontSize: 14
  }
}, "zdravy-dom.sk"))))), /*#__PURE__*/React.createElement("div", {
  style: {
    borderTop: "1px solid rgba(251,247,228,0.12)",
    paddingTop: 24,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 16,
    fontFamily: "var(--font-sans)",
    fontSize: 13,
    color: "rgba(251,247,228,0.5)"
  }
}, /*#__PURE__*/React.createElement("span", null, "\xA9 2026 zdravyprojekt.sk \xB7 V\u0161etky pr\xE1va vyhraden\xE9."), /*#__PURE__*/React.createElement("div", {
  style: {
    display: "flex",
    gap: 22
  }
}, /*#__PURE__*/React.createElement("a", {
  href: "#",
  style: {
    color: "rgba(251,247,228,0.62)",
    textDecoration: "none"
  }
}, "GDPR"), /*#__PURE__*/React.createElement("a", {
  href: "#",
  style: {
    color: "rgba(251,247,228,0.62)",
    textDecoration: "none"
  }
}, "Cookies")))));
Object.assign(window, {
  Footer
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Footer.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Founders.jsx
try { (() => {
// Founders.jsx — Janka & Vlado quotes
const Founders = () => {
  const founders = [{
    name: "Janka",
    role: "spoluzakladateľka · šéfkuchárka",
    initial: "J",
    bg: "var(--peach-400)",
    quote: "Chceme, aby deťom chutilo zdravé jedlo a vytvorili si pozitívny vzťah ku pestrej, sezónnej a lokálnej strave."
  }, {
    name: "Vlado",
    role: "spoluzakladateľ · prevádzka",
    initial: "V",
    bg: "var(--green-400)",
    quote: "Staráme sa o zdravé brušká vašich detí. Deti majú v našich jedlách každý deň dostatok čerstvej zeleniny a ovocia."
  }];
  return /*#__PURE__*/React.createElement("section", {
    id: "founders",
    style: {
      padding: "100px 48px",
      maxWidth: 1280,
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      marginBottom: 64
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 13,
      fontWeight: 600,
      color: "var(--green-600)",
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      marginBottom: 12
    }
  }, "O zakladate\u013Eoch"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: "clamp(32px, 3.6vw, 48px)",
      color: "var(--green-900)",
      margin: 0
    }
  }, "Dva hlasy, jedna kuchy\u0148a.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 32
    }
  }, founders.map(f => /*#__PURE__*/React.createElement("figure", {
    key: f.name,
    style: {
      margin: 0,
      background: "var(--bg-cream-warm)",
      borderRadius: 32,
      padding: 40,
      display: "flex",
      gap: 24,
      boxShadow: "var(--shadow-sm)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 88,
      height: 88,
      borderRadius: "50%",
      background: f.bg,
      flexShrink: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 40,
      color: "var(--green-900)"
    }
  }, f.initial), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("blockquote", {
    style: {
      margin: 0,
      fontFamily: "var(--font-sans)",
      fontSize: 18,
      lineHeight: 1.5,
      color: "var(--green-800)",
      fontStyle: "italic",
      borderLeft: "3px solid var(--peach-500)",
      paddingLeft: 20
    }
  }, "\u201E", f.quote, "\""), /*#__PURE__*/React.createElement("figcaption", {
    style: {
      marginTop: 16,
      paddingLeft: 23,
      fontFamily: "var(--font-display)",
      fontSize: 14,
      fontWeight: 700,
      color: "var(--green-700)",
      letterSpacing: "0.08em",
      textTransform: "uppercase"
    }
  }, f.name, " ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--ink-3)",
      fontWeight: 500,
      letterSpacing: "0.04em",
      textTransform: "none",
      fontFamily: "var(--font-sans)",
      fontStyle: "italic"
    }
  }, "\xB7 ", f.role)))))));
};
Object.assign(window, {
  Founders
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Founders.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Header.jsx
try { (() => {
// Header.jsx — top bar
const Header = () => {
  const linkStyle = {
    fontFamily: "var(--font-display)",
    fontSize: 14,
    fontWeight: 500,
    color: "var(--green-800)",
    textDecoration: "none",
    padding: "8px 0",
    position: "relative"
  };
  return /*#__PURE__*/React.createElement("header", {
    style: {
      background: "rgba(251,247,228,0.92)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      borderBottom: "1px solid var(--line-soft)",
      position: "sticky",
      top: 0,
      zIndex: 50
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1280,
      margin: "0 auto",
      padding: "18px 48px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 32
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      textDecoration: "none"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-marker)",
      fontSize: 26,
      color: "var(--green-700)",
      lineHeight: 1
    }
  }, "zdrav\xFD projekt")), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: "flex",
      gap: 28
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#about",
    style: linkStyle
  }, "O n\xE1s"), /*#__PURE__*/React.createElement("a", {
    href: "#bisb",
    style: linkStyle
  }, "BISB"), /*#__PURE__*/React.createElement("a", {
    href: "#orders",
    style: linkStyle
  }, "Objedn\xE1vky pre dom\xE1cnosti"), /*#__PURE__*/React.createElement("a", {
    href: "#kindergarten",
    style: linkStyle
  }, "Objedn\xE1vka pre \u0161k\xF4lky")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      padding: 4,
      background: "var(--bg-cream-soft)",
      borderRadius: 999
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      background: "var(--green-700)",
      color: "var(--bg-cream)",
      border: "none",
      borderRadius: 999,
      padding: "5px 14px",
      fontFamily: "var(--font-display)",
      fontSize: 12,
      fontWeight: 600,
      cursor: "pointer"
    }
  }, "SK"), /*#__PURE__*/React.createElement("button", {
    style: {
      background: "transparent",
      color: "var(--ink-2)",
      border: "none",
      padding: "5px 12px",
      fontFamily: "var(--font-display)",
      fontSize: 12,
      fontWeight: 600,
      cursor: "pointer"
    }
  }, "EN")), /*#__PURE__*/React.createElement("button", {
    "aria-label": "ko\u0161\xEDk",
    style: {
      background: "var(--bg-cream-soft)",
      border: "none",
      width: 38,
      height: 38,
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      color: "var(--green-700)"
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "9",
    cy: "21",
    r: "1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "20",
    cy: "21",
    r: "1"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"
  }))))));
};
Object.assign(window, {
  Header
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Header.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Hero.jsx
try { (() => {
// Hero.jsx — brand-equation hero
const Hero = () => /*#__PURE__*/React.createElement("section", {
  style: {
    padding: "80px 48px 96px",
    maxWidth: 1280,
    margin: "0 auto",
    position: "relative"
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: "flex",
    justifyContent: "center",
    marginBottom: 56
  }
}, /*#__PURE__*/React.createElement("img", {
  src: "../../assets/brand-equation.png",
  alt: "Zdrav\xE9 Bru\u0161k\xE1 + Zdrav\xFD Dom = Zdrav\xFD projekt",
  style: {
    maxWidth: 720,
    width: "100%",
    height: "auto"
  }
})), /*#__PURE__*/React.createElement("h1", {
  style: {
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
    maxInlineSize: "24ch"
  }
}, "To najlep\u0161ie zo Zdrav\xE9ho domu a Zdrav\xE9ho bru\u0161ka."), /*#__PURE__*/React.createElement("p", {
  style: {
    fontFamily: "var(--font-sans)",
    fontSize: 22,
    lineHeight: 1.55,
    color: "var(--ink-2)",
    textAlign: "center",
    margin: "0 auto 48px",
    maxWidth: "52ch"
  }
}, "Vytv\xE1rame chutn\xE9, vyv\xE1\u017Een\xE9 a nutri\u010Dne hodnotn\xE9 jedl\xE1, ktor\xE9 podporuj\xFA zdravie, rast a pohodu det\xED aj dospel\xFDch."), /*#__PURE__*/React.createElement("div", {
  style: {
    display: "flex",
    gap: 14,
    justifyContent: "center",
    flexWrap: "wrap"
  }
}, /*#__PURE__*/React.createElement("a", {
  href: "#orders",
  style: {
    background: "var(--green-700)",
    color: "var(--bg-cream)",
    padding: "16px 32px",
    borderRadius: 999,
    fontFamily: "var(--font-display)",
    fontSize: 16,
    fontWeight: 600,
    textDecoration: "none",
    boxShadow: "var(--shadow-sm)"
  }
}, "Objedn\xE1vky pre dom\xE1cnosti"), /*#__PURE__*/React.createElement("a", {
  href: "#kindergarten",
  style: {
    background: "var(--bg-cream-soft)",
    color: "var(--green-700)",
    padding: "16px 32px",
    borderRadius: 999,
    fontFamily: "var(--font-display)",
    fontSize: 16,
    fontWeight: 600,
    textDecoration: "none"
  }
}, "Pre \u0161k\xF4lky")), /*#__PURE__*/React.createElement("div", {
  style: {
    position: "absolute",
    top: 40,
    right: 80,
    width: 92,
    height: 92,
    background: "var(--coral-400)",
    color: "#fff",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transform: "rotate(-12deg)",
    fontFamily: "var(--font-marker)",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 1.15,
    boxShadow: "var(--shadow-md)",
    flexDirection: "column"
  }
}, /*#__PURE__*/React.createElement("span", null, "nov\xE1"), /*#__PURE__*/React.createElement("span", null, "kapitola")));
Object.assign(window, {
  Hero
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Hero.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Partners.jsx
try { (() => {
// Partners.jsx — partner logo wall
const PARTNERS = ["yeme", "dobrozrut", "sladucké ovocie", "zelený klatov", "poverlogy", "microgreens", "kvaskové", "pavlické stejky", "dream farm", "chuť od Naty", "cucoriedkovo", "buslák oil"];
const Partners = () => /*#__PURE__*/React.createElement("section", {
  id: "partners",
  style: {
    padding: "80px 48px",
    background: "var(--bg-cream-warm)"
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    maxWidth: 1280,
    margin: "0 auto"
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: "grid",
    gridTemplateColumns: "1fr 2fr",
    gap: 64,
    alignItems: "flex-start",
    marginBottom: 56
  }
}, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
  style: {
    fontFamily: "var(--font-display)",
    fontSize: 13,
    fontWeight: 600,
    color: "var(--green-600)",
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    marginBottom: 12
  }
}, "Spolupracujeme s"), /*#__PURE__*/React.createElement("h2", {
  style: {
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    fontSize: "clamp(28px, 3vw, 40px)",
    color: "var(--green-900)",
    margin: 0,
    lineHeight: 1.1
  }
}, "Na\u0161i partneri")), /*#__PURE__*/React.createElement("p", {
  style: {
    fontFamily: "var(--font-sans)",
    fontSize: 17,
    lineHeight: 1.7,
    color: "var(--ink-2)",
    margin: 0,
    maxWidth: "60ch"
  }
}, "Z\xE1le\u017E\xED n\xE1m na tom, aby jedlo, ktor\xE9 var\xEDme, aj torty, ktor\xE9 pe\u010Dieme, boli chutn\xE9 a zdrav\xE9 \u2014 preto si vyber\xE1me len tie najkvalitnej\u0161ie suroviny. Ver\xEDme, \u017Ee zdrav\xE9 jedlo vznik\xE1 aj v\u010Faka dobr\xFDm vz\u0165ahom, a preto si s na\u0161imi dod\xE1vate\u013Emi budujeme spolupr\xE1cu zalo\u017Een\xFA na d\xF4vere.")), /*#__PURE__*/React.createElement("div", {
  style: {
    display: "grid",
    gridTemplateColumns: "repeat(6, 1fr)",
    gap: 14
  }
}, PARTNERS.map(p => /*#__PURE__*/React.createElement("div", {
  key: p,
  style: {
    background: "var(--bg-cream)",
    borderRadius: 18,
    padding: 22,
    aspectRatio: "1.4 / 1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "var(--font-display)",
    fontSize: 14,
    fontWeight: 600,
    color: "var(--green-700)",
    textAlign: "center",
    boxShadow: "var(--shadow-xs)",
    filter: "grayscale(0.4)",
    opacity: 0.85,
    transition: "all 200ms ease",
    cursor: "default"
  },
  onMouseEnter: e => {
    e.currentTarget.style.filter = "grayscale(0)";
    e.currentTarget.style.opacity = "1";
  },
  onMouseLeave: e => {
    e.currentTarget.style.filter = "grayscale(0.4)";
    e.currentTarget.style.opacity = "0.85";
  }
}, p)))));
Object.assign(window, {
  Partners
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Partners.jsx", error: String((e && e.message) || e) }); }

})();

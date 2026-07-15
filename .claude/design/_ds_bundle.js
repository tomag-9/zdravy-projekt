/* @ds-bundle: {"format":4,"namespace":"ZdravProjektDesignSystem_970737","components":[{"name":"Avatar","sourcePath":"components/Avatar.jsx"},{"name":"Badge","sourcePath":"components/Badge.jsx"},{"name":"Button","sourcePath":"components/Button.jsx"},{"name":"Card","sourcePath":"components/Card.jsx"},{"name":"Checkbox","sourcePath":"components/Checkbox.jsx"},{"name":"Modal","sourcePath":"components/Modal.jsx"},{"name":"PageHead","sourcePath":"components/PageHead.jsx"},{"name":"SearchBox","sourcePath":"components/SearchBox.jsx"},{"name":"StatCard","sourcePath":"components/StatCard.jsx"},{"name":"Tabs","sourcePath":"components/Tabs.jsx"},{"name":"TextField","sourcePath":"components/TextField.jsx"},{"name":"Toggle","sourcePath":"components/Toggle.jsx"}],"sourceHashes":{"client_pc/HomePC.jsx":"7744d0863ca2","client_pc/LoginPC.jsx":"4dffbc4fd6dc","client_pc/MenuPC.jsx":"98a7269120bd","client_pc/OrderDetailPC.jsx":"7612933706ee","client_pc/OrderPC.jsx":"2acdec09e7cf","client_pc/SettingsPC.jsx":"a6e13b94b1a2","client_pc/SuccessPC.jsx":"f9e063defad6","client_pc/icons.jsx":"9ee61ff34461","components/Avatar.jsx":"9c60a9e58e28","components/Badge.jsx":"ce448a5b5de4","components/Button.jsx":"a6954579f3fe","components/Card.jsx":"1db632291099","components/Checkbox.jsx":"29c6c875581c","components/Modal.jsx":"34bf966be844","components/PageHead.jsx":"97abe0a7a01a","components/SearchBox.jsx":"e268713a7ea2","components/StatCard.jsx":"12f70491557f","components/Tabs.jsx":"64430d42bc6e","components/TextField.jsx":"bf7f79585710","components/Toggle.jsx":"439623ed9619","slides/deck-stage.js":"0c125b8b1e23","ui_kits/admin_app/catalog.jsx":"9c66f2ebc982","ui_kits/admin_app/clients.jsx":"c85782929b77","ui_kits/admin_app/comms.jsx":"4ea8db8c045a","ui_kits/admin_app/dash.jsx":"374c48a6121c","ui_kits/admin_app/edupage.jsx":"084163eaf7c9","ui_kits/admin_app/icons.jsx":"eda8627edbe8","ui_kits/admin_app/plan.jsx":"28b0589654c7","ui_kits/admin_app/settings.jsx":"6cde80f0e7d8","ui_kits/admin_app/shell.jsx":"f1fa51e4a178","ui_kits/client_app/App.jsx":"f8682325f0ba","ui_kits/client_app/HomeScreen.jsx":"fe5135f7062b","ui_kits/client_app/LoginScreen.jsx":"2420afd8f422","ui_kits/client_app/MenuScreen.jsx":"ffe164a9ae78","ui_kits/client_app/OrderScreen.jsx":"66dca56dcaca","ui_kits/client_app/SettingsScreens.jsx":"f9d3babcc009","ui_kits/client_app/SuccessScreen.jsx":"5929cc40b34c","ui_kits/client_app/icons.jsx":"9ee61ff34461","ui_kits/website/Audiences.jsx":"afe87135d719","ui_kits/website/DietPicker.jsx":"2ac3e5b3dd68","ui_kits/website/Footer.jsx":"47c1034b0090","ui_kits/website/Founders.jsx":"e58ab06f1891","ui_kits/website/Header.jsx":"0103e0e1e60b","ui_kits/website/Hero.jsx":"cf7d3378effa","ui_kits/website/Partners.jsx":"82687371b563"},"inlinedExternals":[],"unexposedExports":[]} */

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

// components/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* global React */
/* ============================================================
 * Avatar — round initials badge with brand gradient tones.
 * Used in tables, sidebars and lists across the app.
 * ============================================================ */

const AVATAR_TONES = {
  green: "linear-gradient(135deg, var(--green-500), var(--green-700))",
  peach: "linear-gradient(135deg, var(--peach-500), var(--mustard-700))",
  teal: "linear-gradient(135deg, #34b5c2, var(--teal-500))"
};
const AVATAR_SIZES = {
  sm: 32,
  md: 40,
  lg: 52
};
function Avatar({
  name = "",
  tone = "green",
  size = "md",
  style,
  ...rest
}) {
  const px = AVATAR_SIZES[size] || (typeof size === "number" ? size : 40);
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w.charAt(0).toUpperCase()).join("");
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      width: px,
      height: px,
      flex: `0 0 ${px}px`,
      borderRadius: "50%",
      background: AVATAR_TONES[tone] || AVATAR_TONES.green,
      color: "#fff",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: px * 0.38,
      boxShadow: "var(--shadow-xs, 0 1px 2px rgba(0,0,0,0.15))",
      ...style
    }
  }, rest), initials || "?");
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* global React */
/* ============================================================
 * Badge — small status / category pill.
 * Tone maps to the brand accent palette. Optional leading icon.
 * ============================================================ */

const BADGE_TONES = {
  green: {
    background: "rgba(114,136,75,0.16)",
    color: "var(--green-700)"
  },
  peach: {
    background: "var(--peach-300)",
    color: "var(--mustard-700)"
  },
  teal: {
    background: "rgba(0,151,167,0.12)",
    color: "var(--teal-500)"
  },
  honey: {
    background: "rgba(255,201,92,0.28)",
    color: "var(--mustard-700)"
  },
  coral: {
    background: "rgba(201,46,82,0.10)",
    color: "var(--coral-600)"
  },
  orange: {
    background: "rgba(239,152,33,0.18)",
    color: "var(--orange-500)"
  },
  gray: {
    background: "var(--bg-cream-soft)",
    color: "var(--ink-3)"
  }
};
function Badge({
  children,
  tone = "green",
  icon = null,
  style,
  ...rest
}) {
  const t = BADGE_TONES[tone] || BADGE_TONES.green;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      fontFamily: "var(--font-display)",
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "0.02em",
      padding: "4px 10px",
      borderRadius: "999px",
      ...t,
      ...style
    }
  }, rest), icon, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Badge.jsx", error: String((e && e.message) || e) }); }

// components/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* global React */
/* ============================================================
 * Button — Zdravý projekt design system
 * Pill-shaped brand button with tone + size variants. Icons are
 * passed as children alongside the label; renders a leading SVG
 * automatically when `icon` (a React element) is supplied.
 * ============================================================ */

const BTN_TONES = {
  primary: {
    background: "var(--green-700)",
    color: "var(--bg-cream)",
    boxShadow: "var(--shadow-sm)"
  },
  secondary: {
    background: "var(--bg-cream-soft)",
    color: "var(--green-700)"
  },
  ghost: {
    background: "transparent",
    color: "var(--green-700)"
  },
  danger: {
    background: "var(--coral-600)",
    color: "#fff",
    boxShadow: "var(--shadow-sm)"
  },
  honey: {
    background: "var(--mustard-700)",
    color: "var(--bg-cream)",
    boxShadow: "var(--shadow-sm)"
  }
};
const BTN_SIZES = {
  sm: {
    padding: "8px 14px",
    fontSize: 12.5
  },
  md: {
    padding: "11px 20px",
    fontSize: 14
  },
  lg: {
    padding: "14px 26px",
    fontSize: 16
  }
};
function Button({
  children,
  variant = "primary",
  size = "md",
  icon = null,
  shape = "pill",
  full = false,
  disabled = false,
  type = "button",
  onClick,
  style,
  ...rest
}) {
  const tone = BTN_TONES[variant] || BTN_TONES.primary;
  const sz = BTN_SIZES[size] || BTN_SIZES.md;
  const base = {
    display: full ? "flex" : "inline-flex",
    width: full ? "100%" : undefined,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontFamily: "var(--font-display)",
    fontWeight: 600,
    lineHeight: 1,
    border: "1px solid transparent",
    borderRadius: shape === "pill" ? "999px" : "var(--radius-md, 14px)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.45 : 1,
    transition: "filter 180ms ease, transform 120ms ease",
    whiteSpace: "nowrap",
    ...tone,
    ...sz,
    ...style
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    onClick: onClick,
    style: base
  }, rest), icon, children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Button.jsx", error: String((e && e.message) || e) }); }

// components/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* global React */
/* ============================================================
 * Card — cream surface container. Optional header (title +
 * subtitle + right-aligned actions slot) and padded body.
 * ============================================================ */

function Card({
  children,
  title,
  subtitle,
  actions,
  pad = true,
  style,
  bodyStyle,
  ...rest
}) {
  const hasHead = title || subtitle || actions;
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: "var(--bg-cream-warm)",
      border: "1px solid var(--line-soft, rgba(23,53,5,0.08))",
      borderRadius: "var(--radius-lg, 20px)",
      boxShadow: "var(--shadow-sm)",
      overflow: "hidden",
      ...style
    }
  }, rest), hasHead && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "18px 24px",
      borderBottom: "1px solid var(--line-soft, rgba(23,53,5,0.08))",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", null, title && /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 17,
      fontWeight: 700,
      color: "var(--green-900)",
      margin: 0
    }
  }, title), subtitle && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "3px 0 0",
      fontSize: 13,
      color: "var(--ink-3)"
    }
  }, subtitle)), actions && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      alignItems: "center"
    }
  }, actions)), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: pad ? 24 : 0,
      ...bodyStyle
    }
  }, children));
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Card.jsx", error: String((e && e.message) || e) }); }

// components/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* global React */
/* ============================================================
 * Checkbox — labelled brand checkbox. Controlled via `on` +
 * `onChange(next)`. Pairs with Toggle for boolean form input.
 * ============================================================ */

function Checkbox({
  on = false,
  onChange,
  disabled = false,
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    role: "checkbox",
    "aria-checked": on,
    disabled: disabled,
    onClick: () => !disabled && onChange && onChange(!on),
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      fontSize: 14,
      color: "var(--ink-2)",
      fontFamily: "var(--font-sans)",
      background: "transparent",
      border: 0,
      padding: 0,
      textAlign: "left",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 20,
      height: 20,
      flex: "0 0 20px",
      borderRadius: 6,
      border: `1.5px solid ${on ? "var(--green-700)" : "var(--line-strong, rgba(23,53,5,0.28))"}`,
      background: on ? "var(--green-600)" : "var(--bg-cream)",
      color: "#fff",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "all 160ms ease"
    }
  }, on && /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: "13",
    height: "13",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "3",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M20 6L9 17l-5-5"
  }))), children);
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/Modal.jsx
try { (() => {
/* global React */
/* ============================================================
 * Modal — centered dialog on a blurred scrim. Optional title,
 * close button, icon badge and footer actions slot. Click the
 * scrim or the close button to dismiss.
 * ============================================================ */

function Modal({
  title,
  children,
  onClose,
  footer,
  wide = false,
  icon = null,
  iconTone = "danger"
}) {
  const iconBg = iconTone === "danger" ? {
    background: "rgba(201,46,82,0.1)",
    color: "var(--coral-600)"
  } : {
    background: "rgba(114,136,75,0.12)",
    color: "var(--green-700)"
  };
  return /*#__PURE__*/React.createElement("div", {
    onMouseDown: e => {
      if (e.target === e.currentTarget && onClose) onClose();
    },
    style: {
      position: "absolute",
      inset: 0,
      background: "rgba(23,53,5,0.36)",
      backdropFilter: "blur(3px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 50,
      padding: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--bg-cream-warm)",
      borderRadius: "var(--radius-xl, 26px)",
      boxShadow: "var(--shadow-lg)",
      width: "100%",
      maxWidth: wide ? 620 : 480,
      maxHeight: "90%",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden"
    }
  }, (title !== undefined || onClose) && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "20px 24px",
      borderBottom: "1px solid var(--line-soft, rgba(23,53,5,0.08))",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 700,
      color: "var(--green-900)",
      margin: 0
    }
  }, title), onClose && /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    "aria-label": "Zavrie\u0165",
    style: {
      width: 36,
      height: 36,
      borderRadius: "50%",
      border: 0,
      background: "var(--bg-cream-soft)",
      color: "var(--green-700)",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 20,
      lineHeight: 1
    }
  }, "\xD7")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 24,
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
      gap: 16
    }
  }, icon && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 52,
      height: 52,
      borderRadius: "50%",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      ...iconBg
    }
  }, icon), children), footer && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "16px 24px",
      borderTop: "1px solid var(--line-soft, rgba(23,53,5,0.08))",
      display: "flex",
      gap: 10,
      justifyContent: "flex-end"
    }
  }, footer)));
}
Object.assign(__ds_scope, { Modal });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Modal.jsx", error: String((e && e.message) || e) }); }

// components/PageHead.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* global React */
/* ============================================================
 * PageHead — screen header: uppercase eyebrow, display title,
 * optional description and a right-aligned actions slot.
 * ============================================================ */

function PageHead({
  eyebrow,
  title,
  desc,
  actions,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 20,
      flexWrap: "wrap",
      marginBottom: 26,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", null, eyebrow && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 11,
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: "var(--tracking-caps, 0.08em)",
      color: "var(--green-600)",
      marginBottom: 6
    }
  }, eyebrow), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 30,
      fontWeight: 700,
      color: "var(--green-900)",
      margin: 0,
      letterSpacing: "-0.01em",
      lineHeight: 1.1
    }
  }, title), desc && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "6px 0 0",
      color: "var(--ink-3)",
      fontSize: 14
    }
  }, desc)), actions && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      alignItems: "center",
      flexWrap: "wrap"
    }
  }, actions));
}
Object.assign(__ds_scope, { PageHead });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/PageHead.jsx", error: String((e && e.message) || e) }); }

// components/SearchBox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* global React */
/* ============================================================
 * SearchBox — text input with a leading magnifier icon and the
 * brand focus ring. Controlled via `value` + `onChange(text)`.
 * ============================================================ */

function SearchBox({
  value = "",
  onChange,
  placeholder = "Hľadať…",
  style,
  ...rest
}) {
  const [focused, setFocused] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      ...style
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: "17",
    height: "17",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      position: "absolute",
      left: 15,
      top: "50%",
      transform: "translateY(-50%)",
      color: "var(--ink-mute)"
    }
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "11",
    r: "7"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M21 21l-4.3-4.3"
  })), /*#__PURE__*/React.createElement("input", _extends({
    value: value,
    placeholder: placeholder,
    onChange: e => onChange && onChange(e.target.value),
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      width: "100%",
      padding: "11px 14px 11px 42px",
      borderRadius: "var(--radius-md, 14px)",
      border: `1.5px solid ${focused ? "var(--green-600)" : "var(--line, rgba(23,53,5,0.12))"}`,
      background: focused ? "var(--bg-cream-warm)" : "var(--bg-cream)",
      color: "var(--ink-1)",
      fontFamily: "var(--font-sans)",
      fontSize: 14,
      outline: "none",
      boxSizing: "border-box",
      boxShadow: focused ? "0 0 0 3px rgba(114,136,75,0.16)" : "none",
      transition: "all 180ms ease"
    }
  }, rest)));
}
Object.assign(__ds_scope, { SearchBox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/SearchBox.jsx", error: String((e && e.message) || e) }); }

// components/StatCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* global React */
/* ============================================================
 * StatCard — compact metric surface: a big display number with
 * a label, plus an optional leading slot (icon or badge).
 * ============================================================ */

function StatCard({
  label,
  value,
  lead,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      padding: "16px 18px",
      borderRadius: "var(--radius-md, 14px)",
      border: "1px solid var(--line-soft, rgba(23,53,5,0.08))",
      background: "var(--bg-cream-warm)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 4
    }
  }, lead, label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: "var(--ink-3)",
      fontWeight: 500
    }
  }, label)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 26,
      color: "var(--green-900)",
      lineHeight: 1
    }
  }, value));
}
Object.assign(__ds_scope, { StatCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/StatCard.jsx", error: String((e && e.message) || e) }); }

// components/Tabs.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* global React */
/* ============================================================
 * Tabs — underline tab bar. `tabs` is an array of {id,label};
 * controlled via `active` + `onChange(id)`. Equal-width by
 * default; pass `fit={false}` to size to content.
 * ============================================================ */

function Tabs({
  tabs = [],
  active,
  onChange,
  fit = true,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      borderBottom: "1px solid var(--line-soft, rgba(23,53,5,0.08))",
      ...style
    }
  }, rest), tabs.map(t => {
    const on = t.id === active;
    return /*#__PURE__*/React.createElement("button", {
      key: t.id,
      type: "button",
      onClick: () => onChange && onChange(t.id),
      style: {
        flex: fit ? 1 : "0 0 auto",
        padding: "14px 18px",
        border: 0,
        borderBottom: `2px solid ${on ? "var(--green-600)" : "transparent"}`,
        background: on ? "rgba(114,136,75,0.05)" : "transparent",
        cursor: "pointer",
        fontFamily: "var(--font-display)",
        fontSize: 14,
        fontWeight: 600,
        color: on ? "var(--green-700)" : "var(--ink-3)",
        transition: "all 160ms ease"
      }
    }, t.label);
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Tabs.jsx", error: String((e && e.message) || e) }); }

// components/TextField.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* global React */
/* ============================================================
 * TextField — labelled form control. Uppercase Poppins label,
 * cream-warm field, brand focus ring. Renders <input>,
 * <textarea> (multiline) or a <select> (when `options` given).
 * ============================================================ */

const FIELD_STYLE = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: "var(--radius-md, 14px)",
  border: "1.5px solid var(--line, rgba(23,53,5,0.12))",
  background: "var(--bg-cream)",
  color: "var(--ink-1)",
  fontFamily: "var(--font-sans)",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box"
};
function TextField({
  label,
  hint,
  required = false,
  multiline = false,
  options = null,
  value,
  onChange,
  placeholder,
  type = "text",
  style,
  ...rest
}) {
  const [focused, setFocused] = React.useState(false);
  const focusStyle = focused ? {
    borderColor: "var(--green-600)",
    background: "var(--bg-cream-warm)",
    boxShadow: "0 0 0 3px rgba(114,136,75,0.16)"
  } : null;
  const common = {
    value,
    onChange,
    placeholder,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      ...FIELD_STYLE,
      ...focusStyle,
      ...style
    },
    ...rest
  };
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 7
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 12,
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: "var(--tracking-caps, 0.08em)",
      color: "var(--green-700)"
    }
  }, label, required && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--coral-600)",
      marginLeft: 2
    }
  }, "*"), hint && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--ink-mute)",
      fontWeight: 500,
      textTransform: "none",
      letterSpacing: 0,
      marginLeft: 6
    }
  }, hint)), options ? /*#__PURE__*/React.createElement("select", _extends({}, common, {
    style: {
      ...common.style,
      cursor: "pointer",
      appearance: "none",
      paddingRight: 38,
      backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%237C9853' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
      backgroundRepeat: "no-repeat",
      backgroundPosition: "right 12px center"
    }
  }), options.map(o => {
    const val = typeof o === "string" ? o : o.value;
    const lbl = typeof o === "string" ? o : o.label;
    return /*#__PURE__*/React.createElement("option", {
      key: val,
      value: val
    }, lbl);
  })) : multiline ? /*#__PURE__*/React.createElement("textarea", _extends({}, common, {
    style: {
      ...common.style,
      resize: "vertical",
      minHeight: 90,
      lineHeight: 1.5
    }
  })) : /*#__PURE__*/React.createElement("input", _extends({
    type: type
  }, common)));
}
Object.assign(__ds_scope, { TextField });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/TextField.jsx", error: String((e && e.message) || e) }); }

// components/Toggle.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* global React */
/* ============================================================
 * Toggle — brand switch. Controlled via `on` + `onChange(next)`.
 * ============================================================ */

function Toggle({
  on = false,
  onChange,
  disabled = false,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    role: "switch",
    "aria-checked": on,
    disabled: disabled,
    onClick: () => !disabled && onChange && onChange(!on),
    style: {
      position: "relative",
      width: 46,
      height: 26,
      flex: "0 0 46px",
      background: on ? "var(--green-600)" : "var(--bg-cream-soft)",
      border: `1px solid ${on ? "var(--green-700)" : "var(--line, rgba(23,53,5,0.12))"}`,
      borderRadius: "999px",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      transition: "background 200ms ease, border-color 200ms ease",
      padding: 0,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      left: 2,
      top: 1,
      width: 20,
      height: 20,
      borderRadius: "50%",
      background: "#fff",
      boxShadow: "var(--shadow-xs, 0 1px 2px rgba(0,0,0,0.15))",
      transform: on ? "translateX(20px)" : "translateX(0)",
      transition: "transform 200ms cubic-bezier(.4,0,.2,1)"
    }
  }));
}
Object.assign(__ds_scope, { Toggle });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Toggle.jsx", error: String((e && e.message) || e) }); }

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

// ui_kits/admin_app/catalog.jsx
try { (() => {
/* global React, PageHead */
// Katalóg jedál — portion-type coefficients + meal templates grouped by category.

(function () {
  const {
    useState
  } = React;
  const Ic = () => window.AdIcons;
  const PORTIONS = [{
    id: 1,
    name: "Jasle (do 3 r.)",
    pct: 80
  }, {
    id: 2,
    name: "Predškoláci (3–6 r.)",
    pct: 100
  }, {
    id: 3,
    name: "1. stupeň (7–11 r.)",
    pct: 115
  }, {
    id: 4,
    name: "2. stupeň (12–15 r.)",
    pct: 130
  }, {
    id: 5,
    name: "Dospelí",
    pct: 145
  }];
  const CATS = [{
    key: "break",
    label: "Raňajky-desiata",
    icon: "Coffee",
    tpls: [{
      name: "Nátierkový chlieb",
      wl: "95 g",
      on: true
    }, {
      name: "Ovsená kaša",
      wl: "250 g",
      on: true
    }, {
      name: "Rožok s maslom a medom",
      wl: "70 g",
      on: false
    }]
  }, {
    key: "soup",
    label: "Polievka",
    icon: "Soup",
    tpls: [{
      name: "Zeleninová",
      wl: "200 ml",
      on: true
    }, {
      name: "Šošovicová",
      wl: "220 ml",
      on: true
    }]
  }, {
    key: "main",
    label: "Hlavný chod",
    icon: "Utensils",
    tpls: [{
      name: "Kuracie so ryžou",
      wl: "80 g + 150 g",
      on: true
    }, {
      name: "Bravčové s knedľou",
      wl: "80 g + 150 g",
      on: true
    }, {
      name: "Vajcová pomazánka",
      wl: "1 ks vajce podľa vek. sk.",
      exc: true,
      on: true
    }]
  }, {
    key: "snack",
    label: "Olovrant",
    icon: "Cookie",
    tpls: [{
      name: "Ovocie + mlieko",
      wl: "100 g + 150 ml",
      on: true
    }, {
      name: "Jogurt s müsli",
      wl: "200 g",
      on: true
    }]
  }];
  function Catalog() {
    const [drafts, setDrafts] = useState(Object.fromEntries(PORTIONS.map(p => [p.id, String(p.pct)])));
    const [addingCat, setAddingCat] = useState(null);
    const Plus = Ic().Plus;
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(PageHead, {
      eyebrow: "Nastavenia jed\xE1l",
      title: "Katal\xF3g jed\xE1l",
      desc: "Spravujte koeficienty vekov\xFDch skup\xEDn a rozlo\u017Eenia v\xE1h jed\xE1l."
    }), /*#__PURE__*/React.createElement("div", {
      className: "zpa-stack"
    }, /*#__PURE__*/React.createElement("div", {
      className: "zpa-card"
    }, /*#__PURE__*/React.createElement("div", {
      className: "zpa-card-head"
    }, /*#__PURE__*/React.createElement("h3", null, "Typy porci\xED a koeficienty")), /*#__PURE__*/React.createElement("div", {
      className: "zpa-card--pad",
      style: {
        paddingTop: 8,
        paddingBottom: 8
      }
    }, PORTIONS.map(p => /*#__PURE__*/React.createElement("div", {
      className: "zpa-coefrow",
      key: p.id
    }, /*#__PURE__*/React.createElement("span", {
      className: "nm"
    }, p.name), /*#__PURE__*/React.createElement("input", {
      className: "zpa-input",
      type: "number",
      value: drafts[p.id],
      onChange: e => setDrafts(d => ({
        ...d,
        [p.id]: e.target.value
      }))
    }), /*#__PURE__*/React.createElement("span", {
      className: "pct"
    }, "%"), /*#__PURE__*/React.createElement("button", {
      className: "zpa-btn zpa-btn--secondary zpa-btn--sm",
      onClick: () => window.adToast(`Koeficient „${p.name}“ uložený`)
    }, "Ulo\u017Ei\u0165"))))), CATS.map(cat => {
      const CatIcon = Ic()[cat.icon];
      return /*#__PURE__*/React.createElement("div", {
        className: "zpa-card",
        key: cat.key
      }, /*#__PURE__*/React.createElement("div", {
        className: "zpa-card-head"
      }, /*#__PURE__*/React.createElement("h3", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 10
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          width: 34,
          height: 34,
          borderRadius: 10,
          background: "var(--bg-cream-soft)",
          color: "var(--green-700)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center"
        }
      }, /*#__PURE__*/React.createElement(CatIcon, {
        w: 18
      })), cat.label), /*#__PURE__*/React.createElement("button", {
        className: "zpa-btn zpa-btn--secondary zpa-btn--sm",
        onClick: () => setAddingCat(addingCat === cat.key ? null : cat.key)
      }, /*#__PURE__*/React.createElement(Plus, null), "Prida\u0165 rozlo\u017Eenie")), /*#__PURE__*/React.createElement("div", {
        className: "zpa-card--pad"
      }, cat.tpls.map((t, i) => /*#__PURE__*/React.createElement("div", {
        className: "zpa-tplrow" + (t.on ? "" : " off"),
        key: i
      }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
        className: "nm"
      }, t.name), /*#__PURE__*/React.createElement("span", {
        className: "wl" + (t.exc ? " exc" : "")
      }, t.wl)), /*#__PURE__*/React.createElement("button", {
        className: "zpa-btn zpa-btn--ghost zpa-btn--sm",
        onClick: () => window.adToast(t.on ? "Deaktivované" : "Aktivované")
      }, t.on ? "Deaktivovať" : "Aktivovať"))), addingCat === cat.key && /*#__PURE__*/React.createElement("div", {
        style: {
          marginTop: 14,
          paddingTop: 16,
          borderTop: "1px solid var(--line-soft)",
          display: "flex",
          flexDirection: "column",
          gap: 12
        }
      }, /*#__PURE__*/React.createElement("input", {
        className: "zpa-input",
        placeholder: `Názov (napr. „${cat.label} 8")`
      }), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          gap: 8
        }
      }, /*#__PURE__*/React.createElement("input", {
        className: "zpa-input",
        placeholder: "N\xE1zov zlo\u017Eky",
        style: {
          flex: 1
        }
      }), /*#__PURE__*/React.createElement("input", {
        className: "zpa-input",
        placeholder: "Mno\u017Estvo",
        style: {
          width: 110
        }
      }), /*#__PURE__*/React.createElement("select", {
        className: "zpa-select",
        style: {
          width: 90
        }
      }, /*#__PURE__*/React.createElement("option", null, "g"), /*#__PURE__*/React.createElement("option", null, "ml"), /*#__PURE__*/React.createElement("option", null, "ks"))), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          justifyContent: "flex-end",
          gap: 10
        }
      }, /*#__PURE__*/React.createElement("button", {
        className: "zpa-btn zpa-btn--ghost zpa-btn--sm",
        onClick: () => setAddingCat(null)
      }, "Zru\u0161i\u0165"), /*#__PURE__*/React.createElement("button", {
        className: "zpa-btn zpa-btn--primary zpa-btn--sm",
        onClick: () => {
          window.adToast("Pridané do katalógu");
          setAddingCat(null);
        }
      }, "Prida\u0165 do katal\xF3gu")))));
    })));
  }
  window.CatalogScreen = Catalog;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin_app/catalog.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin_app/clients.jsx
try { (() => {
/* global React, PageHead, Modal, Field, SearchBox, Toggle, Checkbox */
// Prevádzky — operations list (search + table + CRUD modals) and a detail view.

(function () {
  const {
    useState
  } = React;
  const Ic = () => window.AdIcons;
  const SEED = [{
    id: 1,
    company: "MŠ Ružinová",
    email: "ruzinova@ms.sk",
    billing: "Materská škola Ružinová, s.r.o.",
    ico: "45872145",
    edupage: false,
    av: "green"
  }, {
    id: 2,
    company: "ZŠ Vajnorská 47",
    email: "jedalen@zsvajnorska.sk",
    billing: "Základná škola Vajnorská",
    ico: "31245789",
    edupage: true,
    av: "teal"
  }, {
    id: 3,
    company: "MŠ Slnečnica",
    email: "skolka@slnecnica.sk",
    billing: "",
    ico: "",
    edupage: false,
    av: "peach"
  }, {
    id: 4,
    company: "ZŠ Nábrežná",
    email: "strava@zsnabrezna.sk",
    billing: "ZŠ Nábrežná, Bratislava",
    ico: "37129654",
    edupage: true,
    av: "green"
  }, {
    id: 5,
    company: "Rodina Kováčová",
    email: "kovacova@gmail.com",
    billing: "",
    ico: "",
    edupage: false,
    av: "peach"
  }];
  const EMPTY = {
    company: "",
    billing: "",
    email: "",
    ico: "",
    dic: "",
    edupage: false,
    apiId: "",
    url: ""
  };
  function OperationForm({
    form,
    setForm,
    urlResult,
    onTest,
    testing
  }) {
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Field, {
      label: "N\xE1zov prev\xE1dzky",
      req: true,
      hint: "(intern\xFD)"
    }, /*#__PURE__*/React.createElement("input", {
      className: "zpa-input",
      value: form.company,
      onChange: e => setForm({
        ...form,
        company: e.target.value
      })
    })), /*#__PURE__*/React.createElement(Field, {
      label: "N\xE1zov spolo\u010Dnosti",
      hint: "(faktur\xE1cia)"
    }, /*#__PURE__*/React.createElement("input", {
      className: "zpa-input",
      value: form.billing,
      onChange: e => setForm({
        ...form,
        billing: e.target.value
      })
    })), /*#__PURE__*/React.createElement(Field, {
      label: "Email",
      req: true
    }, /*#__PURE__*/React.createElement("input", {
      className: "zpa-input",
      type: "email",
      value: form.email,
      onChange: e => setForm({
        ...form,
        email: e.target.value
      })
    })), /*#__PURE__*/React.createElement("div", {
      className: "zpa-grid-2"
    }, /*#__PURE__*/React.createElement(Field, {
      label: "I\u010CO"
    }, /*#__PURE__*/React.createElement("input", {
      className: "zpa-input",
      value: form.ico,
      onChange: e => setForm({
        ...form,
        ico: e.target.value
      })
    })), /*#__PURE__*/React.createElement(Field, {
      label: "DI\u010C"
    }, /*#__PURE__*/React.createElement("input", {
      className: "zpa-input",
      value: form.dic,
      onChange: e => setForm({
        ...form,
        dic: e.target.value
      })
    }))), /*#__PURE__*/React.createElement(Checkbox, {
      on: form.edupage,
      onChange: v => setForm({
        ...form,
        edupage: v
      })
    }, "Edupage prev\xE1dzka"), form.edupage && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Field, {
      label: "Edupage identifik\xE1tor"
    }, /*#__PURE__*/React.createElement("input", {
      className: "zpa-input",
      placeholder: "Identifik\xE1tor pre p\xE1rovanie v Edupage s\xFAboroch",
      value: form.apiId,
      onChange: e => setForm({
        ...form,
        apiId: e.target.value
      })
    })), /*#__PURE__*/React.createElement(Field, {
      label: "MealsGuest URL"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("input", {
      className: "zpa-input",
      placeholder: "https://skola.edupage.org/menu/mealsGuest?id=\u2026",
      value: form.url,
      onChange: e => setForm({
        ...form,
        url: e.target.value
      }),
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement("button", {
      className: "zpa-btn zpa-btn--secondary zpa-btn--sm",
      onClick: onTest,
      disabled: testing,
      type: "button"
    }, testing ? "Testujem…" : "Test")), urlResult && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: urlResult.ok ? "var(--green-600)" : "var(--coral-600)"
      }
    }, urlResult.msg))));
  }
  function ClientDetail({
    op,
    onBack
  }) {
    const ArrowL = Ic().ChevronLeft,
      Building = Ic().Building,
      Salad = Ic().Salad,
      Sliders = Ic().Sliders;
    const [portions, setPortions] = useState({
      1: true,
      2: true,
      3: false,
      4: false,
      5: false
    });
    const [diets, setDiets] = useState({
      KLASIK: true,
      VEGE: true,
      "NO MILK": true,
      "NO GLUTEN": false,
      NONONO: false
    });
    const PORTIONS = [[1, "Jasle (do 3 r.)"], [2, "Predškoláci (3–6 r.)"], [3, "1. stupeň"], [4, "2. stupeň"], [5, "Dospelí"]];
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(PageHead, {
      eyebrow: "Prev\xE1dzky \u203A Detail",
      title: op.company,
      desc: op.email,
      actions: /*#__PURE__*/React.createElement("button", {
        className: "zpa-btn zpa-btn--ghost",
        onClick: onBack
      }, /*#__PURE__*/React.createElement(ArrowL, null), "Sp\xE4\u0165 na zoznam")
    }), /*#__PURE__*/React.createElement("div", {
      className: "zpa-stack"
    }, /*#__PURE__*/React.createElement("div", {
      className: "zpa-grid-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "zpa-card"
    }, /*#__PURE__*/React.createElement("div", {
      className: "zpa-card-head"
    }, /*#__PURE__*/React.createElement("h3", {
      style: {
        display: "flex",
        gap: 8,
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement(Building, {
      w: 18
    }), "Faktura\u010Dn\xE9 \xFAdaje")), /*#__PURE__*/React.createElement("div", {
      className: "zpa-card--pad",
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(Field, {
      label: "Faktura\u010Dn\xFD n\xE1zov"
    }, /*#__PURE__*/React.createElement("input", {
      className: "zpa-input",
      defaultValue: op.billing
    })), /*#__PURE__*/React.createElement("div", {
      className: "zpa-grid-2"
    }, /*#__PURE__*/React.createElement(Field, {
      label: "I\u010CO"
    }, /*#__PURE__*/React.createElement("input", {
      className: "zpa-input",
      defaultValue: op.ico
    })), /*#__PURE__*/React.createElement(Field, {
      label: "DI\u010C"
    }, /*#__PURE__*/React.createElement("input", {
      className: "zpa-input",
      defaultValue: ""
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "flex-end"
      }
    }, /*#__PURE__*/React.createElement("button", {
      className: "zpa-btn zpa-btn--primary zpa-btn--sm",
      onClick: () => window.adToast("Uložené")
    }, "Ulo\u017Ei\u0165")))), /*#__PURE__*/React.createElement("div", {
      className: "zpa-card"
    }, /*#__PURE__*/React.createElement("div", {
      className: "zpa-card-head"
    }, /*#__PURE__*/React.createElement("h3", {
      style: {
        display: "flex",
        gap: 8,
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement(Sliders, {
      w: 18
    }), "Dostupn\xE9 porcie"), /*#__PURE__*/React.createElement("p", null, "Vekov\xE9 skupiny, ktor\xE9 m\xF4\u017Ee prev\xE1dzka objedn\xE1va\u0165.")), /*#__PURE__*/React.createElement("div", {
      className: "zpa-card--pad",
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 10
      }
    }, PORTIONS.map(([id, nm]) => /*#__PURE__*/React.createElement("div", {
      key: id,
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-display)",
        fontWeight: 600,
        color: "var(--green-900)",
        fontSize: 14
      }
    }, nm), /*#__PURE__*/React.createElement(Toggle, {
      on: portions[id],
      onChange: v => setPortions(p => ({
        ...p,
        [id]: v
      }))
    })))))), /*#__PURE__*/React.createElement("div", {
      className: "zpa-card"
    }, /*#__PURE__*/React.createElement("div", {
      className: "zpa-card-head"
    }, /*#__PURE__*/React.createElement("h3", {
      style: {
        display: "flex",
        gap: 8,
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement(Salad, {
      w: 18
    }), "Povolen\xE9 di\xE9ty"), /*#__PURE__*/React.createElement("p", null, "Ktor\xE9 di\xE9ty vid\xED prev\xE1dzka pri objedn\xE1van\xED.")), /*#__PURE__*/React.createElement("div", {
      className: "zpa-card--pad",
      style: {
        display: "flex",
        flexWrap: "wrap",
        gap: 10
      }
    }, Object.keys(diets).map(d => /*#__PURE__*/React.createElement("button", {
      key: d,
      className: "zpa-badge " + (diets[d] ? "zpa-badge--green" : "zpa-badge--gray"),
      style: {
        fontSize: 13,
        padding: "8px 14px",
        cursor: "pointer",
        border: "1px solid transparent"
      },
      onClick: () => setDiets(s => ({
        ...s,
        [d]: !s[d]
      }))
    }, diets[d] && (() => {
      const C = Ic().Check;
      return /*#__PURE__*/React.createElement(C, {
        w: 13
      });
    })(), " ", d))))));
  }
  function Clients() {
    const [rows, setRows] = useState(SEED);
    const [q, setQ] = useState("");
    const [detail, setDetail] = useState(null);
    const [create, setCreate] = useState(false);
    const [edit, setEdit] = useState(null);
    const [del, setDel] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [urlResult, setUrlResult] = useState(null);
    const [testing, setTesting] = useState(false);
    const Plus = Ic().Plus,
      Pencil = Ic().Pencil,
      Trash = Ic().Trash,
      Sliders = Ic().Sliders,
      Link = Ic().Link,
      AlertTriangle = Ic().AlertTriangle;
    const fakeTest = () => {
      setTesting(true);
      setUrlResult(null);
      setTimeout(() => {
        setTesting(false);
        setUrlResult({
          ok: true,
          msg: "✓ OK — 128 porcií (raňajky, obed, olovrant)"
        });
      }, 900);
    };
    const filtered = rows.filter(r => (r.company + r.email + r.billing).toLowerCase().includes(q.toLowerCase()));
    if (detail) return /*#__PURE__*/React.createElement(ClientDetail, {
      op: detail,
      onBack: () => setDetail(null)
    });
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(PageHead, {
      eyebrow: "Prev\xE1dzky",
      title: "Spr\xE1va prev\xE1dzok",
      desc: "Prev\xE1dzky, ich faktura\u010Dn\xE9 \xFAdaje, porcie a di\xE9ty.",
      actions: /*#__PURE__*/React.createElement("button", {
        className: "zpa-btn zpa-btn--primary",
        onClick: () => {
          setForm(EMPTY);
          setUrlResult(null);
          setCreate(true);
        }
      }, /*#__PURE__*/React.createElement(Plus, null), "Prida\u0165 prev\xE1dzku")
    }), /*#__PURE__*/React.createElement("div", {
      className: "zpa-stack"
    }, /*#__PURE__*/React.createElement(SearchBox, {
      value: q,
      onChange: setQ,
      placeholder: "H\u013Eada\u0165 prev\xE1dzky\u2026"
    }), /*#__PURE__*/React.createElement("div", {
      className: "zpa-card",
      style: {
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "zpa-table-wrap"
    }, /*#__PURE__*/React.createElement("table", {
      className: "zpa-table"
    }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Prev\xE1dzka"), /*#__PURE__*/React.createElement("th", {
      className: "r"
    }, "Akcie"))), /*#__PURE__*/React.createElement("tbody", null, filtered.map(u => /*#__PURE__*/React.createElement("tr", {
      key: u.id
    }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 14
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "zpa-avatar-sm " + u.av
    }, u.company.charAt(0)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "zpa-cellname",
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8
      }
    }, u.company, u.edupage && /*#__PURE__*/React.createElement("span", {
      className: "zpa-badge zpa-badge--teal"
    }, /*#__PURE__*/React.createElement(Link, {
      w: 11
    }), "Edupage")), /*#__PURE__*/React.createElement("div", {
      className: "zpa-cellsub"
    }, u.email, u.billing ? " · " + u.billing : "")))), /*#__PURE__*/React.createElement("td", {
      className: "r"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "inline-flex",
        gap: 2
      }
    }, /*#__PURE__*/React.createElement("button", {
      className: "zpa-iconbtn",
      title: "Upravi\u0165",
      onClick: () => {
        setEdit(u);
        setForm({
          company: u.company,
          billing: u.billing,
          email: u.email,
          ico: u.ico,
          dic: "",
          edupage: u.edupage,
          apiId: "",
          url: ""
        });
        setUrlResult(null);
      }
    }, /*#__PURE__*/React.createElement(Pencil, null)), /*#__PURE__*/React.createElement("button", {
      className: "zpa-iconbtn",
      title: "Nastavenia",
      onClick: () => setDetail(u)
    }, /*#__PURE__*/React.createElement(Sliders, null)), /*#__PURE__*/React.createElement("button", {
      className: "zpa-iconbtn zpa-iconbtn--danger",
      title: "Odstr\xE1ni\u0165",
      onClick: () => setDel(u)
    }, /*#__PURE__*/React.createElement(Trash, null)))))), filtered.length === 0 && /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
      colSpan: 2,
      className: "zpa-empty"
    }, "\u017Diadne prev\xE1dzky."))))))), create && /*#__PURE__*/React.createElement(Modal, {
      title: "Prida\u0165 prev\xE1dzku",
      onClose: () => setCreate(false),
      foot: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
        className: "zpa-btn zpa-btn--ghost",
        onClick: () => setCreate(false)
      }, "Zru\u0161i\u0165"), /*#__PURE__*/React.createElement("button", {
        className: "zpa-btn zpa-btn--primary",
        onClick: () => {
          setRows(r => [...r, {
            id: Date.now(),
            company: form.company || "Nová prevádzka",
            email: form.email,
            billing: form.billing,
            ico: form.ico,
            edupage: form.edupage,
            av: "green"
          }]);
          setCreate(false);
          window.adToast("Prevádzka vytvorená");
        }
      }, "Prida\u0165"))
    }, /*#__PURE__*/React.createElement(OperationForm, {
      form: form,
      setForm: setForm,
      urlResult: urlResult,
      onTest: fakeTest,
      testing: testing
    })), edit && /*#__PURE__*/React.createElement(Modal, {
      title: "Upravi\u0165 prev\xE1dzku",
      onClose: () => setEdit(null),
      foot: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
        className: "zpa-btn zpa-btn--ghost",
        onClick: () => setEdit(null)
      }, "Zru\u0161i\u0165"), /*#__PURE__*/React.createElement("button", {
        className: "zpa-btn zpa-btn--primary",
        onClick: () => {
          setRows(r => r.map(x => x.id === edit.id ? {
            ...x,
            company: form.company,
            email: form.email,
            billing: form.billing,
            ico: form.ico,
            edupage: form.edupage
          } : x));
          setEdit(null);
          window.adToast("Prevádzka upravená");
        }
      }, "Ulo\u017Ei\u0165"))
    }, /*#__PURE__*/React.createElement(OperationForm, {
      form: form,
      setForm: setForm,
      urlResult: urlResult,
      onTest: fakeTest,
      testing: testing
    })), del && /*#__PURE__*/React.createElement(Modal, {
      title: "Odstr\xE1ni\u0165 prev\xE1dzku",
      onClose: () => setDel(null),
      icon: "AlertTriangle",
      iconKind: "danger",
      foot: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
        className: "zpa-btn zpa-btn--ghost",
        onClick: () => setDel(null)
      }, "Zru\u0161i\u0165"), /*#__PURE__*/React.createElement("button", {
        className: "zpa-btn zpa-btn--danger",
        onClick: () => {
          setRows(r => r.filter(x => x.id !== del.id));
          setDel(null);
          window.adToast("Prevádzka odstránená");
        }
      }, "Odstr\xE1ni\u0165"))
    }, /*#__PURE__*/React.createElement("p", {
      style: {
        margin: 0,
        color: "var(--ink-2)",
        lineHeight: 1.55
      }
    }, "Naozaj chcete odstr\xE1ni\u0165 prev\xE1dzku ", /*#__PURE__*/React.createElement("strong", {
      style: {
        color: "var(--green-900)"
      }
    }, del.company), "? T\xE1to akcia je nevratn\xE1 a vyma\u017Ee aj v\u0161etky jej objedn\xE1vky.")));
  }
  window.ClientsScreen = Clients;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin_app/clients.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin_app/comms.jsx
try { (() => {
/* global React, PageHead, Modal, Field, SearchBox */
// Logy, Notifikácie, Správa adminov.

(function () {
  const {
    useState
  } = React;
  const Ic = () => window.AdIcons;

  /* ── Logy ── */
  const LOG_SEED = [{
    id: 1,
    ts: "12.06.2025 07:41:03",
    level: "INFO",
    src: "edupage.import:88",
    msg: "Import ZŠ Vajnorská 47 — 128 porcií spracovaných."
  }, {
    id: 2,
    ts: "12.06.2025 07:39:55",
    level: "ERROR",
    src: "edupage.import:142",
    msg: "Neznámy identifikátor jedla v riadku 14 (nabrezna_obed.xml).",
    tb: "Traceback (most recent call last):\n  File \"edupage/import.py\", line 142, in parse_row\n    meal = MEAL_MAP[code]\nKeyError: 'X-4471'"
  }, {
    id: 3,
    ts: "12.06.2025 07:30:00",
    level: "WARNING",
    src: "notifications.push:51",
    msg: "3 neplatné push subscriptions odstránené pri odosielaní."
  }, {
    id: 4,
    ts: "12.06.2025 06:00:12",
    level: "INFO",
    src: "reports.daily:33",
    msg: "Denný report odoslaný na 2 adresy."
  }, {
    id: 5,
    ts: "11.06.2025 22:14:07",
    level: "CRITICAL",
    src: "billing.export:210",
    msg: "Zlyhalo generovanie mesačnej faktúry — chýba IČO prevádzky #5.",
    tb: "Traceback (most recent call last):\n  File \"billing/export.py\", line 210, in build_invoice\n    raise MissingFieldError('ico')\nbilling.errors.MissingFieldError: ico"
  }];
  const LEVELS = ["INFO", "WARNING", "ERROR", "CRITICAL"];
  const lvlIcon = l => {
    const I = Ic();
    return l === "CRITICAL" || l === "ERROR" ? I.XCircle : l === "WARNING" ? I.AlertTriangle : I.Info;
  };
  function Logs() {
    const [active, setActive] = useState(["WARNING", "ERROR", "CRITICAL"]);
    const [q, setQ] = useState("");
    const [open, setOpen] = useState([]);
    const RefreshCw = Ic().RefreshCw,
      ChevronRight = Ic().ChevronRight,
      ChevronDown = Ic().ChevronDown;
    const counts = LOG_SEED.reduce((a, e) => ({
      ...a,
      [e.level]: (a[e.level] || 0) + 1
    }), {});
    const rows = LOG_SEED.filter(e => active.includes(e.level) && (e.msg + e.src).toLowerCase().includes(q.toLowerCase()));
    const toggle = id => setOpen(o => o.includes(id) ? o.filter(x => x !== id) : [...o, id]);
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(PageHead, {
      eyebrow: "Nastavenia",
      title: "Logy",
      desc: "D\xF4le\u017Eit\xE9 syst\xE9mov\xE9 udalosti z backendu.",
      actions: /*#__PURE__*/React.createElement("button", {
        className: "zpa-btn zpa-btn--secondary",
        onClick: () => window.adToast("Obnovené")
      }, /*#__PURE__*/React.createElement(RefreshCw, null), "Obnovi\u0165")
    }), /*#__PURE__*/React.createElement("div", {
      className: "zpa-stack"
    }, /*#__PURE__*/React.createElement("div", {
      className: "zpa-grid-cards",
      style: {
        gridTemplateColumns: "repeat(4, 1fr)"
      }
    }, LEVELS.map(l => {
      const Li = lvlIcon(l);
      return /*#__PURE__*/React.createElement("div", {
        className: "zpa-statcard",
        key: l
      }, /*#__PURE__*/React.createElement("span", {
        className: "zpa-lvl " + l
      }, /*#__PURE__*/React.createElement(Li, null), l), /*#__PURE__*/React.createElement("span", {
        className: "num"
      }, counts[l] || 0));
    })), /*#__PURE__*/React.createElement("div", {
      className: "zpa-card zpa-card--pad"
    }, /*#__PURE__*/React.createElement(SearchBox, {
      value: q,
      onChange: setQ,
      placeholder: "H\u013Eada\u0165 v spr\xE1vach alebo tracebacku\u2026"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        marginTop: 14,
        flexWrap: "wrap"
      }
    }, LEVELS.map(l => {
      const Li = lvlIcon(l);
      const on = active.includes(l);
      return /*#__PURE__*/React.createElement("button", {
        key: l,
        className: "zpa-lvl btn " + (on ? l : "off"),
        onClick: () => setActive(a => on ? a.filter(x => x !== l) : [...a, l])
      }, /*#__PURE__*/React.createElement(Li, null), l);
    }))), /*#__PURE__*/React.createElement("div", {
      className: "zpa-card"
    }, /*#__PURE__*/React.createElement("div", {
      className: "zpa-card-head"
    }, /*#__PURE__*/React.createElement("h3", null, "Z\xE1znamy (", rows.length, ")")), /*#__PURE__*/React.createElement("div", null, rows.map(e => {
      const Li = lvlIcon(e.level);
      const isOpen = open.includes(e.id);
      const Chev = isOpen ? ChevronDown : ChevronRight;
      return /*#__PURE__*/React.createElement("div", {
        className: "zpa-log",
        key: e.id
      }, /*#__PURE__*/React.createElement("div", {
        className: "ts"
      }, e.ts), /*#__PURE__*/React.createElement("span", {
        className: "zpa-lvl " + e.level
      }, /*#__PURE__*/React.createElement(Li, null), e.level), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
        className: "src"
      }, e.src), /*#__PURE__*/React.createElement("pre", {
        className: "msg"
      }, e.msg), e.tb && isOpen && /*#__PURE__*/React.createElement("pre", {
        className: "tb"
      }, e.tb)), e.tb ? /*#__PURE__*/React.createElement("button", {
        className: "zpa-btn zpa-btn--ghost zpa-btn--sm",
        onClick: () => toggle(e.id)
      }, /*#__PURE__*/React.createElement(Chev, {
        w: 14
      }), "Detail") : /*#__PURE__*/React.createElement("span", null));
    }), rows.length === 0 && /*#__PURE__*/React.createElement("div", {
      className: "zpa-empty"
    }, "\u017Diadne logy pre aktu\xE1lne filtre.")))));
  }

  /* ── Notifikácie ── */
  function Notifications() {
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [url, setUrl] = useState("/home");
    const Send = Ic().Send,
      Info = Ic().Info;
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(PageHead, {
      eyebrow: "Komunik\xE1cia",
      title: "Push notifik\xE1cie",
      desc: "Odo\u0161lite notifik\xE1ciu jednej prev\xE1dzke alebo v\u0161etk\xFDm akt\xEDvnym odberate\u013Eom."
    }), /*#__PURE__*/React.createElement("div", {
      className: "zpa-stack",
      style: {
        maxWidth: 720
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "zpa-card"
    }, /*#__PURE__*/React.createElement("div", {
      className: "zpa-card-head"
    }, /*#__PURE__*/React.createElement("h3", null, "Odosla\u0165 notifik\xE1ciu")), /*#__PURE__*/React.createElement("div", {
      className: "zpa-card--pad",
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 16
      }
    }, /*#__PURE__*/React.createElement(Field, {
      label: "Pr\xEDjemca"
    }, /*#__PURE__*/React.createElement("select", {
      className: "zpa-select"
    }, /*#__PURE__*/React.createElement("option", null, "V\u0161etci akt\xEDvni odberatelia"), /*#__PURE__*/React.createElement("option", null, "M\u0160 Ru\u017Einov\xE1"), /*#__PURE__*/React.createElement("option", null, "Z\u0160 Vajnorsk\xE1 47"), /*#__PURE__*/React.createElement("option", null, "M\u0160 Slne\u010Dnica"))), /*#__PURE__*/React.createElement(Field, {
      label: "Nadpis"
    }, /*#__PURE__*/React.createElement("input", {
      className: "zpa-input",
      value: title,
      placeholder: "Napr. Pripomienka objedn\xE1vky",
      onChange: e => setTitle(e.target.value)
    })), /*#__PURE__*/React.createElement(Field, {
      label: "Spr\xE1va"
    }, /*#__PURE__*/React.createElement("textarea", {
      className: "zpa-textarea",
      value: body,
      placeholder: "Text notifik\xE1cie\u2026",
      onChange: e => setBody(e.target.value)
    })), /*#__PURE__*/React.createElement(Field, {
      label: "Cie\u013Eov\xE1 str\xE1nka (URL)",
      hint: "kam sa otvor\xED po kliknut\xED"
    }, /*#__PURE__*/React.createElement("input", {
      className: "zpa-input",
      value: url,
      onChange: e => setUrl(e.target.value)
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
      className: "zpa-btn zpa-btn--primary",
      disabled: !title.trim() || !body.trim(),
      onClick: () => {
        window.adToast("Notifikácia odoslaná");
        setTitle("");
        setBody("");
      }
    }, /*#__PURE__*/React.createElement(Send, null), "Odosla\u0165 notifik\xE1ciu")))), /*#__PURE__*/React.createElement("div", {
      className: "zpa-notice zpa-notice--teal"
    }, /*#__PURE__*/React.createElement(Info, null), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("strong", null, "Inform\xE1cie"), /*#__PURE__*/React.createElement("ul", {
      style: {
        margin: "6px 0 0",
        paddingLeft: 18,
        lineHeight: 1.6
      }
    }, /*#__PURE__*/React.createElement("li", null, "Notifik\xE1cie dostan\xFA len pou\u017E\xEDvatelia, ktor\xED si nain\u0161talovali aplik\xE1ciu a povolili notifik\xE1cie."), /*#__PURE__*/React.createElement("li", null, "Automatick\xE9 pripomienky sa odosielaj\xFA 15 min\xFAt pred uz\xE1vierkou objedn\xE1vky."), /*#__PURE__*/React.createElement("li", null, "Neplatn\xE9 subscriptions sa pri odosielan\xED automaticky odstra\u0148uj\xFA."))))));
  }

  /* ── Správa adminov ── */
  const ADMIN_SEED = [{
    id: 1,
    name: "Janka Uhríková",
    email: "janka@zdravyprojekt.sk",
    av: "green"
  }, {
    id: 2,
    name: "Vlado Uhrík",
    email: "vlado@zdravyprojekt.sk",
    av: "peach"
  }, {
    id: 3,
    name: "Peter Dvořák",
    email: "peter@zdravyprojekt.sk",
    av: "teal"
  }];
  function Admins() {
    const [rows, setRows] = useState(ADMIN_SEED);
    const [q, setQ] = useState("");
    const [create, setCreate] = useState(false);
    const [del, setDel] = useState(null);
    const [form, setForm] = useState({
      first: "",
      last: "",
      email: ""
    });
    const Plus = Ic().Plus,
      Pencil = Ic().Pencil,
      Trash = Ic().Trash,
      AlertTriangle = Ic().AlertTriangle;
    const filtered = rows.filter(r => (r.name + r.email).toLowerCase().includes(q.toLowerCase()));
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(PageHead, {
      eyebrow: "Opr\xE1vnenia",
      title: "Spr\xE1va adminov",
      desc: "Admin \xFA\u010Dty a ich pr\xEDstupov\xE9 \xFAdaje.",
      actions: /*#__PURE__*/React.createElement("button", {
        className: "zpa-btn zpa-btn--primary",
        onClick: () => {
          setForm({
            first: "",
            last: "",
            email: ""
          });
          setCreate(true);
        }
      }, /*#__PURE__*/React.createElement(Plus, null), "Prida\u0165 admina")
    }), /*#__PURE__*/React.createElement("div", {
      className: "zpa-stack"
    }, /*#__PURE__*/React.createElement(SearchBox, {
      value: q,
      onChange: setQ,
      placeholder: "H\u013Eada\u0165 pou\u017E\xEDvate\u013Eov\u2026"
    }), /*#__PURE__*/React.createElement("div", {
      className: "zpa-card",
      style: {
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "zpa-table-wrap"
    }, /*#__PURE__*/React.createElement("table", {
      className: "zpa-table"
    }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Admin"), /*#__PURE__*/React.createElement("th", {
      className: "r"
    }, "Akcie"))), /*#__PURE__*/React.createElement("tbody", null, filtered.map(u => /*#__PURE__*/React.createElement("tr", {
      key: u.id
    }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 14
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "zpa-avatar-sm " + u.av
    }, u.name.charAt(0)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "zpa-cellname"
    }, u.name), /*#__PURE__*/React.createElement("div", {
      className: "zpa-cellsub"
    }, u.email)))), /*#__PURE__*/React.createElement("td", {
      className: "r"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "inline-flex",
        gap: 2
      }
    }, /*#__PURE__*/React.createElement("button", {
      className: "zpa-iconbtn",
      title: "Upravi\u0165",
      onClick: () => window.adToast("Úprava admina (demo)")
    }, /*#__PURE__*/React.createElement(Pencil, null)), /*#__PURE__*/React.createElement("button", {
      className: "zpa-iconbtn zpa-iconbtn--danger",
      title: "Odstr\xE1ni\u0165",
      onClick: () => setDel(u)
    }, /*#__PURE__*/React.createElement(Trash, null)))))), filtered.length === 0 && /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
      colSpan: 2,
      className: "zpa-empty"
    }, "\u017Diadni admini."))))))), create && /*#__PURE__*/React.createElement(Modal, {
      title: "Prida\u0165 admina",
      onClose: () => setCreate(false),
      foot: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
        className: "zpa-btn zpa-btn--ghost",
        onClick: () => setCreate(false)
      }, "Zru\u0161i\u0165"), /*#__PURE__*/React.createElement("button", {
        className: "zpa-btn zpa-btn--primary",
        onClick: () => {
          setRows(r => [...r, {
            id: Date.now(),
            name: (form.first + " " + form.last).trim() || form.email,
            email: form.email,
            av: "green"
          }]);
          setCreate(false);
          window.adToast("Admin účet vytvorený");
        }
      }, "Vytvori\u0165"))
    }, /*#__PURE__*/React.createElement("div", {
      className: "zpa-grid-2"
    }, /*#__PURE__*/React.createElement(Field, {
      label: "Meno"
    }, /*#__PURE__*/React.createElement("input", {
      className: "zpa-input",
      value: form.first,
      onChange: e => setForm({
        ...form,
        first: e.target.value
      })
    })), /*#__PURE__*/React.createElement(Field, {
      label: "Priezvisko"
    }, /*#__PURE__*/React.createElement("input", {
      className: "zpa-input",
      value: form.last,
      onChange: e => setForm({
        ...form,
        last: e.target.value
      })
    }))), /*#__PURE__*/React.createElement(Field, {
      label: "Email",
      req: true
    }, /*#__PURE__*/React.createElement("input", {
      className: "zpa-input",
      type: "email",
      value: form.email,
      onChange: e => setForm({
        ...form,
        email: e.target.value
      })
    })), /*#__PURE__*/React.createElement("p", {
      style: {
        margin: 0,
        fontSize: 12.5,
        color: "var(--ink-3)"
      }
    }, "Admin dostane email s odkazom na nastavenie hesla.")), del && /*#__PURE__*/React.createElement(Modal, {
      title: "Vymaza\u0165 \xFA\u010Det",
      onClose: () => setDel(null),
      icon: "AlertTriangle",
      iconKind: "danger",
      foot: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
        className: "zpa-btn zpa-btn--ghost",
        onClick: () => setDel(null)
      }, "Zru\u0161i\u0165"), /*#__PURE__*/React.createElement("button", {
        className: "zpa-btn zpa-btn--danger",
        onClick: () => {
          setRows(r => r.filter(x => x.id !== del.id));
          setDel(null);
          window.adToast("Účet vymazaný");
        }
      }, "Vymaza\u0165"))
    }, /*#__PURE__*/React.createElement("p", {
      style: {
        margin: 0,
        color: "var(--ink-2)",
        lineHeight: 1.55
      }
    }, "Naozaj chcete vymaza\u0165 \xFA\u010Det ", /*#__PURE__*/React.createElement("strong", {
      style: {
        color: "var(--green-900)"
      }
    }, del.email), "? T\xE1to akcia je nevratn\xE1.")));
  }
  window.LogsScreen = Logs;
  window.NotificationsScreen = Notifications;
  window.AdminsScreen = Admins;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin_app/comms.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin_app/dash.jsx
try { (() => {
/* global React, PageHead */
// Prehľad — Gramáž jedál. The flagship data screen: date navigator + a
// meal-colour-coded gramage table with expandable operations.

(function () {
  const {
    useState,
    useMemo
  } = React;
  const Ic = () => window.AdIcons;

  // ── Meal column groups (hue = brand-translated meal colour) ──
  const COL_GROUPS = [{
    key: "break",
    label: "Raňajky-desiata",
    hue: "break",
    tpl: "Nátierkový chlieb",
    comps: [{
      label: "Pečivo",
      g: 40
    }, {
      label: "Nátierka",
      g: 30
    }, {
      label: "Zelenina",
      g: 25
    }]
  }, {
    key: "soup",
    label: "Polievka",
    hue: "soup",
    tpl: "Zeleninová",
    comps: [{
      label: "Polievka",
      g: 200,
      unit: "ml"
    }]
  }, {
    key: "menuA",
    label: "Menu A",
    hue: "menuA",
    tpl: "Kuracie so ryžou",
    comps: [{
      label: "Porcia",
      g: 230
    }]
  }, {
    key: "menuB",
    label: "Menu B",
    hue: "menuB",
    tpl: "Bravčové s knedľou",
    comps: [{
      label: "Porcia",
      g: 250
    }]
  }, {
    key: "menuC",
    label: "Menu C",
    hue: "menuC",
    tpl: "Zapekané cestoviny",
    comps: [{
      label: "Porcia",
      g: 240
    }]
  }, {
    key: "menuV",
    label: "Menu V",
    hue: "menuV",
    tpl: "Šošovicový guláš (vege)",
    comps: [{
      label: "Porcia",
      g: 230
    }]
  }, {
    key: "snack",
    label: "Olovrant",
    hue: "snack",
    tpl: "Ovocie + mlieko",
    comps: [{
      label: "Ovocie",
      g: 100
    }, {
      label: "Nápoj",
      g: 150,
      unit: "ml"
    }]
  }];

  // ── Operations with standard + diet breakdowns ──
  const ROWS = [{
    id: 1,
    name: "MŠ Ružinová",
    std: 84,
    note: "Prosím oddelene baliť bezlepkové porcie.",
    subs: [{
      type: "std",
      label: "Predškoláci (3–6 r.)",
      count: 52
    }, {
      type: "std",
      label: "Jasle (do 3 r.)",
      count: 32
    }, {
      type: "diet",
      label: "NO GLUTEN",
      count: 4
    }, {
      type: "diet",
      label: "NO MILK",
      count: 3
    }],
    diets: [{
      name: "NO GLUTEN",
      count: 4
    }, {
      name: "NO MILK",
      count: 3
    }]
  }, {
    id: 2,
    name: "ZŠ Vajnorská 47",
    std: 156,
    note: "",
    subs: [{
      type: "std",
      label: "1. stupeň",
      count: 98
    }, {
      type: "std",
      label: "2. stupeň",
      count: 58
    }, {
      type: "diet",
      label: "VEGE",
      count: 11
    }, {
      type: "diet",
      label: "NONONO",
      count: 2
    }],
    diets: [{
      name: "VEGE",
      count: 11
    }, {
      name: "NONONO",
      count: 2
    }]
  }, {
    id: 3,
    name: "MŠ Slnečnica",
    std: 46,
    note: "",
    subs: [{
      type: "std",
      label: "Predškoláci (3–6 r.)",
      count: 46
    }, {
      type: "diet",
      label: "NO MILK / NO GLUTEN",
      count: 2
    }],
    diets: [{
      name: "NO MILK / NO GLUTEN",
      count: 2
    }]
  }];

  // grams helper — plausible totals per component for a given count
  const gramsFor = (count, g) => Math.round(count * g);
  function Dashboard() {
    const [dateLabel] = useState("štvrtok, 12. jún 2025");
    const [expanded, setExpanded] = useState([1]);
    const toggle = id => setExpanded(e => e.includes(id) ? e.filter(x => x !== id) : [...e, id]);
    const flatComps = useMemo(() => COL_GROUPS.flatMap(cg => cg.comps.map(c => ({
      ...c,
      hue: cg.hue
    }))), []);
    const totalCols = flatComps.length;

    // grand totals per component across all operations
    const grand = flatComps.map(c => {
      const totalCount = ROWS.reduce((s, r) => s + r.std, 0);
      return gramsFor(totalCount, c.g);
    });
    const Download = Ic().Download,
      FileText = Ic().FileText,
      FileSpreadsheet = Ic().FileSpreadsheet,
      ChevronLeft = Ic().ChevronLeft,
      ChevronRight = Ic().ChevronRight,
      ChevronRt = Ic().ChevronRight;

    // render gram cells for a given count across all groups (muted per-column tint)
    const gramCells = count => flatComps.map((c, i) => count > 0 ? /*#__PURE__*/React.createElement("td", {
      key: i,
      className: "cell-num mh-" + c.hue + "-cell"
    }, gramsFor(count, c.g)) : /*#__PURE__*/React.createElement("td", {
      key: i,
      className: "cell-empty"
    }, "\u2014"));
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(PageHead, {
      eyebrow: "Preh\u013Ead",
      title: "Gram\xE1\u017E jed\xE1l",
      desc: dateLabel,
      actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
        className: "zpa-btn zpa-btn--danger",
        onClick: () => window.adToast("Generujem PDF…")
      }, /*#__PURE__*/React.createElement(FileText, null), "Stiahnu\u0165 PDF"), /*#__PURE__*/React.createElement("button", {
        className: "zpa-btn zpa-btn--primary",
        onClick: () => window.adToast("Generujem XLSX…")
      }, /*#__PURE__*/React.createElement(FileSpreadsheet, null), "Stiahnu\u0165 XLSX"))
    }), /*#__PURE__*/React.createElement("div", {
      className: "zpa-stack"
    }, /*#__PURE__*/React.createElement("div", {
      className: "zpa-card"
    }, /*#__PURE__*/React.createElement("div", {
      className: "zpa-datenav"
    }, /*#__PURE__*/React.createElement("button", {
      className: "zpa-navchip",
      onClick: () => window.adToast("Predchádzajúci pracovný deň")
    }, /*#__PURE__*/React.createElement(ChevronLeft, null), "Predch\xE1dzaj\xFAci de\u0148"), /*#__PURE__*/React.createElement("div", {
      className: "mid"
    }, /*#__PURE__*/React.createElement("div", {
      className: "curr"
    }, dateLabel), /*#__PURE__*/React.createElement("span", {
      className: "zpa-badge zpa-badge--orange"
    }, "Dnes")), /*#__PURE__*/React.createElement("button", {
      className: "zpa-navchip",
      disabled: true
    }, "Nasleduj\xFAci de\u0148", /*#__PURE__*/React.createElement(ChevronRight, null)))), /*#__PURE__*/React.createElement("div", {
      className: "zpa-card",
      style: {
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "zpa-table-wrap"
    }, /*#__PURE__*/React.createElement("table", {
      className: "zpa-gram"
    }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
      className: "corner",
      rowSpan: 2
    }, "Prev\xE1dzka / Riadok"), /*#__PURE__*/React.createElement("th", {
      className: "cnt",
      rowSpan: 2
    }, "Po\u010Det"), COL_GROUPS.map(cg => /*#__PURE__*/React.createElement("th", {
      key: cg.key,
      className: "grp mh-" + cg.hue + "-1",
      colSpan: cg.comps.length
    }, cg.label, /*#__PURE__*/React.createElement("small", null, cg.tpl)))), /*#__PURE__*/React.createElement("tr", null, COL_GROUPS.map(cg => cg.comps.map((c, ci) => /*#__PURE__*/React.createElement("th", {
      key: cg.key + ci,
      className: "comp mh-" + cg.hue + "-2"
    }, c.label, /*#__PURE__*/React.createElement("small", null, c.g, c.unit || "g")))))), /*#__PURE__*/React.createElement("tbody", null, ROWS.map(row => {
      const open = expanded.includes(row.id);
      const dietTotal = row.diets.reduce((s, d) => s + d.count, 0);
      return /*#__PURE__*/React.createElement(React.Fragment, {
        key: row.id
      }, /*#__PURE__*/React.createElement("tr", {
        className: "client-row"
      }, /*#__PURE__*/React.createElement("td", {
        colSpan: 2 + totalCols
      }, /*#__PURE__*/React.createElement("button", {
        className: "client-toggle",
        onClick: () => toggle(row.id)
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          display: "inline-flex",
          alignItems: "center",
          gap: 8
        }
      }, /*#__PURE__*/React.createElement("span", {
        className: "chev" + (open ? " open" : "")
      }, /*#__PURE__*/React.createElement(ChevronRt, {
        w: 15
      })), row.name, /*#__PURE__*/React.createElement("span", {
        className: "meta"
      }, "\u0161tandard ", row.std, dietTotal ? `, diéty ${dietTotal}` : "")), /*#__PURE__*/React.createElement("span", {
        className: "meta"
      }, "spolu porci\xED ", row.std + dietTotal)))), open && row.subs.map((sr, si) => /*#__PURE__*/React.createElement("tr", {
        key: si,
        className: "sub-row" + (sr.type === "diet" ? " diet" : "")
      }, /*#__PURE__*/React.createElement("td", {
        className: "lbl"
      }, sr.type === "diet" ? "↳ " + sr.label : sr.label), /*#__PURE__*/React.createElement("td", {
        className: "cell-cnt"
      }, sr.count), gramCells(sr.count))), open && row.note && /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
        colSpan: 2 + totalCols,
        style: {
          background: "rgba(114,136,75,0.06)",
          color: "var(--green-800)",
          fontSize: 13,
          padding: "10px 20px"
        }
      }, /*#__PURE__*/React.createElement("strong", {
        style: {
          fontFamily: "var(--font-display)"
        }
      }, "Pozn\xE1mka k objedn\xE1vke:"), " ", row.note)), /*#__PURE__*/React.createElement("tr", {
        className: "summ-std"
      }, /*#__PURE__*/React.createElement("td", null, "S\xFA\u010Det bez di\xE9t"), /*#__PURE__*/React.createElement("td", {
        className: "cell-cnt",
        style: {
          color: "inherit"
        }
      }, row.std), gramCells(row.std)), row.diets.map(d => /*#__PURE__*/React.createElement("tr", {
        className: "summ-diet",
        key: d.name
      }, /*#__PURE__*/React.createElement("td", null, d.name), /*#__PURE__*/React.createElement("td", {
        className: "cell-cnt",
        style: {
          color: "inherit"
        }
      }, d.count), gramCells(d.count))));
    })), /*#__PURE__*/React.createElement("tfoot", null, /*#__PURE__*/React.createElement("tr", {
      className: "band"
    }, /*#__PURE__*/React.createElement("td", {
      colSpan: 2 + totalCols
    }, "S\xFAhrn porci\xED")), COL_GROUPS.map(cg => {
      const cnt = ROWS.reduce((s, r) => s + r.std, 0);
      return /*#__PURE__*/React.createElement("tr", {
        key: cg.key,
        style: {
          background: "var(--bg-cream-warm)"
        }
      }, /*#__PURE__*/React.createElement("td", {
        style: {
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          color: "var(--green-800)",
          paddingLeft: 20
        }
      }, cg.label), /*#__PURE__*/React.createElement("td", {
        className: "cell-cnt"
      }, cnt), flatComps.map((c, i) => c.hue === cg.hue ? /*#__PURE__*/React.createElement("td", {
        key: i,
        className: "cell-num mh-" + c.hue + "-cell"
      }, gramsFor(cnt, c.g)) : /*#__PURE__*/React.createElement("td", {
        key: i,
        className: "cell-empty"
      }, "\u2014")));
    }), /*#__PURE__*/React.createElement("tr", {
      className: "total"
    }, /*#__PURE__*/React.createElement("td", {
      className: "corner",
      colSpan: 2,
      style: {
        textAlign: "left"
      }
    }, "CELKOM (g / ml)"), grand.map((g, i) => /*#__PURE__*/React.createElement("td", {
      key: i
    }, g.toLocaleString("sk-SK"))))))))));
  }
  window.DashboardScreen = Dashboard;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin_app/dash.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin_app/edupage.jsx
try { (() => {
/* global React, PageHead */
// Objednávky (Edupage) — date, per-operation status grid, drop zone, uploaded list.

(function () {
  const {
    useState
  } = React;
  const Ic = () => window.AdIcons;
  const SCHOOLS = [{
    id: 2,
    name: "ZŠ Vajnorská 47",
    uploaded: true,
    count: 1
  }, {
    id: 4,
    name: "ZŠ Nábrežná",
    uploaded: true,
    count: 2
  }, {
    id: 6,
    name: "ZŠ Karloveská",
    uploaded: false,
    count: 0
  }, {
    id: 7,
    name: "Gymnázium Metodova",
    uploaded: false,
    count: 0
  }];
  const UPLOADED = [{
    id: 1,
    file: "vajnorska_2025-06-12.xml",
    op: "ZŠ Vajnorská 47",
    status: "processed",
    when: "12.6.2025 07:41"
  }, {
    id: 2,
    file: "nabrezna_ranajky.xml",
    op: "ZŠ Nábrežná",
    status: "processed",
    when: "12.6.2025 07:38"
  }, {
    id: 3,
    file: "nabrezna_obed.xml",
    op: "ZŠ Nábrežná",
    status: "error",
    when: "12.6.2025 07:39",
    err: "Neznámy identifikátor jedla v riadku 14."
  }];
  function Edupage() {
    const [drag, setDrag] = useState(false);
    const done = SCHOOLS.filter(s => s.uploaded).length;
    const Upload = Ic().Upload,
      Folder = Ic().Folder,
      Check = Ic().Check,
      CheckCircle = Ic().CheckCircle,
      XCircle = Ic().XCircle,
      AlertTriangle = Ic().AlertTriangle;
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(PageHead, {
      eyebrow: "Import",
      title: "Objedn\xE1vky (Edupage)",
      desc: "Nahr\xE1vanie objedn\xE1vok z Edupage exportov."
    }), /*#__PURE__*/React.createElement("div", {
      className: "zpa-stack"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "flex-end",
        gap: 24,
        flexWrap: "wrap"
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "zpa-field",
      style: {
        maxWidth: 220
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "zpa-label"
    }, "D\xE1tum objedn\xE1vok"), /*#__PURE__*/React.createElement("input", {
      className: "zpa-input",
      type: "date",
      defaultValue: "2025-06-12"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "baseline",
        gap: 8,
        paddingBottom: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        fontSize: 28,
        color: done === SCHOOLS.length ? "var(--green-600)" : "var(--green-900)"
      }
    }, done, "/", SCHOOLS.length), /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--ink-3)",
        fontSize: 14
      }
    }, "prev\xE1dzok nahrat\xFDch"))), /*#__PURE__*/React.createElement("div", {
      className: "zpa-card"
    }, /*#__PURE__*/React.createElement("div", {
      className: "zpa-card-head"
    }, /*#__PURE__*/React.createElement("h3", null, "Stav prev\xE1dzok pre 12. j\xFAn 2025")), /*#__PURE__*/React.createElement("div", {
      className: "zpa-card--pad"
    }, /*#__PURE__*/React.createElement("div", {
      className: "zpa-statusgrid"
    }, SCHOOLS.map(s => /*#__PURE__*/React.createElement("div", {
      key: s.id,
      className: "zpa-statuschip " + (s.uploaded ? "done" : "wait")
    }, /*#__PURE__*/React.createElement("span", {
      className: "ck"
    }, s.uploaded ? /*#__PURE__*/React.createElement(Check, null) : /*#__PURE__*/React.createElement("span", {
      style: {
        width: 15,
        height: 15,
        border: "2px solid currentColor",
        borderRadius: 4,
        display: "inline-block"
      }
    })), /*#__PURE__*/React.createElement("span", {
      className: "nm"
    }, s.name), s.count > 1 && /*#__PURE__*/React.createElement("span", {
      className: "n"
    }, s.count, "\xD7")))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
      style: {
        fontFamily: "var(--font-display)",
        fontSize: 15,
        fontWeight: 700,
        color: "var(--green-800)",
        margin: "0 0 12px"
      }
    }, "Nahra\u0165 s\xFAbory"), /*#__PURE__*/React.createElement("div", {
      className: "zpa-dropzone" + (drag ? " drag" : ""),
      onDragOver: e => {
        e.preventDefault();
        setDrag(true);
      },
      onDragLeave: () => setDrag(false),
      onDrop: e => {
        e.preventDefault();
        setDrag(false);
        window.adToast("Súbory pridané do fronty");
      },
      onClick: () => window.adToast("Výber súborov (demo)")
    }, /*#__PURE__*/React.createElement("div", {
      className: "ic"
    }, /*#__PURE__*/React.createElement(Folder, null)), /*#__PURE__*/React.createElement("div", {
      className: "t"
    }, "Presu\u0148 s\xFAbory sem alebo klikni pre v\xFDber"), /*#__PURE__*/React.createElement("div", {
      className: "s"
    }, "M\xF4\u017Ee\u0161 nahra\u0165 viac s\xFAborov naraz (.xml, .xlsx)"))), /*#__PURE__*/React.createElement("div", {
      className: "zpa-card"
    }, /*#__PURE__*/React.createElement("div", {
      className: "zpa-card-head"
    }, /*#__PURE__*/React.createElement("h3", null, "Nahran\xE9 s\xFAbory pre 12. j\xFAn 2025")), /*#__PURE__*/React.createElement("div", null, UPLOADED.map(u => {
      const St = u.status === "processed" ? CheckCircle : u.status === "error" ? XCircle : AlertTriangle;
      const color = u.status === "processed" ? "var(--green-600)" : u.status === "error" ? "var(--coral-600)" : "var(--mustard-700)";
      return /*#__PURE__*/React.createElement("div", {
        className: "zpa-listrow",
        key: u.id
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          alignItems: "flex-start",
          gap: 12
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          color,
          marginTop: 2
        }
      }, /*#__PURE__*/React.createElement(St, {
        w: 18
      })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
        className: "lr-ttl",
        style: {
          textTransform: "none"
        }
      }, u.file), /*#__PURE__*/React.createElement("div", {
        className: "lr-sub"
      }, u.op, " \xB7 ", u.when), u.err && /*#__PURE__*/React.createElement("div", {
        className: "lr-sub",
        style: {
          color: "var(--coral-600)"
        }
      }, u.err))), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 10
        }
      }, /*#__PURE__*/React.createElement("span", {
        className: "zpa-badge " + (u.status === "processed" ? "zpa-badge--green" : u.status === "error" ? "zpa-badge--coral" : "zpa-badge--honey")
      }, u.status === "processed" ? "Spracovaný" : u.status === "error" ? "Chyba" : "Čaká"), /*#__PURE__*/React.createElement("button", {
        className: "zpa-btn zpa-btn--ghost zpa-btn--sm",
        style: {
          color: "var(--coral-600)"
        },
        onClick: () => window.adToast("Zmazané")
      }, "Zmaza\u0165")));
    })))));
  }
  window.EdupageScreen = Edupage;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin_app/edupage.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin_app/icons.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* global React */
// Lucide-style outline icons for the Zdravý projekt admin. No emoji anywhere —
// the brand's icon family is Lucide (stroke, thin, two-tone friendly).

const AIcon = ({
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
}, Array.isArray(d) ? d.map((p, i) => /*#__PURE__*/React.createElement("path", {
  key: i,
  d: p
})) : /*#__PURE__*/React.createElement("path", {
  d: d
}));
const wrap = children => p => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 24 24",
  width: p?.w || 20,
  height: p?.w || 20,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: p?.sw || 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round"
}, children);
window.AdIcons = {
  // ── Nav ──
  Gauge: wrap(/*#__PURE__*/React.createElement(React.Fragment, null, [/*#__PURE__*/React.createElement("path", {
    key: "1",
    d: "M12 14l4-4"
  }), /*#__PURE__*/React.createElement("path", {
    key: "2",
    d: "M3.34 19a10 10 0 1 1 17.32 0"
  })])),
  CalendarDays: wrap(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "4",
    width: "18",
    height: "18",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M16 2v4M8 2v4M3 10h18"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"
  }))),
  BookOpen: wrap(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"
  }))),
  Building: wrap(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "4",
    y: "2",
    width: "16",
    height: "20",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9 22v-4h6v4M9 6h.01M15 6h.01M9 10h.01M15 10h.01M9 14h.01M15 14h.01"
  }))),
  Upload: wrap(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M17 8l-5-5-5 5M12 3v12"
  }))),
  Salad: wrap(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M7 21h10M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M11.38 12a2.4 2.4 0 0 1-.4-4.77 2.4 2.4 0 0 1 3.2-2.77 2.4 2.4 0 0 1 3.47-.63 2.4 2.4 0 0 1 3.37 3.37 2.4 2.4 0 0 1-1.1 3.7"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M13 12a2.4 2.4 0 0 0-2.6-3.4"
  }))),
  Sliders: wrap(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M1 14h6M9 8h6M17 16h6"
  }))),
  Bell: wrap(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M10.3 21a1.94 1.94 0 0 0 3.4 0"
  }))),
  Shield: wrap(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
  }))),
  Umbrella: wrap(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M12 12v8a2 2 0 0 0 4 0"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 2v2M2 12a10 10 0 0 1 20 0z"
  }))),
  Scroll: wrap(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M19 17V5a2 2 0 0 0-2-2H4"
  }))),
  Cog: wrap(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
  }))),
  // ── Meals ──
  Coffee: wrap(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M17 8h1a4 4 0 1 1 0 8h-1"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M6 2v2M10 2v2M14 2v2"
  }))),
  Soup: wrap(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M12 3a1 1 0 0 0-1 1M7 3a1 1 0 0 0-1 1M17 3a1 1 0 0 0-1 1"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3 10h18M4 10a8 8 0 0 0 16 0M6 18h12"
  }))),
  Utensils: wrap(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M3 2v7c0 1.1.9 2 2 2a2 2 0 0 0 2-2V2M5 11v11"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M14 21V7c0-3 2-5 5-5v19"
  }))),
  Cookie: wrap(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8.5 8.5h.01M15 12h.01M11 15h.01M8 13h.01"
  }))),
  // ── Actions & UI ──
  Plus: p => /*#__PURE__*/React.createElement(AIcon, _extends({}, p, {
    d: "M12 5v14M5 12h14",
    sw: p?.sw || 2
  })),
  Minus: p => /*#__PURE__*/React.createElement(AIcon, _extends({}, p, {
    d: "M5 12h14",
    sw: 2
  })),
  X: p => /*#__PURE__*/React.createElement(AIcon, _extends({}, p, {
    d: "M18 6L6 18M6 6l12 12",
    sw: p?.sw || 2
  })),
  Check: p => /*#__PURE__*/React.createElement(AIcon, _extends({}, p, {
    d: "M20 6L9 17l-5-5",
    sw: p?.sw || 2
  })),
  ChevronLeft: p => /*#__PURE__*/React.createElement(AIcon, _extends({}, p, {
    d: "M15 18l-6-6 6-6",
    sw: p?.sw || 2
  })),
  ChevronRight: p => /*#__PURE__*/React.createElement(AIcon, _extends({}, p, {
    d: "M9 18l6-6-6-6",
    sw: p?.sw || 2
  })),
  ChevronDown: p => /*#__PURE__*/React.createElement(AIcon, _extends({}, p, {
    d: "M6 9l6 6 6-6",
    sw: p?.sw || 2
  })),
  Search: wrap(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "11",
    r: "7"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M21 21l-4.3-4.3"
  }))),
  Pencil: p => /*#__PURE__*/React.createElement(AIcon, _extends({}, p, {
    d: "M17 3a2.85 2.83 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z"
  })),
  Trash: wrap(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M10 11v6M14 11v6"
  }))),
  Download: wrap(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M7 10l5 5 5-5M12 15V3"
  }))),
  FileText: wrap(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M14 2v6h6M9 13h6M9 17h6M9 9h1"
  }))),
  FileSpreadsheet: wrap(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M14 2v6h6M8 13h2v5H8zM14 13h2v5h-2z"
  }))),
  LogOut: wrap(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M16 17l5-5-5-5M21 12H9"
  }))),
  Mail: wrap(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "4",
    width: "20",
    height: "16",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M22 7l-10 6L2 7"
  }))),
  Phone: wrap(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72a2 2 0 0 1 1.72 2z"
  }))),
  User: wrap(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "7",
    r: "4"
  }))),
  Info: wrap(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 16v-4M12 8h.01"
  }))),
  AlertTriangle: wrap(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 9v4M12 17h.01"
  }))),
  XCircle: wrap(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M15 9l-6 6M9 9l6 6"
  }))),
  CheckCircle: wrap(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M22 11.08V12a10 10 0 1 1-5.93-9.14"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M22 4L12 14.01l-3-3"
  }))),
  RefreshCw: wrap(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M21 2v6h-6M3 22v-6h6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3.51 9a9 9 0 0 1 14.85-3.36L21 8M3 16l2.64 2.36A9 9 0 0 0 20.49 15"
  }))),
  Send: wrap(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
  }))),
  Clock: wrap(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 6v6l4 2"
  }))),
  Sprout: wrap(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M7 20h10M10 20c5.5-2.5.8-6.4 3-10"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"
  }))),
  Bug: wrap(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M8 2l1.88 1.88M14.12 3.88L16 2M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6zM12 20v-9M6.53 9C4.6 8.8 3 7.1 3 5M6 13H2M3 21c0-2.1 1.7-3.9 3.8-4M20.97 5c0 2.1-1.6 3.8-3.5 4M22 13h-4M17.2 17c2.1.1 3.8 1.9 3.8 4"
  }))),
  Folder: wrap(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2z"
  }))),
  Link: wrap(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
  }))),
  Menu: p => /*#__PURE__*/React.createElement(AIcon, _extends({}, p, {
    d: "M3 12h18M3 6h18M3 18h18",
    sw: 2
  }))
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin_app/icons.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin_app/plan.jsx
try { (() => {
/* global React, PageHead, Modal, Field */
// Jedálniček — month calendar with a per-day meal-plan editor modal.

(function () {
  const {
    useState
  } = React;
  const Ic = () => window.AdIcons;
  const MONTHS = ["Január", "Február", "Marec", "Apríl", "Máj", "Jún", "Júl", "August", "September", "Október", "November", "December"];
  const DOW = ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"];

  // demo: which weekdays of June 2025 have a plan (+ grand grams)
  const PLANS = {
    2: "38.4 kg",
    3: "41.1 kg",
    4: "39.7 kg",
    5: "40.2 kg",
    6: "37.9 kg",
    9: "42.0 kg",
    10: "40.8 kg",
    11: "41.5 kg",
    12: "39.2 kg"
  };
  const TODAY = 12;
  const CATS = [{
    key: "breakfast_snack",
    label: "Raňajky-desiata",
    opts: ["Nátierkový chlieb (95g)", "Ovsená kaša (250g)", "Rožok s maslom (70g)"]
  }, {
    key: "soup",
    label: "Polievka",
    opts: ["Zeleninová (200ml)", "Šošovicová (220ml)", "Slepačí vývar (200ml)"]
  }, {
    key: "main_A",
    label: "Hlavný chod — Menu A",
    opts: ["Kuracie so ryžou (230g)", "Bravčové s knedľou (250g)"]
  }, {
    key: "main_B",
    label: "Hlavný chod — Menu B",
    opts: ["Cestoviny s brokolicou (240g)", "Rizoto (230g)"]
  }, {
    key: "main_V",
    label: "Hlavný chod — Menu V (vege)",
    opts: ["Šošovicový guláš (240g)", "Zeleninové karí (230g)"]
  }, {
    key: "afternoon_snack",
    label: "Olovrant",
    opts: ["Ovocie + mlieko (250g)", "Jogurt s müsli (200g)"]
  }];
  function DayEditor({
    day,
    onClose
  }) {
    const [sel, setSel] = useState({
      breakfast_snack: "Nátierkový chlieb (95g)",
      soup: "Zeleninová (200ml)",
      main_A: "Kuracie so ryžou (230g)",
      main_B: "",
      main_V: "Šošovicový guláš (240g)",
      afternoon_snack: "Ovocie + mlieko (250g)"
    });
    return /*#__PURE__*/React.createElement(Modal, {
      wide: true,
      title: `Jedálniček — ${day}. ${MONTHS[5].toLowerCase()} 2025`,
      onClose: onClose,
      foot: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
        className: "zpa-btn zpa-btn--ghost",
        onClick: onClose
      }, "Zru\u0161i\u0165"), /*#__PURE__*/React.createElement("button", {
        className: "zpa-btn zpa-btn--primary",
        onClick: () => {
          window.adToast("Jedálniček uložený");
          onClose();
        }
      }, "Ulo\u017Ei\u0165"))
    }, CATS.map(c => /*#__PURE__*/React.createElement(Field, {
      key: c.key,
      label: c.label
    }, /*#__PURE__*/React.createElement("select", {
      className: "zpa-select",
      value: sel[c.key],
      onChange: e => setSel(s => ({
        ...s,
        [c.key]: e.target.value
      }))
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "\u2014 nevybrat\xE9 \u2014"), c.opts.map(o => /*#__PURE__*/React.createElement("option", {
      key: o,
      value: o
    }, o))))), /*#__PURE__*/React.createElement("div", {
      className: "zpa-notice zpa-notice--honey"
    }, (() => {
      const Inf = Ic().Info;
      return /*#__PURE__*/React.createElement(Inf, null);
    })(), /*#__PURE__*/React.createElement("span", null, "Menu A/B/C/V s\xFA samostatn\xE9 gram\xE1\u017Ee. Prv\xFD v\xFDber Menu A sa skop\xEDruje do pr\xE1zdnych variantov; \u010Fal\u0161ie zmeny s\xFA nez\xE1visl\xE9.")));
  }
  function MealPlan() {
    const [editing, setEditing] = useState(null);
    const first = new Date(2025, 5, 1).getDay(); // June 1 2025
    const startDow = (first + 6) % 7;
    const numDays = 30;
    const cells = [...Array(startDow).fill(null), ...Array.from({
      length: numDays
    }, (_, i) => i + 1)];
    while (cells.length % 7) cells.push(null);
    const ChevronLeft = Ic().ChevronLeft,
      ChevronRight = Ic().ChevronRight;
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(PageHead, {
      eyebrow: "Pl\xE1novanie",
      title: "Jed\xE1lni\u010Dek",
      desc: "Napl\xE1nujte jed\xE1lni\u010Dek pre ka\u017Ed\xFD pracovn\xFD de\u0148."
    }), /*#__PURE__*/React.createElement("div", {
      className: "zpa-card zpa-card--pad"
    }, /*#__PURE__*/React.createElement("div", {
      className: "zpa-cal-head"
    }, /*#__PURE__*/React.createElement("button", {
      className: "zpa-navchip",
      onClick: () => window.adToast("Predošlý mesiac")
    }, /*#__PURE__*/React.createElement(ChevronLeft, null), "Predo\u0161l\xFD"), /*#__PURE__*/React.createElement("h3", null, MONTHS[5], " 2025"), /*#__PURE__*/React.createElement("button", {
      className: "zpa-navchip",
      onClick: () => window.adToast("Ďalší mesiac")
    }, "\u010Eal\u0161\xED", /*#__PURE__*/React.createElement(ChevronRight, null))), /*#__PURE__*/React.createElement("div", {
      className: "zpa-cal-dow"
    }, DOW.map(d => /*#__PURE__*/React.createElement("span", {
      key: d
    }, d))), /*#__PURE__*/React.createElement("div", {
      className: "zpa-cal-grid"
    }, cells.map((day, i) => {
      if (day === null) return /*#__PURE__*/React.createElement("div", {
        key: "e" + i,
        className: "zpa-cal-cell empty"
      });
      const col = (startDow + day - 1) % 7;
      const weekend = col >= 5;
      const plan = PLANS[day];
      return /*#__PURE__*/React.createElement("button", {
        key: day,
        className: "zpa-cal-cell" + (day === TODAY ? " today" : "") + (weekend ? " weekend" : ""),
        onClick: () => setEditing(day)
      }, /*#__PURE__*/React.createElement("span", {
        className: "dnum"
      }, day), plan && /*#__PURE__*/React.createElement("span", {
        className: "zpa-cal-plan"
      }, /*#__PURE__*/React.createElement("span", {
        className: "dot"
      }), "Pl\xE1n ", /*#__PURE__*/React.createElement("span", {
        className: "grams"
      }, "\xB7 ", plan)));
    })), /*#__PURE__*/React.createElement("div", {
      className: "zpa-cal-legend"
    }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
      className: "dot",
      style: {
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: "var(--green-600)"
      }
    }), "Existuj\xFAci pl\xE1n"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 14,
        height: 14,
        borderRadius: 4,
        border: "2px solid var(--orange-500)",
        background: "#fff4e0"
      }
    }), "Dne\u0161n\xFD de\u0148"))), editing && /*#__PURE__*/React.createElement(DayEditor, {
      day: editing,
      onClose: () => setEditing(null)
    }));
  }
  window.MealPlanScreen = MealPlan;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin_app/plan.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin_app/settings.jsx
try { (() => {
/* global React, PageHead, Modal, Field, Toggle */
// Diéty, Systémové nastavenia, Voľné dni.

(function () {
  const {
    useState
  } = React;
  const Ic = () => window.AdIcons;

  /* ── Diéty ── */
  const DIET_SEED = [{
    id: 1,
    name: "KLASIK",
    desc: "Bežná strava bez obmedzení."
  }, {
    id: 2,
    name: "VEGE",
    desc: "Vegetariánska — bez mäsa, s mliekom a vajcami."
  }, {
    id: 3,
    name: "NO MILK",
    desc: "Bez mlieka a mliečnych výrobkov."
  }, {
    id: 4,
    name: "NO GLUTEN",
    desc: "Bezlepková strava."
  }, {
    id: 5,
    name: "NO MILK / NO GLUTEN",
    desc: "Bez mlieka aj lepku."
  }, {
    id: 6,
    name: "NONONO",
    desc: "Bez mlieka, lepku, vajec a orechov."
  }, {
    id: 7,
    name: "MONTE",
    desc: "Špeciálne menu pre Montessori zariadenia."
  }];
  function Diets() {
    const [diets, setDiets] = useState(DIET_SEED);
    const [name, setName] = useState("");
    const [desc, setDesc] = useState("");
    const [edit, setEdit] = useState(null);
    const [del, setDel] = useState(null);
    const Plus = Ic().Plus,
      Pencil = Ic().Pencil,
      Trash = Ic().Trash,
      AlertTriangle = Ic().AlertTriangle;
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(PageHead, {
      eyebrow: "Nastavenia",
      title: "Spr\xE1va di\xE9t",
      desc: "Pridajte, premenujte alebo upravte popisy syst\xE9mov\xFDch di\xE9t."
    }), /*#__PURE__*/React.createElement("div", {
      className: "zpa-stack"
    }, /*#__PURE__*/React.createElement("div", {
      className: "zpa-card zpa-card--pad"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1.4fr auto",
        gap: 12,
        alignItems: "end"
      }
    }, /*#__PURE__*/React.createElement(Field, {
      label: "N\xE1zov novej di\xE9ty"
    }, /*#__PURE__*/React.createElement("input", {
      className: "zpa-input",
      value: name,
      placeholder: "napr. Bez lepku",
      onChange: e => setName(e.target.value)
    })), /*#__PURE__*/React.createElement(Field, {
      label: "Popis pre prev\xE1dzku"
    }, /*#__PURE__*/React.createElement("input", {
      className: "zpa-input",
      value: desc,
      placeholder: "Kr\xE1tky popis di\xE9ty",
      onChange: e => setDesc(e.target.value)
    })), /*#__PURE__*/React.createElement("button", {
      className: "zpa-btn zpa-btn--primary",
      disabled: !name.trim(),
      onClick: () => {
        setDiets(d => [{
          id: Date.now(),
          name: name.trim().toUpperCase(),
          desc
        }, ...d]);
        setName("");
        setDesc("");
        window.adToast("Diéta pridaná");
      }
    }, /*#__PURE__*/React.createElement(Plus, null), "Prida\u0165 di\xE9tu"))), /*#__PURE__*/React.createElement("div", {
      className: "zpa-grid-cards"
    }, diets.map(d => /*#__PURE__*/React.createElement("div", {
      className: "zpa-card zpa-card--pad",
      key: d.id,
      style: {
        display: "flex",
        justifyContent: "space-between",
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
      className: "zpa-badge zpa-badge--peach",
      style: {
        fontSize: 12
      }
    }, d.name), d.desc && /*#__PURE__*/React.createElement("p", {
      style: {
        margin: "10px 0 0",
        fontSize: 13,
        color: "var(--ink-2)",
        lineHeight: 1.5
      }
    }, d.desc)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 2
      }
    }, /*#__PURE__*/React.createElement("button", {
      className: "zpa-iconbtn",
      title: "Upravi\u0165",
      onClick: () => setEdit(d)
    }, /*#__PURE__*/React.createElement(Pencil, null)), /*#__PURE__*/React.createElement("button", {
      className: "zpa-iconbtn zpa-iconbtn--danger",
      title: "Vymaza\u0165",
      onClick: () => setDel(d)
    }, /*#__PURE__*/React.createElement(Trash, null))))))), edit && /*#__PURE__*/React.createElement(Modal, {
      title: "Premenova\u0165 di\xE9tu",
      onClose: () => setEdit(null),
      foot: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
        className: "zpa-btn zpa-btn--ghost",
        onClick: () => setEdit(null)
      }, "Zru\u0161i\u0165"), /*#__PURE__*/React.createElement("button", {
        className: "zpa-btn zpa-btn--primary",
        onClick: () => {
          setDiets(ds => ds.map(x => x.id === edit.id ? edit : x));
          setEdit(null);
          window.adToast("Diéta upravená");
        }
      }, "Ulo\u017Ei\u0165"))
    }, /*#__PURE__*/React.createElement(Field, {
      label: "N\xE1zov di\xE9ty"
    }, /*#__PURE__*/React.createElement("input", {
      className: "zpa-input",
      value: edit.name,
      onChange: e => setEdit({
        ...edit,
        name: e.target.value
      })
    })), /*#__PURE__*/React.createElement(Field, {
      label: "Popis"
    }, /*#__PURE__*/React.createElement("textarea", {
      className: "zpa-textarea",
      value: edit.desc,
      onChange: e => setEdit({
        ...edit,
        desc: e.target.value
      })
    }))), del && /*#__PURE__*/React.createElement(Modal, {
      title: "Odstr\xE1ni\u0165 di\xE9tu",
      onClose: () => setDel(null),
      icon: "AlertTriangle",
      iconKind: "danger",
      foot: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
        className: "zpa-btn zpa-btn--ghost",
        onClick: () => setDel(null)
      }, "Zru\u0161i\u0165"), /*#__PURE__*/React.createElement("button", {
        className: "zpa-btn zpa-btn--danger",
        onClick: () => {
          setDiets(ds => ds.filter(x => x.id !== del.id));
          setDel(null);
          window.adToast("Diéta odstránená");
        }
      }, "\xC1no, vymaza\u0165"))
    }, /*#__PURE__*/React.createElement("p", {
      style: {
        margin: 0,
        color: "var(--ink-2)"
      }
    }, "Naozaj chcete odstr\xE1ni\u0165 di\xE9tu ", /*#__PURE__*/React.createElement("strong", {
      style: {
        color: "var(--green-900)"
      }
    }, del.name), "? T\xE1to akcia sa ned\xE1 vr\xE1ti\u0165.")));
  }

  /* ── Systémové nastavenia ── */
  function Settings() {
    const [dl, setDl] = useState({
      b: "10:00",
      bDay: false,
      l: "10:00",
      lDay: false,
      o: "10:00",
      oDay: false
    });
    const [auto, setAuto] = useState(true);
    const [recips, setRecips] = useState(["objednavky@zdravyprojekt.sk", "kuchyna@zdravyprojekt.sk"]);
    const [newR, setNewR] = useState("");
    const DEADLINES = [["b", "Raňajky", "bDay"], ["l", "Obed", "lDay"], ["o", "Olovrant", "oDay"]];
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(PageHead, {
      eyebrow: "Nastavenia",
      title: "Syst\xE9mov\xE9 nastavenia",
      desc: "Uz\xE1vierky, automatika a kontaktn\xE9 \xFAdaje."
    }), /*#__PURE__*/React.createElement("div", {
      className: "zpa-stack",
      style: {
        maxWidth: 780
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "zpa-card"
    }, /*#__PURE__*/React.createElement("div", {
      className: "zpa-card-head"
    }, /*#__PURE__*/React.createElement("h3", null, "\u010Casy uz\xE1vierok objedn\xE1vok")), /*#__PURE__*/React.createElement("div", {
      className: "zpa-card--pad"
    }, /*#__PURE__*/React.createElement("div", {
      className: "zpa-grid-3"
    }, DEADLINES.map(([k, lbl, dk]) => /*#__PURE__*/React.createElement("div", {
      key: k,
      className: "zpa-field"
    }, /*#__PURE__*/React.createElement("span", {
      className: "zpa-label"
    }, lbl), /*#__PURE__*/React.createElement("input", {
      className: "zpa-input",
      type: "time",
      value: dl[k],
      onChange: e => setDl({
        ...dl,
        [k]: e.target.value
      })
    }), /*#__PURE__*/React.createElement("label", {
      className: "zpa-check",
      onClick: () => setDl({
        ...dl,
        [dk]: !dl[dk]
      }),
      style: {
        marginTop: 4,
        fontSize: 12.5
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "box" + (dl[dk] ? "" : ""),
      style: {
        width: 18,
        height: 18,
        background: dl[dk] ? "var(--green-600)" : "var(--bg-cream)",
        borderColor: dl[dk] ? "var(--green-700)" : "var(--line-strong)",
        color: "#fff"
      }
    }, dl[dk] && (() => {
      const C = Ic().Check;
      return /*#__PURE__*/React.createElement(C, {
        w: 12
      });
    })()), "Uz\xE1vierka de\u0148 vopred")))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "flex-end",
        marginTop: 20,
        paddingTop: 16,
        borderTop: "1px solid var(--line-soft)"
      }
    }, /*#__PURE__*/React.createElement("button", {
      className: "zpa-btn zpa-btn--primary",
      onClick: () => window.adToast("Nastavenia uložené")
    }, "Ulo\u017Ei\u0165 zmeny")))), /*#__PURE__*/React.createElement("div", {
      className: "zpa-card zpa-card--pad"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        gap: 24,
        alignItems: "flex-start"
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
      style: {
        fontFamily: "var(--font-display)",
        fontSize: 17,
        fontWeight: 700,
        color: "var(--green-900)",
        margin: "0 0 4px"
      }
    }, "EduPage automatika"), /*#__PURE__*/React.createElement("p", {
      style: {
        margin: 0,
        fontSize: 13.5,
        color: "var(--ink-3)",
        lineHeight: 1.5
      }
    }, "Automatick\xE9 \u010D\xEDtanie objedn\xE1vok z EduPage pred uz\xE1vierkami. Manu\xE1lne na\u010D\xEDtanie zostane dostupn\xE9.")), /*#__PURE__*/React.createElement(Toggle, {
      on: auto,
      onChange: setAuto
    }))), /*#__PURE__*/React.createElement("div", {
      className: "zpa-card"
    }, /*#__PURE__*/React.createElement("div", {
      className: "zpa-card-head"
    }, /*#__PURE__*/React.createElement("h3", null, "Kontakt pre prev\xE1dzky"), /*#__PURE__*/React.createElement("p", null, "Zobrazuje sa prev\xE1dzkam pri porci\xE1ch a di\xE9tach.")), /*#__PURE__*/React.createElement("div", {
      className: "zpa-card--pad zpa-grid-2",
      style: {
        gap: 14
      }
    }, /*#__PURE__*/React.createElement(Field, {
      label: "Meno kontaktnej osoby"
    }, /*#__PURE__*/React.createElement("input", {
      className: "zpa-input",
      defaultValue: "Janka Uhr\xEDkov\xE1"
    })), /*#__PURE__*/React.createElement(Field, {
      label: "Rola / pozn\xE1mka"
    }, /*#__PURE__*/React.createElement("input", {
      className: "zpa-input",
      defaultValue: "Koordin\xE1torka stravovania"
    })), /*#__PURE__*/React.createElement(Field, {
      label: "Email"
    }, /*#__PURE__*/React.createElement("input", {
      className: "zpa-input",
      type: "email",
      defaultValue: "janka@zdravyprojekt.sk"
    })), /*#__PURE__*/React.createElement(Field, {
      label: "Telef\xF3n"
    }, /*#__PURE__*/React.createElement("input", {
      className: "zpa-input",
      type: "tel",
      defaultValue: "+421 903 123 456"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        gridColumn: "1 / -1",
        display: "flex",
        justifyContent: "flex-end"
      }
    }, /*#__PURE__*/React.createElement("button", {
      className: "zpa-btn zpa-btn--primary",
      onClick: () => window.adToast("Kontakt uložený")
    }, "Ulo\u017Ei\u0165 kontakt")))), /*#__PURE__*/React.createElement("div", {
      className: "zpa-card"
    }, /*#__PURE__*/React.createElement("div", {
      className: "zpa-card-head"
    }, /*#__PURE__*/React.createElement("h3", null, "Pr\xEDjemcovia denn\xE9ho reportu"), /*#__PURE__*/React.createElement("p", null, "Na tieto adresy sa posiela denn\xFD preh\u013Ead objedn\xE1vok (XLSX).")), /*#__PURE__*/React.createElement("div", {
      className: "zpa-card--pad"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 10,
        marginBottom: 14
      }
    }, /*#__PURE__*/React.createElement("input", {
      className: "zpa-input",
      type: "email",
      placeholder: "email@priklad.sk",
      value: newR,
      onChange: e => setNewR(e.target.value),
      onKeyDown: e => {
        if (e.key === "Enter" && newR.trim()) {
          setRecips(r => [...r, newR.trim()]);
          setNewR("");
          window.adToast("Príjemca pridaný");
        }
      }
    }), /*#__PURE__*/React.createElement("button", {
      className: "zpa-btn zpa-btn--primary",
      onClick: () => {
        if (newR.trim()) {
          setRecips(r => [...r, newR.trim()]);
          setNewR("");
          window.adToast("Príjemca pridaný");
        }
      }
    }, "Prida\u0165")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 8
      }
    }, recips.map(e => /*#__PURE__*/React.createElement("div", {
      key: e,
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "var(--bg-cream-soft)",
        borderRadius: "var(--radius-md)",
        padding: "12px 16px"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        color: "var(--ink-1)"
      }
    }, e), /*#__PURE__*/React.createElement("button", {
      className: "zpa-btn zpa-btn--ghost zpa-btn--sm",
      style: {
        color: "var(--coral-600)"
      },
      onClick: () => {
        setRecips(r => r.filter(x => x !== e));
        window.adToast("Príjemca odstránený");
      }
    }, "Odstr\xE1ni\u0165"))))))));
  }

  /* ── Voľné dni ── */
  const HOL_SEED = [{
    id: 1,
    date: "2025-07-01",
    reason: "Letné prázdniny",
    up: true
  }, {
    id: 2,
    date: "2025-07-05",
    reason: "Sviatok — sv. Cyril a Metod",
    up: true
  }, {
    id: 3,
    date: "2025-08-29",
    reason: "Výročie SNP",
    up: true
  }, {
    id: 4,
    date: "2025-05-01",
    reason: "Sviatok práce",
    up: false
  }];
  const fmt = s => new Intl.DateTimeFormat("sk-SK", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(s + "T12:00:00"));
  function Holidays() {
    const [tab, setTab] = useState("single");
    const [hols, setHols] = useState(HOL_SEED);
    const up = hols.filter(h => h.up),
      past = hols.filter(h => !h.up);
    const Trash = Ic().Trash;
    const Row = ({
      h
    }) => /*#__PURE__*/React.createElement("div", {
      className: "zpa-listrow" + (h.up ? "" : " past")
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "lr-ttl"
    }, fmt(h.date)), h.reason && /*#__PURE__*/React.createElement("div", {
      className: "lr-sub"
    }, h.reason)), /*#__PURE__*/React.createElement("button", {
      className: "zpa-iconbtn zpa-iconbtn--danger",
      title: "Odstr\xE1ni\u0165",
      onClick: () => {
        setHols(x => x.filter(y => y.id !== h.id));
        window.adToast("Voľný deň odstránený");
      }
    }, /*#__PURE__*/React.createElement(Trash, null)));
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(PageHead, {
      eyebrow: "Nastavenia",
      title: "Vo\u013En\xE9 dni",
      desc: "V tieto dni nie je mo\u017En\xE9 zada\u0165 objedn\xE1vku. Nastavte jednotliv\xE9 dni alebo cel\xFD \xFAsek."
    }), /*#__PURE__*/React.createElement("div", {
      className: "zpa-stack",
      style: {
        maxWidth: 780
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "zpa-card",
      style: {
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "zpa-tabs"
    }, /*#__PURE__*/React.createElement("button", {
      className: "zpa-tab" + (tab === "single" ? " active" : ""),
      onClick: () => setTab("single")
    }, "+ Prida\u0165 de\u0148"), /*#__PURE__*/React.createElement("button", {
      className: "zpa-tab" + (tab === "range" ? " active" : ""),
      onClick: () => setTab("range")
    }, "+ Prida\u0165 \xFAsek dn\xED")), /*#__PURE__*/React.createElement("div", {
      className: "zpa-card--pad"
    }, tab === "single" ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "zpa-grid-2"
    }, /*#__PURE__*/React.createElement(Field, {
      label: "D\xE1tum"
    }, /*#__PURE__*/React.createElement("input", {
      className: "zpa-input",
      type: "date"
    })), /*#__PURE__*/React.createElement(Field, {
      label: "Pozn\xE1mka",
      hint: "(nepovinn\xE9)"
    }, /*#__PURE__*/React.createElement("input", {
      className: "zpa-input",
      placeholder: "napr. Sviatok, dovolenka\u2026"
    }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
      className: "zpa-btn zpa-btn--primary",
      onClick: () => window.adToast("Voľný deň pridaný")
    }, "Prida\u0165 de\u0148"))) : /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "zpa-grid-3"
    }, /*#__PURE__*/React.createElement(Field, {
      label: "Od"
    }, /*#__PURE__*/React.createElement("input", {
      className: "zpa-input",
      type: "date"
    })), /*#__PURE__*/React.createElement(Field, {
      label: "Do"
    }, /*#__PURE__*/React.createElement("input", {
      className: "zpa-input",
      type: "date"
    })), /*#__PURE__*/React.createElement(Field, {
      label: "Pozn\xE1mka",
      hint: "(nepovinn\xE9)"
    }, /*#__PURE__*/React.createElement("input", {
      className: "zpa-input",
      placeholder: "napr. Viano\u010Dn\xE9 sviatky"
    }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
      className: "zpa-btn zpa-btn--primary",
      onClick: () => window.adToast("Úsek pridaný")
    }, "Prida\u0165 \xFAsek"))))), /*#__PURE__*/React.createElement("div", {
      className: "zpa-card"
    }, /*#__PURE__*/React.createElement("div", {
      className: "zpa-card-head"
    }, /*#__PURE__*/React.createElement("h3", null, "Nastaven\xE9 vo\u013En\xE9 dni")), /*#__PURE__*/React.createElement("div", null, up.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "zpa-listgroup-label"
    }, "Nadch\xE1dzaj\xFAce"), up.map(h => /*#__PURE__*/React.createElement(Row, {
      key: h.id,
      h: h
    }))), past.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "zpa-listgroup-label"
    }, "Minul\xE9"), past.map(h => /*#__PURE__*/React.createElement(Row, {
      key: h.id,
      h: h
    })))))));
  }
  window.DietsScreen = Diets;
  window.SettingsScreen = Settings;
  window.HolidaysScreen = Holidays;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin_app/settings.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin_app/shell.jsx
try { (() => {
/* global React */
// Admin shell: sidebar navigation, user footer, logout modal, and shared UI
// primitives (Modal, Toast, Field, Card) reused across screens.

const {
  useState,
  useEffect
} = React;
const I = () => window.AdIcons;

/* ── Navigation model ── */
const NAV = [{
  type: "item",
  id: "dashboard",
  label: "Prehľad",
  icon: "Gauge"
}, {
  type: "item",
  id: "meal-plan",
  label: "Jedálniček",
  icon: "CalendarDays"
}, {
  type: "item",
  id: "catalog",
  label: "Katalóg jedál",
  icon: "BookOpen"
}, {
  type: "section",
  label: "Prevádzky",
  icon: "Building"
}, {
  type: "item",
  id: "clients",
  label: "Správa prevádzok",
  icon: "Building"
}, {
  type: "section",
  label: "Import",
  icon: "Upload"
}, {
  type: "item",
  id: "edupage",
  label: "Objednávky (Edupage)",
  icon: "Upload"
}, {
  type: "section",
  label: "Nastavenia",
  icon: "Cog"
}, {
  type: "item",
  id: "diets",
  label: "Diéty",
  icon: "Salad"
}, {
  type: "item",
  id: "settings",
  label: "Systémové nastavenia",
  icon: "Sliders"
}, {
  type: "item",
  id: "holidays",
  label: "Voľné dni",
  icon: "Umbrella"
}, {
  type: "item",
  id: "logs",
  label: "Logy",
  icon: "Scroll"
}, {
  type: "section",
  label: "Komunikácia",
  icon: "Bell"
}, {
  type: "item",
  id: "notifications",
  label: "Notifikácie",
  icon: "Bell"
}, {
  type: "section",
  label: "Oprávnenia",
  icon: "Shield"
}, {
  type: "item",
  id: "admins",
  label: "Správa adminov",
  icon: "Shield"
}];

/* ── Toast (module-level emitter so any screen can call it) ── */
let _toastFn = null;
function toast(message, kind) {
  if (_toastFn) _toastFn(message, kind);
}
window.adToast = toast;
function Toast() {
  const [t, setT] = useState(null);
  useEffect(() => {
    _toastFn = (message, kind) => {
      setT({
        message,
        kind,
        id: Date.now()
      });
      clearTimeout(Toast._to);
      Toast._to = setTimeout(() => setT(null), 2600);
    };
    return () => {
      _toastFn = null;
    };
  }, []);
  if (!t) return null;
  const Ic = t.kind === "err" ? I().XCircle : I().CheckCircle;
  return /*#__PURE__*/React.createElement("div", {
    className: "zpa-toast" + (t.kind === "err" ? " err" : ""),
    key: t.id
  }, /*#__PURE__*/React.createElement(Ic, null), /*#__PURE__*/React.createElement("span", null, t.message));
}

/* ── Shared primitives ── */
function Field({
  label,
  req,
  hint,
  children
}) {
  return /*#__PURE__*/React.createElement("label", {
    className: "zpa-field"
  }, label && /*#__PURE__*/React.createElement("span", {
    className: "zpa-label"
  }, label, req && /*#__PURE__*/React.createElement("span", {
    className: "req"
  }, "*"), hint && /*#__PURE__*/React.createElement("span", {
    className: "hint"
  }, hint)), children);
}
function Toggle({
  on,
  onChange
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "zpa-switch" + (on ? " on" : ""),
    onClick: () => onChange(!on),
    "aria-pressed": on
  });
}
function Checkbox({
  on,
  onChange,
  children
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "zpa-check" + (on ? " on" : ""),
    onClick: () => onChange(!on)
  }, /*#__PURE__*/React.createElement("span", {
    className: "box"
  }, on && /*#__PURE__*/React.createElement(I.Check, null)), children);
}
// Checkbox uses I.Check — resolve at render:
function CheckboxReal({
  on,
  onChange,
  children
}) {
  const Ck = I().Check;
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "zpa-check" + (on ? " on" : ""),
    onClick: () => onChange(!on)
  }, /*#__PURE__*/React.createElement("span", {
    className: "box"
  }, on && /*#__PURE__*/React.createElement(Ck, null)), children);
}
function Modal({
  title,
  onClose,
  children,
  foot,
  wide,
  icon,
  iconKind
}) {
  const X = I().X;
  return /*#__PURE__*/React.createElement("div", {
    className: "zpa-scrim",
    onMouseDown: e => {
      if (e.target === e.currentTarget) onClose && onClose();
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "zpa-modal" + (wide ? " zpa-modal--wide" : "")
  }, title !== undefined && /*#__PURE__*/React.createElement("div", {
    className: "zpa-modal-head"
  }, /*#__PURE__*/React.createElement("h3", null, title), onClose && /*#__PURE__*/React.createElement("button", {
    className: "zpa-modal-close",
    onClick: onClose,
    "aria-label": "Zavrie\u0165"
  }, /*#__PURE__*/React.createElement(X, null))), /*#__PURE__*/React.createElement("div", {
    className: "zpa-modal-body"
  }, icon && (() => {
    const Ic = I()[icon];
    return /*#__PURE__*/React.createElement("div", {
      className: "zpa-modal-icon " + (iconKind || "")
    }, /*#__PURE__*/React.createElement(Ic, null));
  })(), children), foot && /*#__PURE__*/React.createElement("div", {
    className: "zpa-modal-foot"
  }, foot)));
}
function PageHead({
  eyebrow,
  title,
  desc,
  actions
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "zpa-pagehead"
  }, /*#__PURE__*/React.createElement("div", null, eyebrow && /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, eyebrow), /*#__PURE__*/React.createElement("h1", null, title), desc && /*#__PURE__*/React.createElement("p", null, desc)), actions && /*#__PURE__*/React.createElement("div", {
    className: "actions"
  }, actions));
}
function SearchBox({
  value,
  onChange,
  placeholder
}) {
  const S = I().Search;
  return /*#__PURE__*/React.createElement("div", {
    className: "zpa-search"
  }, /*#__PURE__*/React.createElement(S, null), /*#__PURE__*/React.createElement("input", {
    className: "zpa-input",
    value: value,
    placeholder: placeholder,
    onChange: e => onChange(e.target.value)
  }));
}

/* ── The shell ── */
function AdminShell({
  route,
  onNavigate,
  children
}) {
  const [logoutOpen, setLogoutOpen] = useState(false);
  const Icons = I();
  const Sprout = Icons.Sprout,
    LogOut = Icons.LogOut;
  return /*#__PURE__*/React.createElement("div", {
    className: "zpa-app"
  }, /*#__PURE__*/React.createElement("aside", {
    className: "zpa-sidebar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zpa-side-inner"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zpa-brand"
  }, /*#__PURE__*/React.createElement("div", {
    className: "brand-mini"
  }, /*#__PURE__*/React.createElement("img", {
    src: "logo-zdravy-projekt.png",
    alt: "Zdrav\xFD projekt"
  })), /*#__PURE__*/React.createElement("div", {
    className: "brand-full"
  }, /*#__PURE__*/React.createElement("img", {
    src: "logo-zdravy-projekt.png",
    alt: "Zdrav\xFD projekt"
  }), /*#__PURE__*/React.createElement("span", {
    className: "badge"
  }, "Administr\xE1cia"))), /*#__PURE__*/React.createElement("nav", {
    className: "zpa-nav"
  }, NAV.map((n, i) => {
    if (n.type === "section") {
      const Sc = Icons[n.icon];
      return /*#__PURE__*/React.createElement("div", {
        className: "zpa-nav-section",
        key: "s" + i
      }, /*#__PURE__*/React.createElement(Sc, null), /*#__PURE__*/React.createElement("span", {
        className: "lbl"
      }, n.label));
    }
    const Ic = Icons[n.icon];
    return /*#__PURE__*/React.createElement("button", {
      key: n.id,
      className: "zpa-nav-item" + (route === n.id ? " active" : ""),
      onClick: () => onNavigate(n.id),
      title: n.label
    }, /*#__PURE__*/React.createElement(Ic, null), /*#__PURE__*/React.createElement("span", {
      className: "lbl"
    }, n.label));
  })), /*#__PURE__*/React.createElement("div", {
    className: "zpa-user"
  }, /*#__PURE__*/React.createElement("div", {
    className: "avatar"
  }, "J"), /*#__PURE__*/React.createElement("div", {
    className: "body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "nm"
  }, "Janka Uhr\xEDkov\xE1"), /*#__PURE__*/React.createElement("div", {
    className: "em"
  }, "janka@zdravyprojekt.sk")), /*#__PURE__*/React.createElement("button", {
    className: "logout",
    onClick: () => setLogoutOpen(true),
    title: "Odhl\xE1si\u0165 sa"
  }, /*#__PURE__*/React.createElement(LogOut, null))))), /*#__PURE__*/React.createElement("main", {
    className: "zpa-main",
    id: "zpa-main"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zpa-content"
  }, children)), logoutOpen && /*#__PURE__*/React.createElement(Modal, {
    title: "Naozaj sa chcete odhl\xE1si\u0165?",
    onClose: () => setLogoutOpen(false),
    foot: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
      className: "zpa-btn zpa-btn--ghost",
      onClick: () => setLogoutOpen(false)
    }, "Zru\u0161i\u0165"), /*#__PURE__*/React.createElement("button", {
      className: "zpa-btn zpa-btn--danger",
      onClick: () => {
        setLogoutOpen(false);
        toast("Odhlásené (demo)");
      }
    }, "Odhl\xE1si\u0165 sa"))
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      color: "var(--ink-2)"
    }
  }, "Budete presmerovan\xFD na prihlasovaciu obrazovku.")), /*#__PURE__*/React.createElement(Toast, null));
}
Object.assign(window, {
  AdminShell,
  Modal,
  Field,
  Toggle,
  Checkbox: CheckboxReal,
  PageHead,
  SearchBox,
  NAV
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin_app/shell.jsx", error: String((e && e.message) || e) }); }

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

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Modal = __ds_scope.Modal;

__ds_ns.PageHead = __ds_scope.PageHead;

__ds_ns.SearchBox = __ds_scope.SearchBox;

__ds_ns.StatCard = __ds_scope.StatCard;

__ds_ns.Tabs = __ds_scope.Tabs;

__ds_ns.TextField = __ds_scope.TextField;

__ds_ns.Toggle = __ds_scope.Toggle;

})();

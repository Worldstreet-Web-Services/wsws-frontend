import {
  require_dayjs_min
} from "./lib.KT6MWEZ3.js";
import {
  Chart,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  TimeScale,
  index,
  plugin_title,
  plugin_tooltip
} from "./lib.SHTOLDQD.js";
import {
  start
} from "./lib.QPVUN6AP.js";
import {
  apiArgs,
  transformWikiHtml,
  wikiBooksUrl
} from "./lib.CARBOP2Y.js";
import {
  require_dist
} from "./lib.3VFZRSDR.js";
import {
  initMiniBoards
} from "./lib.LY6FZSW3.js";
import "./lib.KC3NJ77S.js";
import "./lib.NNS7OYZ5.js";
import "./lib.LYPETE66.js";
import "./lib.ILS4LNPZ.js";
import "./lib.GSUEVEQG.js";
import "./lib.JUCKJNFH.js";
import "./lib.PM233RJM.js";
import "./lib.23HTWUBN.js";
import "./lib.GOC3UD5K.js";
import "./lib.WVJXH4CQ.js";
import "./lib.2L7Z4FRN.js";
import "./lib.YID4KMSR.js";
import "./lib.2DWRH35C.js";
import {
  text,
  url
} from "./lib.M3IF75DN.js";
import "./lib.AXX3QIAX.js";
import {
  requestIdleCallbackSafe
} from "./lib.GK2I5IFJ.js";
import {
  __toESM
} from "./lib.KO2KTNGK.js";

// ../opening/src/chart.ts
var import_dayjs = __toESM(require_dayjs_min(), 1);
Chart.register(
  LineController,
  LinearScale,
  PointElement,
  LineElement,
  plugin_tooltip,
  index,
  plugin_title,
  TimeScale
);
var firstDate = (0, import_dayjs.default)("2017-01-01");
var renderHistoryChart = (data) => {
  if (!data.history.some((p) => p > 0)) return;
  const canvas = $(".opening__popularity__chart")[0];
  new Chart(canvas, {
    type: "line",
    data: {
      datasets: [
        {
          data: data.history.map((n, i) => ({ x: firstDate.add(i, "M").valueOf(), y: n })),
          borderColor: "hsl(37 74% 43%)",
          backgroundColor: "hsl(37 74% 43% / 0.5)",
          fill: true
        }
      ]
    },
    options: {
      animation: false,
      scales: {
        x: {
          type: "time",
          time: {
            tooltipFormat: "MMMM YYYY"
          },
          display: false
        },
        y: {
          title: {
            display: true,
            text: "Popularity in %"
          }
        }
      },
      // https://www.chartjs.org/docs/latest/configuration/responsive.html
      // responsive: false, // just doesn't work
      interaction: {
        mode: "index",
        intersect: false
      },
      parsing: false,
      normalized: true
    }
  });
};

// ../opening/src/panels.ts
function panels_default(panels, onSelect) {
  $(panels).find(".tab-list__tab").on("click", (e) => {
    const panelId = e.target.getAttribute("aria-controls");
    $(e.target.parentNode).find('[aria-selected="true"]').attr("aria-selected", "false");
    e.target.setAttribute("aria-selected", true);
    $(panels).find('[role="tabpanel"]').addClass("none");
    $(panels).find(`#${panelId}`).removeClass("none");
    onSelect(panelId);
  });
  const selected = $(panels).find('[role="tab"][aria-selected="true"]').attr("aria-controls");
  if (selected) onSelect(selected);
}

// ../opening/src/search.ts
var import_debounce_promise = __toESM(require_dist(), 1);
function init() {
  const debounced = (0, import_debounce_promise.default)((str) => {
    const q = str.trim();
    if (q)
      text(url("/opening", { q })).then((html) => {
        selectResults().replaceWith(html).removeClass("none");
        initMiniBoards();
      });
    else {
      selectResults().addClass("none");
    }
  }, 150);
  $(".opening__search-form__input").on("input", (e) => {
    debounced(e.target.value);
  });
}
var selectResults = () => $(".opening__search__results");

// ../opening/src/wiki.ts
function wikiTheory(data) {
  $(".opening__wiki__markup__placeholder").each(function() {
    const wrap = $(this);
    fetchAndRender(data, (html) => wrap.html(html));
  });
}
async function fetchAndRender(data, render) {
  var _a;
  const plyPrefix = (ply) => `${Math.floor((ply + 1) / 2)}${ply % 2 === 1 ? "._" : "..."}`;
  const pathParts = data.sans.map((san, i) => `${plyPrefix(i + 1)}${san}`);
  const path = (_a = pathParts.join("/").replace(/[+!#?]/g, "")) != null ? _a : "";
  if (pathParts.length > 30 || !path || path.length > 255 - 21) return;
  const title = `Chess_Opening_Theory/${path}`;
  try {
    const res = await fetch(`${wikiBooksUrl}/w/api.php?titles=${title}&${apiArgs}`);
    if (res.ok) {
      const json = await res.json();
      const page2 = json.query.pages[0];
      if (!page2.missing) {
        if (page2.invalid) {
          console.warn("invalid request: " + page2.invalidreason);
        } else if (!page2.extract) {
          console.warn("error: unexpected API response: " + JSON.stringify(page2));
        } else {
          return render(transformWikiHtml(page2.extract, title));
        }
      }
    }
  } catch (err) {
    console.warn(err);
  }
}

// ../opening/src/opening.ts
function initModule(data) {
  data ? page(data) : init();
}
function page(data) {
  $(".opening__intro .lpv").each(function() {
    start(this, {
      pgn: this.dataset["pgn"],
      initialPly: "last",
      showMoves: "bottom",
      showClocks: false,
      showPlayers: false,
      chessground: cgConfig,
      menu: {
        getPgn: {
          enabled: true,
          fileName: (this.dataset["title"] || this.dataset["pgn"] || "opening").replace(" ", "_") + ".pgn"
        }
      }
    });
  });
  initMiniBoards();
  highlightNextPieces();
  panels_default($(".opening__panels"), (id) => {
    if (id === "opening-panel-games") loadExampleGames();
  });
  init();
  requestIdleCallbackSafe(() => {
    renderHistoryChart(data);
    wikiTheory(data);
  });
}
var cgConfig = {
  coordinates: false
};
var loadExampleGames = () => $(".opening__games .lpv--todo").removeClass("lpv--todo").each(function() {
  start(this, {
    pgn: this.dataset["pgn"],
    initialPly: parseInt(this.dataset["ply"] || "99"),
    showMoves: "bottom",
    showClocks: false,
    showPlayers: true,
    chessground: cgConfig,
    menu: {
      getPgn: {
        enabled: true,
        fileName: (this.dataset["title"] || "game").replace(" ", "_") + ".pgn"
      }
    }
  });
});
var highlightNextPieces = () => {
  $(".opening__next cg-board").each(function() {
    Array.from($(this).find(".last-move")).map((el) => el.style.transform).forEach((transform) => {
      $(this).find(`piece[style="transform: ${transform};"]`).addClass("highlight");
    });
  });
};
export {
  initModule
};
//# sourceMappingURL=opening.2RFZOCDL.js.map

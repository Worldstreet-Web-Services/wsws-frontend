import {
  Chart,
  LineElement,
  PointElement,
  RadarController,
  RadialLinearScale,
  index,
  plugin_tooltip
} from "./lib.Q3AEFXB3.js";
import {
  currentTheme
} from "./lib.S3TIZ2HQ.js";
import "./lib.LWF5S4ZV.js";
import "./lib.5I4BSVKX.js";
import "./lib.NFSQQWN5.js";
import "./lib.GMEH5BEF.js";
import "./lib.KO2KTNGK.js";

// ../puzzle/src/puzzle.dashboard.ts
Chart.register(RadarController, RadialLinearScale, PointElement, LineElement, plugin_tooltip, index);
function initModule(data) {
  const canvas = document.querySelector(".puzzle-dashboard__radar");
  const d = data.radar;
  if (!(d == null ? void 0 : d.datasets.length) || !canvas) return;
  d.datasets[0] = {
    ...d.datasets[0],
    backgroundColor: "rgb(189 130 35 / 0.2)",
    borderColor: "rgb(189 130 35 / 1)",
    pointBackgroundColor: "rgb(189 130 35 / 1)"
  };
  const fontColor = currentTheme() === "dark" ? "#bababa" : "#4d4d4d";
  const lineColor = "rgb(127 127 127 / 0.3)";
  new Chart(canvas, {
    type: "radar",
    data: d,
    options: {
      aspectRatio: 2,
      scales: {
        r: {
          beginAtZero: false,
          suggestedMin: Math.min(d.datasets[0].data) - 100,
          ticks: {
            color: fontColor,
            showLabelBackdrop: false,
            // hide square behind text
            format: {
              useGrouping: false
            }
          },
          pointLabels: {
            color: fontColor,
            font: {
              size: window.innerWidth < 500 ? 11 : 16
            }
          },
          grid: {
            color: lineColor
          },
          angleLines: {
            color: lineColor
          }
        }
      }
    }
  });
}
export {
  initModule
};
//# sourceMappingURL=puzzle.dashboard.XLFBZF5M.js.map

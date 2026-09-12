import {
  require_dayjs_min
} from "./lib.QEA5JRKK.js";
import {
  Chart,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  TimeScale,
  index,
  plugin_tooltip
} from "./lib.Q3AEFXB3.js";
import {
  __toESM
} from "./lib.KO2KTNGK.js";

// ../fide/src/fideRatingChart.ts
var import_dayjs = __toESM(require_dayjs_min(), 1);
function initModule(opts) {
  Chart.register(
    LineController,
    LinearScale,
    PointElement,
    LineElement,
    plugin_tooltip,
    index,
    TimeScale
  );
  const ratings = [...opts.standard, ...opts.rapid, ...opts.blitz].map(decodeElo);
  const minRating = Math.min(...ratings, 2e3);
  const maxRating = Math.max(...ratings, 2800);
  for (const [tc, points] of Object.entries(opts)) {
    $(`.fide-player__rating__history--${tc}`).each(function() {
      renderRatingChart(this, points, minRating, maxRating);
    });
  }
}
var decodeElo = (point) => point % 1e4;
var decodeRatingPoint = (point) => {
  const elo = decodeElo(point);
  const dateNum = Math.floor(point / 1e4);
  const year = Math.floor(dateNum / 100);
  const month = dateNum % 100;
  return [`${year}-${month.toString().padStart(2, "0")}`, elo];
};
var renderRatingChart = (canvas, data, minRating, maxRating) => {
  const chartData = data.map(decodeRatingPoint).map(([date, elo]) => ({ x: (0, import_dayjs.default)(date).valueOf(), y: elo }));
  new Chart(canvas, {
    type: "line",
    data: {
      datasets: [
        {
          data: chartData,
          borderColor: "hsl(37 74% 43%)",
          backgroundColor: "hsl(37 74% 43% / 0.5)",
          fill: true
        }
      ]
    },
    options: {
      animation: false,
      aspectRatio: 2,
      // also in CSS for FOUC
      scales: {
        x: {
          type: "time",
          time: {
            tooltipFormat: "MMMM YYYY"
          },
          display: false
        },
        y: {
          display: false,
          min: minRating,
          max: maxRating,
          ticks: {
            format: {
              useGrouping: false
            }
          }
        }
      },
      elements: {
        point: {
          radius: 0
        },
        line: {
          tension: 0,
          borderWidth: 1
        }
      },
      interaction: {
        mode: "index",
        intersect: false
      },
      parsing: false,
      normalized: true
    }
  });
};
export {
  initModule
};
//# sourceMappingURL=fideRatingChart.DTD3ICEQ.js.map

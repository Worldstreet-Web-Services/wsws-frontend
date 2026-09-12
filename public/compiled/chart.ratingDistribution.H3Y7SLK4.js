import {
  plugin
} from "./lib.ZGBKUI6O.js";
import {
  fontFamily,
  gridColor,
  hoverBorderColor
} from "./lib.RYMCRMTK.js";
import {
  Chart,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  index,
  plugin_tooltip
} from "./lib.SHTOLDQD.js";
import "./lib.WVJXH4CQ.js";
import "./lib.2L7Z4FRN.js";
import "./lib.2DWRH35C.js";
import "./lib.AXX3QIAX.js";
import "./lib.GK2I5IFJ.js";
import "./lib.KO2KTNGK.js";

// ../chart/src/chart.ratingDistribution.ts
Chart.register(LineController, LinearScale, PointElement, LineElement, plugin_tooltip, index, plugin);
async function initModule(data) {
  $("#rating_distribution_chart").each(function() {
    var _a;
    const ratingAt = (i) => 400 + i * 25;
    const arraySum = (arr) => arr.reduce((a, b) => a + b, 0);
    const sum = arraySum(data.freq);
    const cumul = [];
    const ratings = [];
    for (let i = 0; i < data.freq.length; i++) {
      ratings.push(ratingAt(i));
      cumul.push(arraySum(data.freq.slice(0, i)) / sum);
    }
    const gradient = (_a = this.getContext("2d")) == null ? void 0 : _a.createLinearGradient(0, 0, 0, 400);
    gradient == null ? void 0 : gradient.addColorStop(0, "rgb(119 152 191 / 1)");
    gradient == null ? void 0 : gradient.addColorStop(1, "rgb(119 152 191 / 0.3)");
    const seriesCommonData = (color) => ({
      pointHoverRadius: 6,
      pointHoverBorderWidth: 2,
      pointHoverBorderColor: hoverBorderColor,
      borderColor: color,
      pointBackgroundColor: color
    });
    const maxRating = Math.max(...ratings);
    const datasets = [
      {
        ...seriesCommonData("#dddf0d"),
        data: cumul,
        yAxisID: "y2",
        label: i18n.site.cumulative,
        pointRadius: 0,
        datalabels: { display: false },
        pointHitRadius: 200
      },
      {
        ...seriesCommonData("#7798bf"),
        data: data.freq,
        backgroundColor: gradient,
        yAxisID: "y",
        fill: true,
        label: i18n.site.players,
        pointRadius: 4,
        datalabels: { display: false },
        pointHitRadius: 200
      }
    ];
    const pushLine = (color, rating, label) => datasets.push({
      ...seriesCommonData(color),
      yAxisID: "y2",
      data: [
        { x: rating, y: 0 },
        { x: rating, y: Math.max(...cumul) }
      ],
      segment: {
        borderDash: [10]
      },
      label,
      pointRadius: 4,
      datalabels: {
        align: "top",
        offset: 0,
        display: "auto",
        formatter: (value) => value.y === 0 ? "" : label,
        color
      }
    });
    if (data.myRating && data.myRating <= maxRating)
      pushLine("#55bf3b", data.myRating, `${i18n.site.yourRating} (${data.myRating})`);
    if (data.otherRating && data.otherPlayer)
      pushLine("#eeaaee", Math.min(data.otherRating, maxRating), `${data.otherPlayer} (${data.otherRating})`);
    const chartData = {
      labels: ratings,
      datasets
    };
    const config = {
      type: "line",
      data: chartData,
      options: {
        scales: {
          x: {
            type: "linear",
            min: Math.min(...ratings),
            max: maxRating,
            grid: {
              color: gridColor
            },
            ticks: {
              stepSize: 100,
              format: {
                useGrouping: false
              }
            },
            title: {
              display: true,
              text: i18n.site.glicko2Rating
            }
          },
          y: {
            grid: {
              color: gridColor,
              tickLength: 0
            },
            ticks: {
              padding: 10
            },
            title: {
              display: true,
              text: i18n.site.players
            }
          },
          y2: {
            position: "right",
            grid: {
              display: false
            },
            ticks: {
              format: {
                style: "percent",
                maximumFractionDigits: 1
              }
            },
            title: {
              display: true,
              text: i18n.site.cumulative
            }
          }
        },
        animation: false,
        locale: document.documentElement.lang,
        maintainAspectRatio: false,
        responsive: true,
        plugins: {
          tooltip: {
            titleFont: fontFamily(),
            bodyFont: fontFamily(),
            caretPadding: 8,
            callbacks: {
              label: (item) => item.datasetIndex > 1 ? item.dataset.label : void 0
            }
          }
        }
      }
    };
    new Chart(this, config);
  });
}
export {
  initModule
};
//# sourceMappingURL=chart.ratingDistribution.H3Y7SLK4.js.map

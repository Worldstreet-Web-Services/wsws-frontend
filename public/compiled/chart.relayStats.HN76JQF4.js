import {
  plugin
} from "./lib.ZGBKUI6O.js";
import "./lib.KT6MWEZ3.js";
import {
  fontColor,
  fontFamily,
  gridColor,
  hoverBorderColor,
  tooltipBgColor
} from "./lib.RYMCRMTK.js";
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
import "./lib.WVJXH4CQ.js";
import "./lib.2L7Z4FRN.js";
import "./lib.2DWRH35C.js";
import "./lib.AXX3QIAX.js";
import {
  memoize,
  notNull
} from "./lib.GK2I5IFJ.js";
import "./lib.KO2KTNGK.js";

// ../chart/src/chart.relayStats.ts
Chart.register(
  PointElement,
  TimeScale,
  plugin_tooltip,
  LinearScale,
  LineController,
  LineElement,
  index,
  plugin_title,
  plugin
);
Chart.defaults.font = fontFamily();
var dateFormat = memoize(
  () => window.Intl && Intl.DateTimeFormat ? new Intl.DateTimeFormat(site.displayLocale, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format : (d) => d.toLocaleDateString()
);
function initModule(data) {
  const $el = $(".relay-tour__stats canvas");
  makeChart($el, data);
}
var makeDataset = (data, el) => {
  var _a;
  const blue = "hsl(209, 76%, 56%)";
  const gradient = (_a = el.getContext("2d")) == null ? void 0 : _a.createLinearGradient(0, 0, 0, 400);
  gradient == null ? void 0 : gradient.addColorStop(0, "rgb(119 152 191 / 0.4)");
  gradient == null ? void 0 : gradient.addColorStop(1, "rgb(119 152 191 / 0.05)");
  const plot = [
    {
      indexAxis: "x",
      type: "line",
      data: fillData(data.viewers),
      label: data.round.name,
      pointBorderColor: "#fff",
      pointBackgroundColor: blue,
      backgroundColor: gradient,
      fill: true,
      borderColor: blue,
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 5,
      hoverBorderColor,
      tension: 0,
      datalabels: { display: false }
    }
  ];
  if (data.round.startsAt && data.viewers.length) {
    const pink = "hsl(317, 74%, 73%)";
    plot.push({
      indexAxis: "x",
      yAxisID: "y2",
      type: "line",
      data: [
        { x: data.round.startsAt, y: 0 },
        { x: data.round.startsAt, y: 100 }
      ],
      borderColor: pink,
      borderDash: [5, 5],
      datalabels: {
        align: "top",
        offset: -5,
        display: "auto",
        formatter: (value) => value.y === 0 ? "" : "Round Start",
        color: pink
      },
      pointRadius: 0,
      pointHoverRadius: 0
    });
  }
  if (data.round.finishedAt && data.viewers.length) {
    const pink = "hsl(317, 74%, 73%)";
    plot.push({
      indexAxis: "x",
      yAxisID: "y2",
      type: "line",
      data: [
        { x: data.round.finishedAt, y: 0 },
        { x: data.round.finishedAt, y: 100 }
      ],
      borderColor: pink,
      borderDash: [5, 5],
      datalabels: {
        align: "top",
        offset: -5,
        display: "auto",
        formatter: (value) => value.y === 0 ? "" : "Round Finish",
        color: pink
      },
      pointRadius: 0,
      pointHoverRadius: 0
    });
  }
  return plot;
};
var makeChart = ($el, data) => {
  const ds = makeDataset(data, $el[0]);
  const config = {
    type: "line",
    data: {
      datasets: ds
    },
    options: {
      parsing: false,
      interaction: {
        mode: "nearest",
        axis: "x",
        intersect: false
      },
      locale: document.documentElement.lang,
      maintainAspectRatio: false,
      responsive: true,
      animation: false,
      scales: {
        x: {
          type: "time",
          grid: {
            color: gridColor
          },
          border: {
            display: false
          },
          ticks: {
            maxTicksLimit: 20,
            major: {
              enabled: true
            }
          },
          title: {
            display: true,
            text: "Time",
            color: fontColor
          },
          time: {
            minUnit: "minute"
          }
        },
        y: {
          type: "linear",
          grid: {
            color: gridColor
          },
          border: {
            display: false
          },
          ticks: {
            stepSize: 1,
            maxTicksLimit: 20
          },
          title: {
            display: true,
            text: "Spectators",
            color: fontColor
          },
          min: 0
        },
        y2: {
          display: false
        }
      },
      plugins: {
        tooltip: {
          filter: (i) => i.datasetIndex === 0,
          backgroundColor: tooltipBgColor,
          bodyColor: fontColor,
          titleColor: fontColor,
          borderColor: fontColor,
          borderWidth: 1,
          caretPadding: 5,
          usePointStyle: true,
          callbacks: {
            title: (items) => items.length && items[0].parsed.x ? dateFormat()(items[0].parsed.x) : ""
          }
        },
        title: {
          display: true,
          text: data.viewers[0] ? titleText(data) : "No viewership stats yet",
          color: fontColor
        }
      }
    }
  };
  const relayChart = new Chart($el[0], config);
  relayChart.updateData = (data2) => {
    relayChart.data.datasets = makeDataset(data2, $el[0]);
    relayChart.options.plugins.title.text = titleText(data2);
    relayChart.update();
  };
  return relayChart;
};
var titleText = (data) => `${data.round.name} \u2022 Start - ${dateFormat()(data.round.startsAt)}`;
var fillData = (viewers) => {
  const points = [];
  if (!viewers.length) return [];
  const last = viewers[viewers.length - 1];
  points.push({ x: last[0], y: last[1] });
  viewers.slice(0, viewers.length - 2).reverse().forEach(([behind, v]) => {
    const minuteGap = points.find(({ x }) => notNull(x) && x - behind <= 60);
    if (!minuteGap) {
      for (let i = behind; i < points[points.length - 1].x; i += 60) points.push({ x: i, y: v });
    } else points.push({ x: behind, y: v });
  });
  return points.map((p) => ({ x: notNull(p.x) ? p.x * 1e3 : null, y: p.y })).reverse();
};
export {
  initModule as default
};
//# sourceMappingURL=chart.relayStats.HN76JQF4.js.map

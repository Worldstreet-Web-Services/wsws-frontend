import {
  plugin
} from "./lib.EUZVEQQ4.js";
import {
  fontColor,
  fontFamily
} from "./lib.YC7KWOFF.js";
import {
  ArcElement,
  Chart,
  DoughnutController,
  plugin_title
} from "./lib.Q3AEFXB3.js";
import {
  wsAverageLag,
  wsSend
} from "./lib.PNHYIP7B.js";
import "./lib.S3TIZ2HQ.js";
import "./lib.LWF5S4ZV.js";
import {
  pubsub
} from "./lib.QPQZCXK2.js";
import "./lib.5I4BSVKX.js";
import "./lib.TT4QSUKQ.js";
import "./lib.NFSQQWN5.js";
import "./lib.GMEH5BEF.js";
import "./lib.KO2KTNGK.js";

// ../chart/src/chart.lag.ts
Chart.register(DoughnutController, ArcElement, plugin, plugin_title);
Chart.defaults.font = fontFamily();
var v = {
  server: -1,
  network: -1
};
async function initModule() {
  pubsub.after("socket.hasConnected").then(() => wsSend("moveLat", true));
  $(".meter canvas").each(function(index) {
    const colors = ["#55bf3b", "#dddf0d", "#df5353"];
    const dataset = [
      {
        data: index ? [400, 200, 200] : [100, 100, 100],
        backgroundColor: colors,
        hoverBackgroundColor: colors,
        borderColor: "#d9d9d9",
        borderWidth: 3,
        circumference: 180,
        rotation: 270
      }
    ];
    const config = {
      type: "doughnut",
      data: {
        labels: index ? ["0-400", "400-600", "600-800"] : ["0-100", "100-200", "200-300"],
        datasets: dataset
      },
      options: {
        events: [],
        plugins: {
          title: {
            display: true,
            text: "",
            padding: { top: 100 },
            color: fontColor
          },
          needle: {
            value: index ? v.network : v.server
          },
          datalabels: {
            color: "black",
            formatter: (_, ctx) => ctx.chart.data.labels[ctx.dataIndex]
          }
        }
      },
      plugins: [
        {
          id: "needle",
          afterDatasetDraw(chart2, _args, _opts) {
            var _a, _b, _c;
            const ctx = chart2.ctx;
            ctx.save();
            const data = chart2.getDatasetMeta(0).data[0];
            const first = chart2.data.datasets[0].data[0];
            let dest = data.circumference / Math.PI / first;
            dest = dest * ((_c = (_b = (_a = chart2.options.plugins) == null ? void 0 : _a.needle) == null ? void 0 : _b.value) != null ? _c : 1);
            const outer = data.outerRadius;
            ctx.translate(data.x, data.y);
            ctx.rotate(Math.PI * (dest + 1.5));
            ctx.beginPath();
            ctx.fillStyle = "#838382";
            ctx.moveTo(-10, 0);
            ctx.lineWidth = 1;
            ctx.lineTo(0, -outer);
            ctx.lineTo(10, 0);
            ctx.lineTo(-10, 0);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(0, 0, 9, 0, Math.PI / 180 * 360, false);
            ctx.fill();
            ctx.restore();
          }
        }
      ]
    };
    const chart = new Chart(this, config);
    if (index === 0)
      pubsub.on("socket.in.mlat", (d) => {
        v.server = d;
        if (v.server <= 0) return;
        chart.options.plugins.needle.value = Math.min(750, v.server);
        chart.options.plugins.title.text = makeTitle(index, v.server);
        updateAnswer();
      });
    else {
      setInterval(function() {
        v.network = Math.round(wsAverageLag());
        if (v.network <= 0) return;
        chart.options.plugins.needle.value = Math.min(750, v.network);
        chart.options.plugins.title.text = makeTitle(index, v.network);
        updateAnswer();
      }, 1e3);
    }
    const updateAnswer = () => {
      if (v.server === -1 || v.network === -1) return;
      const c = v.server <= 100 && v.network <= 500 ? "nope-nope" : v.server <= 100 ? "nope-yep" : "yep";
      $(".lag .answer span").addClass("none").parent().find("." + c).removeClass("none");
      chart.update();
    };
  });
}
var makeTitle = (index, lat) => [
  (index ? "Ping" : "Server latency") + " in milliseconds",
  `${lat}`
];
export {
  initModule
};
//# sourceMappingURL=chart.lag.R2DXYICL.js.map

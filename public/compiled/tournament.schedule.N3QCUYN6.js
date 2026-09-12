import {
  perfIcons_default
} from "./lib.ZXVUOO3F.js";
import {
  icon
} from "./lib.MYPIOGN5.js";
import "./lib.LRP46MC3.js";
import "./lib.HMFK7OOB.js";
import "./lib.AEOHBIQD.js";
import "./lib.RPQH5UYI.js";
import "./lib.XAEDCBGD.js";
import "./lib.X7H2PLEK.js";
import "./lib.53PYQRAK.js";
import "./lib.CAO7TYYH.js";
import {
  wsConnect
} from "./lib.PNHYIP7B.js";
import {
  dataIcon,
  onInsert
} from "./lib.S3TIZ2HQ.js";
import {
  attributesModule,
  classModule,
  h,
  init
} from "./lib.LWF5S4ZV.js";
import {
  pubsub
} from "./lib.QPQZCXK2.js";
import {
  licon
} from "./lib.5I4BSVKX.js";
import "./lib.TT4QSUKQ.js";
import "./lib.NFSQQWN5.js";
import "./lib.GMEH5BEF.js";
import {
  __commonJS,
  __toESM
} from "./lib.KO2KTNGK.js";

// ../../../../../node_modules/.pnpm/dragscroll@0.0.8/node_modules/dragscroll/dragscroll.js
var require_dragscroll = __commonJS({
  "../../../../../node_modules/.pnpm/dragscroll@0.0.8/node_modules/dragscroll/dragscroll.js"(exports) {
    !(function(e, n) {
      "function" == typeof define && define.amd ? define(["exports"], n) : n("undefined" != typeof exports ? exports : e.dragscroll = {});
    })(exports, function(e) {
      var n, t, o = window, l = document, c = "mousemove", r = "mouseup", i = "mousedown", m = "EventListener", d = "add" + m, s = "remove" + m, f = [], u = function(e2, m2) {
        for (e2 = 0; e2 < f.length; ) m2 = f[e2++], m2 = m2.container || m2, m2[s](i, m2.md, 0), o[s](r, m2.mu, 0), o[s](c, m2.mm, 0);
        for (f = [].slice.call(l.getElementsByClassName("dragscroll")), e2 = 0; e2 < f.length; ) !(function(e3, m3, s2, f2, u2, a) {
          (a = e3.container || e3)[d](i, a.md = function(n2) {
            e3.hasAttribute("nochilddrag") && l.elementFromPoint(n2.pageX, n2.pageY) != a || (f2 = 1, m3 = n2.clientX, s2 = n2.clientY, n2.preventDefault());
          }, 0), o[d](r, a.mu = function() {
            f2 = 0;
          }, 0), o[d](c, a.mm = function(o2) {
            f2 && ((u2 = e3.scroller || e3).scrollLeft -= n = -m3 + (m3 = o2.clientX), u2.scrollTop -= t = -s2 + (s2 = o2.clientY), e3 == l.body && ((u2 = l.documentElement).scrollLeft -= n, u2.scrollTop -= t));
          }, 0);
        })(f[e2++]);
      };
      "complete" == l.readyState ? u() : o[d]("load", u, 0), e.reset = u;
    });
  }
});

// ../tournament/src/view/scheduleView.ts
var import_dragscroll = __toESM(require_dragscroll(), 1);
var scale = 8;
var now;
var startTime;
var stopTime;
var i18nNames = {};
var startDirection = () => document.dir === "rtl" ? "right" : "left";
function i18nName(t) {
  if (!i18nNames[t.id]) i18nNames[t.id] = t.fullName;
  return i18nNames[t.id];
}
function displayClockLimit(limit) {
  switch (limit) {
    case 15:
      return "\xBC";
    case 30:
      return "\xBD";
    case 45:
      return "\xBE";
    case 90:
      return "1.5";
    default:
      return limit / 60;
  }
}
function displayClock(clock) {
  return displayClockLimit(clock.limit) + "+" + clock.increment;
}
function leftPos(time) {
  const rounded = 1e3 * 60 * Math.floor(time / 1e3 / 60);
  return scale * (rounded - startTime) / 1e3 / 60;
}
function laneGrouper(t) {
  var _a, _b, _c;
  if (((_a = t.schedule) == null ? void 0 : _a.freq) === "unique") {
    return -1;
  } else if (t.variant.key !== "standard") {
    return 99;
  } else if (t.schedule && t.hasMaxRating) {
    return 50 + parseInt(t.fullName.slice(1, 5)) / 1e4;
  } else if (((_b = t.schedule) == null ? void 0 : _b.speed) === "superBlitz") {
    return t.perf.position - 0.5;
  } else if (((_c = t.schedule) == null ? void 0 : _c.speed) === "hyperBullet") {
    return 4;
  } else if (t.schedule && t.perf.key === "ultraBullet") {
    return 4;
  } else {
    return t.perf.position;
  }
}
function group(arr, grouper) {
  const groups = {};
  let g;
  arr.forEach((e) => {
    var _a;
    g = grouper(e);
    if (groups[g]) (_a = groups[g]) == null ? void 0 : _a.push(e);
    else groups[g] = [e];
  });
  return Object.keys(groups).sort().map(function(k) {
    return groups[k];
  });
}
function truncSeconds(epoch) {
  return epoch - epoch % (60 * 1e3);
}
function fitLane(lane, tour2) {
  return !lane.some(function(tour1) {
    return !(truncSeconds(tour1.finishesAt) <= truncSeconds(tour2.startsAt) || truncSeconds(tour2.finishesAt) <= truncSeconds(tour1.startsAt));
  });
}
function splitOverlapping(lanes) {
  let ret = [], i;
  lanes.forEach((lane) => {
    const newLanes = [[]];
    lane.forEach((tour) => {
      let collision = true;
      for (i = 0; i < newLanes.length; i++) {
        if (fitLane(newLanes[i], tour)) {
          newLanes[i].push(tour);
          collision = false;
          break;
        }
      }
      if (collision) newLanes.push([tour]);
    });
    ret = ret.concat(newLanes);
  });
  return ret;
}
function tournamentClass(tour) {
  const finished = tour.status === 30;
  const userCreated = tour.createdBy !== "lichess";
  const classes = {
    "tsht-rated": tour.rated,
    "tsht-casual": !tour.rated,
    "tsht-finished": finished,
    "tsht-joinable": !finished,
    "tsht-user-created": userCreated,
    "tsht-thematic": !!tour.position,
    "tsht-short": tour.minutes <= 30,
    "tsht-max-rating": !userCreated && tour.hasMaxRating,
    "tsht-variant": tour.variant.key !== "standard" && tour.variant.key !== "fromPosition"
  };
  if (tour.schedule) classes["tsht-" + tour.schedule.freq] = true;
  return classes;
}
var iconOf = (tour) => {
  var _a;
  return ((_a = tour.schedule) == null ? void 0 : _a.freq) === "shield" ? licon.Shield : perfIcons_default[tour.perf.key];
};
var mousedownAt;
function renderTournament(tour) {
  let width = tour.minutes * scale;
  const left = leftPos(tour.startsAt);
  const paddingLeft = tour.minutes < 90 ? 0 : Math.max(
    0,
    Math.min(
      width - 250,
      // max padding, reserved text space
      leftPos(now) - left - 380
    )
  );
  width = Math.min(width, leftPos(stopTime) - left);
  return h(
    "a.tsht",
    {
      class: tournamentClass(tour),
      attrs: {
        href: "/tournament/" + tour.id,
        style: "width: " + width + "px; " + startDirection() + ": " + left + "px; padding-" + startDirection() + ": " + paddingLeft + "px"
      }
    },
    [
      icon(iconOf(tour))(),
      h("span.body", [
        h("span.name", i18nName(tour)),
        h("span.infos", [
          h("span.text", [
            displayClock(tour.clock) + " ",
            tour.position ? "Thematic " : null,
            i18n.site[tour.rated ? "ratedTournament" : "casualTournament"]
          ]),
          tour.nbPlayers ? h("span.nb-players", { attrs: dataIcon(licon.User) }, tour.nbPlayers) : null
        ])
      ])
    ]
  );
}
function renderTimeline() {
  const minutesBetween = 10;
  const time = new Date(startTime);
  time.setSeconds(0);
  time.setMinutes(Math.floor(time.getMinutes() / minutesBetween) * minutesBetween);
  const timeHeaders = [];
  const count = (stopTime - startTime) / (minutesBetween * 60 * 1e3);
  for (let i = 0; i < count; i++) {
    timeHeaders.push(
      h(
        "div.timeheader",
        {
          class: { hour: !time.getMinutes() },
          attrs: { style: startDirection() + ": " + leftPos(time.getTime()) + "px" }
        },
        timeString(time)
      )
    );
    time.setUTCMinutes(time.getUTCMinutes() + minutesBetween);
  }
  timeHeaders.push(
    h("div.timeheader.now", { attrs: { style: startDirection() + ": " + leftPos(now) + "px" } })
  );
  return h("div.timeline", timeHeaders);
}
function timeString(time) {
  return ("0" + time.getHours()).slice(-2) + ":" + ("0" + time.getMinutes()).slice(-2);
}
function isSystemTournament(t) {
  return !!t.schedule;
}
function scheduleView_default(ctrl) {
  now = Date.now();
  startTime = now - 3 * 60 * 60 * 1e3;
  stopTime = startTime + 10 * 60 * 60 * 1e3;
  const data = ctrl.data();
  const systemTours = [], userTours = [];
  data.finished.concat(data.started).concat(data.created).filter((t) => t.finishesAt > startTime).forEach((t) => {
    if (isSystemTournament(t)) systemTours.push(t);
    else userTours.push(t);
  });
  const tourLanes = splitOverlapping(group(systemTours, laneGrouper).concat([userTours])).filter(
    (lane) => lane.length > 0
  );
  return h("div.tour-chart", [
    h(
      "div.tour-chart__inner.dragscroll.",
      {
        hook: onInsert((el) => {
          const bitLater = now + 15 * 60 * 1e3;
          const scroll = leftPos(bitLater - el.clientWidth / 2.5 / scale * 60 * 1e3);
          el.scrollLeft = document.dir === "rtl" ? -1 * scroll : scroll;
          import_dragscroll.default.reset();
          el.addEventListener("mousedown", (e) => {
            mousedownAt = [e.clientX, e.clientY];
          });
          el.addEventListener("click", (e) => {
            const dist = mousedownAt ? Math.abs(e.clientX - mousedownAt[0]) + Math.abs(e.clientY - mousedownAt[1]) : 0;
            if (dist > 20) {
              e.preventDefault();
              return false;
            }
            return true;
          });
        })
      },
      [
        renderTimeline(),
        ...tourLanes.map((lane) => {
          return h(
            "div.tournamentline",
            lane.map((tour) => renderTournament(tour))
          );
        })
      ]
    )
  ]);
}

// ../tournament/src/tournament.schedule.ts
var patch = init([classModule, attributesModule]);
function initModule(opts) {
  wsConnect("/socket/v5", false, { params: { flag: "tournament" } });
  const element = document.querySelector(".tour-chart");
  const ctrl = {
    data: () => opts.data
  };
  let vnode;
  function redraw() {
    vnode = patch(vnode || element, scheduleView_default(ctrl));
  }
  redraw();
  setInterval(redraw, 3700);
  pubsub.on("socket.in.reload", (d) => {
    opts.data = {
      created: update(opts.data.created, d.created),
      started: update(opts.data.started, d.started),
      finished: update(opts.data.finished, d.finished)
    };
    redraw();
  });
}
function update(prevs, news) {
  const now2 = Date.now();
  return news.concat(prevs.filter((p) => !p.schedule || p.finishesAt < now2));
}
export {
  initModule
};
//# sourceMappingURL=tournament.schedule.N3QCUYN6.js.map

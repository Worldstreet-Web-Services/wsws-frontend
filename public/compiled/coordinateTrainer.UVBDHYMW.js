import {
  makeVoice,
  renderVoiceBar
} from "./lib.ZW2QUNR4.js";
import "./lib.WB3RHOLH.js";
import "./lib.E2LEIDPC.js";
import {
  toggleZenMode
} from "./lib.ZROMAH7X.js";
import {
  colors
} from "./lib.LXQPVRII.js";
import {
  menuHover_default
} from "./lib.2OVDXZTI.js";
import {
  resizeHandle
} from "./lib.SPSB7AAJ.js";
import "./lib.CHCAIC5O.js";
import "./lib.67VUYMDO.js";
import "./lib.GD6YSPBF.js";
import {
  cmnToggleWrapProp
} from "./lib.MYPIOGN5.js";
import "./lib.LRP46MC3.js";
import "./lib.HMFK7OOB.js";
import {
  Chessground
} from "./lib.AEOHBIQD.js";
import "./lib.RPQH5UYI.js";
import "./lib.XAEDCBGD.js";
import "./lib.X7H2PLEK.js";
import {
  COLORS
} from "./lib.53PYQRAK.js";
import "./lib.CAO7TYYH.js";
import "./lib.PNHYIP7B.js";
import {
  bind,
  hl,
  isSafari,
  onInsert
} from "./lib.S3TIZ2HQ.js";
import {
  attributesModule,
  classModule,
  eventListenersModule,
  h,
  init,
  propsModule,
  styleModule
} from "./lib.LWF5S4ZV.js";
import {
  pubsub
} from "./lib.QPQZCXK2.js";
import "./lib.5I4BSVKX.js";
import {
  form,
  text
} from "./lib.TT4QSUKQ.js";
import {
  storedBooleanProp,
  storedProp
} from "./lib.NFSQQWN5.js";
import {
  myUserId,
  withEffect
} from "./lib.GMEH5BEF.js";
import {
  __commonJS,
  __toESM
} from "./lib.KO2KTNGK.js";

// ../../../../../node_modules/.pnpm/@fnando+sparkline@0.3.10/node_modules/@fnando/sparkline/dist/sparkline.commonjs2.js
var require_sparkline_commonjs2 = __commonJS({
  "../../../../../node_modules/.pnpm/@fnando+sparkline@0.3.10/node_modules/@fnando/sparkline/dist/sparkline.commonjs2.js"(exports, module) {
    module.exports = (function(t) {
      var e = {};
      function r(n) {
        if (e[n]) return e[n].exports;
        var o = e[n] = { i: n, l: false, exports: {} };
        return t[n].call(o.exports, o, o.exports, r), o.l = true, o.exports;
      }
      return r.m = t, r.c = e, r.d = function(t2, e2, n) {
        r.o(t2, e2) || Object.defineProperty(t2, e2, { enumerable: true, get: n });
      }, r.r = function(t2) {
        "undefined" != typeof Symbol && Symbol.toStringTag && Object.defineProperty(t2, Symbol.toStringTag, { value: "Module" }), Object.defineProperty(t2, "__esModule", { value: true });
      }, r.t = function(t2, e2) {
        if (1 & e2 && (t2 = r(t2)), 8 & e2) return t2;
        if (4 & e2 && "object" == typeof t2 && t2 && t2.__esModule) return t2;
        var n = /* @__PURE__ */ Object.create(null);
        if (r.r(n), Object.defineProperty(n, "default", { enumerable: true, value: t2 }), 2 & e2 && "string" != typeof t2) for (var o in t2) r.d(n, o, function(e3) {
          return t2[e3];
        }.bind(null, o));
        return n;
      }, r.n = function(t2) {
        var e2 = t2 && t2.__esModule ? function() {
          return t2.default;
        } : function() {
          return t2;
        };
        return r.d(e2, "a", e2), e2;
      }, r.o = function(t2, e2) {
        return Object.prototype.hasOwnProperty.call(t2, e2);
      }, r.p = "", r(r.s = 1);
    })([function(t, e, r) {
      var n = r(2), o = r(3), i = r(4);
      t.exports = function(t2) {
        return n(t2) || o(t2) || i();
      };
    }, function(t, e, r) {
      "use strict";
      r.r(e), r.d(e, "sparkline", function() {
        return c;
      });
      var n = r(0), o = r.n(n);
      function i(t2, e2, r2, n2) {
        return parseFloat((e2 - n2 * e2 / t2 + r2).toFixed(2));
      }
      function a(t2) {
        return t2.value;
      }
      function u(t2, e2) {
        var r2 = document.createElementNS("http://www.w3.org/2000/svg", t2);
        for (var n2 in e2) r2.setAttribute(n2, e2[n2]);
        return r2;
      }
      function c(t2, e2, r2) {
        var n2;
        if (n2 = t2, o()(n2.querySelectorAll("*")).forEach(function(t3) {
          return n2.removeChild(t3);
        }), !(e2.length <= 1)) {
          r2 = r2 || {}, "number" == typeof e2[0] && (e2 = e2.map(function(t3) {
            return { value: t3 };
          }));
          var c2 = r2.onmousemove, l = r2.onmouseout, s = "interactive" in r2 ? r2.interactive : !!c2, f = r2.spotRadius || 2, p = 2 * f, d = r2.cursorWidth || 2, v = parseFloat(t2.attributes["stroke-width"].value), b = r2.fetch || a, h2 = e2.map(function(t3) {
            return b(t3);
          }), y = parseFloat(t2.attributes.width.value) - 2 * p, x = parseFloat(t2.attributes.height.value), m = x - 2 * v - p, g = Math.max.apply(Math, o()(h2)), A = -1e3, w = h2.length - 1, j = y / w, O = [], k = i(g, m, v + f, h2[0]), S = "M".concat(p, " ").concat(k);
          h2.forEach(function(t3, r3) {
            var n3 = r3 * j + p, o2 = i(g, m, v + f, t3);
            O.push(Object.assign({}, e2[r3], { index: r3, x: n3, y: o2 })), S += " L ".concat(n3, " ").concat(o2);
          });
          var M = u("path", { class: "sparkline--line", d: S, fill: "none" }), C = u("path", { class: "sparkline--fill", d: "".concat(S, " V ").concat(x, " L ").concat(p, " ").concat(x, " Z"), stroke: "none" });
          if (t2.appendChild(C), t2.appendChild(M), s) {
            var E = u("line", { class: "sparkline--cursor", x1: A, x2: A, y1: 0, y2: x, "stroke-width": d }), _ = u("circle", { class: "sparkline--spot", cx: A, cy: A, r: f });
            t2.appendChild(E), t2.appendChild(_);
            var F = u("rect", { width: t2.attributes.width.value, height: t2.attributes.height.value, style: "fill: transparent; stroke: transparent", class: "sparkline--interaction-layer" });
            t2.appendChild(F), F.addEventListener("mouseout", function(t3) {
              E.setAttribute("x1", A), E.setAttribute("x2", A), _.setAttribute("cx", A), l && l(t3);
            }), F.addEventListener("mousemove", function(t3) {
              var e3 = t3.offsetX, r3 = O.find(function(t4) {
                return t4.x >= e3;
              });
              r3 || (r3 = O[w]);
              var n3, o2 = O[O.indexOf(r3) - 1], i2 = (n3 = o2 ? o2.x + (r3.x - o2.x) / 2 <= e3 ? r3 : o2 : r3).x, a2 = n3.y;
              _.setAttribute("cx", i2), _.setAttribute("cy", a2), E.setAttribute("x1", i2), E.setAttribute("x2", i2), c2 && c2(t3, n3);
            });
          }
        }
      }
      e.default = c;
    }, function(t, e) {
      t.exports = function(t2) {
        if (Array.isArray(t2)) {
          for (var e2 = 0, r = new Array(t2.length); e2 < t2.length; e2++) r[e2] = t2[e2];
          return r;
        }
      };
    }, function(t, e) {
      t.exports = function(t2) {
        if (Symbol.iterator in Object(t2) || "[object Arguments]" === Object.prototype.toString.call(t2)) return Array.from(t2);
      };
    }, function(t, e) {
      t.exports = function() {
        throw new TypeError("Invalid attempt to spread non-iterable instance");
      };
    }]);
  }
});

// ../coordinateTrainer/src/ctrl.ts
var import_sparkline = __toESM(require_sparkline_commonjs2());
var orientationFromColorChoice = (colorChoice) => colorChoice === "random" ? COLORS[Math.round(Math.random())] : colorChoice;
var randomChoice = (max) => Math.floor(Math.random() * max);
var newKey = (oldKey, selectedFiles, selectedRanks) => {
  const rand = randomChoice(2);
  let files = "abcdefgh".split("");
  let rows = "12345678".split("");
  if (selectedFiles == null ? void 0 : selectedFiles.size) files = files.filter((f) => selectedFiles.has(f));
  if (selectedRanks == null ? void 0 : selectedRanks.size) rows = rows.filter((r) => selectedRanks.has(r));
  if (files.length > 1 && rand === 0) files = files.filter((f) => f !== oldKey[0]);
  if (rows.length > 1 && rand === 1) rows = rows.filter((r) => r !== oldKey[1]);
  return files[randomChoice(files.length)] + rows[randomChoice(rows.length)];
};
var targetSvg = (target) => `<g transform="translate(50, 50)"><rect class="${target}-target" fill="none" stroke-width="10" x="-50" y="-50" width="100" height="100" rx="5" /></g>`;
var rankWords = {
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8"
};
var DURATION = 30 * 1e3;
var TICK_DELAY = 50;
var CoordinateTrainerCtrl = class {
  constructor(config, redraw) {
    this.config = config;
    this.redraw = redraw;
    this.currentKey = "a1";
    this.hasPlayed = false;
    this.isAuth = !!myUserId();
    this.modeScores = this.config.scores;
    this.nextKey = newKey("a1");
    this.playing = false;
    this.score = 0;
    this.timeLeft = DURATION;
    this.colorChoice = withEffect(
      storedProp("coordinateTrainer.colorChoice", "random", (str) => str),
      () => this.setOrientationFromColorChoice()
    );
    this.orientation = orientationFromColorChoice(this.colorChoice());
    this.setOrientationFromColorChoice = () => {
      this.orientation = orientationFromColorChoice(this.colorChoice());
      if (this.chessground.state.orientation !== this.orientation) this.chessground.toggleOrientation();
      this.redraw();
    };
    this.mode = withEffect(
      storedProp(
        "coordinateTrainer.mode",
        window.location.hash === "#name" ? "nameSquare" : "findSquare",
        (str) => str
      ),
      () => this.onModeChange()
    );
    this.onModeChange = () => {
      this.redraw();
      this.updateCharts();
      window.location.hash = `#${this.mode().substring(0, 4)}`;
    };
    this.selectionEnabled = withEffect(
      storedBooleanProp("coordinateTrainer.selectionEnabled", false),
      this.redraw
    );
    this.selectedFiles = /* @__PURE__ */ new Set();
    this.selectedRanks = /* @__PURE__ */ new Set();
    this.onFilesChange = (file, on) => {
      if (on) this.selectedFiles.add(file);
      else this.selectedFiles.delete(file);
    };
    this.onRanksChange = (rank, on) => {
      if (on) this.selectedRanks.add(rank);
      else this.selectedRanks.delete(rank);
    };
    this.timeControl = withEffect(
      storedProp(
        "coordinateTrainer.timeControl",
        document.body.classList.contains("kid") ? "untimed" : "thirtySeconds",
        (str) => str
      ),
      this.redraw
    );
    this.timeDisabled = () => this.timeControl() === "untimed";
    this.showCoordinates = withEffect(
      storedBooleanProp("coordinateTrainer.showCoordinates", document.body.classList.contains("kid")),
      (show) => this.onShowCoordinatesChange(show)
    );
    this.onShowCoordinatesChange = (show) => {
      var _a, _b;
      (_a = this.chessground) == null ? void 0 : _a.set({ coordinates: show });
      (_b = this.chessground) == null ? void 0 : _b.redrawAll();
    };
    this.showCoordsOnAllSquares = withEffect(
      storedBooleanProp("coordinateTrainer.showCoordsOnAllSquares", document.body.classList.contains("kid")),
      (show) => this.onShowCoordsOnAllSquaresChange(show)
    );
    this.onShowCoordsOnAllSquaresChange = (show) => {
      var _a, _b;
      (_a = this.chessground) == null ? void 0 : _a.set({ coordinatesOnSquares: show });
      (_b = this.chessground) == null ? void 0 : _b.redrawAll();
    };
    this.showPieces = withEffect(
      storedBooleanProp("coordinateTrainer.showPieces", true),
      () => this.onShowPiecesChange()
    );
    this.onShowPiecesChange = () => {
      var _a, _b;
      (_a = this.chessground) == null ? void 0 : _a.set({ fen: this.boardFEN() });
      (_b = this.chessground) == null ? void 0 : _b.redrawAll();
    };
    this.boardFEN = () => this.showPieces() ? "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR" : "8/8/8/8/8/8/8/8";
    this.coordinateInputMethod = withEffect(
      storedProp(
        "coordinateTrainer.coordinateInputMethod",
        window.innerWidth >= 980 ? "text" : "buttons",
        (str) => str
      ),
      this.redraw
    );
    this.toggleInputMethod = () => this.coordinateInputMethod(this.coordinateInputMethod() === "text" ? "buttons" : "text");
    this.start = () => {
      var _a, _b;
      if (this.playing) return;
      this.playing = true;
      this.hasPlayed = true;
      this.score = 0;
      this.timeLeft = DURATION;
      this.currentKey = "";
      this.nextKey = "";
      (_a = this.chessground) == null ? void 0 : _a.redrawAll();
      this.setOrientationFromColorChoice();
      if (this.mode() === "nameSquare") (_b = this.keyboardInput) == null ? void 0 : _b.focus();
      setTimeout(() => {
        this.advanceCoordinates();
        this.advanceCoordinates();
        this.timeAtStart = /* @__PURE__ */ new Date();
        if (!this.timeDisabled()) this.tick();
      }, 1e3);
    };
    this.tick = () => {
      if (!this.playing) return;
      const timeSpent = Math.min(DURATION, Date.now() - Number(this.timeAtStart));
      this.timeLeft = DURATION - timeSpent;
      this.redraw();
      if (this.timeLeft > 0) setTimeout(this.tick, TICK_DELAY);
      else this.stop();
    };
    this.advanceCoordinates = () => {
      var _a;
      this.currentKey = this.nextKey;
      if (this.selectionEnabled()) this.nextKey = newKey(this.nextKey, this.selectedFiles, this.selectedRanks);
      else this.nextKey = newKey(this.nextKey);
      if (this.mode() === "nameSquare")
        (_a = this.chessground) == null ? void 0 : _a.setShapes([
          { orig: this.currentKey, customSvg: { html: targetSvg("current") } },
          { orig: this.nextKey, customSvg: { html: targetSvg("next") } }
        ]);
      this.redraw();
    };
    this.stop = () => {
      var _a, _b, _c;
      if (!this.playing) return;
      this.playing = false;
      this.wrong = false;
      if (this.mode() === "nameSquare") {
        (_a = this.keyboardInput) == null ? void 0 : _a.blur();
        if (this.keyboardInput) this.keyboardInput.value = "";
      }
      if (this.timeControl() === "thirtySeconds") {
        this.updateScoreList();
        if (this.isAuth)
          text("/training/coordinate/score", {
            method: "post",
            body: form({ mode: this.mode(), color: this.orientation, score: this.score })
          });
      }
      (_b = this.chessground) == null ? void 0 : _b.setShapes([]);
      (_c = this.chessground) == null ? void 0 : _c.redrawAll();
      this.redraw();
    };
    this.updateScoreList = () => {
      const scoreList = this.modeScores[this.mode()][this.orientation];
      if (scoreList.length >= 20) this.modeScores[this.mode()][this.orientation] = scoreList.slice(1, 20);
      this.modeScores[this.mode()][this.orientation].push(this.score);
      requestAnimationFrame(() => this.updateCharts());
    };
    this.updateCharts = () => {
      for (const color of COLORS) {
        const svgElement = document.getElementById(`${color}-sparkline`);
        if (!svgElement || !(svgElement instanceof SVGSVGElement)) continue;
        this.updateChart(svgElement, color);
      }
    };
    this.updateChart = (svgElement, color) => {
      const parent = svgElement.parentElement;
      const scoreValues = this.modeScores[this.mode()][color];
      const tooltip = svgElement.nextElementSibling;
      svgElement.setAttribute("width", `${parent.offsetWidth}px`);
      const options = {
        onmousemove(_, datapoint) {
          tooltip.hidden = false;
          tooltip.textContent = scoreValues[datapoint.index].toString();
          tooltip.style.top = `${datapoint.y}px`;
          tooltip.style.left = `${datapoint.x}px`;
        },
        onmouseout() {
          tooltip.hidden = true;
        }
      };
      (0, import_sparkline.sparkline)(svgElement, scoreValues, options);
    };
    this.hasModeScores = () => this.modeScores[this.mode()].white.length + this.modeScores[this.mode()].black.length > 0;
    this.handleCorrect = () => {
      this.score++;
      this.advanceCoordinates();
      this.wrong = false;
    };
    this.handleWrong = () => {
      clearTimeout(this.wrongTimeout);
      this.wrong = true;
      this.redraw();
      this.wrongTimeout = setTimeout(() => {
        this.wrong = false;
        this.redraw();
      }, 500);
    };
    this.onChessgroundSelect = (key) => {
      if (!this.playing || this.mode() !== "findSquare") return;
      if (key === this.currentKey) this.handleCorrect();
      else this.handleWrong();
    };
    this.onRadioInputKeyUp = (e) => {
      if (!this.playing && e.key === "Enter") this.start();
    };
    this.onVoice = (txt) => {
      if (this.playing) {
        if (txt.includes("stop")) {
          this.stop();
          return;
        }
        const words = txt.split(" ").map((w) => {
          var _a;
          return (_a = rankWords[w]) != null ? _a : w;
        });
        if (this.currentKey && words.join("").includes(this.currentKey)) this.handleCorrect();
      } else if (txt.includes("start")) this.start();
    };
    this.onKeyboardInputKeyUp = (e) => {
      const input = e.target;
      input.value = input.value.toLowerCase().replace(/[^a-h1-8]/, "");
      if (!e.isTrusted || !this.playing) {
        input.value = "";
        if (e.key === "Enter") this.start();
      } else this.checkKeyboardInput();
    };
    this.checkKeyboardInput = () => {
      const input = this.keyboardInput;
      if (input.value.length === 1) {
        input.value = input.value.replace(/[^a-h]/, "");
      } else if (input.value.length === 2 && input.value === this.currentKey) {
        input.value = "";
        this.handleCorrect();
      } else if (input.value.length === 2 && !input.value.match(/[a-h][1-8]/)) {
        input.value = input.value[1];
      } else if (input.value.length >= 2) {
        input.value = "";
        this.handleWrong();
      }
    };
    pubsub.on("zen", () => toggleZenMode({ unconditional: true }));
    $("#zentog").on("click", () => pubsub.emit("zen"));
    site.mousetrap.bind("z", () => pubsub.emit("zen"));
    window.addEventListener("resize", () => requestAnimationFrame(this.updateCharts), true);
    this.voice = makeVoice({ redraw: this.redraw, tpe: "coords" });
    this.voice.mic.initRecognizer([...Array.from("abcdefgh"), ...Object.keys(rankWords), "start", "stop"], {
      partial: true,
      listener: this.onVoice.bind(this)
    });
  }
};

// ../coordinateTrainer/src/chessground.ts
function chessground_default(ctrl) {
  return h("div.cg-wrap", {
    hook: {
      ...onInsert((el) => {
        ctrl.chessground = Chessground(el, makeConfig(ctrl));
        pubsub.on("board.change", (is3d) => {
          ctrl.chessground.state.addPieceZIndex = is3d;
          ctrl.chessground.redrawAll();
        });
      }),
      destroy: () => ctrl.chessground.destroy()
    }
  });
}
function makeConfig(ctrl) {
  return {
    fen: ctrl.boardFEN(),
    orientation: ctrl.orientation,
    blockTouchScroll: true,
    coordinates: ctrl.showCoordinates(),
    coordinatesOnSquares: ctrl.showCoordsOnAllSquares(),
    addPieceZIndex: ctrl.config.is3d,
    jsHover: isSafari(),
    movable: { free: false, color: void 0 },
    drawable: { enabled: false },
    draggable: { enabled: false },
    selectable: { enabled: false },
    events: {
      insert(elements) {
        resizeHandle(elements, ctrl.config.resizePref, ctrl.playing ? 2 : 0);
      },
      select: ctrl.onChessgroundSelect
    }
  };
}

// ../coordinateTrainer/src/side.ts
var timeControls = [
  ["untimed", "\u221E"],
  ["thirtySeconds", "0:30"]
];
var filesAndRanksSelection = (ctrl) => ctrl.selectionEnabled() && ctrl.mode() === "findSquare" ? [
  h("form.files.buttons", [
    h(
      "group.radio",
      "abcdefgh".split("").map(
        (fileLetter) => h("div.file_option", [
          h("input", {
            attrs: {
              type: "checkbox",
              id: `coord_file_${fileLetter}`,
              name: "files_selection",
              value: fileLetter,
              checked: ctrl.selectedFiles.has(fileLetter)
            },
            on: {
              change: (e) => {
                const target = e.target;
                ctrl.onFilesChange(target.value, target.checked);
              },
              keyup: ctrl.onRadioInputKeyUp
            }
          }),
          h(
            `label.file_${fileLetter}`,
            { attrs: { for: `coord_file_${fileLetter}`, title: fileLetter } },
            fileLetter
          )
        ])
      )
    )
  ]),
  h("form.ranks.buttons", [
    h(
      "group.radio",
      "12345678".split("").map(
        (rank) => h("div.file_option", [
          h("input", {
            attrs: {
              type: "checkbox",
              id: `coord_rank_${rank}`,
              name: "ranks_selection",
              value: rank,
              checked: ctrl.selectedRanks.has(rank)
            },
            on: {
              change: (e) => {
                const target = e.target;
                ctrl.onRanksChange(target.value, target.checked);
              },
              keyup: ctrl.onRadioInputKeyUp
            }
          }),
          h(`label.rank_${rank}`, { attrs: { for: `coord_rank_${rank}`, title: rank } }, rank)
        ])
      )
    )
  ])
] : [];
var configurationButtons = (ctrl) => [
  h("form.mode.buttons", [
    h(
      "group.radio",
      ["findSquare", "nameSquare"].map(
        (mode) => h("div.mode_option", [
          h("input", {
            attrs: {
              type: "radio",
              id: `coord_mode_${mode}`,
              name: "mode",
              value: mode,
              checked: mode === ctrl.mode()
            },
            on: {
              change: (e) => {
                const target = e.target;
                ctrl.mode(target.value);
                if (target.value === "nameSquare") {
                  if (ctrl.voice.enabled()) ctrl.voice.mic.start();
                } else ctrl.voice.mic.stop();
              },
              keyup: ctrl.onRadioInputKeyUp
            }
          }),
          h(
            `label.mode_${mode}`,
            {
              attrs: {
                for: `coord_mode_${mode}`,
                title: i18n.coordinates[mode === "findSquare" ? "aCoordinateAppears" : "aSquareIsHighlightedExplanation"]
              }
            },
            i18n.coordinates[mode]
          )
        ])
      )
    )
  ]),
  h("form.timeControl.buttons", [
    h(
      "group.radio",
      timeControls.map(
        ([timeControl, timeControlLabel]) => h("div.timeControl_option", [
          h("input", {
            attrs: {
              type: "radio",
              id: `coord_timeControl_${timeControl}`,
              name: "timeControl",
              value: timeControl,
              checked: timeControl === ctrl.timeControl()
            },
            on: {
              change: (e) => {
                const target = e.target;
                ctrl.timeControl(target.value);
              },
              keyup: ctrl.onRadioInputKeyUp
            }
          }),
          h(
            `label.timeControl_${timeControl}`,
            {
              attrs: {
                for: `coord_timeControl_${timeControl}`,
                title: i18n.coordinates[timeControl === "thirtySeconds" ? "youHaveThirtySeconds" : "goAsLongAsYouWant"]
              }
            },
            timeControlLabel
          )
        ])
      )
    )
  ]),
  h("form.color.buttons", [
    h(
      "group.radio",
      colors.map(
        ({ key, name }) => h("div", [
          h("input", {
            attrs: {
              type: "radio",
              id: `coord_color_${key}`,
              name: "color",
              value: key,
              checked: key === ctrl.colorChoice()
            },
            on: {
              change: (e) => {
                const target = e.target;
                ctrl.colorChoice(target.value);
              },
              keyup: ctrl.onRadioInputKeyUp
            }
          }),
          h(`label.color_${key}`, { attrs: { for: `coord_color_${key}`, title: name } }, h("icon"))
        ])
      )
    )
  ])
];
var average = (array) => array.reduce((a, b) => a + b) / array.length;
var scoreCharts = (ctrl) => h(
  "div.box",
  h(
    "div.scores",
    [
      ["white", i18n.coordinates.averageScoreAsWhiteX, ctrl.modeScores[ctrl.mode()].white],
      ["black", i18n.coordinates.averageScoreAsBlackX, ctrl.modeScores[ctrl.mode()].black]
    ].map(
      ([color, fmt, scoreList]) => scoreList.length ? h("div.color-chart", [
        h("p", fmt.asArray(h("strong", average(scoreList).toFixed(2)))),
        h("div.sparkline-box", [
          h("svg.sparkline", {
            attrs: { height: "80px", "stroke-width": "3", id: `${color}-sparkline` },
            hook: { insert: (vnode) => ctrl.updateChart(vnode.elm, color) }
          }),
          h("span.sparkline-tooltip", { attrs: { hidden: true } })
        ])
      ]) : null
    )
  )
);
var scoreBox = (ctrl) => h("div.box.current-status", [h("h1", i18n.storm.score), h("div.score", ctrl.score)]);
var timeBox = (ctrl) => h("div.box.current-status", [
  h("h1", i18n.site.time),
  h("div.timer", { class: { hurry: ctrl.timeLeft <= 10 * 1e3 } }, (ctrl.timeLeft / 1e3).toFixed(1))
]);
var backButton = (ctrl) => h("div.back", h("a.back-button", { hook: bind("click", ctrl.stop) }, `\xAB ${i18n.study.back}`));
var settings = (ctrl) => {
  const { redraw, showCoordinates, showCoordsOnAllSquares, showPieces } = ctrl;
  return h("div.settings", [
    ctrl.mode() === "findSquare" ? cmnToggleWrapProp({
      id: "enableSelection",
      name: i18n.coordinates.practiceOnlySomeFilesAndRanks,
      prop: ctrl.selectionEnabled,
      redraw
    }) : null,
    ...filesAndRanksSelection(ctrl),
    cmnToggleWrapProp({
      id: "showCoordinates",
      name: i18n.coordinates.showCoordinates,
      prop: showCoordinates,
      redraw
    }),
    cmnToggleWrapProp({
      id: "showCoordsOnAllSquares",
      name: i18n.coordinates.showCoordsOnAllSquares,
      prop: showCoordsOnAllSquares,
      disabled: !ctrl.showCoordinates(),
      redraw
    }),
    cmnToggleWrapProp({
      id: "showPieces",
      name: i18n.coordinates.showPieces,
      prop: showPieces,
      redraw
    })
  ]);
};
var playingAs = (ctrl) => {
  return h("div.box.current-status.current-status--color", [
    h(`label.color_${ctrl.orientation}`, h("icon")),
    h("em", i18n.site[ctrl.orientation === "white" ? "youPlayTheWhitePieces" : "youPlayTheBlackPieces"])
  ]);
};
var side = (ctrl) => h(
  "div.side",
  ctrl.playing ? [
    scoreBox(ctrl),
    !ctrl.timeDisabled() ? timeBox(ctrl) : null,
    playingAs(ctrl),
    ctrl.isAuth && ctrl.hasModeScores() ? scoreCharts(ctrl) : null,
    ctrl.timeDisabled() ? backButton(ctrl) : null
  ] : [
    ctrl.hasPlayed ? scoreBox(ctrl) : null,
    ...configurationButtons(ctrl),
    ctrl.isAuth && ctrl.hasModeScores() ? scoreCharts(ctrl) : null,
    settings(ctrl)
  ]
);
var side_default = side;

// ../coordinateTrainer/src/view.ts
var textOverlay = (ctrl) => {
  return ctrl.playing && ctrl.mode() === "findSquare" && hl(
    "svg.coords-svg",
    { attrs: { viewBox: "0 0 100 100" } },
    ["current", "next"].map(
      (modifier) => hl(
        `g.${modifier}`,
        {
          key: `${ctrl.score}-${modifier}`,
          style: modifier === "current" ? {
            remove: { opacity: 0, transform: "translate(-8px, 60px)" }
          } : void 0
        },
        hl("text", modifier === "current" ? ctrl.currentKey : ctrl.nextKey)
      )
    )
  );
};
var explanation = (ctrl) => {
  return hl("div.explanation.box", [
    hl("h1", i18n.coordinates.coordinates),
    hl("p", i18n.coordinates.knowingTheChessBoard),
    hl("ul", [
      hl("li", i18n.coordinates.mostChessCourses),
      hl("li", i18n.coordinates.talkToYourChessFriends),
      hl("li", i18n.coordinates.youCanAnalyseAGameMoreEffectively)
    ]),
    hl("strong", i18n.coordinates[ctrl.mode()]),
    hl(
      "p",
      i18n.coordinates[ctrl.mode() === "findSquare" ? "aCoordinateAppears" : "aSquareIsHighlightedExplanation"]
    ),
    hl(
      "p",
      i18n.coordinates[ctrl.timeControl() === "thirtySeconds" ? "youHaveThirtySeconds" : "goAsLongAsYouWant"]
    )
  ]);
};
var table = (ctrl) => {
  return hl("div.table", [
    !ctrl.hasPlayed && explanation(ctrl),
    !ctrl.playing && hl(
      "button.start.button.button-fat",
      { hook: bind("click", ctrl.start) },
      i18n.coordinates.startTraining
    )
  ]);
};
var progress = (ctrl) => {
  return hl(
    "div.progress",
    ctrl.hasPlayed && hl("div.progress__bar", { style: { width: `${100 * (1 - ctrl.timeLeft / DURATION)}%` } })
  );
};
var coordinateInput = (ctrl) => {
  const coordinateInput2 = [
    ctrl.coordinateInputMethod() === "buttons" && hl(
      "div.files-ranks",
      "abcdefgh12345678".split("").map(
        (fileOrRank) => hl(
          "button.file-rank",
          {
            on: {
              click: () => {
                if (ctrl.playing) {
                  ctrl.keyboardInput.value += fileOrRank;
                  ctrl.checkKeyboardInput();
                }
              }
            }
          },
          fileOrRank
        )
      )
    ),
    hl("div.voice-container", renderVoiceBar(ctrl.voice, ctrl.redraw, "coords")),
    hl("div.keyboard-container", [
      hl("span", [
        hl("input.keyboard", {
          hook: onInsert((el) => ctrl.keyboardInput = el),
          on: { keyup: ctrl.onKeyboardInputKeyUp }
        }),
        ctrl.playing ? hl("span", "Enter the coordinate") : hl("strong", "Press <enter> to start")
      ]),
      hl(
        "a",
        { on: { click: () => ctrl.toggleInputMethod() } },
        ctrl.coordinateInputMethod() === "text" ? "Show buttons" : "Hide buttons"
      )
    ])
  ];
  return ctrl.mode() === "nameSquare" && hl("div.coordinate-input", coordinateInput2);
};
var view = (ctrl) => hl("div.trainer", { class: { wrong: ctrl.wrong } }, [
  side_default(ctrl),
  hl("div.main-board", chessground_default(ctrl)),
  textOverlay(ctrl),
  table(ctrl),
  progress(ctrl),
  coordinateInput(ctrl)
]);
var view_default = view;

// ../coordinateTrainer/src/coordinateTrainer.ts
var patch = init([classModule, attributesModule, propsModule, eventListenersModule, styleModule]);
function initModule(config) {
  const ctrl = new CoordinateTrainerCtrl(config, redraw);
  const element = document.getElementById("trainer");
  element.innerHTML = "";
  const inner = document.createElement("div");
  element.appendChild(inner);
  let vnode = patch(inner, view_default(ctrl));
  function redraw() {
    vnode = patch(vnode, view_default(ctrl));
  }
  menuHover_default();
}
export {
  initModule
};
//# sourceMappingURL=coordinateTrainer.UVBDHYMW.js.map

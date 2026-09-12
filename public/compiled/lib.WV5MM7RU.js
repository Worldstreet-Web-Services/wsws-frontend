import {
  resizeHandle
} from "./lib.3NURFI3P.js";
import {
  Coords,
  ShowResizeHandle
} from "./lib.TSMVECCD.js";
import {
  initMiniBoardWith
} from "./lib.LY6FZSW3.js";
import {
  opposite as opposite2,
  uciToMove
} from "./lib.ILS4LNPZ.js";
import {
  Chess,
  chessgroundDests,
  makeFen,
  parseFen,
  san_exports
} from "./lib.JUCKJNFH.js";
import {
  opposite,
  parseUci
} from "./lib.PM233RJM.js";
import {
  isSafari,
  onInsert
} from "./lib.WVJXH4CQ.js";
import {
  h
} from "./lib.2L7Z4FRN.js";
import {
  storage
} from "./lib.AXX3QIAX.js";
import {
  defined,
  toggle
} from "./lib.GK2I5IFJ.js";

// ../lib/src/puz/util.ts
var getNow = () => Math.round(performance.now());
var puzzlePov = (puzzle) => opposite(parseFen(puzzle.fen).unwrap().turn);
var loadSound = (name, volume, delay) => {
  setTimeout(() => site.sound.load(name, site.sound.url(`${name}.mp3`)), delay || 1e3);
  return () => site.sound.play(name, volume);
};
var sound = {
  good: loadSound("lisp/PuzzleStormGood", 0.9, 1e3),
  wrong: loadSound("lisp/Error", 1, 1e3),
  end: loadSound("lisp/PuzzleStormEnd", 1, 5e3)
};

// ../lib/src/puz/clock.ts
var Clock = class {
  constructor(config, startedMillisAgo = 0) {
    this.config = config;
    this.start = () => {
      if (!this.startAt) this.startAt = getNow();
    };
    this.started = () => !!this.startAt;
    this.millis = () => this.startAt ? Math.max(0, this.startAt + this.initialMillis - getNow()) : this.initialMillis;
    this.addSeconds = (seconds) => {
      this.initialMillis += seconds * 1e3;
    };
    this.flag = () => !this.millis();
    this.initialMillis = config.clock.initial * 1e3 - startedMillisAgo;
  }
};

// ../lib/src/puz/combo.ts
var Combo = class {
  constructor(config) {
    this.config = config;
    this.current = 0;
    this.best = 0;
    this.inc = () => {
      this.current++;
      this.best = Math.max(this.best, this.current);
    };
    this.reset = () => {
      this.current = 0;
    };
    this.level = () => this.config.combo.levels.reduce(
      (lvl, [threshold, _], index) => threshold <= this.current ? index : lvl,
      0
    );
    this.percent = () => {
      const lvl = this.level();
      const levels = this.config.combo.levels;
      const lastLevel = levels[levels.length - 1];
      if (lvl >= levels.length - 1) {
        const range = lastLevel[0] - levels[levels.length - 2][0];
        return (this.current - lastLevel[0]) / range * 100 % 100;
      }
      const bounds = [levels[lvl][0], levels[lvl + 1][0]];
      return Math.floor((this.current - bounds[0]) / (bounds[1] - bounds[0]) * 100);
    };
    this.bonus = () => {
      if (this.percent() === 0) {
        const level = this.level();
        if (level > 0)
          return {
            seconds: this.config.combo.levels[level][1],
            at: getNow()
          };
      }
      return void 0;
    };
  }
};

// ../lib/src/puz/current.ts
var CurrentPuzzle = class {
  constructor(index, puzzle) {
    this.index = index;
    this.puzzle = puzzle;
    this.moveIndex = -1;
    this.position = (index = this.moveIndex + 1) => {
      const pos = Chess.fromSetup(parseFen(this.puzzle.fen).unwrap()).unwrap();
      if (index >= 0) this.line.slice(0, index).forEach((uci) => pos.play(parseUci(uci)));
      return pos;
    };
    this.expectedMove = () => this.line[this.moveIndex + 1];
    this.lastMove = () => this.line[this.moveIndex];
    this.isOver = () => this.moveIndex >= this.line.length - 1;
    this.line = puzzle.line.split(" ");
    this.pov = opposite(parseFen(puzzle.fen).unwrap().turn);
    this.startAt = getNow();
  }
  playSound(prev) {
    let prevSan = "";
    if (prev) {
      const index = prev !== this ? prev.line.length - 1 : this.moveIndex - 1;
      if (index > -1) prevSan = san_exports.makeSan(prev.position(index), parseUci(prev.line[index]));
    }
    const currSan = san_exports.makeSan(
      this.position(this.moveIndex),
      parseUci(this.line[Math.max(this.moveIndex, 0)])
    );
    const combined = this.isOver() ? prevSan : prevSan + currSan;
    site.sound.move({ san: combined, uci: this.lastMove() });
  }
};

// ../lib/src/puz/filters.ts
var PuzFilters = class {
  constructor(redraw, skip) {
    this.fail = toggle(false, redraw);
    this.slow = toggle(false, redraw);
    this.skip = skip ? toggle(false, redraw) : void 0;
  }
};

// ../lib/src/puz/run.ts
var makeCgOpts = (run, canMove, flipped) => {
  const cur = run.current;
  const pos = cur.position();
  return {
    fen: makeFen(pos.toSetup()),
    orientation: flipped ? opposite2(run.pov) : run.pov,
    turnColor: pos.turn,
    movable: {
      color: run.pov,
      dests: canMove ? chessgroundDests(pos) : void 0
    },
    check: pos.isCheck(),
    lastMove: uciToMove(cur.lastMove()),
    animation: {
      enabled: cur.moveIndex >= 0
    }
  };
};
var povMessage = (run) => run.pov === "white" ? i18n.storm.youPlayTheWhitePiecesInAllPuzzles : i18n.storm.youPlayTheBlackPiecesInAllPuzzles;

// ../lib/src/puz/view/clock.ts
var refreshInterval;
var lastText;
function renderClock(run, onFlag, withBonus) {
  return h("div.puz-clock__time", {
    hook: {
      ...onInsert((el) => {
        el.innerText = formatMs(run.clock.millis());
        refreshInterval = setInterval(() => renderIn(run, onFlag, el, withBonus), 100);
      }),
      destroy() {
        if (refreshInterval) clearInterval(refreshInterval);
      }
    }
  });
}
function renderIn(run, onFlag, el, withBonus) {
  if (!run.clock.startAt) return;
  const mods = run.modifier;
  const now = getNow();
  const millis = run.clock.millis();
  const diffs = withBonus ? computeModifierDiff(now, mods.bonus) - computeModifierDiff(now, mods.malus) : 0;
  const text = formatMs(millis - diffs);
  if (text !== lastText) el.innerText = text;
  lastText = text;
  if (millis < 1 && !run.endAt) onFlag();
}
var pad = (x) => (x < 10 ? "0" : "") + x;
var formatMs = (millis) => {
  const date = new Date(Math.max(0, Math.ceil(millis / 1e3) * 1e3)), minutes = date.getUTCMinutes(), seconds = date.getUTCSeconds();
  return minutes + ":" + pad(seconds);
};
function computeModifierDiff(now, mod) {
  const millisSince = mod && (now - mod.at < 1e3 ? now - mod.at : void 0);
  return defined(millisSince) ? mod.seconds * 1e3 * (1 - millisSince / 1e3) : 0;
}

// ../lib/src/puz/view/history.ts
var slowPuzzleIds = (ctrl) => {
  if (!ctrl.filters.slow() || !ctrl.run.history.length) return void 0;
  const mean = ctrl.run.history.reduce((a, r) => a + r.millis, 0) / ctrl.run.history.length;
  const threshold = mean * 1.5;
  return new Set(ctrl.run.history.filter((r) => r.millis > threshold).map((r) => r.puzzle.id));
};
var toggleButton = (prop, title) => h(
  "button.puz-history__filter.button",
  {
    class: { active: prop(), "button-empty": !prop },
    hook: onInsert((e) => e.addEventListener("click", prop.toggle))
  },
  title
);
var history_default = (ctrl) => {
  const slowIds = slowPuzzleIds(ctrl), filters = ctrl.filters, buttons = [
    toggleButton(filters.fail, i18n.storm.failedPuzzles),
    toggleButton(filters.slow, i18n.storm.slowPuzzles)
  ];
  if (filters.skip) buttons.push(toggleButton(filters.skip, i18n.storm.skippedPuzzle));
  return h("div.puz-history.box.box-pad", [
    h("div.box__top", [h("h2", i18n.storm.puzzlesPlayed), h("div.box__top__actions", buttons)]),
    h(
      "div.puz-history__rounds",
      ctrl.run.history.filter(
        (r) => (!r.win || !filters.fail()) && (!slowIds || slowIds.has(r.puzzle.id)) && (!filters.skip || !filters.skip() || r.puzzle.id === ctrl.run.skipId)
      ).map(
        (round) => h("div.puz-history__round", { key: round.puzzle.id }, [
          h(`a.puz-history__round__puzzle.mini-board.cg-wrap.is2d.${round.win ? "good" : "bad"}`, {
            attrs: {
              href: `/training/${round.puzzle.id}`,
              target: "_blank"
            },
            hook: onInsert((e) => {
              const pos = Chess.fromSetup(parseFen(round.puzzle.fen).unwrap()).unwrap();
              const uci = round.puzzle.line.split(" ")[0];
              pos.play(parseUci(uci));
              initMiniBoardWith(e, {
                fen: makeFen(pos.toSetup()),
                orientation: pos.turn,
                lastMove: uciToMove(uci)
              });
            })
          }),
          h("span.puz-history__round__meta", [
            h("span.puz-history__round__result", [
              h(round.win ? "good" : "bad", Math.round(round.millis / 1e3) + "s"),
              ctrl.pref.ratings ? h("rating", round.puzzle.rating) : ""
            ]),
            h("span.puz-history__round__id", "#" + round.puzzle.id)
          ])
        ])
      )
    )
  ]);
};

// ../lib/src/puz/view/util.ts
var playModifiers = (run) => {
  const now = getNow();
  const malus = run.modifier.malus;
  const bonus = run.modifier.bonus;
  return {
    "puz-mod-puzzle": run.current.startAt > now - 90,
    "puz-mod-move": run.modifier.moveAt > now - 90,
    "puz-mod-malus-slow": !!malus && malus.at > now - 950,
    "puz-mod-bonus-slow": !!bonus && bonus.at > now - 950
  };
};
var renderCombo = (config, renderBonus) => (run) => {
  const level = run.combo.level();
  return h("div.puz-combo", [
    h("div.puz-combo__counter", [
      h("span.puz-combo__counter__value", run.combo.current),
      h("span.puz-combo__counter__combo", "COMBO")
    ]),
    h("div.puz-combo__bars", [
      h("div.puz-combo__bar", [
        h("div.puz-combo__bar__in", { attrs: { style: `width:${run.combo.percent()}%` } }),
        h("div.puz-combo__bar__in-full")
      ]),
      h(
        "div.puz-combo__levels",
        [0, 1, 2, 3].map(
          (l) => h(
            "div.puz-combo__level",
            { class: { active: l < level } },
            h("span", renderBonus(config.combo.levels[l + 1][1]))
          )
        )
      )
    ])
  ]);
};

// ../lib/src/puz/view/chessground.ts
function makeConfig(opts, pref, userMove) {
  return {
    fen: opts.fen,
    orientation: opts.orientation,
    turnColor: opts.turnColor,
    check: opts.check,
    lastMove: opts.lastMove,
    coordinates: pref.coords !== Coords.Hidden,
    coordinatesOnSquares: pref.coords === Coords.All,
    addPieceZIndex: pref.is3d,
    addDimensionsCssVarsTo: document.body,
    jsHover: isSafari(),
    movable: {
      free: false,
      color: opts.movable.color,
      dests: opts.movable.dests,
      showDests: pref.destination,
      rookCastle: pref.rookCastle
    },
    draggable: {
      enabled: pref.moveEvent > 0,
      showGhost: pref.highlight
    },
    selectable: {
      enabled: pref.moveEvent !== 1
    },
    events: {
      move: userMove,
      insert(elements) {
        resizeHandle(elements, ShowResizeHandle.OnlyAtStart, 0, (p) => p === 0);
      }
    },
    premovable: {
      enabled: false
    },
    drawable: {
      enabled: true,
      defaultSnapToValidMove: storage.boolean("arrow.snap").getOrDefault(true)
    },
    highlight: {
      lastMove: pref.highlight,
      check: pref.highlight
    },
    animation: {
      duration: pref.animation
    },
    disableContextMenu: true
  };
}

export {
  getNow,
  puzzlePov,
  sound,
  Clock,
  Combo,
  CurrentPuzzle,
  PuzFilters,
  makeCgOpts,
  povMessage,
  renderClock,
  history_default,
  playModifiers,
  renderCombo,
  makeConfig
};
//# sourceMappingURL=lib.WV5MM7RU.js.map

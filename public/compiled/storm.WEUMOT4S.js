import {
  Clock,
  Combo,
  CurrentPuzzle,
  PuzFilters,
  getNow,
  history_default,
  makeCgOpts,
  makeConfig,
  playModifiers,
  povMessage,
  puzzlePov,
  renderClock,
  renderCombo,
  sound
} from "./lib.WV5MM7RU.js";
import {
  toggleZenMode
} from "./lib.FP5W4O7U.js";
import {
  menuHover_default
} from "./lib.ZWX3OLRL.js";
import {
  PromotionCtrl
} from "./lib.EWOOJSE7.js";
import "./lib.3NURFI3P.js";
import "./lib.TSMVECCD.js";
import {
  numberSpread
} from "./lib.EJQKEWZT.js";
import {
  a,
  button,
  div,
  icon,
  main,
  makeExoticTag,
  p,
  span,
  strong,
  table,
  tbody,
  td,
  th,
  tr
} from "./lib.LY6FZSW3.js";
import "./lib.KC3NJ77S.js";
import "./lib.NNS7OYZ5.js";
import {
  Chessground
} from "./lib.LYPETE66.js";
import "./lib.ILS4LNPZ.js";
import "./lib.GSUEVEQG.js";
import "./lib.JUCKJNFH.js";
import {
  parseUci
} from "./lib.PM233RJM.js";
import "./lib.23HTWUBN.js";
import {
  wsSend
} from "./lib.GOC3UD5K.js";
import {
  dataIcon,
  onInsert
} from "./lib.WVJXH4CQ.js";
import {
  attributesModule,
  classModule,
  init
} from "./lib.2L7Z4FRN.js";
import {
  pubsub
} from "./lib.YID4KMSR.js";
import {
  licon
} from "./lib.2DWRH35C.js";
import {
  form,
  json
} from "./lib.M3IF75DN.js";
import {
  storage
} from "./lib.AXX3QIAX.js";
import {
  prop
} from "./lib.GK2I5IFJ.js";
import "./lib.KO2KTNGK.js";

// ../lib/src/puz/sign.ts
function sign_default(serverKey) {
  const otp = randomAscii(64);
  wsSend("sk1", `${serverKey}!${otp}`);
  return new Promise((solve) => pubsub.on("socket.in.sk1", (encrypted) => solve(xor(encrypted, otp))));
}
function xor(a2, b) {
  const result = [];
  for (let i = 0; i < a2.length; i++) result.push(String.fromCharCode(a2.charCodeAt(i) ^ b.charCodeAt(i)));
  return result.join("");
}
function randomAscii(length) {
  const result = [];
  for (let i = 0; i < length; i++) result.push(String.fromCharCode(34 + Math.floor(Math.random() * 92)));
  return result.join("");
}

// ../storm/src/config.ts
var config = {
  // all times in seconds
  clock: {
    initial: 3 * 60,
    // initial: 10,
    malus: 10
  },
  combo: {
    levels: [
      [0, 0],
      [5, 3],
      [12, 5],
      [20, 7],
      [30, 10]
    ]
  },
  timeToStart: 1e3 * 60 * 2,
  minFirstMoveTime: 400
};
var config_default = config;

// ../storm/src/xhr.ts
function record(run) {
  return json("/storm", {
    method: "POST",
    body: form({
      ...run,
      time: Math.round(run.time),
      notAnExploit: "Yes, we know that you can send whatever score you like. That's why there's no leaderboards and no competition."
    })
  });
}

// ../storm/src/ctrl.ts
var StormCtrl = class {
  constructor(opts, redraw) {
    this.duration = 900;
    this.ground = prop(false);
    this.flipped = false;
    this.end = () => {
      if (this.run.endAt) return;
      this.run.history.reverse();
      this.run.endAt = getNow();
      this.ground(false);
      this.redraw();
      sound.end();
      record(this.runStats()).then((res) => {
        this.vm.response = res;
        this.redraw();
      });
      $("body").toggleClass("playing");
      this.redrawSlow();
    };
    this.endNow = () => {
      this.pushToHistory(false);
      this.end();
    };
    this.userMove = (orig, dest) => {
      if (!this.promotion.start(orig, dest, { submit: this.playUserMove })) this.playUserMove(orig, dest);
    };
    this.playUserMove = (orig, dest, promotion) => {
      const now = getNow();
      const puzzle = this.run.current;
      if (puzzle.startAt + config_default.minFirstMoveTime > now) console.log("reverted!");
      else {
        this.run.clock.start();
        this.run.moves++;
        this.promotion.cancel();
        const uci = `${orig}${dest}${promotion ? promotion === "knight" ? "n" : promotion[0] : ""}`;
        const pos = puzzle.position();
        pos.play(parseUci(uci));
        const correct = pos.isCheckmate() || uci === puzzle.expectedMove();
        if (correct) {
          puzzle.moveIndex++;
          this.run.combo.inc();
          this.run.modifier.moveAt = now;
          const bonus = this.run.combo.bonus();
          if (bonus) {
            this.run.modifier.bonus = bonus;
            this.run.clock.addSeconds(bonus.seconds);
          }
          if (puzzle.isOver()) {
            this.pushToHistory(true);
            if (!this.incPuzzle()) this.end();
          } else {
            puzzle.moveIndex++;
          }
        } else {
          sound.wrong();
          this.pushToHistory(false);
          this.run.errors++;
          this.run.combo.reset();
          this.run.clock.addSeconds(-config_default.clock.malus);
          this.run.modifier.malus = {
            seconds: config_default.clock.malus,
            at: getNow()
          };
          if (this.run.clock.flag()) this.end();
          else if (!this.incPuzzle()) this.end();
        }
        this.run.current.playSound(puzzle);
        this.redraw();
        this.redrawQuick();
        this.redrawSlow();
      }
      this.setGround();
      if (this.run.current.moveIndex < 0) {
        this.run.current.moveIndex = 0;
        this.setGround();
      }
      pubsub.emit("ply", this.run.moves);
    };
    this.redrawQuick = () => setTimeout(this.redraw, 100);
    this.redrawSlow = () => setTimeout(this.redraw, 1e3);
    this.pushToHistory = (win) => this.run.history.push({
      puzzle: this.run.current.puzzle,
      win,
      millis: this.run.history.length ? getNow() - this.run.current.startAt : 0
      // first one is free
    });
    this.incPuzzle = () => {
      const index = this.run.current.index;
      if (index < this.data.puzzles.length - 1) {
        this.run.current = new CurrentPuzzle(index + 1, this.data.puzzles[index + 1]);
        return true;
      }
      return false;
    };
    this.withGround = (f) => {
      const g = this.ground();
      return g ? f(g) : void 0;
    };
    this.setGround = () => this.withGround((g) => g.set(makeCgOpts(this.run, !this.run.endAt, this.flipped)));
    this.countWins = () => this.run.history.reduce((c, r) => c + (r.win ? 1 : 0), 0);
    this.runStats = () => ({
      puzzles: this.run.history.length,
      score: this.countWins(),
      moves: this.run.moves,
      errors: this.run.errors,
      combo: this.run.combo.best,
      time: (this.run.endAt - this.run.clock.startAt) / 1e3,
      highest: this.run.history.reduce((h, r) => r.win && r.puzzle.rating > h ? r.puzzle.rating : h, 0),
      signed: this.vm.signed()
    });
    this.flip = () => {
      this.flipped = !this.flipped;
      this.withGround((g) => g.toggleOrientation());
      this.redraw();
    };
    this.checkDupTab = () => {
      const dupTabMsg = storage.make("storm.tab");
      dupTabMsg.fire(this.data.puzzles[0].id);
      dupTabMsg.listen((ev) => {
        if (!this.run.clock.startAt && ev.value === this.data.puzzles[0].id) {
          this.vm.dupTab = true;
          this.redraw();
        }
      });
    };
    this.toggleZen = () => pubsub.emit("zen");
    this.hotkeys = () => site.mousetrap.bind("space", () => location.reload()).bind("return", this.end).bind("f", this.flip).bind("z", this.toggleZen);
    this.data = { puzzles: opts.puzzles, key: opts.key };
    this.pref = opts.pref;
    this.redraw = () => redraw(this.data);
    this.filters = new PuzFilters(this.redraw, false);
    this.run = {
      pov: puzzlePov(this.data.puzzles[0]),
      moves: 0,
      errors: 0,
      current: new CurrentPuzzle(0, this.data.puzzles[0]),
      clock: new Clock(config_default),
      history: [],
      combo: new Combo(config_default),
      modifier: {
        moveAt: 0
      }
    };
    this.vm = {
      signed: prop(void 0),
      lateStart: false
    };
    this.promotion = new PromotionCtrl(this.withGround, this.setGround, this.redraw);
    setTimeout(() => {
      this.run.current.moveIndex = 0;
      this.setGround();
    }, 100);
    this.checkDupTab();
    setTimeout(this.hotkeys, 1e3);
    if (this.data.key) setTimeout(() => sign_default(this.data.key).then(this.vm.signed), 1e3 * 40);
    setTimeout(() => {
      if (!this.run.clock.startAt) {
        this.vm.lateStart = true;
        this.redraw();
      }
    }, config_default.timeToStart + 1e3);
    pubsub.on("zen", toggleZenMode);
    $("#zentog").on("click", this.toggleZen);
    this.run.current.playSound();
  }
};

// ../storm/src/view/end.ts
var newHighI18n = {
  day: i18n.storm.newDailyHighscore,
  week: i18n.storm.newWeeklyHighscore,
  month: i18n.storm.newMonthlyHighscore,
  allTime: i18n.storm.newAllTimeHighscore
};
var number = makeExoticTag("number");
function renderSummary(ctrl) {
  var _a;
  const run = ctrl.runStats();
  const high = (_a = ctrl.vm.response) == null ? void 0 : _a.newHigh;
  const playAgain = ctrl.run.endAt < getNow() - ctrl.duration ? a("/storm") : button;
  const accuracy = 100 * (run.moves - run.errors) / run.moves;
  const scoreSteps = Math.min(run.score, 50);
  return [
    high ? div(
      ".storm--end__high.storm--end__high-daily.bar-glider",
      div(".storm--end__high__content", [
        div(".storm--end__high__text", [
          strong(newHighI18n[high.key]),
          high.prev ? span(i18n.storm.previousHighscoreWasX(high.prev)) : null
        ])
      ])
    ) : null,
    div(".storm--end__score", [
      span(
        ".storm--end__score__number",
        { hook: onInsert((el) => numberSpread(el, scoreSteps, Math.round(scoreSteps * 50), 0)(run.score)) },
        "0"
      ),
      p(i18n.storm.puzzlesSolved)
    ]),
    div(".storm--end__stats.box.box-pad", [
      table(".slist", [
        tbody([
          tr([th(i18n.storm.moves), td(number(run.moves))]),
          tr([
            th(i18n.storm.accuracy),
            td([number(accuracy ? accuracy.toFixed(1) : "-"), accuracy ? "%" : ""])
          ]),
          tr([th(i18n.storm.combo), td(number(ctrl.run.combo.best))]),
          tr([th(i18n.storm.time), td([number(run.time ? Math.round(run.time) : 0), "s"])]),
          tr([
            th(i18n.storm.timePerMove),
            td([number(run.time ? (run.time / run.moves).toFixed(2) : 0), "s"])
          ]),
          tr([th(i18n.storm.highestSolved), td(number(run.highest))])
        ])
      ])
    ]),
    playAgain(".storm-play-again.button", i18n.storm.playAgain)
  ];
}

// ../storm/src/view/main.ts
function main_default(ctrl) {
  if (ctrl.vm.dupTab) return renderReload(i18n.storm.thisRunWasOpenedInAnotherTab);
  if (ctrl.vm.lateStart) return renderReload(i18n.storm.thisRunHasExpired);
  if (!ctrl.run.endAt) {
    return div(".storm.storm-app.storm--play", { class: playModifiers(ctrl.run) }, renderPlay(ctrl));
  }
  return main(".storm.storm--end", [renderSummary(ctrl), history_default(ctrl)]);
}
var chessground = (ctrl) => div(".cg-wrap", {
  hook: onInsert((el) => {
    ctrl.ground(
      Chessground(
        el,
        makeConfig(makeCgOpts(ctrl.run, !ctrl.run.endAt, ctrl.flipped), ctrl.pref, ctrl.userMove)
      )
    );
    pubsub.on(
      "board.change",
      (is3d) => ctrl.withGround((g) => {
        g.state.addPieceZIndex = is3d;
        g.redrawAll();
      })
    );
  })
});
var renderBonus = (bonus) => `${bonus}s`;
var renderPlay = (ctrl) => {
  const run = ctrl.run;
  const now = getNow();
  const start = now - ctrl.duration;
  const { malus, bonus } = run.modifier;
  return [
    div(".puz-board.main-board", [chessground(ctrl), ctrl.promotion.view()]),
    div(".puz-side", [
      run.clock.startAt ? renderSolved(ctrl) : startNode,
      div(".puz-clock", [
        renderClock(run, ctrl.endNow, true),
        !!malus && malus.at > start ? div(".puz-clock__malus", "-" + malus.seconds) : null,
        !!bonus && bonus.at > start ? div(".puz-clock__bonus", "+" + bonus.seconds) : null,
        run.clock.started() ? [div(".puz-clock__pov", povMessage(run))] : null
      ]),
      div(".puz-side__table", [renderControls(ctrl), renderCombo(config_default, renderBonus)(run)])
    ])
  ];
};
var renderSolved = ({ countWins }) => div(".puz-side__top.puz-side__solved", [div(".puz-side__solved__text", `${countWins()}`)]);
var renderControls = (ctrl) => div(".puz-side__control", [
  button(".puz-side__control__flip.button", {
    class: { active: ctrl.flipped, "button-empty": !ctrl.flipped },
    ...dataIcon(licon.ChasingArrows),
    title: i18n.site.flipBoard + " (Keyboard: f)",
    hook: onInsert((el) => el.addEventListener("click", ctrl.flip))
  }),
  a("/storm")(".puz-side__control__reload.button.button-empty", {
    ...dataIcon(licon.Trash),
    title: i18n.storm.newRun
  }),
  button(".puz-side__control__end.button.button-empty", {
    ...dataIcon(licon.FlagOutline),
    title: i18n.storm.endRun,
    hook: onInsert((el) => el.addEventListener("click", ctrl.endNow))
  })
]);
var startNode = div(".puz-side__top.puz-side__start", [
  div(".puz-side__start__text", [strong("Puzzle Storm"), span(i18n.storm.moveToStart)])
]);
var renderReload = (text) => div(".storm.storm--reload.box.box-pad", [
  icon(licon.Storm)(),
  p(text),
  a("/storm")(".storm--dup__reload.button", i18n.storm.clickToReload)
]);

// ../storm/src/storm.ts
var patch = init([classModule, attributesModule]);
async function initModule(opts) {
  await site.asset.loadPieces;
  const element = document.querySelector(".storm-app");
  let vnode;
  function redraw() {
    vnode = patch(vnode, main_default(ctrl));
  }
  const ctrl = new StormCtrl(opts, redraw);
  const blueprint = main_default(ctrl);
  element.innerHTML = "";
  vnode = patch(element, blueprint);
  menuHover_default();
  $("script").remove();
}
export {
  initModule
};
//# sourceMappingURL=storm.WEUMOT4S.js.map

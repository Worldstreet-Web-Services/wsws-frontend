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
  userLink
} from "./lib.RU54GHQA.js";
import {
  a,
  button,
  copyMeInput,
  div,
  form,
  h2,
  makeExoticTag,
  p,
  span,
  strong
} from "./lib.LY6FZSW3.js";
import "./lib.KC3NJ77S.js";
import "./lib.NNS7OYZ5.js";
import {
  Chessground
} from "./lib.LYPETE66.js";
import "./lib.ILS4LNPZ.js";
import "./lib.GSUEVEQG.js";
import {
  INITIAL_BOARD_FEN
} from "./lib.JUCKJNFH.js";
import {
  parseUci
} from "./lib.PM233RJM.js";
import "./lib.23HTWUBN.js";
import {
  wsConnect,
  wsSend
} from "./lib.GOC3UD5K.js";
import {
  bind,
  onInsert
} from "./lib.WVJXH4CQ.js";
import {
  attributesModule,
  classModule,
  init,
  propsModule,
  styleModule
} from "./lib.2L7Z4FRN.js";
import {
  pubsub
} from "./lib.YID4KMSR.js";
import {
  licon
} from "./lib.2DWRH35C.js";
import "./lib.M3IF75DN.js";
import {
  storedBooleanProp,
  throttle
} from "./lib.AXX3QIAX.js";
import {
  defined,
  prop
} from "./lib.GK2I5IFJ.js";
import "./lib.KO2KTNGK.js";

// ../racer/src/boost.ts
var Boost = class {
  constructor() {
    this.cars = [];
    this.setPlayers = (players) => {
      if (players.length !== this.cars.length) {
        this.cars = players.map((p2) => ({ score: p2.score, time: -9999999 }));
      } else {
        this.cars = this.cars.map((car, i) => ({
          score: players[i].score,
          time: players[i].score > car.score ? getNow() : car.time
        }));
      }
    };
    this.isBoosting = (index) => {
      var _a, _b;
      return !!((_a = this.cars[index]) == null ? void 0 : _a.score) && ((_b = this.cars[index]) == null ? void 0 : _b.time) > getNow() - 1e3;
    };
  }
};

// ../racer/src/config.ts
var config = {
  clock: {
    // initial: 99 * 60,
    // initial: 1 * 60,
    initial: 90,
    malus: 0
  },
  combo: {
    levels: [
      [0, 0],
      [5, 1],
      [12, 2],
      [20, 3],
      [30, 4]
    ]
  },
  minFirstMoveTime: 400
};
var config_default = config;

// ../racer/src/countdown.ts
var Countdown = class {
  constructor(clock, onStart, redraw) {
    this.clock = clock;
    this.onStart = onStart;
    this.redraw = redraw;
    this.played = /* @__PURE__ */ new Set();
    this.start = (startsAt, aloud) => {
      const countdown = () => {
        const diff = startsAt.getTime() - Date.now();
        if (diff > 0) {
          if (aloud && diff % 1e3 > 500) this.playOnce(Math.ceil(diff / 1e3));
          setTimeout(countdown, diff % 1e3);
        } else {
          if (aloud) this.playOnce(0);
          this.clock.start();
          this.onStart();
        }
        this.redraw();
      };
      countdown();
    };
    this.playOnce = (i) => {
      if (!this.played.has(i)) {
        this.played.add(i);
        site.sound.play(`countDown${i}`);
      }
    };
    for (let i = 10; i >= 0; i--) site.sound.load(`countDown${i}`);
  }
};

// ../racer/src/ctrl.ts
var RacerCtrl = class {
  constructor(opts, redraw) {
    this.redraw = redraw;
    this.sign = Math.random().toString(36);
    this.localScore = 0;
    this.boost = new Boost();
    this.skipAvailable = true;
    this.knowsSkip = storedBooleanProp("racer.skip", false);
    this.ground = prop(false);
    this.flipped = false;
    this.serverUpdate = (data) => {
      this.data.players = data.players;
      this.boost.setPlayers(data.players);
      if (data.startsIn && this.status() === "pre") {
        this.vm.startsAt = new Date(Date.now() + data.startsIn);
        this.run.current.startAt = getNow() + data.startsIn;
        if (data.startsIn > 0) this.countdown.start(this.vm.startsAt, this.isPlayer());
        else this.run.clock.start();
      }
    };
    this.player = () => this.data.player;
    this.players = () => this.data.players;
    this.isPlayer = () => !this.vm.alreadyStarted && this.data.players.some((p2) => p2.name === this.data.player.name);
    this.raceFull = () => this.data.players.length >= 10;
    this.status = () => this.run.clock.started() ? this.run.clock.flag() ? "post" : "racing" : "pre";
    this.isRacing = () => this.status() === "racing";
    this.isOwner = () => this.data.owner;
    this.myScore = () => {
      const p2 = this.data.players.find((p3) => p3.name === this.data.player.name);
      return p2 == null ? void 0 : p2.score;
    };
    this.join = throttle(1e3, () => {
      if (!this.isPlayer()) this.socketSend("racerJoin", void 0);
    });
    this.start = throttle(1e3, () => {
      if (this.isOwner()) this.socketSend("racerStart", void 0);
    });
    this.countdownSeconds = () => this.status() === "pre" && this.vm.startsAt && this.vm.startsAt > /* @__PURE__ */ new Date() ? Math.min(10, Math.ceil((this.vm.startsAt.getTime() - Date.now()) / 1e3)) : void 0;
    this.end = () => {
      this.pushToHistory(false);
      this.setGround();
      this.redraw();
      sound.end();
      pubsub.emit("ply", 0);
      $("body").toggleClass("playing");
      this.redrawSlow();
      clearInterval(this.redrawInterval);
    };
    this.canSkip = () => this.skipAvailable;
    this.skip = () => {
      if (this.skipAvailable && this.run.clock.started()) {
        this.skipAvailable = false;
        sound.good();
        this.run.skipId = this.run.current.puzzle.id;
        this.playUci(this.run.current.expectedMove());
        this.knowsSkip(true);
      }
    };
    this.userMove = (orig, dest) => {
      if (!this.promotion.start(orig, dest, { submit: this.playUserMove })) this.playUserMove(orig, dest);
    };
    this.playUserMove = (orig, dest, promotion) => this.playUci(`${orig}${dest}${promotion ? promotion === "knight" ? "n" : promotion[0] : ""}`);
    this.playUci = (uci) => {
      const now = getNow();
      const puzzle = this.run.current;
      if (puzzle.startAt + config_default.minFirstMoveTime > now) console.log("reverted!");
      else {
        this.run.moves++;
        this.promotion.cancel();
        const pos = puzzle.position();
        pos.play(parseUci(uci));
        if (pos.isCheckmate() || uci === puzzle.expectedMove()) {
          puzzle.moveIndex++;
          this.localScore++;
          this.run.combo.inc();
          this.run.modifier.moveAt = now;
          const bonus = this.run.combo.bonus();
          if (bonus) {
            this.run.modifier.bonus = bonus;
            this.localScore += bonus.seconds;
          }
          this.socketSend("racerScore", this.localScore);
          if (puzzle.isOver()) {
            if (!this.incPuzzle(true)) this.end();
          } else {
            puzzle.moveIndex++;
          }
          this.run.current.playSound(puzzle);
        } else {
          sound.wrong();
          this.run.errors++;
          this.run.combo.reset();
          if (this.run.clock.flag()) this.end();
          else if (!this.incPuzzle(false)) this.end();
        }
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
    this.makeVehicles = (raceId) => {
      const vehicle = [];
      for (let c = 0; c < 10; c++) {
        let h = 0;
        const str = `${raceId}${c}`;
        for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
        vehicle.push(Math.abs(h) % 4);
      }
      return vehicle;
    };
    this.redrawQuick = () => setTimeout(this.redraw, 100);
    this.redrawSlow = () => setTimeout(this.redraw, 1e3);
    this.cgOpts = () => this.isPlayer() ? makeCgOpts(this.run, this.isRacing(), this.flipped) : {
      orientation: this.run.pov
    };
    this.setGround = () => this.withGround((g) => g.set(this.cgOpts()));
    this.incPuzzle = (win) => {
      this.pushToHistory(win);
      const index = this.run.current.index;
      if (index < this.data.puzzles.length - 1) {
        this.run.current = new CurrentPuzzle(index + 1, this.data.puzzles[index + 1]);
        return true;
      }
      return false;
    };
    this.pushToHistory = (win) => this.run.history.push({
      puzzle: this.data.puzzles[this.run.current.index],
      win,
      millis: getNow() - this.run.current.startAt
    });
    this.withGround = (f) => {
      const g = this.ground();
      return g ? f(g) : void 0;
    };
    this.flip = () => {
      this.flipped = !this.flipped;
      this.withGround((g) => g.toggleOrientation());
      this.redraw();
    };
    this.socketSend = (tpe, data) => wsSend(tpe, data, { sign: this.sign, ackable: false });
    this.toggleZen = () => pubsub.emit("zen");
    this.hotkeys = () => site.mousetrap.bind("f", this.flip).bind("z", this.toggleZen);
    this.data = opts.data;
    this.race = this.data.race;
    this.vehicle = this.makeVehicles(this.race.id);
    this.pref = opts.pref;
    this.filters = new PuzFilters(redraw, true);
    this.run = {
      pov: puzzlePov(this.data.puzzles[0]),
      moves: 0,
      errors: 0,
      current: new CurrentPuzzle(0, this.data.puzzles[0]),
      clock: new Clock(config_default, defined(opts.data.startsIn) ? Math.max(0, -opts.data.startsIn) : void 0),
      history: [],
      combo: new Combo(config_default),
      modifier: {
        moveAt: 0
      }
    };
    this.vm = {
      alreadyStarted: defined(opts.data.startsIn) && opts.data.startsIn <= 0
    };
    this.countdown = new Countdown(
      this.run.clock,
      () => {
        this.setGround();
        this.run.current.moveIndex = 0;
        this.setGround();
      },
      () => setTimeout(this.redraw)
    );
    this.promotion = new PromotionCtrl(this.withGround, this.setGround, this.redraw);
    this.serverUpdate(opts.data);
    wsConnect(`/racer/${this.race.id}`, false, {
      events: {
        racerState: (data) => {
          this.serverUpdate(data);
          this.redraw();
          this.redrawSlow();
        }
      }
    }).sign(this.sign);
    pubsub.on("zen", () => toggleZenMode({ unconditional: true }));
    $("#zentog").on("click", this.toggleZen);
    this.redrawInterval = setInterval(this.redraw, 1e3);
    setTimeout(this.hotkeys, 1e3);
  }
};

// ../racer/src/view/board.ts
var renderBoard = (ctrl) => {
  return div(".puz-board.main-board", [
    renderGround(ctrl),
    ctrl.promotion.view(),
    renderCountdown(ctrl.countdownSeconds())
  ]);
};
var renderGround = (ctrl) => div(".cg-wrap", {
  hook: onInsert((el) => {
    ctrl.ground(
      Chessground(
        el,
        makeConfig(
          ctrl.isRacing() && ctrl.isPlayer() ? makeCgOpts(ctrl.run, true, ctrl.flipped) : { fen: INITIAL_BOARD_FEN, orientation: ctrl.run.pov, movable: { color: ctrl.run.pov } },
          ctrl.pref,
          ctrl.userMove
        )
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
var light = makeExoticTag("light");
var renderCountdown = (seconds) => {
  if (!seconds) return void 0;
  return div(".racer__countdown", [
    div(".racer__countdown__lights", [
      light(".red", { class: { active: seconds > 4 } }),
      light(".orange", { class: { active: seconds === 3 || seconds === 4 } }),
      light(".green", { class: { active: seconds <= 2 } })
    ]),
    div(".racer__countdown__seconds", seconds)
  ]);
};

// ../racer/src/view/race.ts
var TRACK_HEIGHT = 25;
var renderRace = (ctrl) => {
  const players = ctrl.players();
  const minMoves = players.reduce((m, p2) => p2.score < m ? p2.score : m, 130) / 3;
  const maxMoves = players.reduce((m, p2) => p2.score > m ? p2.score : m, 35);
  const delta = maxMoves - minMoves;
  const relative = (score) => (score - minMoves) / delta;
  const bestScore = players.reduce((b, p2) => p2.score > b ? p2.score : b, 0);
  const myName = ctrl.player().name;
  const tracks = [];
  players.forEach((p2, i) => {
    const isMe = p2.name === myName;
    const track = renderTrack(relative, isMe, bestScore, ctrl, p2, i);
    if (isMe) tracks.unshift(track);
    else tracks.push(track);
  });
  return div(
    ".racer__race",
    { style: { height: `${players.length * TRACK_HEIGHT + 14}px` } },
    div(".racer__race__tracks", tracks)
  );
};
var renderTrack = (relative, isMe, bestScore, ctrl, player, index) => {
  return div(
    ".racer__race__track",
    {
      class: {
        "racer__race__track--me": isMe,
        "racer__race__track--first": !!player.score && player.score === bestScore,
        "racer__race__track--boost": ctrl.boost.isBoosting(index)
      }
    },
    [
      div(
        ".racer__race__player",
        {
          style: {
            transform: `translateX(${relative(player.score) * 95 * (document.dir === "rtl" ? -1 : 1)}%)`
          }
        },
        [
          div(`.racer__race__player__car.car-${index}.vehicle${ctrl.vehicle[index]}`, ctrl.vehicle[index]),
          span(".racer__race__player__name", playerLink(player, isMe))
        ]
      ),
      div(".racer__race__score", player.score)
    ]
  );
};
var anonymous = makeExoticTag("anonymous", { title: "Anonymous player" });
var playerLink = (player, isMe) => player.id ? userLink({ ...player, line: false }) : anonymous([player.name, isMe ? " (you)" : void 0]);

// ../racer/src/view/main.ts
function main_default(ctrl) {
  return div(
    ".racer.racer-app.racer--play",
    { class: { ...playModifiers(ctrl.run), [`racer--${ctrl.status()}`]: true } },
    [
      renderBoard(ctrl),
      div(".puz-side", selectScreen(ctrl)),
      renderRace(ctrl),
      ctrl.status() === "post" && ctrl.run.history.length > 0 ? history_default(ctrl) : null
    ]
  );
}
var selectScreen = (ctrl) => {
  const combo = comboZone(ctrl);
  switch (ctrl.status()) {
    case "pre": {
      const povMsg = p(".racer__pre__message__pov", povMessage(ctrl.run));
      return ctrl.race.lobby ? [
        waitingToStart,
        div(".racer__pre__message.racer__pre__message--with-skip", [
          div(".racer__pre__message__text", [
            p(
              ctrl.knowsSkip() ? i18n.storm[ctrl.vm.startsAt ? "getReady" : "waitingForMorePlayers"] : skipHelp
            ),
            povMsg
          ]),
          !ctrl.knowsSkip() ? renderSkip(ctrl) : null
        ]),
        combo
      ] : [
        waitingToStart,
        div(".racer__pre__message", [
          ctrl.raceFull() ? ctrl.isPlayer() ? [renderStart(ctrl)] : null : ctrl.isPlayer() ? [renderLink(ctrl), renderStart(ctrl)] : [renderJoin(ctrl)],
          povMsg
        ]),
        combo
      ];
    }
    case "racing": {
      const clock = renderClock(ctrl.run, ctrl.end, false);
      return ctrl.isPlayer() ? [playerScore(ctrl), div(".puz-clock", [clock, renderSkip(ctrl)]), combo] : [
        spectating,
        div(".racer__spectating", [
          div(".puz-clock", clock),
          ctrl.race.lobby ? lobbyNext(ctrl) : waitForRematch
        ]),
        combo
      ];
    }
    case "post": {
      const nextRace = ctrl.race.lobby ? lobbyNext(ctrl) : friendNext(ctrl);
      const raceComplete = h2(i18n.storm.raceComplete);
      return ctrl.isPlayer() ? [playerScore(ctrl), div(".racer__post", [raceComplete, yourRank(ctrl), nextRace]), combo] : [spectating, div(".racer__post", [raceComplete, nextRace]), combo];
    }
    default:
      return [];
  }
};
var renderSkip = (ctrl) => button(
  ".racer__skip.button.button-red",
  {
    class: { disabled: !ctrl.canSkip() },
    title: i18n.storm.skipExplanation,
    hook: bind("click", ctrl.skip)
  },
  i18n.storm.skip
);
var skipHelp = p(i18n.storm.skipHelp);
var puzzleRacer = strong("Puzzle Racer");
var waitingToStart = div(
  ".puz-side__top.puz-side__start",
  div(".puz-side__start__text", [puzzleRacer, span(i18n.storm.waitingToStart)])
);
var spectating = div(
  ".puz-side__top.puz-side__start",
  div(".puz-side__start__text", [puzzleRacer, span(i18n.storm.spectating)])
);
var renderBonus = (bonus) => `+${bonus}`;
var renderControls = (ctrl) => div(
  ".puz-side__control",
  button(".puz-side__control__flip.button", {
    class: { active: ctrl.flipped, "button-empty": !ctrl.flipped },
    "data-icon": licon.ChasingArrows,
    title: i18n.site.flipBoard + " (Keyboard: f)",
    hook: bind("click", ctrl.flip)
  })
);
var comboZone = (ctrl) => div(".puz-side__table", [renderControls(ctrl), renderCombo(config_default, renderBonus)(ctrl.run)]);
var playerScore = ({ myScore }) => div(".puz-side__top.puz-side__solved", [div(".puz-side__solved__text", `${myScore() || 0}`)]);
var renderLink = ({ race }) => div(".puz-side__link", [
  p(i18n.site.toInviteSomeoneToPlayGiveThisUrl),
  copyMeInput(`${window.location.protocol}//${window.location.host}/racer/${race.id}`, {
    inputAttrs: { readonly: true }
  })
]);
var renderStart = (ctrl) => {
  if (!ctrl.isOwner() || ctrl.vm.startsAt) return null;
  return div(
    ".puz-side__start",
    button(
      ".button.button-fat",
      {
        class: { disabled: ctrl.players().length < 2 },
        hook: bind("click", ctrl.start),
        disabled: ctrl.players().length < 2
      },
      i18n.storm.startTheRace
    )
  );
};
var renderJoin = (ctrl) => div(
  ".puz-side__join",
  button(".button.button-fat", { hook: bind("click", ctrl.join) }, i18n.storm.joinTheRace)
);
var yourRank = (ctrl) => {
  const score = ctrl.myScore();
  if (!score) return void 0;
  const players = ctrl.players();
  const rank = players.filter((p2) => p2.score > score).length + 1;
  return strong(".race__post__rank", i18n.storm.yourRankX(`${rank}/${players.length}`));
};
var waitForRematch = button(
  ".racer__new-race.button.button-fat.button-navaway.disabled",
  { disabled: true },
  i18n.storm.waitForRematch
);
var lobbyNext = ({ race }) => form({ action: "/racer/lobby", method: "post" }, [
  button(
    `.racer__new-race.button.button-navaway${race.lobby ? ".button-fat" : ".button-empty"}`,
    i18n.storm.nextRace
  )
]);
var friendNext = ({ race }) => div(".racer__post__next", [
  a(`/racer/${race.id}/rematch`)(
    `.racer__rematch.button.button-fat.button-navaway`,
    i18n.storm.joinRematch
  ),
  form(
    ".racer__post__next__new",
    { action: "/racer", method: "post" },
    button(".racer__post__next__button.button.button-empty", { type: "submit" }, i18n.storm.createNewGame)
  )
]);

// ../racer/src/racer.ts
var patch = init([classModule, attributesModule, propsModule, styleModule]);
async function initModule(opts) {
  await site.asset.loadPieces;
  const element = document.querySelector(".racer-app");
  let vnode;
  function redraw() {
    vnode = patch(vnode, main_default(ctrl));
  }
  const ctrl = new RacerCtrl(opts, redraw);
  const blueprint = main_default(ctrl);
  element.innerHTML = "";
  vnode = patch(element, blueprint);
  menuHover_default();
  $("script").remove();
}
export {
  initModule
};
//# sourceMappingURL=racer.LGCET76W.js.map

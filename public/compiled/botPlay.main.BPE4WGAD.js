import {
  ClockCtrl
} from "./lib.RP5Y56GU.js";
import {
  renderBlindfoldToggle
} from "./lib.CZSHUNBU.js";
import {
  colorButtons,
  timeControlFromStoredValues,
  timePickerAndSliders
} from "./lib.FIORGJSY.js";
import {
  colors
} from "./lib.UVMTZBJW.js";
import {
  Bot,
  BotLoader,
  botAssetUrl
} from "./lib.Q3YC5EXG.js";
import {
  hashBoard
} from "./lib.MAMCKG3Y.js";
import {
  PromotionCtrl
} from "./lib.EWOOJSE7.js";
import {
  renderMaterialDiffs
} from "./lib.MX5OJBS2.js";
import {
  renderClock,
  statusOf
} from "./lib.MAZAPTWV.js";
import {
  resizeHandle
} from "./lib.3NURFI3P.js";
import {
  Coords,
  MoveEvent,
  ShowResizeHandle
} from "./lib.TSMVECCD.js";
import "./lib.LDYEPMQF.js";
import "./lib.JAWNVB2A.js";
import {
  stepwiseScroll
} from "./lib.XDYCHUJV.js";
import {
  addPointerListeners,
  alert,
  boardMenu,
  initMiniBoard,
  snabDialog,
  toggleButton
} from "./lib.LY6FZSW3.js";
import "./lib.KC3NJ77S.js";
import {
  randomId
} from "./lib.NNS7OYZ5.js";
import {
  Chessground
} from "./lib.LYPETE66.js";
import "./lib.ILS4LNPZ.js";
import "./lib.GSUEVEQG.js";
import {
  Chess,
  INITIAL_FEN,
  chessgroundDests,
  chessgroundMove,
  defaultGame,
  makeFen,
  makeSan,
  normalizeMove,
  parseFen,
  parsePgn,
  parseSan
} from "./lib.JUCKJNFH.js";
import {
  makeUci,
  opposite,
  parseSquare,
  parseUci
} from "./lib.PM233RJM.js";
import "./lib.23HTWUBN.js";
import "./lib.GOC3UD5K.js";
import {
  bind,
  dataIcon,
  displayColumns,
  hl,
  onInsert
} from "./lib.WVJXH4CQ.js";
import {
  attributesModule,
  classModule,
  eventListenersModule,
  h,
  init
} from "./lib.2L7Z4FRN.js";
import {
  pubsub
} from "./lib.YID4KMSR.js";
import {
  licon
} from "./lib.2DWRH35C.js";
import "./lib.M3IF75DN.js";
import {
  storage,
  storedJsonProp,
  throttle
} from "./lib.AXX3QIAX.js";
import {
  prop,
  propWithEffect,
  repeater,
  toggle
} from "./lib.GK2I5IFJ.js";
import "./lib.KO2KTNGK.js";

// ../botPlay/src/clock.ts
var computeClockState = (g) => {
  const config = g.clockConfig;
  if (!config) return void 0;
  const initial = config.initial || 5;
  const state = {
    white: initial,
    black: initial
  };
  let lastMoveAt;
  g.moves.forEach(({ at }, i) => {
    const color = i % 2 ? "black" : "white";
    if (lastMoveAt && i > 1) {
      state[color] = Math.max(0, state[color] - (at - lastMoveAt) / 1e3 + config.increment);
    }
    lastMoveAt = at;
  });
  const ticking = g.isClockTicking();
  if (ticking && lastMoveAt && g.moves.length > 1) {
    state[ticking] = Math.max(0, state[ticking] - (Date.now() - lastMoveAt) / 1e3);
  } else if (g.end && lastMoveAt) {
    const millisBetweenLastMoveAndEnd = g.end.at - lastMoveAt;
    state[g.turn()] = Math.max(0, state[g.turn()] - millisBetweenLastMoveAndEnd / 1e3);
  }
  return {
    ...state,
    ticking
  };
};

// ../botPlay/src/game.ts
var _Game = class _Game {
  constructor(data) {
    this.data = data;
    this.ply = () => this.moves.length;
    this.turn = () => this.ply() % 2 ? "black" : "white";
    this.isClockTicking = () => this.end || this.moves.length < 2 ? void 0 : this.turn();
    this.clockState = () => computeClockState(this);
    this.rewindToPly = (ply) => {
      this.data.moves = this.moves.slice(0, ply);
    };
    this.playMoveAtPly = (chessMove, ply) => {
      this.rewindToPly(ply);
      const chess = this.lastBoard().chess;
      const move = {
        san: makeSan(chess, normalizeMove(chess, chessMove)),
        at: Date.now()
      };
      this.moves.push(move);
      this.computeEnd();
      return move;
    };
    this.copyAtPly = (ply) => {
      if (ply >= this.ply()) return this;
      const moves = this.moves.slice(0, ply);
      return new _Game({ ...this.data, moves, end: void 0 });
    };
    this.toPgn = () => {
      const headers = /* @__PURE__ */ new Map();
      if (this.data.initialFen) headers.set("FEN", this.data.initialFen);
      const pgn = parsePgn(this.moves.map((m) => m.san).join(" "), () => headers)[0] || defaultGame();
      const chess = this.data.initialFen ? parseFen(this.data.initialFen).chain((setup) => Chess.fromSetup(setup)).unwrap(
        (i) => i,
        (_) => Chess.default()
      ) : Chess.default();
      return [pgn, chess];
    };
    this.lastBoard = () => {
      const [pgn, chess] = this.toPgn();
      const board = { onPly: 0, chess };
      if (!pgn) return board;
      for (const node of pgn.moves.mainline()) {
        const move = parseSan(board.chess, node.san);
        if (!move) {
          console.warn("Illegal move", node.san);
          this.rewindToPly(board.onPly);
          break;
        }
        board.chess.play(move);
        board.onPly++;
        board.lastMove = move;
      }
      return board;
    };
    this.computeEnd = () => {
      if (this.end) return this.end;
      const chess = this.lastBoard().chess;
      this.data.end = endOnTheBoard(chess);
      if (this.end) return this.end;
      const clock = this.clockState();
      if (!clock) return void 0;
      const flag = (color) => ({
        winner: opposite(color),
        status: "outoftime",
        fen: makeFen(chess.toSetup()),
        at: Date.now()
      });
      if ((clock == null ? void 0 : clock.white) <= 0) this.data.end = flag("white");
      else if ((clock == null ? void 0 : clock.black) <= 0) this.data.end = flag("black");
      return this.data.end;
    };
    this.worthResuming = () => this.moves.length > 1 && !this.end;
    this.computeEnd();
  }
  get id() {
    return this.data.id;
  }
  get botKey() {
    return this.data.botKey;
  }
  get pov() {
    return this.data.pov;
  }
  get clockConfig() {
    return this.data.clockConfig;
  }
  get moves() {
    return this.data.moves;
  }
  get end() {
    return this.data.end;
  }
};
_Game.randomId = () => "b-" + randomId(10);
var Game = _Game;
var endOnTheBoard = (chess) => {
  var _a;
  if (!chess.isEnd()) return void 0;
  return {
    winner: (_a = chess.outcome()) == null ? void 0 : _a.winner,
    status: chess.isCheckmate() ? "mate" : chess.isStalemate() ? "stalemate" : "draw",
    fen: makeFen(chess.toSetup()),
    at: Date.now()
  };
};

// ../botPlay/src/debug.ts
function debugCli(play) {
  window["bot"] = {
    threefold: () => play(
      new Game({
        id: Game.randomId(),
        botKey: "#centipawn",
        pov: "white",
        initialFen: void 0,
        moves: addMoveTimes(["e4", "e5", "Nf3", "Nf6", "Ng1", "Ng8", "Nf3", "Nf6", "Ng1"])
      })
    ),
    checkmate: () => play(
      new Game({
        id: Game.randomId(),
        botKey: "#terrence",
        pov: "white",
        initialFen: void 0,
        moves: addMoveTimes(["e4", "e5", "Bc4", "d6", "Qf3", "a6"])
      })
    ),
    promotion: () => play(
      new Game({
        id: Game.randomId(),
        botKey: "#tal-e",
        pov: "white",
        initialFen: "5bnk/PPPPpppp/8/8/8/8/pppPPPPP/RNBQKBNR w KQ - 0 1",
        moves: []
      })
    ),
    materialImbalance: () => play(
      new Game({
        id: Game.randomId(),
        botKey: "#professor",
        clockConfig: { initial: 7200, increment: 20, moretime: 0 },
        pov: "white",
        moves: addMoveTimes(
          "Nf3 Nf6 g3 g6 Bg2 Bg7 O-O O-O d4 d5 c4 c5 dxc5 dxc4 Qxd8 Rxd8 Ne5 Na6 Be3 Nd5 Nxc4 Nxe3 fxe3 Nxc5 Nc3 Be6 Na5 Rac8 Rad1 Bh6 Kf2 Kg7 Rd4 Bg5 Rfd1 Rxd4 exd4 b6 Nc6 Na6 Nxa7 Rc7 Nab5 Rd7 d5 Bf5 e4 Bg4 Bf3 Bxf3".split(
            " "
          )
        )
      })
    )
  };
}
var addMoveTimes = (moves) => {
  const startedAt = Date.now() - 1e3 * moves.length;
  return moves.map((san, i) => ({
    san,
    at: startedAt + 1e3 * i
  }));
};

// ../botPlay/src/ground.ts
var updateGround = (game, board) => {
  const onLastPosition = board.onPly === game.ply();
  const onEndPosition = onLastPosition && game.end;
  return {
    fen: fenOf(board),
    check: board.chess.isCheck(),
    turnColor: board.chess.turn,
    lastMove: board.lastMove && chessgroundMove(board.lastMove),
    movable: {
      dests: onEndPosition || board.chess.isEnd() ? /* @__PURE__ */ new Map() : chessgroundDests(board.chess)
    }
  };
};
var lastMove = (board) => board.lastMove && chessgroundMove(board.lastMove);
var fenOf = (board) => makeFen(board.chess.toSetup());
function initialGround(ctrl) {
  const playing = ctrl.isPlaying();
  const pref = ctrl.opts.pref;
  const chess = ctrl.board.chess;
  return {
    fen: makeFen(chess.toSetup()),
    orientation: ctrl.bottomColor(),
    turnColor: chess.turn,
    lastMove: lastMove(ctrl.board),
    check: chess.isCheck(),
    coordinates: pref.coords !== Coords.Hidden,
    coordinatesOnSquares: pref.coords === Coords.All,
    addPieceZIndex: pref.is3d,
    addDimensionsCssVarsTo: document.body,
    highlight: {
      lastMove: pref.highlight,
      check: pref.highlight
    },
    events: {
      select: ctrl.onPieceSelect,
      insert: (elements) => resizeHandle(
        elements,
        playing ? pref.resizeHandle : ShowResizeHandle.Always,
        ctrl.board.onPly,
        (p) => p <= 2
      )
    },
    movable: {
      free: false,
      color: playing ? ctrl.game.pov : void 0,
      dests: playing ? chessgroundDests(chess) : /* @__PURE__ */ new Map(),
      showDests: pref.destination && !ctrl.blindfold(),
      rookCastle: pref.rookCastle,
      events: {
        after: ctrl.onUserMove
      }
    },
    animation: {
      enabled: true,
      duration: pref.animationDuration
    },
    premovable: {
      enabled: pref.enablePremove,
      showDests: pref.destination
    },
    draggable: {
      enabled: pref.moveEvent !== MoveEvent.Click,
      showGhost: pref.highlight
    },
    selectable: {
      enabled: pref.moveEvent !== MoveEvent.Drag
    },
    drawable: {
      enabled: true,
      defaultSnapToValidMove: storage.boolean("arrow.snap").getOrDefault(true)
    },
    disableContextMenu: true
  };
}
var miniBoard = (board, pov) => h("span.mini-board.is2d", {
  attrs: {
    "data-state": `${fenOf(board)},${pov},${board.lastMove ? makeUci(board.lastMove) : ""}`
  },
  hook: onInsert(initMiniBoard)
});

// ../botPlay/src/play/botMove.ts
var requestBotMove = async (source, game) => {
  const now = performance.now();
  const [ucis, hashes, chess] = makeUcisAndHashes(game);
  const threefoldMoves = makeThreefoldMoves(chess, hashes);
  const moveRequest = {
    pos: { fen: game.data.initialFen || INITIAL_FEN, moves: ucis },
    chess,
    avoid: threefoldMoves,
    initial: Infinity,
    remaining: Infinity,
    opponentRemaining: Infinity,
    increment: 0,
    ply: game.moves.length
  };
  const res = await source.move(moveRequest);
  const uci = res && parseUci(res.uci);
  if (uci)
    return new Promise((resolve) => {
      const waitTime = Math.max(0, res.movetime * 1e3 - (performance.now() - now));
      setTimeout(() => resolve(uci), waitTime);
    });
  else return Promise.reject(new Error("no move"));
};
var makeUcisAndHashes = (game) => {
  const [pgn, chess] = game.toPgn();
  const ucis = [];
  const hashes = [];
  for (const node of pgn.moves.mainline()) {
    const move = parseSan(chess, node.san);
    chess.play(move);
    ucis.push(makeUci(move));
    if (chess.halfmoves === 0) hashes.length = 0;
    else hashes.push(hashBoard(chess.board));
  }
  return [ucis, hashes, chess];
};
var makeThreefoldMoves = (chess, hashes) => {
  const tfms = [];
  for (const [from, dests] of chess.allDests()) {
    for (const to of dests) {
      const next = chess.clone();
      next.play({ from, to });
      const moveHash = hashBoard(next.board);
      if (hashes.filter((h2) => h2 === moveHash).length > 1) tfms.push(makeUci({ from, to }));
    }
  }
  return tfms;
};

// ../botPlay/src/play/keyboard.ts
function keyboard(ctrl) {
  site.mousetrap.bind(["left", "k"], () => ctrl.goDiff(-1)).bind(["right", "j"], () => ctrl.goDiff(1)).bind(["up", "0", "home"], () => ctrl.goTo(0)).bind(["down", "$", "end"], () => ctrl.goToLast()).bind("z", () => pubsub.emit("zen")).bind("f", ctrl.flip).bind("h", () => ctrl.menu.toggle());
}

// ../botPlay/src/play/sound.ts
var playMoveSounds = async (ctrl, move) => {
  const san = move.san;
  const sounds = [];
  const prefix = ctrl.board.chess.turn === ctrl.game.pov ? "bot" : "player";
  if (san.includes("x")) sounds.push(`${prefix}Capture`);
  if (san.includes("+")) sounds.push(`${prefix}Check`);
  if (ctrl.game.end) sounds.push(`${prefix}Win`);
  sounds.push(`${prefix}Move`);
  const bridge = await ctrl.opts.bridge;
  const boardSoundVolume = sounds.length ? bridge.playSound(sounds) : 1;
  if (boardSoundVolume) site.sound.move({ san, volume: boardSoundVolume });
};

// ../botPlay/src/play/playCtrl.ts
var PlayCtrl = class {
  constructor(opts) {
    this.opts = opts;
    this.flipped = toggle(false);
    // will be replaced by view layer
    this.ground = prop(false);
    this.autoScroll = () => {
    };
    this.isPlaying = () => !this.game.end;
    this.isOnLastPly = () => this.board.onPly === this.game.ply();
    this.colorAt = (position) => position === "bottom" ? this.game.pov : opposite(this.game.pov);
    this.bottomColor = () => this.colorAt(this.flipped() ? "top" : "bottom");
    this.flip = () => {
      this.flipped.toggle();
      this.withGround((cg) => cg.set({ orientation: this.bottomColor() }));
      this.opts.redraw();
    };
    this.onUserMove = (orig, dest) => {
      if (!this.promotion.start(orig, dest, { submit: this.playUserMove })) {
        this.playUserMove(orig, dest);
      }
    };
    this.onPieceSelect = () => {
      if (this.board.chess.turn !== this.opts.game.pov) this.goToLast();
    };
    this.onFlag = () => {
      var _a;
      this.game.computeEnd();
      if (((_a = this.game.end) == null ? void 0 : _a.status) === "outoftime") {
        this.recomputeAndSetClock();
        this.updateGround();
        this.opts.redraw();
      }
    };
    this.goTo = (ply) => {
      const newPly = Math.max(0, Math.min(this.game.ply(), ply));
      if (newPly === this.board.onPly) return;
      this.board = this.opts.game.copyAtPly(newPly).lastBoard();
      this.updateGround();
      this.opts.redraw();
      this.autoScroll();
      this.safelyRequestBotMove();
    };
    this.updateGround = () => {
      this.withGround((cg) => cg.set(updateGround(this.game, this.board)));
    };
    this.goDiff = (plyDiff) => this.goTo(this.board.onPly + plyDiff);
    this.goToLast = () => this.goTo(this.game.ply());
    this.playUserMove = (orig, dest, promotion) => {
      const chessMove = normalizeMove(this.board.chess, {
        from: parseSquare(orig),
        to: parseSquare(dest),
        promotion
      });
      const move = this.game.playMoveAtPly(chessMove, this.board.onPly);
      this.afterMove(move);
      this.goTo(this.game.ply());
      this.safelyRequestBotMove();
    };
    this.safelyRequestBotMove = async () => {
      const source = await this.opts.bridge;
      if (this.game.computeEnd()) return;
      if (this.game.turn() === this.game.pov) return;
      const sign = () => this.game.pov + this.game.moves.map((m) => m.san).join("");
      const before = sign();
      const chessMove = await requestBotMove(source, this.game);
      if (sign() !== before) return console.warn("Bot move ignored due to board state mismatch");
      if (this.game.computeEnd()) return;
      const onLastPly = this.isOnLastPly();
      const move = this.game.playMoveAtPly(chessMove, this.game.ply());
      this.afterMove(move);
      if (onLastPly) {
        this.goTo(this.game.ply());
        this.withGround((cg) => cg.playPremove());
      } else {
        this.opts.redraw();
        this.autoScroll();
      }
    };
    this.afterMove = (move) => {
      playMoveSounds(this, move);
      this.opts.save(this.game);
      this.recomputeAndSetClock();
    };
    this.makeClockOpts = () => ({
      onFlag: this.onFlag,
      playable: () => true,
      bothPlayersHavePlayed: () => this.game.moves.length > 1,
      hasGoneBerserk: () => false,
      soundColor: this.game.pov,
      nvui: false
    });
    this.recomputeAndSetClock = () => {
      const clk = this.game.clockState();
      if (this.clock && clk) this.clock.setClock(clk);
    };
    this.setGround = () => this.withGround((g) => g.set(initialGround(this)));
    this.withGround = (f) => {
      const g = this.ground();
      return g ? f(g) : void 0;
    };
    this.game = opts.game;
    this.board = opts.game.lastBoard();
    this.promotion = new PromotionCtrl(this.withGround, this.setGround, this.opts.redraw);
    this.menu = toggle(false, opts.redraw);
    this.blindfold = toggle(false, opts.redraw);
    const clk = this.game.clockState();
    if (clk) {
      const clockData = {
        ...this.game.clockConfig,
        white: clk.white,
        black: clk.black,
        running: !!clk.ticking
      };
      this.clock = new ClockCtrl(clockData, opts.pref, clk.ticking, this.makeClockOpts());
    }
    keyboard(this);
    setTimeout(this.safelyRequestBotMove, 500);
  }
};

// ../botPlay/src/play/view/autoScroll.ts
var scrollMax = 99999;
var autoScroll = throttle(
  100,
  (movesEl, ctrl) => window.requestAnimationFrame(() => {
    let st;
    if (ctrl.board.onPly < 3) st = 0;
    else if (ctrl.isOnLastPly()) st = scrollMax;
    else {
      const plyEl = movesEl.querySelector(".current");
      if (plyEl)
        st = displayColumns() === 1 ? plyEl.offsetLeft - movesEl.offsetWidth / 2 + plyEl.offsetWidth / 2 : plyEl.offsetTop - movesEl.offsetHeight / 2 + plyEl.offsetHeight / 2;
    }
    if (typeof st === "number") {
      if (st === scrollMax) movesEl.scrollLeft = movesEl.scrollTop = st;
      else if (displayColumns() === 1) movesEl.scrollLeft = st;
      else movesEl.scrollTop = st;
    }
  })
);

// ../botPlay/src/play/view/boardMenu.ts
function boardMenu_default(ctrl) {
  return boardMenu(ctrl.opts.redraw, ctrl.menu, (menu) => [
    h("section", [
      menu.flip(i18n.site.flipBoard, ctrl.flipped(), () => {
        ctrl.flip();
        ctrl.menu.toggle();
      })
    ]),
    h("section", [
      menu.zenMode(true),
      menu.blindfold(ctrl.blindfold)
      // menu.voiceInput(boolPrefXhrToggle('voice', !!ctrl.voiceMove), !spectator),
      // menu.keyboardInput(boolPrefXhrToggle('keyboardMove', !!ctrl.keyboardMove), !spectator),
      // !spectator && (d.pref.submitMove || ctrl.voiceMove)
      //   ? menu.confirmMove(ctrl.confirmMoveToggle)
      //   : undefined,
    ]),
    h("section.board-menu__links", [
      h("a", { attrs: { target: "_blank", href: "/account/preferences/display" } }, i18n.preferences.display),
      h(
        "a",
        { attrs: { target: "_blank", href: "/account/preferences/game-behavior " } },
        i18n.preferences.gameBehavior
      )
    ])
  ]);
}

// ../botPlay/src/play/view/playView.ts
var playView = (ctrl) => hl(`main.bot-app.bot-game.unique-game-${ctrl.game.id}.bot-color--${ctrl.opts.bot.key}`, [
  renderBlindfoldToggle(ctrl.blindfold),
  viewBoard(ctrl),
  hl("div.bot-game__table"),
  viewTable(ctrl)
]);
var viewTable = (ctrl) => {
  const diffs = materialDiffs(ctrl);
  return [
    viewMat("top", diffs[0]),
    viewClock(ctrl, "top"),
    viewOpponent(ctrl.opts.bot),
    viewMoves(ctrl),
    viewNavigation(ctrl),
    viewActions(ctrl),
    viewClock(ctrl, "bottom"),
    viewMat("bottom", diffs[1])
  ];
};
var viewMat = (position, material) => hl(`div.bot-game__mat.bot-game__mat--${position}`, [material]);
var viewClock = (ctrl, position) => hl(
  `div.bot-game__clock.bot-game__clock--${position}`,
  ctrl.clock && renderClock(ctrl.clock, ctrl.colorAt(position), position, () => [])
);
var viewActions = (ctrl) => hl("div.bot-game__actions", [
  ctrl.game.end && hl("button.bot-game__rematch", { hook: bind("click", ctrl.opts.rematch) }, "Rematch"),
  hl(
    "button.bot-game__close.text",
    { attrs: dataIcon(licon.Back), hook: bind("click", ctrl.opts.close) },
    "More opponents"
  ),
  hl(
    "button.bot-game__restart.text",
    { attrs: dataIcon(licon.Reload), hook: bind("click", ctrl.opts.rematch) },
    "New game"
  )
]);
var viewResult = (ctrl) => {
  const end = ctrl.game.end;
  if (!end) return void 0;
  const result = end.winner === "white" ? "1-0" : end.winner === "black" ? "0-1" : "\xBD-\xBD";
  const statusData = {
    winner: end.winner,
    ply: ctrl.game.moves.length,
    status: end.status,
    fen: end.fen,
    variant: "standard"
  };
  return result ? hl("div.result-wrap", [
    hl("p.result", result || ""),
    hl(
      "p.status",
      {
        hook: onInsert(() => {
          if (ctrl.autoScroll) ctrl.autoScroll();
          else setTimeout(() => ctrl.autoScroll(), 200);
        })
      },
      statusOf(statusData)
    )
  ]) : void 0;
};
var viewMoves = (ctrl) => {
  var _a;
  const pairs = [];
  for (let i = 0; i < ctrl.game.ply(); i += 2)
    pairs.push([ctrl.game.moves[i].san, (_a = ctrl.game.moves[i + 1]) == null ? void 0 : _a.san]);
  const els = [];
  for (let i = 1; i <= pairs.length; i++) {
    els.push(
      hl("turn", i),
      viewMove(i * 2 - 1, pairs[i - 1][0], ctrl.board.onPly),
      viewMove(i * 2, pairs[i - 1][1], ctrl.board.onPly)
    );
  }
  els.push(viewResult(ctrl));
  return hl(
    "div.bot-game__moves",
    {
      hook: onInsert((el) => {
        el.addEventListener("mousedown", (e) => {
          let node = e.target, offset = -2;
          if (node.tagName !== "MOVE") return;
          while (node = node.previousSibling) {
            offset++;
            if (node.tagName === "TURN") {
              ctrl.goTo(2 * parseInt(node.textContent || "") + offset);
              break;
            }
          }
        });
        ctrl.autoScroll = () => autoScroll(el, ctrl);
        ctrl.autoScroll();
      })
    },
    els
  );
};
var viewMove = (ply, san, curPly) => hl("move", { class: { current: ply === curPly } }, san);
var viewNavigation = (ctrl) => {
  return hl("div.bot-game__nav", [
    boardMenu_default(ctrl),
    hl("div.noop"),
    [
      ["JumpFirst", 0],
      ["JumpPrev", ctrl.board.onPly - 1],
      ["JumpNext", ctrl.board.onPly + 1],
      ["JumpLast", ctrl.game.ply()]
    ].map((b, i) => {
      const enabled = ctrl.board.onPly !== b[1] && b[1] >= 0 && b[1] <= ctrl.game.ply();
      return hl("button.fbt.repeatable", {
        class: { glowing: i === 3 && !ctrl.isOnLastPly() },
        attrs: { disabled: !enabled, "data-icon": licon[b[0]], "data-ply": enabled ? b[1] : "-" },
        hook: onInsert((el) => addPointerListeners(el, { click: (e) => goThroughMoves(ctrl, e), hold: "click" }))
      });
    }),
    toggleButton(ctrl.menu, i18n.site.menu)
  ]);
};
var goThroughMoves = (ctrl, e) => {
  const targetPly = () => parseInt(e.target.getAttribute("data-ply") || "");
  repeater(
    () => {
      const ply = targetPly();
      if (!isNaN(ply)) ctrl.goTo(ply);
    },
    () => isNaN(targetPly())
  );
};
var viewOpponent = (bot) => hl("div.bot-game__opponent", [
  hl("div.bot-game__opponent__header", [
    hl("span.bot-game__opponent__name", bot.name),
    hl("span.bot-game__opponent__rating", Bot.rating(bot, "classical"))
  ]),
  bot.image && hl("img.bot-game__opponent__image", { attrs: { src: botAssetUrl("image", bot.image) } })
  // hl('div.bot-game__opponent__description', bot.description),
]);
var viewBoard = (ctrl) => hl(`div.bot-game__board.main-board${ctrl.blindfold() ? ".blindfold" : ""}`, { hook: boardScroll(ctrl) }, [
  ctrl.promotion.view(),
  hl("div.cg-wrap", {
    hook: onInsert((el) => ctrl.ground(Chessground(el, initialGround(ctrl))))
  })
]);
var boardScroll = (ctrl) => "ontouchstart" in window ? void 0 : bind(
  "wheel",
  stepwiseScroll(
    (e) => {
      if (e.deltaY > 0) ctrl.goDiff(1);
      else if (e.deltaY < 0) ctrl.goDiff(-1);
    },
    () => false
  ),
  void 0,
  false
);
var materialDiffs = (ctrl) => renderMaterialDiffs(
  ctrl.opts.pref.showCaptured,
  ctrl.bottomColor(),
  ctrl.board.chess.board,
  false,
  [],
  ctrl.game.ply()
);

// ../botPlay/src/setup/setupCtrl.ts
var SetupCtrl = class {
  constructor(opts, ongoing, resume, start, redraw) {
    this.opts = opts;
    this.ongoing = ongoing;
    this.resume = resume;
    this.start = start;
    this.redraw = redraw;
    this.settings = storedJsonProp("botPlay.setup.settings", () => ({
      color: "random",
      clock: false,
      time: 5,
      increment: 3
    }));
    this.select = (bot) => {
      this.selectedBot = bot;
      this.redraw();
    };
    this.cancel = () => {
      var _a;
      this.selectedBot = void 0;
      (_a = this.dialog) == null ? void 0 : _a.close();
      this.redraw();
    };
    this.play = () => {
      var _a;
      if (!this.selectedBot) return;
      (_a = this.dialog) == null ? void 0 : _a.close();
      this.saveSettings();
      this.start(this.selectedBot, this.color(), clockConfig(this.timeControl));
    };
    this.saveSettings = () => {
      this.settings({
        color: this.color(),
        clock: this.timeControl.mode() === "realTime",
        time: this.timeControl.time(),
        increment: this.timeControl.increment()
      });
    };
    this.ongoingGameWorthResuming = () => {
      const game = this.ongoing();
      if (!(game == null ? void 0 : game.worthResuming())) return void 0;
      const bot = this.opts.bots.find((b) => b.key === game.botKey);
      if (!bot) return void 0;
      return { game, board: game.lastBoard(), bot };
    };
    const s = this.settings();
    this.color = prop(s.color);
    this.timeControl = timeControlFromStoredValues(
      propWithEffect(s.clock ? "realTime" : "unlimited", this.redraw),
      ["realTime", "unlimited"],
      s.time,
      s.increment,
      0,
      this.redraw,
      []
    );
  }
};
var clockConfig = (tc) => tc.isRealTime() && tc.realTimeValid() ? {
  initial: tc.initialSeconds(),
  increment: tc.increment(),
  moretime: 0
} : void 0;

// ../botPlay/src/setup/view/setupDialog.ts
var setupDialog = (ctrl) => {
  const bot = ctrl.selectedBot;
  if (!bot) return void 0;
  return snabDialog({
    class: `bot-setup__dialog bot-color--${bot.key}`,
    onClose: ctrl.cancel,
    modal: true,
    noScrollable: true,
    easyClose: "clickOutside",
    onInsert(dialog) {
      ctrl.dialog = dialog;
      dialog.show();
      pubsub.emit("content-loaded");
    },
    vnodes: [
      hl("img.bot-setup__dialog__image", {
        attrs: { src: (bot == null ? void 0 : bot.image) && botAssetUrl("image", bot.image) }
      }),
      hl("h2.bot-setup__dialog__title", bot.name),
      hl("div.bot-setup__dialog__desc", bot.description),
      hl(
        "fieldset.bot-setup__dialog__settings.toggle-box.toggle-box--toggle",
        { class: { "toggle-box--toggle-off": true } },
        [
          hl("legend", settingsPreview(ctrl)),
          hl("div.bot-setup__form", [colorButtons(ctrl.color), timePickerAndSliders(ctrl.timeControl)])
        ]
      ),
      hl(
        "button.button",
        {
          hook: bind("click", ctrl.play),
          attrs: { disabled: !ctrl.timeControl.valid() },
          class: { disabled: !ctrl.timeControl.valid() }
        },
        "Play now"
      )
    ]
  });
};
var settingsPreview = (ctrl) => {
  var _a, _b;
  const color = (_b = (_a = colors.find((c) => c.key === ctrl.color())) == null ? void 0 : _a.name) != null ? _b : "random";
  return [color, ctrl.timeControl.isRealTime() ? ctrl.timeControl.clockStr() : "No clock"].join(" | ");
};

// ../botPlay/src/setup/view/setupView.ts
var setupView = (ctrl) => hl("main.bot-app.bot-setup", [setupDialog(ctrl), viewOngoing(ctrl), viewBotList(ctrl)]);
var viewOngoing = (ctrl) => {
  const g = ctrl.ongoingGameWorthResuming();
  return g ? hl("div.bot-setup__ongoing", { hook: bind("click", ctrl.resume, ctrl.redraw) }, [
    hl("div.bot-setup__ongoing__preview", miniBoard(g.board, g.game.pov)),
    g.bot.image && hl("img.bot-setup__ongoing__image", {
      attrs: { src: botAssetUrl("image", g.bot.image) }
    }),
    hl("div.bot-setup__ongoing__content", [
      hl("h2.bot-setup__ongoing__name", g.bot.name),
      hl("p.bot-setup__ongoing__text", "Should we resume our game?")
    ])
  ]) : hl("h1.bot-setup__title", ["Lichess official bots", hl("strong.beta", "EARLY BETA")]);
};
var viewBotList = (ctrl) => {
  const g = ctrl.ongoingGameWorthResuming();
  return hl(
    "div.bot-setup__bots",
    { class: { "bot-setup--blur": !!ctrl.selectedBot } },
    ctrl.opts.bots.map((bot) => viewBotCard(ctrl, bot, !!g && bot.key === g.game.botKey))
  );
};
var viewBotCard = (ctrl, bot, ongoing) => {
  var _a;
  return hl(
    "div.bot-card.bot-color--" + bot.key,
    {
      hook: bind("click", () => ctrl.select(bot)),
      class: {
        "bot-card--ongoing": ongoing,
        "bot-card--dev": !!((_a = ctrl.opts.devBots) == null ? void 0 : _a.includes(bot.key))
      }
    },
    [
      hl("img.bot-card__image", {
        attrs: { src: (bot == null ? void 0 : bot.image) && botAssetUrl("image", bot.image) }
      }),
      hl("div.bot-card__content", [
        hl("div.bot-card__header", [
          hl("h2.bot-card__name", bot.name)
          // hl('span.bot-card__rating', BotUtil.rating(bot, 'classical').toString()),
        ]),
        hl("p.bot-card__description", bot.description || "Short description here")
      ])
    ]
  );
};

// ../botPlay/src/storage.ts
var currentGameJson = storedJsonProp("bot.current-game", () => null);
var loadCurrentGame = () => {
  const data = currentGameJson();
  return data ? new Game(data) : void 0;
};
var saveCurrentGame = (game) => {
  currentGameJson(game ? game.data : null);
};

// ../botPlay/src/botCtrl.ts
var BotCtrl = class {
  constructor(opts, redraw) {
    this.opts = opts;
    this.redraw = redraw;
    this.resume = (evenIfEnded) => {
      try {
        const game = loadCurrentGame();
        if (game && (game.worthResuming() || evenIfEnded)) this.resumeGame(game);
      } catch (e) {
        this.onResumeFail(e);
      }
    };
    this.newGame = (bot, pov, clock) => {
      const color = pov === "random" ? Math.random() < 0.5 ? "white" : "black" : pov;
      this.resumeGameAndRedraw(
        new Game({
          id: Game.randomId(),
          botKey: bot.uid,
          pov: color,
          clockConfig: clock,
          moves: []
        })
      );
    };
    this.resumeGame = (game) => {
      const bot = this.opts.bots.find((b) => b.uid === game.data.botKey);
      if (!bot) {
        alert(`Couldn't find your opponent ${game.data.botKey}`);
        return;
      }
      try {
        this.playCtrl = new PlayCtrl({
          pref: this.opts.pref,
          game,
          bot,
          bridge: this.makeLocalBridge(bot),
          redraw: this.redraw,
          save: saveCurrentGame,
          close: this.closeGame,
          rematch: () => this.newGame(bot, opposite(game.data.pov), game.data.clockConfig)
        });
      } catch (e) {
        this.onResumeFail(e);
      }
    };
    this.onResumeFail = (e) => {
      console.error("Failed to resume game", e);
      alert("Failed to resume game. Please start a new one.");
      saveCurrentGame(null);
    };
    this.resumeGameAndRedraw = (game) => {
      this.resumeGame(game);
      this.redraw();
    };
    this.closeGame = () => {
      this.playCtrl = void 0;
      this.redraw();
    };
    this.view = () => this.playCtrl ? playView(this.playCtrl) : setupView(this.setupCtrl);
    this.makeLocalBridge = async (info) => {
      const loader = new BotLoader();
      await loader.init(this.opts.bots);
      await loader.preload(info.uid);
      const bot = loader.bots.get(info.uid);
      return {
        move: (args) => bot.move(args),
        playSound: (eventList) => bot.playSound(eventList)
      };
    };
    this.setupCtrl = new SetupCtrl(opts, loadCurrentGame, this.resume, this.newGame, redraw);
    debugCli((game) => {
      saveCurrentGame(game);
      this.resumeGameAndRedraw(game);
    });
    addZenSupport();
    this.resume();
  }
};
var addZenSupport = () => {
  pubsub.on("zen", () => {
    $("body").toggleClass("zen");
    window.dispatchEvent(new Event("resize"));
  });
  $("#zentog").on("click", () => pubsub.emit("zen"));
};

// ../botPlay/src/botPlay.main.ts
async function initModule(opts) {
  const element = document.querySelector("main.bot-play"), patch = init([classModule, attributesModule, eventListenersModule]);
  const ctrl = new BotCtrl(opts, redraw);
  let vnode = patch(element, ctrl.view());
  const mainWrap = document.getElementById("main-wrap");
  function redraw() {
    mainWrap.classList.toggle("bot-play", !!ctrl.playCtrl);
    vnode = patch(vnode, ctrl.view());
  }
  redraw();
}
export {
  initModule
};
//# sourceMappingURL=botPlay.main.BPE4WGAD.js.map

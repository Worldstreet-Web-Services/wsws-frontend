import {
  corresClockView_default,
  makeConfig,
  next,
  plyStep,
  prev,
  renderResult,
  renderTableEnd,
  renderTablePlay,
  renderTableWatch
} from "./lib.LHNTP3YL.js";
import {
  arrowKeyHandler,
  boardCommands,
  boardCommandsHandler,
  castlingFlavours,
  commands,
  inputToMove,
  lastCapturedCommandHandler,
  leaveSquareHandler,
  makeContext,
  pieceJumpingHandler,
  pocketsStr,
  positionJumpHandler,
  possibleMovesHandler,
  renderBoard,
  renderPieces,
  renderPockets,
  renderSan,
  renderSetting,
  scanDirectionsHandler,
  selectionHandler
} from "./lib.KNM37UUI.js";
import "./lib.GIUNMRJU.js";
import {
  renderClock
} from "./lib.5Q3MW527.js";
import "./lib.SPSB7AAJ.js";
import "./lib.CHCAIC5O.js";
import {
  playable
} from "./lib.67VUYMDO.js";
import "./lib.GD6YSPBF.js";
import "./lib.BMKV23O2.js";
import "./lib.MYPIOGN5.js";
import {
  plyToTurn
} from "./lib.LRP46MC3.js";
import "./lib.HMFK7OOB.js";
import {
  Chessground
} from "./lib.AEOHBIQD.js";
import "./lib.RPQH5UYI.js";
import "./lib.XAEDCBGD.js";
import "./lib.X7H2PLEK.js";
import {
  COLORS,
  opposite
} from "./lib.53PYQRAK.js";
import "./lib.CAO7TYYH.js";
import "./lib.PNHYIP7B.js";
import {
  bind,
  hl,
  isTouchDevice,
  noTrans,
  onInsert
} from "./lib.S3TIZ2HQ.js";
import "./lib.LWF5S4ZV.js";
import {
  pubsub
} from "./lib.QPQZCXK2.js";
import "./lib.5I4BSVKX.js";
import "./lib.TT4QSUKQ.js";
import "./lib.NFSQQWN5.js";
import "./lib.GMEH5BEF.js";
import "./lib.KO2KTNGK.js";

// ../round/src/view/nvuiView.ts
var selectSound = () => site.sound.play("select");
var borderSound = () => site.sound.play("outOfBound");
var errorSound = () => site.sound.play("error");
function renderNvui(ctx) {
  const { ctrl, notify, moveStyle, pieceStyle, prefixStyle, positionStyle, boardStyle, pageStyle } = ctx;
  notify.redraw = ctrl.redraw;
  if (!ctrl.chessground) {
    ctrl.setChessground(
      Chessground(document.createElement("div"), {
        ...makeConfig(ctrl),
        animation: { enabled: false },
        drawable: { enabled: false },
        coordinates: false
      })
    );
  }
  const nvuiHook = {
    hook: onInsert((_) => setTimeout(() => notify.set(gameText(ctrl)), 2e3))
  };
  const sharedSettings = [
    hl("h2", i18n.site.advancedSettings),
    hl("label", [noTrans("Move notation"), renderSetting(moveStyle, ctrl.redraw)]),
    hl("label", [noTrans("Page layout"), renderSetting(pageStyle, ctrl.redraw)])
  ];
  const keyboardInput = [
    hl("h2", i18n.keyboardMove.keyboardInputCommands),
    hl("p", [
      i18n.nvui.inputFormCommandList,
      hl("br"),
      i18n.nvui.movePiece,
      hl("br"),
      i18n.nvui.promotion,
      hl("br"),
      inputCommands.filter((c) => {
        var _a;
        return !((_a = c.invalid) == null ? void 0 : _a.call(c, ctrl));
      }).flatMap((cmd) => [`${cmd.cmd}${cmd.alt ? ` / ${cmd.alt}` : ""}: `, cmd.help, hl("br")])
    ])
  ];
  if (isTouchDevice() && pageStyle.get() === "board-actions") {
    pieceStyle.set("name");
    prefixStyle.set("name");
    boardStyle.set("plain");
    return hl("div.nvui", nvuiHook, [
      pageStyle.get() === "actions-board" ? [ctrl.isPlaying() && inputForm(ctx), renderActions(ctx), renderBoard2(ctx)] : [
        renderBoard2(ctx),
        renderTouchDeviceCommands(ctx),
        renderActions(ctx),
        ctrl.isPlaying() && inputForm(ctx)
      ],
      gameInfo(ctx),
      ...sharedSettings,
      hl("label", [noTrans("Show position"), renderSetting(positionStyle, ctrl.redraw)]),
      ...keyboardInput
    ]);
  } else
    return hl("div.nvui", nvuiHook, [
      gameInfo(ctx),
      ctrl.isPlaying() && inputForm(ctx),
      pageStyle.get() === "actions-board" ? [renderActions(ctx), renderBoard2(ctx)] : [renderBoard2(ctx), renderActions(ctx)],
      ...sharedSettings,
      hl("h3", noTrans("Board settings")),
      hl("label", [noTrans("Piece style"), renderSetting(pieceStyle, ctrl.redraw)]),
      hl("label", [noTrans("Piece prefix style"), renderSetting(prefixStyle, ctrl.redraw)]),
      hl("label", [noTrans("Show position"), renderSetting(positionStyle, ctrl.redraw)]),
      hl("label", [noTrans("Board layout"), renderSetting(boardStyle, ctrl.redraw)]),
      ...keyboardInput,
      boardCommands()
    ]);
}
function inputForm(ctx) {
  const { ctrl, notify, moveStyle } = ctx;
  const d = ctrl.data, nvui = ctrl.nvui;
  return hl("div.move-input", [
    hl("h2", i18n.nvui.inputForm),
    hl(
      "form#move-form",
      {
        hook: onInsert((el) => {
          const $form = $(el);
          const $input = $form.find(".move").val("");
          nvui.submitMove = createSubmitHandler(ctrl, notify.set, moveStyle.get, $input);
          $form.on("submit", (ev) => {
            var _a;
            ev.preventDefault();
            (_a = nvui.submitMove) == null ? void 0 : _a.call(nvui);
          });
        })
      },
      [
        hl("label", [
          d.player.color === d.game.player ? i18n.site.yourTurn : i18n.site.waiting,
          hl("input.move.mousetrap", {
            attrs: {
              name: "move",
              type: "text",
              autocomplete: "off",
              autofocus: true
            }
          })
        ])
      ]
    )
  ]);
}
function gameInfo(ctx) {
  var _a;
  const { ctrl, notify, moveStyle } = ctx;
  const d = ctrl.data, step = plyStep(d, ctrl.ply), style = moveStyle.get(), pockets = (_a = step.crazy) == null ? void 0 : _a.pockets, clocks = [anyClock(ctrl, "bottom"), anyClock(ctrl, "top")];
  return [
    hl("h1", gameText(ctrl)),
    hl("h2", i18n.nvui.gameInfo),
    COLORS.map((color) => hl("p", [i18n.site[color], ":", playerHtml(ctrl, ctrl.playerByColor(color))])),
    hl("p", [i18n.site[d.game.rated ? "rated" : "casual"] + " " + transGamePerf(d.game.perf)]),
    d.clock ? hl("p", [i18n.site.clock, `${d.clock.initial / 60} + ${d.clock.increment}`]) : null,
    hl("h2", i18n.nvui.moveList),
    hl("p.moves", { attrs: { role: "log", "aria-live": "off" } }, renderMoves(d.steps.slice(1), style)),
    hl("h2", i18n.nvui.pieces),
    renderPieces(ctrl.chessground.state.pieces, style, d.player.color),
    pockets && hl("h2", i18n.nvui.pockets),
    pockets && renderPockets(pockets),
    hl("h2", i18n.nvui.gameStatus),
    hl(
      "div.status",
      {
        attrs: {
          role: "status",
          "aria-live": "assertive",
          "aria-atomic": "true"
        }
      },
      [ctrl.data.game.status.name === "started" ? i18n.site.playingRightNow : renderResult(ctrl)]
    ),
    hl("h2", i18n.nvui.lastMove),
    hl(
      "p.lastMove",
      { attrs: { "aria-live": "assertive", "aria-atomic": "true" } },
      // make sure consecutive moves are different so that they get re-read
      renderSan(step.san, step.uci, style) + (ctrl.ply % 2 === 0 ? "" : "\xA0")
    ),
    clocks.some((c) => !!c) && hl("div.clocks", [
      hl("h2", i18n.nvui.yourClock),
      hl("div.botc", clocks[0]),
      hl("h2", i18n.nvui.opponentClock),
      hl("div.topc", clocks[1])
    ]),
    notify.render()
  ];
}
function renderActions({ ctrl }) {
  return [
    hl("h2", i18n.nvui.actions),
    ctrl.data.player.spectator ? renderTableWatch(ctrl) : playable(ctrl.data) ? renderTablePlay(ctrl) : renderTableEnd(ctrl)
  ];
}
function renderTouchDeviceCommands(ctx) {
  const { notify, ctrl } = ctx;
  return [
    hl("div.actions", [
      hl("button", { hook: bind("click", () => notify.set($(".lastMove").text())) }, "last move"),
      hl(
        "button",
        {
          hook: bind("click", () => {
            if ($(".nvui .botc").text().trim() !== "")
              notify.set($(".nvui .botc").text() + " - " + $(".nvui .topc").text());
            else notify.set("not available");
          })
        },
        "clocks"
      ),
      hl(
        "button",
        {
          hook: bind("click", () => {
            if (ctrl.isPlaying()) {
              $("input.move").val("");
              $("#move-form").trigger("submit");
            } else notify.set("not available");
          })
        },
        "cancel premove"
      ),
      hl(
        "button",
        {
          hook: bind("click", () => {
            flipBoard(ctx);
          })
        },
        "flip the board"
      )
    ])
  ];
}
function renderBoard2(ctx) {
  const { ctrl, prefixStyle, pieceStyle, positionStyle, boardStyle } = ctx;
  return [
    hl("h2", i18n.site.board),
    hl(
      "div.board",
      {
        hook: {
          insert: (el) => boardEventsHook(ctx, el.elm),
          update: (_, vnode) => boardEventsHook(ctx, vnode.elm)
        }
      },
      renderBoard(
        ctrl.chessground.state.pieces,
        ctrl.data.game.variant.key === "racingKings" ? "white" : ctrl.flip ? opposite(ctrl.data.player.color) : ctrl.data.player.color,
        pieceStyle.get(),
        prefixStyle.get(),
        positionStyle.get(),
        boardStyle.get()
      )
    ),
    hl("div.boardstatus", { attrs: { "aria-live": "polite", "aria-atomic": "true" } }, "")
  ];
}
function flipBoard(ctx) {
  const { ctrl, notify } = ctx;
  if (ctrl.data.game.variant.key !== "racingKings") {
    notify.set("Flipping the board");
    setTimeout(() => {
      ctrl.flip = !ctrl.flip;
      ctrl.redraw();
    }, 1e3);
  }
}
function boardEventsHook(ctx, el) {
  const { ctrl, prefixStyle, pieceStyle, moveStyle } = ctx;
  const $board = $(el);
  $board.off(".nvui");
  $board.on("blur.nvui", "button", (e) => {
    leaveSquareHandler($board.find("button"))(e);
  });
  $board.on("click.nvui", "button", (e) => {
    selectionHandler(
      () => ctrl.data.opponent.color,
      isTouchDevice(),
      ctrl.data.game.variant.key === "antichess"
    )(e);
  });
  $board.on("keydown.nvui", "button", (e) => {
    var _a;
    if (e.shiftKey && e.key.match(/^[ad]$/i)) nextOrPrev(ctrl)(e);
    else if (e.key.match(/^x$/i))
      scanDirectionsHandler(
        ctrl.flip ? opposite(ctrl.data.player.color) : ctrl.data.player.color,
        ctrl.chessground.state.pieces,
        moveStyle.get()
      )(e);
    else if (e.key.toLowerCase() === "f") {
      flipBoard(ctx);
    } else if (["o", "l", "t"].includes(e.key)) boardCommandsHandler()(e);
    else if (e.key.startsWith("Arrow"))
      arrowKeyHandler(
        ctrl.flip ? opposite(ctrl.data.player.color) : ctrl.data.player.color,
        borderSound
      )(e);
    else if (e.key === "c")
      lastCapturedCommandHandler(
        () => ctrl.data.steps.map((step) => step.fen),
        pieceStyle.get(),
        prefixStyle.get()
      )();
    else if (e.code.match(/^Digit([1-8])$/)) positionJumpHandler()(e);
    else if (e.key.match(/^[kqrbnp]$/i))
      pieceJumpingHandler(selectSound, errorSound, ctrl.data.game.variant.key === "antichess")(e);
    else if (e.key.toLowerCase() === "m")
      possibleMovesHandler(
        ctrl.data.player.color,
        ctrl.chessground,
        ctrl.data.game.variant.key,
        ctrl.data.steps
      )(e);
    else if (e.key === "i") {
      e.preventDefault();
      (_a = $("input.move").get(0)) == null ? void 0 : _a.focus();
    }
  });
}
function createSubmitHandler(ctrl, notify, style, $input) {
  return (submitStoredPremove = false) => {
    const nvui = ctrl.nvui;
    if (submitStoredPremove && nvui.premoveInput === "") return;
    if (!submitStoredPremove && $input.val() === "") {
      if (nvui.premoveInput !== "") {
        nvui.premoveInput = "";
        notify(i18n.nvui.premoveCancelled);
      } else notify(i18n.nvui.invalidMove);
    }
    const input = submitStoredPremove ? nvui.premoveInput : castlingFlavours($input.val().trim());
    if (!input) return;
    const command = isInputCommand(input) || isInputCommand(input.slice(1));
    if (command) command.cb(notify, ctrl, style(), input);
    else {
      const move = inputToMove(input, plyStep(ctrl.data, ctrl.ply).fen, ctrl.chessground);
      const isDrop = (u) => !!(u && typeof u !== "string");
      const isOpponentsTurn = ctrl.data.player.color !== ctrl.data.game.player;
      const isInvalidDrop = (d) => !ctrl.crazyValid(d.role, d.key) || !isOpponentsTurn && ctrl.chessground.state.pieces.has(d.key);
      if (isOpponentsTurn) {
        nvui.premoveInput = input;
        notify(i18n.nvui.premoveRecorded(input));
      } else if (isDrop(move) && isInvalidDrop(move)) notify(`Invalid drop: ${input}`);
      else if (move) sendMove(move, ctrl, !!nvui.premoveInput);
      else notify(`${i18n.nvui.invalidMove}: ${input}`);
    }
    $input.val("");
  };
}
var inputCommands = [
  {
    cmd: "board",
    help: i18n.nvui.goToBoard,
    cb: (notify, ctrl, style, input) => {
      notify(commands().board.apply(input, ctrl.chessground.state.pieces, style) || "");
    },
    alt: "b"
  },
  {
    cmd: "clock",
    help: i18n.keyboardMove.readOutClocks,
    cb: (notify) => notify($(".nvui .botc").text() + " - " + $(".nvui .topc").text()),
    alt: "c"
  },
  {
    cmd: "last",
    help: i18n.nvui.announceLastMove,
    cb: (notify) => notify($(".lastMove").text()),
    alt: "l"
  },
  {
    cmd: "abort",
    help: i18n.site.abortGame,
    cb: () => $(".nvui button.abort").trigger("click")
  },
  {
    cmd: "resign",
    help: i18n.site.resign,
    cb: () => $(".nvui button.resign").trigger("click")
  },
  {
    cmd: "draw",
    help: i18n.keyboardMove.offerOrAcceptDraw,
    cb: () => $(".nvui button.draw-yes").trigger("click")
  },
  {
    cmd: "takeback",
    help: i18n.site.proposeATakeback,
    cb: () => $(".nvui button.takeback-yes").trigger("click")
  },
  {
    cmd: "p",
    help: commands().piece.help,
    cb: (notify, ctrl, style, input) => {
      var _a;
      return notify(
        (_a = commands().piece.apply(input, ctrl.chessground.state.pieces, style, ctrl.data.player.color)) != null ? _a : `Bad input: ${input}. Expected format: ${commands().piece.help}`
      );
    }
  },
  {
    cmd: "s",
    help: commands().scan.help,
    cb: (notify, ctrl, style, input) => {
      var _a;
      return notify(
        (_a = commands().scan.apply(input, ctrl.chessground.state.pieces, style)) != null ? _a : `Bad input: ${input}. Expected format: ${commands().scan.help}`
      );
    }
  },
  {
    cmd: "opponent",
    help: i18n.keyboardMove.readOutOpponentName,
    cb: (notify, ctrl) => notify(playerText(ctrl)),
    alt: "o"
  },
  {
    cmd: "pocket",
    help: 'Read out pockets for white or black. Example: "pocket black"',
    cb: (notify, ctrl, _, input) => {
      var _a, _b, _c, _d;
      const pockets = (_b = (_a = ctrl.data) == null ? void 0 : _a.crazyhouse) == null ? void 0 : _b.pockets;
      const color = (_d = (_c = input.split(" ")) == null ? void 0 : _c[1]) == null ? void 0 : _d.trim();
      return notify(
        pockets ? color ? pocketsStr(color === "white" ? pockets[0] : pockets[1]) || i18n.site.none : "Expected format: pocket [white|black]" : "Command only available in crazyhouse"
      );
    },
    invalid: (ctrl) => ctrl.data.game.variant.key !== "crazyhouse"
  }
];
var isInputCommand = (input) => {
  const firstWordLowerCase = input.split(" ")[0].toLowerCase();
  return inputCommands.find((c) => c.cmd === firstWordLowerCase || (c == null ? void 0 : c.alt) === firstWordLowerCase);
};
var sendMove = (uciOrDrop, ctrl, premove) => typeof uciOrDrop === "string" ? ctrl.socket.send("move", { u: uciOrDrop }, { ackable: true }) : ctrl.sendNewPiece(uciOrDrop.role, uciOrDrop.key, premove);
function anyClock(ctrl, position) {
  const d = ctrl.data, player = ctrl.playerAt(position);
  return ctrl.clock && renderClock(ctrl.clock, player.color, position, (_) => []) || d.correspondence && corresClockView_default(ctrl.corresClock, player.color, position, d.game.player);
}
var renderMoves = (steps, style) => steps.reduce((res, s) => {
  const turn = s.ply & 1 ? `${plyToTurn(s.ply)}.` : "";
  const san = `${renderSan(s.san, s.uci, style)}, `;
  return res.concat(`${turn} ${san}`).concat(s.ply % 2 === 0 ? hl("br") : []);
}, []);
function playerHtml(ctrl, player) {
  var _a;
  if (player.ai) return i18n.site.aiNameLevelAiLevel("Stockfish", player.ai);
  const perf = ctrl.data.game.perf, user = player.user, rating = (_a = user == null ? void 0 : user.perfs[perf]) == null ? void 0 : _a.rating, rd = player.ratingDiff, ratingDiff = rd ? rd > 0 ? "+" + rd : rd < 0 ? "\u2212" + -rd : "" : "";
  return user ? hl("span", [
    hl(
      "a",
      { attrs: { href: "/@/" + user.username } },
      user.title ? `${user.title} ${user.username}` : user.username
    ),
    rating ? ` ${rating}` : ``,
    " " + ratingDiff
  ]) : i18n.site.anonymous;
}
function playerText(ctrl) {
  var _a, _b, _c;
  const player = ctrl.data.opponent;
  if (player.ai) return i18n.site.aiNameLevelAiLevel("Stockfish", player.ai);
  const user = player.user, rating = (_c = (_b = player == null ? void 0 : player.rating) != null ? _b : (_a = user == null ? void 0 : user.perfs[ctrl.data.game.perf]) == null ? void 0 : _a.rating) != null ? _c : i18n.site.unknown;
  return !user ? i18n.site.anonymous : `${user.title || ""} ${user.username}. ${i18n.site.rating} ${rating}`;
}
function gameText(ctrl) {
  const d = ctrl.data;
  return [
    d.game.status.name === "started" ? ctrl.isPlaying() ? i18n.site[ctrl.data.player.color === "white" ? "youPlayTheWhitePieces" : "youPlayTheBlackPieces"] : "Spectating." : i18n.site.gameOver,
    i18n.site[ctrl.data.game.rated ? "rated" : "casual"],
    d.clock ? `${d.clock.initial / 60} + ${d.clock.increment}` : "",
    transGamePerf(d.game.perf),
    i18n.site.gameVsX(playerText(ctrl))
  ].join(" ");
}
function doAndRedraw(ctrl, f) {
  f(ctrl);
  ctrl.redraw();
}
function nextOrPrev(ctrl) {
  return (e) => {
    if (e.key === "A") doAndRedraw(ctrl, prev);
    else if (e.key === "D") doAndRedraw(ctrl, next);
  };
}
var transGamePerf = (perf) => i18n.site[perf] || perf;

// ../round/src/round.nvui.ts
function initModule(ctrl) {
  const ctx = makeContext({
    ctrl
  });
  pubsub.on("socket.in.message", (line) => {
    if (line.u === "lichess") ctx.notify.set(line.t);
  });
  pubsub.on("round.suggestion", ctx.notify.set);
  const nvui = {
    premoveInput: "",
    playPremove() {
      var _a;
      (_a = nvui.submitMove) == null ? void 0 : _a.call(nvui, true);
      nvui.premoveInput = "";
    },
    submitMove: void 0,
    render: () => renderNvui(ctx)
  };
  return nvui;
}
export {
  initModule
};
//# sourceMappingURL=round.nvui.NKIMR766.js.map

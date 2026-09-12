import {
  menuHover_default
} from "./lib.ZWX3OLRL.js";
import {
  boardFenToChess960Id,
  castlingRooksFromBoard,
  chess960CastlingSquares,
  chess960IdToFEN,
  fenToChess960Id,
  isValidPositionId,
  randomPositionId
} from "./lib.AMLDW7ZU.js";
import {
  resizeHandle
} from "./lib.3NURFI3P.js";
import {
  ShowResizeHandle
} from "./lib.TSMVECCD.js";
import {
  a,
  button,
  copyMeInput,
  div,
  domDialog,
  enter,
  form,
  input,
  label,
  makeExoticTag,
  optgroup,
  option,
  p,
  prompt,
  select,
  span,
  strong
} from "./lib.LY6FZSW3.js";
import {
  fenToEpd
} from "./lib.KC3NJ77S.js";
import "./lib.NNS7OYZ5.js";
import {
  Chessground,
  dragNewPiece
} from "./lib.LYPETE66.js";
import {
  eventPosition,
  opposite
} from "./lib.ILS4LNPZ.js";
import "./lib.GSUEVEQG.js";
import {
  Board,
  Castles,
  EMPTY_FEN,
  INITIAL_FEN,
  Material,
  RemainingChecks,
  defaultPosition,
  defaultSetup,
  lichessRules,
  makeFen,
  parseCastlingFen,
  parseFen,
  setupPosition
} from "./lib.JUCKJNFH.js";
import {
  makeSquare,
  parseSquare
} from "./lib.PM233RJM.js";
import "./lib.23HTWUBN.js";
import "./lib.GOC3UD5K.js";
import {
  dataIcon,
  isSafari,
  onInsert
} from "./lib.WVJXH4CQ.js";
import {
  attributesModule,
  classModule,
  eventListenersModule,
  h,
  init,
  propsModule
} from "./lib.2L7Z4FRN.js";
import {
  pubsub
} from "./lib.YID4KMSR.js";
import {
  licon
} from "./lib.2DWRH35C.js";
import {
  url
} from "./lib.M3IF75DN.js";
import {
  storage
} from "./lib.AXX3QIAX.js";
import {
  defined,
  propWithEffect
} from "./lib.GK2I5IFJ.js";
import "./lib.KO2KTNGK.js";

// ../editor/src/interfaces.ts
var CASTLING_TOGGLES = ["K", "Q", "k", "q"];

// ../editor/src/ctrl.ts
var EditorCtrl = class {
  constructor(cfg, redraw) {
    this.cfg = cfg;
    this.redraw = redraw;
    this.variant = "standard";
    this.indexOfNthOccurrence = (haystack, needle, n) => {
      let index = haystack.indexOf(needle);
      for (; n > 1 && index !== -1; n--) index = haystack.indexOf(needle, index + needle.length);
      return index;
    };
    this.bottomColor = () => this.chessground ? this.chessground.state.orientation : this.options.orientation || "white";
    this.startPosition = () => this.setFen(
      this.variant === "chess960" && this.chess960PositionId !== void 0 ? chess960IdToFEN(this.chess960PositionId) : makeFen(defaultPosition(this.getRules()).toSetup())
    );
    this.clearBoard = () => {
      this.guessCastlingToggles = this.variant !== "antichess";
      const parts = EMPTY_FEN.split(" ");
      parts[1] = this.turn[0];
      return this.setFen(parts.join(" "));
    };
    this.setSetup = (setup) => {
      this.pockets = setup.pockets;
      this.turn = setup.turn;
      this.epSquare = setup.epSquare;
      this.remainingChecks = setup.remainingChecks;
      this.halfmoves = setup.halfmoves;
      this.fullmoves = setup.fullmoves;
      const castles = Castles.fromSetup(setup);
      this.castlingToggles["Q"] = defined(castles.rook.white.a) || setup.castlingRights.has(0);
      this.castlingToggles["K"] = defined(castles.rook.white.h) || setup.castlingRights.has(7);
      this.castlingToggles["q"] = defined(castles.rook.black.a) || setup.castlingRights.has(56);
      this.castlingToggles["k"] = defined(castles.rook.black.h) || setup.castlingRights.has(63);
      this.enabledCastlingToggles = this.computeCastlingToggles();
    };
    this.setFen = (fen) => parseFen(fen).unwrap(
      (setup) => {
        if (this.chessground) this.chessground.set({ fen });
        this.setSetup(setup);
        this.onChange();
        return true;
      },
      (_) => false
    );
    this.options = cfg.options || {};
    this.selected = propWithEffect("pointer", (selected) => {
      if (this.chessground)
        this.chessground.set({
          drawable: { enabled: selected === "pointer" }
        });
    });
    [...cfg.positions || [], ...cfg.endgamePositions || []].forEach(
      (p2) => p2.epd = p2.fen.split(" ").slice(0, 4).join(" ")
    );
    if (this.options.bindHotkeys !== false)
      site.mousetrap.bind("f", () => {
        if (this.chessground) {
          this.chessground.toggleOrientation();
          if (this.options.orientation) this.setOrientation(opposite(this.options.orientation));
        }
        this.onChange();
      });
    this.castlingToggles = { K: false, Q: false, k: false, q: false };
    const params = new URLSearchParams(location.search);
    this.variant = this.cfg.embed ? "standard" : params.get("variant") || "standard";
    const fenPassedIn = cfg.fen || params.get("fen");
    this.initialFen = (fenPassedIn || INITIAL_FEN).replace(/_/g, " ");
    this.guessCastlingToggles = false;
    if (this.variant === "chess960") {
      this.chess960PositionId = fenPassedIn ? fenToChess960Id(fenPassedIn) : params.get("position") !== null ? parseInt(params.get("position"), 10) : randomPositionId();
    }
    if (!this.cfg.embed) this.options.orientation = params.get("color") === "black" ? "black" : "white";
    parseFen(this.initialFen).unwrap(this.setSetup, (_) => {
      this.initialFen = INITIAL_FEN;
      this.setSetup(defaultSetup());
    });
    new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (!m.attributeName || !(m.attributeName === "data-board" || m.attributeName === "data-piece-set"))
          continue;
        this.redraw();
      }
    }).observe(window.document.body, { attributes: true });
  }
  // Ideally to be replaced when something like parseCastlingFen exists in chessops but for epSquare (@getSetup)
  fenFixedEp(fen) {
    let enPassant = fen.split(" ")[3];
    if (enPassant !== "-" && !this.getEnPassantOptions(fen).includes(enPassant)) {
      this.epSquare = void 0;
      enPassant = "-";
    }
    const epIndex = this.indexOfNthOccurrence(fen, " ", 3) + 1;
    const epEndIndex = fen.indexOf(" ", epIndex);
    return `${fen.substring(0, epIndex)}${enPassant}${fen.substring(epEndIndex)}`;
  }
  onChange() {
    var _a, _b, _c;
    this.chess960PositionId = (_a = boardFenToChess960Id(this.getFen().split(" ")[0])) != null ? _a : this.chess960PositionId;
    this.enabledCastlingToggles = this.computeCastlingToggles();
    if (this.guessCastlingToggles) {
      this.castlingToggles = { ...this.enabledCastlingToggles };
    }
    const fen = this.fenFixedEp(this.getFen());
    if (!this.cfg.embed) {
      window.history.replaceState(null, "", this.makeEditorUrl(fen, this.bottomColor()));
    }
    (_c = (_b = this.options).onChange) == null ? void 0 : _c.call(_b, fen);
    this.redraw();
  }
  castlingToggleFen() {
    const isCastlingToggleEnabled = (toggle) => this.enabledCastlingToggles[toggle] && this.castlingToggles[toggle];
    return CASTLING_TOGGLES.filter(isCastlingToggleEnabled).join("");
  }
  computeCastlingToggles() {
    const board = this.getBoard();
    if (this.variant === "chess960") {
      const white = castlingRooksFromBoard(board, "white"), black = castlingRooksFromBoard(board, "black");
      return {
        K: defined(white.rookK),
        Q: defined(white.rookQ),
        k: defined(black.rookK),
        q: defined(black.rookQ)
      };
    }
    const chess960Castling = chess960CastlingSquares(this.chess960PositionId);
    const whiteKingOnE1 = board.king.intersect(board.white).has(parseSquare(chess960Castling.white.king)), blackKingOnE8 = board.king.intersect(board.black).has(parseSquare(chess960Castling.black.king)), whiteRooks = board.rook.intersect(board.white), blackRooks = board.rook.intersect(board.black);
    return {
      K: whiteKingOnE1 && whiteRooks.has(parseSquare(chess960Castling.white.rookK)),
      Q: whiteKingOnE1 && whiteRooks.has(parseSquare(chess960Castling.white.rookQ)),
      k: blackKingOnE8 && blackRooks.has(parseSquare(chess960Castling.black.rookK)),
      q: blackKingOnE8 && blackRooks.has(parseSquare(chess960Castling.black.rookQ))
    };
  }
  getBoard() {
    var _a;
    const boardFen = ((_a = this.chessground) == null ? void 0 : _a.getFen()) || this.initialFen;
    return parseFen(boardFen).unwrap(
      (setup) => setup.board,
      (_) => Board.empty()
    );
  }
  getSetup() {
    const board = this.getBoard();
    return {
      board,
      pockets: this.pockets,
      turn: this.turn,
      castlingRights: parseCastlingFen(board, this.castlingToggleFen()).unwrap(),
      epSquare: this.epSquare,
      remainingChecks: this.remainingChecks,
      halfmoves: this.halfmoves,
      fullmoves: this.fullmoves
    };
  }
  getRules() {
    return lichessRules(this.variant);
  }
  getFen() {
    return makeFen(this.getSetup());
  }
  getPosition() {
    return setupPosition(this.getRules(), this.getSetup());
  }
  getLegalFen() {
    return this.getPosition().unwrap(
      (pos) => makeFen(pos.toSetup()),
      (_) => void 0
    );
  }
  isPlayable() {
    return this.getPosition().unwrap(
      (pos) => !pos.isEnd(),
      (_) => false
    );
  }
  // hopefully moved to chessops soon
  // https://github.com/niklasf/chessops/issues/154
  getEnPassantOptions(fen) {
    const unpackRank = (packedRank) => Array.from(packedRank).reduce((accumulator, current) => {
      const parsedInt = parseInt(current);
      return accumulator + (parsedInt >= 1 ? "x".repeat(parsedInt) : current);
    }, "");
    const checkRank = (rank, regex, offset, filesEnPassant2) => {
      let match;
      while ((match = regex.exec(rank)) !== null) {
        filesEnPassant2.add(match.index + offset);
      }
    };
    const filesEnPassant = /* @__PURE__ */ new Set();
    const [positions, turn] = fen.split(" ");
    const ranks = positions.split("/");
    const unpackedRank = unpackRank(ranks[turn === "w" ? 3 : 4]);
    checkRank(unpackedRank, /pP/g, turn === "w" ? 0 : 1, filesEnPassant);
    checkRank(unpackedRank, /Pp/g, turn === "w" ? 1 : 0, filesEnPassant);
    const [rank1, rank2] = filesEnPassant.size >= 1 ? [unpackRank(ranks[turn === "w" ? 1 : 6]), unpackRank(ranks[turn === "w" ? 2 : 5])] : [null, null];
    return Array.from(filesEnPassant).filter((e) => rank1[e] === "x" && rank2[e] === "x").map((e) => String.fromCharCode("a".charCodeAt(0) + e) + (turn === "w" ? "6" : "3"));
  }
  getState() {
    const legalFen = this.getLegalFen();
    return {
      fen: this.getFen(),
      legalFen,
      playable: ["standard", "chess960", "fromPosition"].includes(this.variant) && this.isPlayable(),
      enPassantOptions: legalFen ? this.getEnPassantOptions(legalFen) : []
    };
  }
  makeAnalysisUrl(legalFen, orientation = "white") {
    const variant = this.variant === "standard" ? "" : this.variant + "/";
    const chess960PositionId = this.chess960PositionId === void 0 ? "" : `&position=${this.chess960PositionId}`;
    return `/analysis/${variant}${this.urlFen(legalFen)}?color=${orientation}${chess960PositionId}`;
  }
  makeEditorUrl(fen, orientation = "white") {
    if (fen === INITIAL_FEN && this.variant === "standard" && orientation === "white")
      return this.cfg.baseUrl;
    const variant = this.variant === "standard" ? "" : "?variant=" + this.variant;
    const chess960PositionId = this.chess960PositionId === void 0 ? "" : `&position=${this.chess960PositionId}`;
    const orientationParam = variant ? `&color=${orientation}` : `?color=${orientation}`;
    return `${this.cfg.baseUrl}/${this.urlFen(fen)}${variant}${orientationParam}${chess960PositionId}`;
  }
  setCastlingToggle(id, value) {
    this.castlingToggles[id] = value;
    this.guessCastlingToggles = false;
    this.onChange();
  }
  setTurn(turn) {
    this.turn = turn;
    this.epSquare = void 0;
    this.onChange();
  }
  setEnPassant(epSquare) {
    this.epSquare = epSquare;
    this.onChange();
  }
  loadNewFen(fen) {
    if (fen === "prompt") prompt("Paste FEN position").then((fen2) => fen2 && this.setFen(fen2.trim()));
    else this.setFen(fen);
  }
  setVariant(variant) {
    this.variant = variant;
    if (variant === "crazyhouse") this.pockets || (this.pockets = Material.empty());
    else this.pockets = void 0;
    if (variant === "threeCheck") this.remainingChecks || (this.remainingChecks = RemainingChecks.default());
    else this.remainingChecks = void 0;
    this.onChange();
  }
  setOrientation(o) {
    this.options.orientation = o;
    if (this.chessground.state.orientation !== o) this.chessground.toggleOrientation();
    this.redraw();
  }
  set960Position(positionId) {
    this.chess960PositionId = positionId;
    this.setFen(chess960IdToFEN(positionId));
  }
  setRandom960Position() {
    const id = randomPositionId();
    id !== this.chess960PositionId ? this.set960Position(id) : this.setRandom960Position();
  }
  urlFen(fen) {
    return encodeURIComponent(fen).replace(/%20/g, "_").replace(/%2F/g, "/");
  }
};

// ../editor/src/chessground.ts
function chessground_default(ctrl) {
  return h("div.cg-wrap", {
    hook: {
      ...onInsert((el) => {
        ctrl.chessground = Chessground(el, makeConfig(ctrl));
        bindEvents(el, ctrl);
      }),
      destroy: () => ctrl.chessground.destroy()
    }
  });
}
function bindEvents(el, ctrl) {
  const handler = onMouseEvent(ctrl);
  ["touchstart", "touchmove", "mousedown", "mousemove", "contextmenu"].forEach(
    (ev) => el.addEventListener(ev, handler)
  );
  pubsub.on("board.change", (is3d) => {
    ctrl.chessground.state.addPieceZIndex = is3d;
    ctrl.chessground.redrawAll();
  });
}
var isLeftButton = (e) => e.buttons === 1 || e.button === 1;
var isLeftClick = (e) => isLeftButton(e) && !e.ctrlKey;
var isRightClick = (e) => e.button === 2 || !!e.ctrlKey && isLeftButton(e);
var downKey;
var lastKey;
var placeDelete;
function onMouseEvent(ctrl) {
  return function(e) {
    var _a, _b;
    const sel = ctrl.selected();
    const isMouseOrTouchStart = e.type === "mousedown" || e.type === "touchstart";
    if (sel !== "pointer" && e.cancelable && (e.type === "touchstart" || e.type === "touchmove"))
      e.preventDefault();
    if (isLeftClick(e) || e.type === "touchstart" || e.type === "touchmove") {
      if (sel === "pointer" || ((_b = (_a = ctrl.chessground) == null ? void 0 : _a.state.draggable.current) == null ? void 0 : _b.newPiece)) return;
      const pos = eventPosition(e);
      if (!pos) return;
      const key = ctrl.chessground.getKeyAtDomPos(pos);
      if (!key) return;
      if (isMouseOrTouchStart) downKey = key;
      if (sel === "trash") deleteOrHidePiece(ctrl, key, e);
      else {
        const existingPiece = ctrl.chessground.state.pieces.get(key);
        const piece2 = {
          color: sel[0],
          role: sel[1]
        };
        const samePiece = existingPiece && piece2.color === existingPiece.color && piece2.role === existingPiece.role;
        if (isMouseOrTouchStart && samePiece) {
          deleteOrHidePiece(ctrl, key, e);
          placeDelete = true;
          const endEvents = { mousedown: "mouseup", touchstart: "touchend" };
          document.addEventListener(endEvents[e.type], () => placeDelete = false, { once: true });
        } else if (!placeDelete && (isMouseOrTouchStart || key !== lastKey)) {
          ctrl.chessground.setPieces(/* @__PURE__ */ new Map([[key, piece2]]));
          ctrl.onChange();
          ctrl.chessground.cancelMove();
        }
      }
      lastKey = key;
    } else if (isRightClick(e)) {
      if (sel !== "pointer" && sel !== "trash" && e.type === "contextmenu") {
        ctrl.chessground.cancelMove();
        sel[0] = opposite(sel[0]);
        ctrl.redraw();
      }
    }
  };
}
function deleteOrHidePiece(ctrl, key, e) {
  if (e.type === "touchstart") {
    if (ctrl.chessground.state.pieces.has(key)) {
      ctrl.chessground.state.draggable.current.element.style.display = "none";
      ctrl.chessground.cancelMove();
    }
    document.addEventListener("touchend", () => deletePiece(ctrl, key), { once: true });
  } else if (e.type === "mousedown" || key !== downKey) {
    deletePiece(ctrl, key);
  }
}
function deletePiece(ctrl, key) {
  ctrl.chessground.setPieces(/* @__PURE__ */ new Map([[key, void 0]]));
  ctrl.onChange();
}
function makeConfig(ctrl) {
  return {
    fen: ctrl.getFen(),
    orientation: ctrl.options.orientation || "white",
    coordinates: ctrl.options.coordinates !== false,
    autoCastle: false,
    addPieceZIndex: ctrl.cfg.is3d,
    jsHover: isSafari(),
    movable: {
      free: true,
      color: "both"
    },
    animation: {
      duration: ctrl.cfg.animation.duration
    },
    premovable: {
      enabled: false
    },
    drawable: {
      enabled: ctrl.selected() === "pointer",
      defaultSnapToValidMove: storage.boolean("arrow.snap").getOrDefault(true)
    },
    draggable: {
      showGhost: true,
      deleteOnDropOff: true
    },
    selectable: {
      enabled: false
    },
    highlight: {
      lastMove: false
    },
    events: {
      change: ctrl.onChange.bind(ctrl),
      insert(elements) {
        resizeHandle(elements, ShowResizeHandle.Always, 0);
      }
    }
  };
}

// ../editor/src/view.ts
function castleCheckBox(ctrl, id, inputLabel, reversed) {
  const inputElement = input("checkbox")({
    class: { "not-allowed": !ctrl.enabledCastlingToggles[id] },
    props: {
      checked: ctrl.castlingToggles[id] && ctrl.enabledCastlingToggles[id],
      disabled: !ctrl.enabledCastlingToggles[id]
    },
    on: {
      change(e) {
        ctrl.setCastlingToggle(id, e.target.checked);
      }
    }
  });
  return label(reversed ? [inputElement, inputLabel] : [inputLabel, inputElement]);
}
function studyButton(ctrl, state) {
  return form({ method: "post", action: "/study/as" }, [
    input("hidden")({ name: "orientation", value: ctrl.bottomColor() }),
    input("hidden")({ name: "variant", value: lichessRules(ctrl.variant) }),
    input("hidden")({ name: "fen", value: state.legalFen || "" }),
    button(
      {
        type: "submit",
        ...dataIcon(licon.StudyBoard),
        disabled: !state.legalFen,
        class: { button: true, "button-empty": true, text: true, disabled: !state.legalFen }
      },
      i18n.site.toStudy
    )
  ]);
}
function variantOption(key, name, ctrl) {
  return option({ value: key, selected: key === ctrl.variant }, `${i18n.site.variant} | ${name}`);
}
function endgamePositionOption(pos) {
  return option({ value: pos.epd || pos.fen, "data-fen": pos.fen }, pos.name);
}
function positionOption(pos) {
  return option(
    { value: pos.epd || pos.fen, "data-fen": pos.fen },
    pos.eco ? `${pos.eco} ${pos.name}` : pos.name
  );
}
var ALL_VARIANTS = [
  ["standard", i18n.variant.standard],
  ["chess960", i18n.variant.chess960],
  ["kingOfTheHill", i18n.variant.kingOfTheHill],
  ["threeCheck", i18n.variant.threeCheck],
  ["crazyhouse", i18n.variant.crazyhouse],
  ["antichess", i18n.variant.antichess],
  ["atomic", i18n.variant.atomic],
  ["horde", i18n.variant.horde],
  ["racingKings", i18n.variant.racingKings]
];
function controlsButtonStart(ctrl, icon) {
  return button(
    `.button.button-empty${icon ? ".text" : ""}`,
    {
      on: {
        click(e) {
          e.preventDefault();
          ctrl.startPosition();
        }
      },
      type: "button",
      ...icon ? dataIcon(icon) : {}
    },
    i18n.site.startPosition
  );
}
function controlsButtonClear(ctrl, icon) {
  return button(
    `.button.button-empty${icon ? ".text" : ""}`,
    {
      on: {
        click(e) {
          e.preventDefault();
          ctrl.clearBoard();
        }
      },
      type: "button",
      ...icon ? dataIcon(icon) : {}
    },
    i18n.site.clearBoard
  );
}
function controls(ctrl, state) {
  const chess960PositionIdSelector = ctrl.variant !== "chess960" ? null : div(".metadata", [
    div(".chess960-position-row", [
      label(".form-label", { for: "chess960-position-id" }, "Chess960 position"),
      input("number")("#chess960-position-id", {
        minlength: 1,
        maxlength: 3,
        min: "0",
        max: "959",
        props: {
          value: ctrl.chess960PositionId
        },
        on: {
          change(e) {
            const value = e.target.value;
            if (!/^\d+$/.test(value)) return;
            const candidateId = parseInt(value);
            if (!isValidPositionId(candidateId)) return;
            ctrl.set960Position(candidateId);
          },
          keydown: enter((target) => target.blur())
        }
      }),
      button(".button.button-empty", {
        type: "button",
        title: i18n.site.randomChess960Position,
        ...dataIcon(licon.DieSix),
        on: {
          click(e) {
            e.preventDefault();
            ctrl.setRandom960Position();
          }
        }
      })
    ])
  ]);
  return div(".board-editor__tools", [
    div(".metadata", [
      div(
        ".color",
        select(
          {
            on: {
              change(e) {
                ctrl.setTurn(e.target.value);
              }
            },
            props: { value: ctrl.turn }
          },
          ["whitePlays", "blackPlays"].map(
            (key) => option(
              {
                value: key.startsWith("w") ? "white" : "black",
                selected: key.startsWith(ctrl.turn[0])
              },
              i18n.site[key]
            )
          )
        )
      ),
      div(".castling", [
        strong(i18n.site.castling),
        div([
          castleCheckBox(ctrl, "K", i18n.site.whiteCastlingKingside, !!ctrl.options.inlineCastling),
          castleCheckBox(ctrl, "Q", "O-O-O", true)
        ]),
        div([
          castleCheckBox(ctrl, "k", i18n.site.blackCastlingKingside, !!ctrl.options.inlineCastling),
          castleCheckBox(ctrl, "q", "O-O-O", true)
        ])
      ]),
      div(".enpassant", [
        label({ for: "enpassant-select" }, i18n.site.enPassant),
        select(
          "#enpassant-select",
          {
            on: {
              change(e) {
                ctrl.setEnPassant(parseSquare(e.target.value));
              }
            },
            props: { value: ctrl.epSquare ? makeSquare(ctrl.epSquare) : "" }
          },
          ["", ...[ctrl.turn === "black" ? 3 : 6].flatMap((r) => "abcdefgh".split("").map((f) => f + r))].map(
            (key) => option(
              {
                value: key,
                selected: (key ? parseSquare(key) : void 0) === ctrl.epSquare,
                hidden: Boolean(key && !state.enPassantOptions.includes(key)),
                disabled: Boolean(key && !state.enPassantOptions.includes(key))
              },
              key
            )
          )
        )
      ])
    ]),
    ...ctrl.cfg.embed || !ctrl.cfg.positions || !ctrl.cfg.endgamePositions ? [] : [
      (() => {
        var _a;
        const epd = fenToEpd(state.fen);
        const value = ((_a = ctrl.cfg.positions.find((p2) => p2.fen.startsWith(epd)) || ctrl.cfg.endgamePositions.find((p2) => p2.epd === epd)) == null ? void 0 : _a.epd) || "";
        return select(
          ".positions",
          {
            props: { value },
            on: {
              insert(vnode) {
                vnode.elm.value = fenToEpd(state.fen);
              },
              change(e) {
                const el = e.target;
                const value2 = el.selectedOptions[0].getAttribute("data-fen");
                if (!value2 || !ctrl.setFen(value2)) el.value = "";
              }
            }
          },
          [
            option({ value: "" }, i18n.site.setTheBoard),
            optgroup(i18n.site.popularOpenings)(ctrl.cfg.positions.map(positionOption)),
            optgroup(i18n.site.endgamePositions)(ctrl.cfg.endgamePositions.map(endgamePositionOption))
          ]
        );
      })()
    ],
    ...ctrl.cfg.embed ? [div(".actions", [chess960PositionIdSelector, controlsButtonStart(ctrl), controlsButtonClear(ctrl)])] : [
      div([
        select(
          {
            id: "variants",
            on: {
              change(e) {
                const value = e.target.value;
                if (value === "chess960") ctrl.setRandom960Position();
                ctrl.setVariant(value);
              }
            }
          },
          ALL_VARIANTS.map((x) => variantOption(x[0], x[1], ctrl))
        )
      ]),
      chess960PositionIdSelector,
      div(".actions", [
        controlsButtonStart(ctrl, licon.Reload),
        controlsButtonClear(ctrl, licon.Trash),
        button(
          ".button.button-empty.text",
          {
            ...dataIcon(licon.ChasingArrows),
            on: {
              click() {
                ctrl.chessground.toggleOrientation();
                ctrl.onChange();
              }
            }
          },
          i18n.site.flipBoard
        ),
        a(state.legalFen ? ctrl.makeAnalysisUrl(state.legalFen, ctrl.bottomColor()) : "")(
          {
            ...dataIcon(licon.Microscope),
            rel: "nofollow",
            class: {
              button: true,
              "button-empty": true,
              text: true,
              disabled: !state.legalFen
            }
          },
          i18n.site.analysis
        ),
        button(
          {
            class: { button: true, "button-empty": true, disabled: !state.playable },
            disabled: !state.playable,
            on: {
              click: () => {
                if (state.playable)
                  domDialog({
                    cash: $(".continue-with"),
                    modal: true,
                    easyClose: "clickOutside",
                    show: true
                  });
              }
            }
          },
          [span(".text", dataIcon(licon.Swords), i18n.site.continueFromHere)]
        ),
        studyButton(ctrl, state)
      ]),
      div(".continue-with.none", [
        a("/?fen=" + state.legalFen + "#ai")(
          ".button",
          { rel: "nofollow" },
          i18n.site.playAgainstComputer
        ),
        a("/?fen=" + state.legalFen + "#friend")(
          ".button",
          { rel: "nofollow" },
          i18n.site.challengeAFriend
        )
      ])
    ]
  ]);
}
function inputs(ctrl, fen) {
  if (ctrl.cfg.embed) return void 0;
  return div(".copyables", [
    p([
      strong("FEN"),
      copyMeInput(fen, {
        inputAttrs: { enterkeyhint: "done" },
        on: {
          change(e) {
            const el = e.target;
            ctrl.setFen(el.value.trim());
            el.reportValidity();
          },
          input(e) {
            const el = e.target;
            const valid = parseFen(el.value.trim()).isOk;
            el.setCustomValidity(valid ? "" : "Invalid FEN");
          },
          blur(e) {
            const el = e.target;
            el.value = ctrl.getFen();
            el.setCustomValidity("");
          },
          keypress: enter((el) => {
            const candidateChess960Id = fenToChess960Id(el.value.trim());
            if (candidateChess960Id !== void 0) {
              ctrl.chess960PositionId = candidateChess960Id;
            }
            el.blur();
          })
        }
      })
    ]),
    p([
      strong(".name", "URL"),
      copyMeInput(ctrl.makeEditorUrl(fen, ctrl.bottomColor()), { inputAttrs: { readonly: true } })
    ]),
    a(
      url(`${site.asset.baseUrl()}/export/fen.gif`, {
        fen: ctrl.urlFen(fen),
        color: ctrl.bottomColor(),
        theme: document.body.dataset.board,
        piece: document.body.dataset.pieceSet
      })
    )(
      {
        download: true
      },
      "SCREENSHOT"
    )
  ]);
}
function selectedToClass(s) {
  return s === "pointer" || s === "trash" ? s : s.join(" ");
}
var lastTouchMovePos;
var piece = makeExoticTag("piece");
function sparePieces(ctrl, color, position) {
  const selectedClass = selectedToClass(ctrl.selected());
  const pieces = ["king", "queen", "rook", "bishop", "knight", "pawn"].map((role) => [color, role]);
  return div(
    {
      class: {
        spare: true,
        ["spare-" + position]: true,
        ["spare-" + color]: true
      }
    },
    ["pointer", ...pieces, "trash"].map((s) => {
      var _a, _b;
      const className = selectedToClass(s);
      const attrs = {
        class: className,
        ...s !== "pointer" && s !== "trash" ? {
          "data-color": s[0],
          "data-role": s[1]
        } : {}
      };
      const selectedSquare = selectedClass === className && !((_b = (_a = ctrl.chessground) == null ? void 0 : _a.state.draggable.current) == null ? void 0 : _b.newPiece);
      return div(
        {
          class: {
            "no-square": true,
            pointer: s === "pointer",
            trash: s === "trash",
            "selected-square": selectedSquare
          },
          on: {
            mousedown: onSelectSparePiece(ctrl, s, "mouseup"),
            touchstart: onSelectSparePiece(ctrl, s, "touchend"),
            touchmove: (e) => {
              lastTouchMovePos = eventPosition(e);
            }
          }
        },
        div(piece({ attrs }))
      );
    })
  );
}
function onSelectSparePiece(ctrl, s, upEvent) {
  return function(e) {
    e.preventDefault();
    if (s === "pointer" || s === "trash") {
      ctrl.selected(s);
      ctrl.redraw();
    } else {
      ctrl.selected("pointer");
      dragNewPiece(ctrl.chessground.state, { color: s[0], role: s[1] }, e, true);
      document.addEventListener(
        upEvent,
        (e2) => {
          const eventPos = eventPosition(e2) || lastTouchMovePos;
          if (eventPos && ctrl.chessground.getKeyAtDomPos(eventPos)) ctrl.selected("pointer");
          else ctrl.selected(s);
          ctrl.redraw();
        },
        { once: true }
      );
    }
  };
}
function makeCursor(selected) {
  if (selected === "pointer") return "pointer";
  const name = selected === "trash" ? "trash" : selected.join("-");
  const url2 = site.asset.url("cursors/" + name + ".cur");
  return `url('${url2}'), default !important`;
}
function view_default(ctrl) {
  const state = ctrl.getState();
  const color = ctrl.bottomColor();
  return div(`.board-editor.board-editor--${ctrl.variant}`, [
    sparePieces(ctrl, opposite(color), "top"),
    div(".main-board", { attrs: { style: `cursor: ${makeCursor(ctrl.selected())}` } }, chessground_default(ctrl)),
    sparePieces(ctrl, color, "bottom"),
    controls(ctrl, state),
    inputs(ctrl, state.legalFen || state.fen)
  ]);
}

// ../editor/src/editor.ts
var patch = init([classModule, attributesModule, propsModule, eventListenersModule]);
function initModule(config) {
  const ctrl = new EditorCtrl(config, redraw);
  const el = config.el || document.getElementById("board-editor");
  el.innerHTML = "";
  const inner = document.createElement("div");
  el.appendChild(inner);
  let vnode = patch(inner, view_default(ctrl));
  function redraw() {
    vnode = patch(vnode, view_default(ctrl));
  }
  menuHover_default();
  return {
    getFen: ctrl.getFen.bind(ctrl),
    setFen: (fen) => ctrl.setFen(fen),
    setOrientation: ctrl.setOrientation.bind(ctrl),
    setVariant: ctrl.setVariant.bind(ctrl)
  };
}
export {
  initModule
};
//# sourceMappingURL=editor.ZBERRHWR.js.map

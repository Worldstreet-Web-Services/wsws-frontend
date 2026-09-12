import {
  completeNode,
  path_exports
} from "./lib.NPW3BL7S.js";
import {
  perfIcons_default
} from "./lib.ZXVUOO3F.js";
import {
  resizeHandle
} from "./lib.SPSB7AAJ.js";
import {
  Coords,
  ShowResizeHandle
} from "./lib.CHCAIC5O.js";
import {
  userLink
} from "./lib.BMKV23O2.js";
import {
  numberFormat
} from "./lib.EAANXKAK.js";
import {
  cmnToggleWrap,
  icon
} from "./lib.MYPIOGN5.js";
import {
  plyOpponentColor
} from "./lib.LRP46MC3.js";
import {
  Chessground
} from "./lib.AEOHBIQD.js";
import {
  Chess,
  INITIAL_FEN,
  Result,
  makeFen,
  makeSanAndPlay,
  normalizeMove,
  parseFen,
  parseSan
} from "./lib.X7H2PLEK.js";
import {
  isNormal,
  makeUci,
  parseUci
} from "./lib.53PYQRAK.js";
import {
  bind,
  dataIcon,
  hl,
  isSafari,
  onInsert
} from "./lib.S3TIZ2HQ.js";
import {
  h
} from "./lib.LWF5S4ZV.js";
import {
  licon
} from "./lib.5I4BSVKX.js";
import {
  storage
} from "./lib.NFSQQWN5.js";

// ../puzzle/src/control.ts
function next(ctrl) {
  const child = ctrl.node.children[0];
  if (!child) return;
  ctrl.userJump(ctrl.path + child.id);
}
function prev(ctrl) {
  ctrl.userJump(path_exports.init(ctrl.path));
}
function last(ctrl) {
  const toInit = !path_exports.contains(ctrl.path, ctrl.initialPath);
  ctrl.userJump(toInit ? ctrl.initialPath : path_exports.fromNodeList(ctrl.mainline));
}
function first(ctrl) {
  const toInit = ctrl.path !== ctrl.initialPath && path_exports.contains(ctrl.path, ctrl.initialPath);
  ctrl.userJump(toInit ? ctrl.initialPath : path_exports.root);
}

// ../puzzle/src/moveTree.ts
function pgnToTree(pgn) {
  const pos = Chess.default();
  const root = completeNode("standard")({
    ply: 0,
    fen: INITIAL_FEN
  });
  let current = root;
  pgn.forEach((san, i) => {
    const move = parseSan(pos, san);
    pos.play(move);
    const nextNode = makeNode(pos.clone(), move, i + 1, san);
    current.children.push(nextNode);
    current = nextNode;
  });
  return root;
}
function mergeSolution(root, initialPath, solution, pov) {
  const initialNode = root.nodeAtPath(initialPath);
  const pos = Chess.fromSetup(parseFen(initialNode.fen).unwrap()).unwrap();
  const fromPly = initialNode.ply;
  const nodes = solution.map((uci, i) => {
    const move = normalizeMove(pos, parseUci(uci));
    const san = makeSanAndPlay(pos, move);
    const node = makeNode(pos.clone(), move, fromPly + i + 1, san);
    if (pov === "white" === (node.ply % 2 === 1)) node.puzzle = "good";
    return node;
  });
  root.addNodes(nodes, initialPath);
}
var makeNode = (pos, move, ply, san) => completeNode("standard")({
  ply,
  san,
  fen: makeFen(pos.toSetup()),
  uci: makeUci(move),
  pos: () => Result.ok(pos),
  children: []
});
function nextCorrectMove(ctrl) {
  if (ctrl.mode === "view") return void 0;
  if (!path_exports.contains(ctrl.path, ctrl.initialPath)) return void 0;
  const playedByColor = plyOpponentColor(ctrl.node.ply);
  if (playedByColor === ctrl.pov) return void 0;
  const nodes = ctrl.nodeList.slice(path_exports.size(ctrl.initialPath) + 1);
  const nextUci = ctrl.data.puzzle.solution[nodes.length];
  const move = nextUci && parseUci(nextUci);
  return move && isNormal(move) ? move : void 0;
}

// ../puzzle/src/view/chessground.ts
function chessground_default(ctrl) {
  return h("div.cg-wrap.cgv" + ctrl.cgVersion, {
    hook: {
      ...onInsert((el) => ctrl.setChessground(Chessground(el, makeConfig(ctrl)))),
      destroy: () => {
        ctrl.ground().destroy();
      }
    }
  });
}
function makeConfig(ctrl) {
  const opts = ctrl.makeCgOpts();
  return {
    fen: opts.fen,
    orientation: opts.orientation,
    turnColor: opts.turnColor,
    check: opts.check,
    lastMove: opts.lastMove,
    coordinates: ctrl.pref.coords !== Coords.Hidden,
    coordinatesOnSquares: ctrl.pref.coords === Coords.All,
    addPieceZIndex: ctrl.pref.is3d,
    addDimensionsCssVarsTo: document.body,
    jsHover: isSafari(),
    movable: {
      free: false,
      color: opts.movable.color,
      dests: opts.movable.dests,
      showDests: ctrl.pref.destination && !ctrl.blindfold(),
      rookCastle: ctrl.pref.rookCastle
    },
    draggable: {
      enabled: ctrl.pref.moveEvent > 0,
      showGhost: ctrl.pref.highlight
    },
    selectable: {
      enabled: ctrl.pref.moveEvent !== 1
    },
    events: {
      move: ctrl.userMove,
      insert(elements) {
        resizeHandle(elements, ShowResizeHandle.Always, ctrl.node.ply);
      }
    },
    premovable: {
      enabled: opts.premovable.enabled
    },
    drawable: {
      enabled: true,
      defaultSnapToValidMove: storage.boolean("arrow.snap").getOrDefault(true)
    },
    highlight: {
      lastMove: ctrl.pref.highlight,
      check: ctrl.pref.highlight
    },
    animation: {
      enabled: true,
      duration: ctrl.pref.animation.duration
    },
    disableContextMenu: true
  };
}

// ../puzzle/src/view/side.ts
function puzzleBox(ctrl) {
  return hl("div.puzzle__side__metas", [puzzleInfos(ctrl), gameInfos(ctrl)]);
}
var angleImg = (angle) => {
  const name = angle.opening || angle.openingAbstract ? "opening" : angle.key.startsWith("mateIn") ? "mate" : angle.key;
  return site.asset.url(`images/puzzle-themes/${name}.svg`);
};
var puzzleInfos = (ctrl) => {
  const { puzzle, angle } = ctrl.data;
  return hl("div.infos.puzzle", [
    hl("img.infos__angle-img", { attrs: { src: angleImg(angle), alt: angle.name } }),
    hl("div", [
      hl(
        "p",
        i18n.puzzle.puzzleId.asArray(
          ctrl.streak && ctrl.mode === "play" ? hl("span.hidden", i18n.puzzle.hidden) : hl(
            "a",
            {
              attrs: {
                href: ctrl.routerWithLang(`/training/${puzzle.id}`),
                ...ctrl.streak ? { target: "_blank" } : {}
              }
            },
            "#" + puzzle.id
          )
        )
      ),
      ctrl.opts.showRatings && hl(
        "p",
        i18n.puzzle.ratingX.asArray(
          !ctrl.streak && ctrl.mode === "play" ? hl("span.hidden", i18n.puzzle.hidden) : hl("strong", puzzle.rating)
        )
      ),
      hl("p", i18n.puzzle.playedXTimes.asArray(puzzle.plays, hl("strong", numberFormat(puzzle.plays))))
    ])
  ]);
};
function gameInfos(ctrl) {
  const { game, puzzle } = ctrl.data;
  const gameName = game.clock && game.perf ? `${game.clock} \u2022 ${game.perf.name}` : "import";
  return hl("div.infos", { attrs: game.perf && dataIcon(perfIcons_default[game.perf.key]) }, [
    hl("div", [
      hl(
        "p",
        i18n.puzzle.fromGameLink.asArray(
          ctrl.mode === "play" ? hl("span", gameName) : hl("a", { attrs: { href: `/${game.id}/${ctrl.pov}#${puzzle.initialPly}` } }, gameName)
        )
      ),
      hl(
        "div.players",
        game.players.map((p) => {
          var _a;
          const user = p.name === "ghost" ? ((_a = p.rating) == null ? void 0 : _a.toString()) || "" : userLink({ ...p, rating: ctrl.opts.showRatings ? p.rating : void 0, line: false });
          return hl("div.player.color-icon.is.text." + p.color, user);
        })
      )
    ])
  ]);
}
var renderStreak = (streak) => hl(
  "div.puzzle__side__streak",
  streak.data.index === 0 ? hl("div.puzzle__side__streak__info", [
    hl("h1.text", { attrs: dataIcon(licon.ArrowThruApple) }, "Puzzle Streak"),
    hl("p", i18n.puzzle.streakDescription)
  ]) : hl(
    "div.puzzle__side__streak__score.text",
    { attrs: dataIcon(licon.ArrowThruApple) },
    `${streak.data.index}`
  )
);
var userBox = (ctrl) => {
  var _a;
  const { data } = ctrl;
  if (!data.user)
    return hl("div.puzzle__side__user", [
      hl("p", i18n.puzzle.toGetPersonalizedPuzzles),
      hl("a.button", { attrs: { href: ctrl.routerWithLang("/signup") } }, i18n.site.signUp)
    ]);
  const diff = (_a = ctrl.round) == null ? void 0 : _a.ratingDiff;
  const ratedId = `puzzle-toggle-rated_hint-${ctrl.hintHasBeenShown()}`;
  return hl("div.puzzle__side__user", [
    !data.replay && !ctrl.streak && data.user && cmnToggleWrap({
      id: ratedId,
      name: i18n.site.rated,
      checked: ctrl.rated() && !ctrl.hintHasBeenShown(),
      change: ctrl.toggleRated,
      disabled: ctrl.lastFeedback !== "init" || ctrl.hintHasBeenShown(),
      redraw: ctrl.redraw
    }),
    hl(
      "div.puzzle__side__user__rating",
      ctrl.rated() ? ctrl.opts.showRatings && hl("strong", [
        data.user.rating - (diff || 0),
        !!diff && diff > 0 && [" ", hl("good.rp", "+" + diff)],
        !!diff && diff < 0 && [" ", hl("bad.rp", "\u2212" + -diff)]
      ]) : hl("p.puzzle__side__user__rating__casual", i18n.puzzle.yourPuzzleRatingWillNotChange)
    )
  ]);
};
var streakBox = ({ streak }) => hl("div.puzzle__side__user", renderStreak(streak));
var difficulties = [
  ["easiest", -600],
  ["easier", -300],
  ["normal", 0],
  ["harder", 300],
  ["hardest", 600]
];
var colors = [
  ["black", "asBlack"],
  ["random", "randomColor"],
  ["white", "asWhite"]
];
function replay(ctrl) {
  const { replay: replay2, angle } = ctrl.data;
  if (!replay2) return void 0;
  const i = replay2.i + (ctrl.mode === "play" ? 0 : 1);
  const text = i18n.puzzleTheme[angle.key];
  return hl("div.puzzle__side__replay", [
    hl("a", { attrs: { href: `/training/dashboard/${replay2.days}` } }, ["\xAB ", `Replaying ${text} puzzles`]),
    hl("div.puzzle__side__replay__bar", {
      attrs: {
        style: `---p:${replay2.of ? Math.round(100 * i / replay2.of) : 1}%`,
        "data-text": `${i} / ${replay2.of}`
      }
    })
  ]);
}
function config(ctrl) {
  const { data } = ctrl;
  return hl("div.puzzle__side__config", [
    cmnToggleWrap({
      id: "puzzle-toggle-autonext",
      name: i18n.puzzle.jumpToNextPuzzleImmediately,
      checked: ctrl.autoNext(),
      change(v) {
        ctrl.autoNext(v);
        if (ctrl.autoNext() && ctrl.resultSent && !ctrl.streak) ctrl.nextPuzzle();
      },
      redraw: ctrl.redraw
    }),
    !data.user || data.replay || ctrl.streak ? null : renderDifficultyForm(ctrl)
  ]);
}
var renderDifficultyForm = (ctrl) => hl(
  "form.puzzle__side__config__difficulty",
  { attrs: { action: `/training/difficulty/${ctrl.data.angle.key}`, method: "post" } },
  [
    hl("label", { attrs: { for: "puzzle-difficulty" } }, i18n.puzzle.difficultyLevel),
    hl(
      "select#puzzle-difficulty.puzzle__difficulty__selector",
      {
        attrs: { name: "difficulty" },
        hook: onInsert(
          (elm) => elm.addEventListener("change", () => elm.parentNode.submit())
        )
      },
      difficulties.map(
        ([key, delta]) => hl(
          "option",
          {
            attrs: {
              value: key,
              selected: key === ctrl.opts.settings.difficulty,
              title: !!delta && delta < 0 ? i18n.puzzle.nbPointsBelowYourPuzzleRating(Math.abs(delta)) : i18n.puzzle.nbPointsAboveYourPuzzleRating(Math.abs(delta))
            }
          },
          [i18n.puzzle[key], delta ? ` (${delta > 0 ? "+" : ""}${delta})` : ""]
        )
      )
    )
  ]
);
var renderColorForm = (ctrl) => hl(
  "div.puzzle__side__config__color",
  hl(
    "group.radio",
    colors.map(
      ([key, i18nKey]) => hl("div", [
        hl(
          `a.label.color-${key}${key === (ctrl.opts.settings.color || "random") ? ".active" : ""}`,
          {
            attrs: { href: `/training/${ctrl.data.angle.key}/${key}`, title: i18n.site[i18nKey] }
          },
          hl("icon")
        )
      ])
    )
  )
);

// ../puzzle/src/view/theme.ts
var STUDY_URL = "https://lichess.org/study/viiWlKjv";
function theme(ctrl) {
  const { angle, replay: replay2 } = ctrl.data;
  const showEditor = ctrl.mode === "view" && !ctrl.autoNexting();
  if (replay2) return showEditor ? hl("div.puzzle__side__theme", editor(ctrl)) : null;
  if (ctrl.streak) return null;
  const backHref = ctrl.routerWithLang(`/training/${angle.opening ? "openings" : "themes"}`);
  if (ctrl.isDaily) {
    return hl(
      "div.puzzle__side__theme.puzzle__side__theme--daily",
      backToTheme(backHref, ["\xAB ", i18n.puzzle.dailyPuzzle])
    );
  }
  return hl("div.puzzle__side__theme", [
    backToTheme(backHref, ["\xAB ", angle.name], { class: { long: angle.name.length > 20 } }),
    angle.opening ? hl("a", { attrs: { href: `/opening/${angle.opening.key}` } }, [
      "Learn more about ",
      angle.opening.name
    ]) : hl("p", [
      angle.desc,
      angle.chapter && hl(
        "a.puzzle__side__theme__chapter.text",
        { attrs: { href: `${STUDY_URL}/${angle.chapter}`, target: "_blank" } },
        [" ", i18n.puzzle.example]
      )
    ]),
    showEditor ? hl("div.puzzle__themes", editor(ctrl)) : !replay2 && !ctrl.streak && (angle.opening || angle.openingAbstract) && renderColorForm(ctrl)
  ]);
}
var invisibleThemes = /* @__PURE__ */ new Set(["master", "masterVsMaster", "superGM"]);
function backToTheme(href, content, data = {}) {
  return hl("a.puzzle__side__theme__back", { attrs: { href }, ...data }, content);
}
function themeTrans(key) {
  return key in i18n.puzzleTheme ? i18n.puzzleTheme[key].toString() : key;
}
var editor = (ctrl) => {
  var _a, _b;
  const { puzzle } = ctrl.data;
  const votedThemes = (_b = (_a = ctrl.round) == null ? void 0 : _a.themes) != null ? _b : {};
  const visibleThemes = [
    ...puzzle.themes.filter((t) => !invisibleThemes.has(t)),
    ...Object.keys(votedThemes).filter(
      (t) => !!votedThemes[t] && !puzzle.themes.includes(t)
    )
  ].sort();
  const allThemes = ctrl.isDaily ? null : ctrl.allThemes;
  const availableThemes = allThemes ? allThemes.dynamic.filter((t) => !votedThemes[t]) : null;
  if (availableThemes) availableThemes.sort((a, b) => themeTrans(a) < themeTrans(b) ? -1 : 1);
  return [
    hl(
      "div.puzzle__themes_list",
      {
        hook: bind("click", (e) => {
          const target = e.target;
          const theme2 = target.getAttribute("data-theme");
          if (theme2) ctrl.voteTheme(theme2, target.classList.contains("vote-up"));
        })
      },
      visibleThemes.map(
        (key) => hl("div.puzzle__themes__list__entry", { class: { strike: votedThemes[key] === false } }, [
          hl(
            "a",
            { attrs: { href: `/training/${key}`, title: themeTrans(`${key}Description`) } },
            themeTrans(key)
          ),
          allThemes && hl(
            "div.puzzle__themes__votes",
            allThemes.static.has(key) ? [hl("div.puzzle__themes__lock", icon(licon.Padlock)())] : [
              hl("button.puzzle__themes__vote.vote-up", {
                class: { active: !!votedThemes[key] },
                attrs: { "data-theme": key }
              }),
              hl("button.puzzle__themes__vote.vote-down", {
                class: { active: votedThemes[key] === false },
                attrs: { "data-theme": key }
              })
            ]
          )
        ])
      )
    ),
    ...availableThemes ? [
      hl(
        `select.puzzle__themes__selector.cache-bust-${availableThemes.length}`,
        {
          hook: {
            ...bind("change", (e) => {
              const theme2 = e.target.value;
              if (theme2) ctrl.voteTheme(theme2, true);
            }),
            postpatch(_, vnode) {
              vnode.elm.value = "";
            }
          }
        },
        [
          hl("option", { attrs: { value: "", selected: true } }, i18n.puzzle.addAnotherTheme),
          availableThemes.map(
            (theme2) => hl(
              "option",
              { attrs: { value: theme2, title: themeTrans(`${theme2}Description`) } },
              themeTrans(theme2)
            )
          )
        ]
      ),
      hl(
        "a.puzzle__themes__study.text",
        { attrs: { "data-icon": licon.InfoCircle, href: STUDY_URL, target: "_blank" } },
        "About puzzle themes"
      )
    ] : []
  ];
};

export {
  next,
  prev,
  last,
  first,
  pgnToTree,
  mergeSolution,
  nextCorrectMove,
  chessground_default,
  makeConfig,
  puzzleBox,
  userBox,
  streakBox,
  replay,
  config,
  renderDifficultyForm,
  theme
};
//# sourceMappingURL=lib.H6DCD7XD.js.map

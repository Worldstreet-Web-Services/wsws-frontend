import {
  CommentForm,
  DescriptionCtrl,
  GlyphForm,
  NotifCtrl,
  SearchCtrl,
  ServerEval,
  StudyForm,
  StudyMemberCtrl,
  StudyShare,
  TagsForm,
  TopicsCtrl,
  keyToMouseEvent,
  makeShapesFromUci,
  resultTag,
  start_default,
  studyPracticeView_exports,
  studySideNodes,
  studyView_exports,
  tagsToMap
} from "./lib.MVDLUPAI.js";
import "./lib.GIUNMRJU.js";
import "./lib.LARLSDYI.js";
import "./lib.CJXBWL7W.js";
import "./lib.YN2PHZNI.js";
import "./lib.TRB3Z2N6.js";
import "./lib.2OVDXZTI.js";
import "./lib.QGZVCTIP.js";
import {
  api
} from "./lib.EN3TWOBW.js";
import "./lib.PQMRP22H.js";
import {
  MultiBoardCtrl,
  MultiCloudEval,
  RelayCtrl,
  StudyChaptersCtrl,
  broadcasterDeepLink,
  chapterConfig,
  fidePageLinkAttrs,
  findTag,
  isFinished,
  looksLikeLichessGame,
  patch,
  playerColoredResult,
  playerFedFlag,
  playerId,
  playerPhotoOrFallback,
  practiceComplete,
  reload,
  renderClocks,
  renderMaterialDiffs
} from "./lib.UZWUG6PB.js";
import "./lib.OY6DQ2TE.js";
import "./lib.2NHX5WHM.js";
import "./lib.HSNYRAMB.js";
import {
  completeNode,
  intersection,
  ops_exports,
  path_exports
} from "./lib.NPW3BL7S.js";
import "./lib.ZXVUOO3F.js";
import "./lib.FMGDQ222.js";
import "./lib.LG7MGGUH.js";
import "./lib.5Q3MW527.js";
import "./lib.SPSB7AAJ.js";
import "./lib.CHCAIC5O.js";
import "./lib.67VUYMDO.js";
import "./lib.GD6YSPBF.js";
import {
  userTitle
} from "./lib.BMKV23O2.js";
import "./lib.6Z4MCRO3.js";
import "./lib.MFOXABY3.js";
import "./lib.D6AFQ4TK.js";
import "./lib.EAANXKAK.js";
import "./lib.REVOPUIJ.js";
import "./lib.BWJ4DVGT.js";
import {
  alert,
  icon
} from "./lib.MYPIOGN5.js";
import "./lib.LRP46MC3.js";
import "./lib.HMFK7OOB.js";
import "./lib.AEOHBIQD.js";
import "./lib.RPQH5UYI.js";
import "./lib.XAEDCBGD.js";
import "./lib.X7H2PLEK.js";
import {
  COLORS,
  opposite
} from "./lib.53PYQRAK.js";
import "./lib.CAO7TYYH.js";
import {
  wsConnect
} from "./lib.PNHYIP7B.js";
import {
  bind,
  dataIcon,
  displayColumns,
  hl,
  onInsert,
  requiresI18n
} from "./lib.S3TIZ2HQ.js";
import {
  h
} from "./lib.LWF5S4ZV.js";
import {
  pubsub
} from "./lib.QPQZCXK2.js";
import {
  licon
} from "./lib.5I4BSVKX.js";
import "./lib.TT4QSUKQ.js";
import {
  debounce,
  storedBooleanProp,
  storedMap,
  throttle,
  throttlePromiseDelay
} from "./lib.NFSQQWN5.js";
import {
  defined,
  memoize,
  prop,
  requestIdleCallbackSafe,
  richHTML
} from "./lib.GMEH5BEF.js";
import {
  __export
} from "./lib.KO2KTNGK.js";

// ../analyse/src/study/studyDeps.ts
var studyDeps_exports = {};
__export(studyDeps_exports, {
  StudyCtrl: () => StudyCtrl,
  findTag: () => findTag,
  gbEdit: () => gamebookEdit_exports,
  gbPlay: () => gamebookPlayView_exports,
  relayManager: () => relayManagerView_default,
  renderPlayerBars: () => playerBars_default,
  studyPracticeView: () => studyPracticeView_exports,
  studyView: () => studyView_exports
});

// ../analyse/src/study/playerBars.ts
function playerBars_default(ctrl) {
  var _a, _b, _c;
  const study = ctrl.study;
  if (!study) return void 0;
  const relayPlayers = (_a = study.relay) == null ? void 0 : _a.players;
  const showTeamLeaderboard = !!((_b = study.relay) == null ? void 0 : _b.data.tour.showTeamScores);
  const relayTeamLeaderboard = (_c = study.relay) == null ? void 0 : _c.teamLeaderboard;
  const players = study.currentChapter().players, tags = study.data.chapter.tags, clocks = renderClocks(ctrl, selectClockPath(ctrl, study)), tickingColor = study.isClockTicking(ctrl.path) && ctrl.turnColor(), materialDiffs = renderMaterialDiffs(ctrl), tagsMap = tagsToMap(tags);
  return COLORS.map(
    (color) => {
      var _a2;
      return renderPlayer(
        ctrl,
        tagsMap,
        clocks,
        materialDiffs,
        players,
        color,
        tickingColor === color,
        study.data.showRatings || !looksLikeLichessGame(tags),
        (_a2 = study.relay) == null ? void 0 : _a2.round,
        relayPlayers,
        { show: showTeamLeaderboard, leaderboard: relayTeamLeaderboard }
      );
    }
  );
}
function selectClockPath(ctrl, study) {
  const gamePath = ctrl.gamePath || study.data.chapter.relayPath;
  return ctrl.node.clock ? ctrl.path : gamePath ? intersection(ctrl.path, gamePath) : ctrl.path;
}
function renderPlayer(ctrl, tags, clocks, materialDiffs, players, color, ticking, showRatings, round, relayPlayers, relayTeamLeaderboard) {
  var _a, _b, _c;
  const showResult = !defined((_a = ctrl.study) == null ? void 0 : _a.relay) || ((_b = ctrl.study) == null ? void 0 : _b.multiBoard.showResults()) || ctrl.node.ply === ctrl.tree.lastPly(), team = tags.get(`${color}team`), rawStatus = showResult ? (_c = tags.get("result")) == null ? void 0 : _c.replace(/1\/2/g, "\xBD") : void 0, status = rawStatus && rawStatus !== "*" ? rawStatus : void 0, result = showResult ? resultOf(tags, color === "white") : void 0, top = ctrl.bottomColor() !== color, eloTag = tags.get(`${color}elo`), fideIdTag = tags.get(`${color}fideid`), fideId = fideIdTag ? parseInt(fideIdTag) : void 0, player = {
    ...players == null ? void 0 : players[color],
    name: tags.get(color),
    title: tags.get(`${color}title`),
    rating: showRatings && eloTag ? parseInt(eloTag) : void 0,
    fideId
  }, photo = fideId ? relayPlayers == null ? void 0 : relayPlayers.fidePhoto(fideId) : void 0;
  const coloredResult = status && status !== "*" && playerColoredResult(status, color, round == null ? void 0 : round.customScoring);
  const resultNode = coloredResult ? hl(`${coloredResult.tag}.result`, coloredResult.points) : result && hl(`${resultTag(result)}.result`, result);
  return relayPlayers ? hl(`div.relay-board-player.relay-board-player-${top ? "top" : "bot"}`, { class: { ticking } }, [
    hl("div.left", [
      playerPhotoOrFallback(player, photo, "small", "relay-board-player__photo"),
      hl("div.info-split", [
        hl("div", [
          !!player.title && userTitle(player),
          playerId(player) && hl(`a.name.relay-player-${color}`, relayPlayers.playerLinkConfig(player), player.name)
        ]),
        hl("div.info-secondary", [
          team ? hl(
            "a.team",
            {
              on: {
                click: (ev) => {
                  var _a2, _b2, _c2;
                  ev.preventDefault();
                  (relayTeamLeaderboard == null ? void 0 : relayTeamLeaderboard.show) ? (_a2 = relayTeamLeaderboard == null ? void 0 : relayTeamLeaderboard.leaderboard) == null ? void 0 : _a2.setTeamToShow(team) : (_c2 = (_b2 = ctrl.study) == null ? void 0 : _b2.relay) == null ? void 0 : _c2.openTab("teams");
                }
              }
            },
            team
          ) : void 0,
          playerFedFlag(player == null ? void 0 : player.fed),
          player.rating && hl("span.elo", `${player.rating}`)
        ])
      ]),
      resultNode
    ]),
    materialDiffs[top ? 0 : 1],
    clocks == null ? void 0 : clocks[color === "white" ? 0 : 1]
  ]) : hl(`div.study__player.study__player-${top ? "top" : "bot"}`, { class: { ticking } }, [
    hl("div.left", [
      resultNode,
      hl("span.info", [
        team ? hl("span.team", team) : void 0,
        playerFedFlag(player == null ? void 0 : player.fed),
        !!player.title && userTitle(player),
        playerId(player) && hl(
          player.fideId ? "a.name" : "span.name",
          { attrs: fidePageLinkAttrs(player, ctrl.isEmbed) },
          player.name
        ),
        player.rating && hl("span.elo", `${player.rating}`)
      ])
    ]),
    materialDiffs[top ? 0 : 1],
    clocks == null ? void 0 : clocks[color === "white" ? 0 : 1]
  ]);
}
function resultOf(tags, isWhite) {
  var _a;
  const both = (_a = tags.get("result")) == null ? void 0 : _a.split("-");
  const mine = (both == null ? void 0 : both.length) === 2 ? both[isWhite ? 0 : 1] : void 0;
  return mine === "1/2" ? "\xBD" : mine;
}

// ../analyse/src/study/relay/relayManagerView.ts
function relayManagerView_default(ctrl, study) {
  const contributor = study.members.canContribute(), sync = ctrl.data.sync;
  return contributor || study.data.admin ? hl("div.relay-admin__container", [
    contributor && hl("div.relay-admin", { hook: onInsert((_) => site.asset.loadCssPath("analyse.relay-admin")) }, [
      hl("h2", [
        hl("span.text", { attrs: dataIcon(licon.RadioTower) }, "Broadcast manager"),
        hl("a", {
          attrs: { href: `/broadcast/round/${study.data.id}/edit`, "data-icon": licon.Gear }
        })
      ]),
      (sync == null ? void 0 : sync.url) || (sync == null ? void 0 : sync.ids) || (sync == null ? void 0 : sync.urls) || (sync == null ? void 0 : sync.users) ? (sync.ongoing ? stateOn : stateOff)(ctrl) : statePush(ctrl),
      renderLog(ctrl)
    ]),
    (contributor || study.data.admin) && studySideNodes(study, false)
  ]) : void 0;
}
var logSuccess = (e) => e.moves ? [hl("strong", e.moves), ` new move${e.moves > 1 ? "s" : ""}`] : ["Nothing new"];
function renderLog(ctrl) {
  var _a, _b;
  const url = (_a = ctrl.data.sync) == null ? void 0 : _a.url;
  const logLines = (((_b = ctrl.data.sync) == null ? void 0 : _b.log) || []).slice(0).reverse().map((e) => {
    const err = e.error && hl("a", url ? { attrs: { href: url, target: "_blank", rel: "nofollow" } } : {}, e.error);
    return hl(
      "div" + (err ? ".err" : ""),
      { key: e.at, attrs: dataIcon(err ? licon.CautionCircle : licon.Checkmark) },
      [hl("div", [err ? [err] : logSuccess(e), hl("time", dateFormatter()(new Date(e.at)))])]
    );
  });
  if (ctrl.loading()) logLines.unshift(hl("div.load", [hl("icon.ddloader"), "Polling source..."]));
  return hl("div.log", logLines);
}
function stateOn(ctrl) {
  const sync = ctrl.data.sync;
  return hl(
    "button.state.on.clickable",
    { hook: bind("click", (_) => ctrl.setSync(false)), attrs: dataIcon(licon.ChasingArrows) },
    [
      hl("span", [
        "Connected ",
        sync && [
          !!sync.delay && `with ${sync.delay}s delay `,
          sync.url ? ["to", hl("br"), "single URL source"] : sync.ids ? ["to", hl("br"), sync.ids.length, " game(s)"] : sync.users ? [
            "to",
            hl("br"),
            sync.users.length > 4 ? `${sync.users.length} users` : sync.users.join(" ")
          ] : sync.urls && ["to", hl("br"), sync.urls.length, " sources"],
          !!sync.filter && ` (round ${sync.filter})`,
          !!sync.slices && ` (slice ${sync.slices})`
        ]
      ])
    ]
  );
}
var stateOff = (ctrl) => hl(
  "button.state.off.clickable",
  { hook: bind("click", (_) => ctrl.setSync(true)), attrs: dataIcon(licon.PlayTriangle) },
  [hl("span.fat", "Connect to source")]
);
var statePush = (ctrl) => hl("div.state.push", { attrs: dataIcon(licon.UploadCloud) }, [
  hl("span", [
    "Listening to ",
    hl("a", { attrs: { href: "/broadcast/app" } }, "Broadcaster App"),
    hl("br"),
    hl("small", [
      hl("a", { attrs: { href: broadcasterDeepLink(ctrl.round.url) } }, "Open this round in the app")
    ])
  ])
]);
var dateFormatter = memoize(
  () => new Intl.DateTimeFormat(site.displayLocale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric"
  }).format
);

// ../analyse/src/study/gamebook/gamebookPlayCtrl.ts
var GamebookPlayCtrl = class {
  constructor(root, chapterId, redraw) {
    this.root = root;
    this.chapterId = chapterId;
    this.redraw = redraw;
    this.makeState = () => {
      var _a, _b;
      const node = this.root.node, nodeComment = (node.comments || [])[0], state = {
        init: this.root.path === "",
        comment: nodeComment ? nodeComment.text : void 0,
        showHint: false
      }, parPath = path_exports.init(this.root.path), parNode = this.root.tree.nodeAtPath(parPath);
      if (this.root.onMainline && !node.children[0] || !this.root.onMainline && !this.root.tree.pathIsMainline(parPath))
        state.feedback = "end";
      else if (this.isMyMove()) {
        state.feedback = "play";
        state.hint = (_a = node.gamebook) == null ? void 0 : _a.hint;
      } else if (this.root.onMainline) state.feedback = "good";
      else {
        state.feedback = "bad";
        if (!state.comment) state.comment = (_b = parNode.children[0].gamebook) == null ? void 0 : _b.deviation;
      }
      this.state = state;
      if (!state.comment) {
        if (state.feedback === "good") setTimeout(this.next, this.root.path ? 1e3 : 300);
        else if (state.feedback === "bad") setTimeout(this.retry, 800);
      }
    };
    this.isMyMove = () => this.root.turnColor() === this.root.data.orientation;
    this.movableColor = () => ["play", "good"].includes(this.state.feedback) ? this.root.data.orientation : void 0;
    this.retry = () => {
      let path = this.root.path;
      while (path && !this.root.tree.pathIsMainline(path)) path = path_exports.init(path);
      this.root.userJump(path);
      this.redraw();
    };
    this.next = () => {
      if (!this.isMyMove()) {
        const child = this.root.node.children[0];
        if (child) this.root.userJump(this.root.path + child.id);
      }
      this.redraw();
    };
    this.onSpace = () => {
      switch (this.state.feedback) {
        case "bad":
          this.retry();
          break;
        case "end": {
          this.root.study.goToNextChapter();
          break;
        }
        default:
          this.next();
      }
    };
    this.onPremoveSet = () => {
      this.next();
    };
    this.hint = () => {
      if (this.state.hint) this.state.showHint = !this.state.showHint;
    };
    this.solution = () => {
      this.root.chessground.setShapes(
        makeShapesFromUci(this.root.turnColor(), this.root.node.children[0].uci, "green")
      );
    };
    this.canJumpTo = (path) => path_exports.contains(this.root.path, path);
    this.onJump = () => {
      this.makeState();
      setTimeout(() => this.root.withCg((cg) => cg.playPremove()), 100);
    };
    this.onShapeChange = (shapes) => {
      var _a;
      const node = this.root.node;
      if (((_a = node.gamebook) == null ? void 0 : _a.shapes) && !shapes.length) {
        node.shapes = node.gamebook.shapes.slice(0);
        this.root.jump(this.root.path);
      }
    };
    this.makeState();
  }
};

// ../analyse/src/study/practice/studyPracticeSuccess.ts
var isDrawish = (node) => hasSolidEval(node) ? !node.ceval.mate && Math.abs(node.ceval.cp) < 150 : null;
var isWinning = (node, goalCp, color) => {
  if (!hasSolidEval(node)) {
    const pos = node.pos().unwrap();
    return pos.isStalemate() || pos.isInsufficientMaterial() ? false : null;
  }
  const cp = node.ceval.mate > 0 ? 99999 : node.ceval.mate < 0 ? -99999 : node.ceval.cp;
  return color === "white" ? cp >= goalCp : cp <= goalCp;
};
var myMateIn = (node, color) => {
  var _a;
  if (!hasSolidEval(node)) return null;
  if (!((_a = node.ceval) == null ? void 0 : _a.mate)) return false;
  const mateIn = node.ceval.mate * (color === "white" ? 1 : -1);
  return mateIn > 0 ? mateIn : false;
};
var hasSolidEval = (node) => node.ceval && node.ceval.depth >= 16;
var hasBlundered = (comment) => !!comment && ["mistake", "blunder"].includes(comment.verdict);
function studyPracticeSuccess_default(root, goal, nbMoves) {
  const node = root.node;
  if (!node.uci) return null;
  const outcome = node.outcome();
  if (outcome == null ? void 0 : outcome.winner) return outcome.winner === root.bottomColor();
  if (hasBlundered(root.practice.comment())) return false;
  switch (goal.result) {
    case "drawIn":
    case "equalIn":
      if (node.threefold) return true;
      if (isDrawish(node) === false) return false;
      if (nbMoves > goal.moves) return false;
      if (outcome && !outcome.winner) return true;
      if (nbMoves >= goal.moves) return isDrawish(node);
      break;
    case "evalIn":
      if (nbMoves >= goal.moves) return isWinning(node, goal.cp, root.bottomColor());
      break;
    case "mateIn": {
      if (nbMoves > goal.moves) return false;
      const mateIn = myMateIn(node, root.bottomColor());
      if (mateIn === null) return null;
      if (!mateIn || mateIn + nbMoves > goal.moves) return false;
      break;
    }
    case "promotion":
      if (!node.uci[4]) return null;
      return isWinning(node, goal.cp, root.bottomColor());
    case "mate":
      if (node.threefold) return false;
      if (isDrawish(node)) return false;
      if (node.pos().unwrap().isStalemate()) return false;
  }
  return null;
}

// ../analyse/src/study/practice/studyPracticeCtrl.ts
var StudyPracticeCtrl = class {
  constructor(root, studyData, data) {
    this.root = root;
    this.studyData = studyData;
    this.data = data;
    this.nbMoves = prop(0);
    // null = ongoing, true = win, false = fail
    this.success = prop(null);
    this.autoNext = storedBooleanProp("analyse.practice-auto-next", true);
    this.onLoad = () => {
      this.goal(this.root.data.practiceGoal);
      this.nbMoves(0);
      this.success(null);
    };
    this.computeNbMoves = () => {
      let plies = this.root.node.ply - this.root.tree.root.ply;
      if (this.root.bottomColor() !== this.root.data.player.color) plies--;
      return Math.ceil(plies / 2);
    };
    this.checkSuccess = () => {
      var _a, _b;
      const gamebook = (_a = this.root.study) == null ? void 0 : _a.gamebookPlay;
      if (gamebook) {
        if (gamebook.state.feedback === "end") this.onVictory();
        return;
      }
      if (this.success() !== null || !this.root.practice || !((_b = this.root.study) == null ? void 0 : _b.data.chapter.practice)) return;
      this.nbMoves(this.computeNbMoves());
      const res = this.success(studyPracticeSuccess_default(this.root, this.goal(), this.nbMoves()));
      if (res) this.onVictory();
      else if (res === false) this.onFailure();
    };
    this.onVictory = () => {
      site.sound.play("practiceSuccess");
      this.onComplete();
      if (this.studyData.chapter.practice && this.autoNext())
        setTimeout(this.root.study.goToNextChapter, 1e3);
    };
    this.onComplete = () => {
      this.saveNbMoves();
    };
    this.saveNbMoves = () => {
      const chapterId = this.root.study.currentChapter().id, former = this.data.completion[chapterId];
      if (typeof former === "undefined" || this.nbMoves() < former) {
        this.data.completion[chapterId] = this.nbMoves();
        practiceComplete(chapterId, this.nbMoves());
      }
    };
    this.onFailure = () => {
      this.root.node.fail = true;
      site.sound.play("practiceFailure");
    };
    this.onJump = () => {
      if (this.success() === false && !this.root.nodeList.some((n) => !!n.fail)) this.success(null);
      this.checkSuccess();
    };
    this.onCeval = this.checkSuccess;
    this.reset = () => {
      this.root.tree.root.children = [];
      this.root.userJump("");
      this.root.practice.reset();
      this.onLoad();
      this.root.practice.resume();
    };
    this.customCeval = {
      search: () => {
        var _a, _b, _c;
        return (_c = (_b = (_a = api.overrides).studyPracticeSearch) == null ? void 0 : _b.call(_a)) != null ? _c : { by: { nodes: 6e5 }, multiPv: 1, indeterminate: true };
      }
    };
    this.isWhite = this.root.bottomIsWhite;
    this.analysisUrl = () => `/analysis/standard/${this.root.node.fen.replace(/ /g, "_")}?color=${this.root.bottomColor()}`;
    this.goal = prop(root.data.practiceGoal);
    site.sound.load("practiceSuccess", site.sound.url("other/energy3.mp3"));
    site.sound.load("practiceFailure", site.sound.url("other/failure2.mp3"));
    this.onLoad();
  }
};

// ../analyse/src/study/studyKeyboard.ts
function studyKeyboard(ctrl) {
  const kbd = window.site.mousetrap;
  keyToMouseEvent("d", "click", ".study__buttons .comments");
  keyToMouseEvent("g", "click", ".study__buttons .glyphs");
  kbd.bind("p", ctrl.goToPrevChapter);
  kbd.bind("n", ctrl.goToNextChapter);
  for (let i = 1; i < 9; i++) kbd.bind(i.toString(), () => ctrl.glyphForm.toggleGlyph(i === 8 ? 22 : i));
  for (let i = 1; i < 9; i++) kbd.bind(`shift+${i}`, () => ctrl.glyphForm.toggleGlyph(i === 1 ? 10 : 11 + i));
  const observationIds = [146, 32, 36, 40, 132, 138, 44, 140];
  for (let i = 1; i < 9; i++)
    kbd.bind(`ctrl+shift+${i}`, () => ctrl.glyphForm.toggleGlyph(observationIds[i - 1]));
  kbd.bind("mod+z", ctrl.undoShapeChange);
  kbd.bind("shift+s", () => {
    ctrl.search.open(true);
    ctrl.redraw();
  });
  kbd.bind("shift+h", () => ctrl.toggleStudyFormIfAllowed());
  kbd.bind("shift+e", () => {
    if (!ctrl.members.canContribute()) return;
    ctrl.chapters.editForm.toggle(ctrl.currentChapter());
    ctrl.redraw();
  });
  kbd.bind("shift+n", () => {
    if (!ctrl.members.canContribute()) return;
    ctrl.chapters.toggleNewForm();
    ctrl.redraw();
  });
}

// ../analyse/src/study/studyCtrl.ts
var StudyCtrl = class {
  constructor(data, ctrl, tagTypes, practiceData, relayData) {
    this.ctrl = ctrl;
    this.relayRecProp = prop(false);
    this.nonRelayRecMapProp = storedMap("study.rec", 100, () => true);
    this.chapterFlipMapProp = storedMap("chapter.flip", 400, () => false);
    this.arrowHistory = [];
    this.send = this.ctrl.socket.send;
    this.redraw = this.ctrl.redraw;
    this.startTour = async () => {
      const [tour] = await Promise.all([
        site.asset.loadEsm("analyse.study.tour"),
        site.asset.loadCssPath("bits.shepherd")
      ]);
      tour.study(this.ctrl);
    };
    this.setTab = (tab) => {
      if (tab === "chapters") this.chapters.scroller.request("instant");
      this.vm.tab(tab);
      this.redraw();
    };
    this.currentChapter = () => this.chapters.list.get(this.vm.chapterId);
    this.isChapterOwner = () => this.ctrl.opts.userId === this.data.chapter.ownerId;
    this.isWriting = () => this.vm.mode.write && !this.isGamebookPlay();
    this.updateShapes = (shapes) => {
      this.ctrl.tree.setShapes(shapes, this.ctrl.path);
      this.makeChange(
        "shapes",
        this.addChapterId({
          path: this.ctrl.path,
          shapes
        })
      );
    };
    this.undoShapeChange = () => {
      if (!this.vm.mode.write) return;
      const last = this.arrowHistory.pop();
      if (!last) return;
      this.updateShapes(last);
      this.ctrl.withCg((cg) => cg.setShapes(last.slice()));
    };
    this.makeChange = (event, ...args) => {
      if (this.isWriting()) {
        this.send(event, ...args);
        return true;
      }
      return this.vm.mode.sticky = false;
    };
    this.addChapterId = (req) => ({
      ...req,
      ch: this.vm.chapterId
    });
    this.isGamebookPlay = () => this.data.chapter.gamebook && this.vm.gamebookOverride !== "analyse" && (this.vm.gamebookOverride === "play" || !this.members.canContribute());
    this.configureAnalysis = () => {
      var _a;
      const canContribute = this.members.canContribute();
      this.vm.mode.write = this.vm.mode.write && canContribute;
      pubsub.emit("chat.writeable", this.data.features.chat);
      pubsub.emit("chat.permissions", { local: canContribute && !((_a = this.relay) == null ? void 0 : _a.isOfficial()) });
      if (!this.data.chapter.features.explorer) this.ctrl.explorer.disable();
      this.ctrl.explorer.allowed(this.data.chapter.features.explorer);
    };
    this.isCevalAllowed = () => {
      var _a;
      return (!((_a = this.relay) == null ? void 0 : _a.tourShow()) || site.blindMode) && !this.isGamebookPlay() && (this.data.chapter.features.computer || this.data.chapter.practice);
    };
    this.configurePractice = () => {
      var _a;
      if (!this.data.chapter.practice && this.ctrl.practice) this.ctrl.togglePractice();
      if (this.data.chapter.practice) this.ctrl.togglePractice(true);
      (_a = this.practice) == null ? void 0 : _a.onLoad();
    };
    this.onReload = (d) => {
      var _a, _b;
      const s = d.study;
      const prevPath = this.ctrl.path;
      const sameChapter = this.data.chapter.id === s.chapter.id;
      const changeInChapterOrientation = sameChapter && // changes on orientation are only relevant for the same chapter
      this.data.chapter.setup.orientation !== s.chapter.setup.orientation;
      this.vm.mode.sticky = this.vm.mode.sticky && s.features.sticky || !this.data.features.sticky && s.features.sticky;
      if (this.vm.mode.sticky) this.vm.behind = 0;
      this.data.position = s.position;
      this.data.name = s.name;
      this.data.flair = s.flair;
      this.data.visibility = s.visibility;
      this.data.features = s.features;
      this.data.settings = s.settings;
      this.data.chapter = s.chapter;
      this.data.likes = s.likes;
      this.data.liked = s.liked;
      this.data.description = s.description;
      this.chapterDesc.set(this.data.chapter.description);
      this.studyDesc.set(this.data.description);
      document.title = (_b = (_a = this.relay) == null ? void 0 : _a.fullRoundName()) != null ? _b : this.data.name;
      this.members.dict(s.members);
      if (s.chapters) this.chapters.loadFromServer(s.chapters);
      if (changeInChapterOrientation) this.chapterFlipMapProp(this.data.chapter.id, false);
      this.ctrl.flipped = this.chapterFlipMapProp(this.data.chapter.id);
      const merge = !this.vm.mode.write && sameChapter;
      this.ctrl.reloadData(d.analysis, merge);
      this.vm.gamebookOverride = void 0;
      this.configureAnalysis();
      this.vm.loading = false;
      this.instantiateGamebookPlay();
      let nextPath;
      if (this.vm.mode.sticky) {
        this.vm.chapterId = this.data.position.chapterId;
        nextPath = this.vm.justSetChapterId === this.vm.chapterId && this.chapters.localPaths[this.vm.chapterId] || this.data.position.path;
      } else {
        nextPath = sameChapter ? prevPath : this.relay && !this.multiBoard.showResults() ? path_exports.root : this.data.chapter.relayPath || this.chapters.localPaths[this.vm.chapterId] || path_exports.root;
      }
      this.ctrl.userJump(this.ctrl.tree.longestValidPath(nextPath));
      this.vm.justSetChapterId = void 0;
      this.configurePractice();
      this.serverEval.reset();
      this.commentForm.onSetPath(this.data.chapter.id, this.ctrl.path, this.ctrl.node);
      this.redraw();
      this.ctrl.startCeval();
      this.updateHistoryAndAddressBar();
    };
    this.xhrReload = throttlePromiseDelay(
      () => 400,
      /* `callback` runs immediately after the xhr, and is not affected by the delay */
      (withChapters = false, immediateCallback = () => {
      }) => {
        this.vm.loading = true;
        return reload(
          this.practice ? "practice/load" : "study",
          this.data.id,
          this.vm.mode.sticky ? void 0 : this.vm.chapterId,
          withChapters
        ).then(this.onReload, site.reload).then(immediateCallback);
      }
    );
    this.onSetPath = throttle(300, (path) => {
      if (this.vm.mode.sticky && path !== this.data.position.path)
        this.makeChange("setPath", this.addChapterId({ path }));
    });
    this.currentNode = () => this.ctrl.node;
    this.onMainline = () => this.ctrl.tree.pathIsMainline(this.ctrl.path);
    this.bottomColor = () => this.ctrl.flipped ? opposite(this.data.chapter.setup.orientation) : this.data.chapter.setup.orientation;
    this.instantiateGamebookPlay = () => {
      var _a;
      if (!this.isGamebookPlay()) return this.gamebookPlay = void 0;
      ops_exports.updateAll(this.ctrl.tree.root, (n) => {
        n.gamebook = n.gamebook || {};
        if (n.shapes) n.gamebook.shapes = n.shapes.slice(0);
      });
      if (((_a = this.gamebookPlay) == null ? void 0 : _a.chapterId) === this.vm.chapterId) return void 0;
      this.gamebookPlay = new GamebookPlayCtrl(this.ctrl, this.vm.chapterId, this.redraw);
      this.vm.mode.sticky = false;
      return void 0;
    };
    this.mutateCgConfig = (config) => {
      if (config.drawable) {
        config.drawable.onChange = (shapes) => {
          var _a, _b, _c;
          if (this.vm.mode.write) {
            this.arrowHistory.push((_b = (_a = this.ctrl.node.shapes) == null ? void 0 : _a.slice()) != null ? _b : []);
            this.updateShapes(shapes);
          }
          (_c = this.gamebookPlay) == null ? void 0 : _c.onShapeChange(shapes);
        };
      }
    };
    this.wrongChapter = (serverData) => {
      if (serverData.p.chapterId !== this.vm.chapterId) {
        if (this.vm.mode.sticky && serverData.s) this.xhrReload();
        return true;
      }
      return false;
    };
    this.setMemberActive = (who) => {
      who && this.members.setActive(who.u);
      this.vm.updatedAt = Date.now();
    };
    this.withPosition = (obj) => ({
      ...obj,
      ch: this.vm.chapterId,
      path: this.ctrl.path
    });
    this.likeToggler = debounce(() => this.send("like", { liked: this.data.liked }), 1e3);
    this.setChapter = async (idOrNumber, force) => {
      var _a, _b;
      const id = (_a = this.chapters.list.get(idOrNumber)) == null ? void 0 : _a.id;
      if (!id) {
        console.warn(`Chapter ${idOrNumber} not found`);
        return false;
      }
      const componentCallbacks = (id2) => {
        var _a2;
        (_a2 = this.relay) == null ? void 0 : _a2.onChapterChange(id2);
      };
      const alreadySet = id === this.vm.chapterId && !force;
      if (alreadySet) {
        componentCallbacks(this.data.chapter.id);
        this.redraw();
        return true;
      }
      this.chapters.scroller.request("smooth");
      this.vm.nextChapterId = id;
      this.vm.justSetChapterId = id;
      if (this.vm.mode.sticky && this.makeChange("setChapter", id)) {
        this.vm.loading = true;
        (_b = this.relay) == null ? void 0 : _b.onChapterChange(id);
        this.redraw();
      } else {
        this.vm.mode.sticky = false;
        if (!this.vm.behind) this.vm.behind = 1;
        this.vm.chapterId = id;
        this.chapters.scroller.request("smooth");
        await this.xhrReload(false, () => componentCallbacks(id));
      }
      if (displayColumns() > 2) window.scrollTo(0, 0);
      return true;
    };
    this.chapterSelect = {
      is: (idOrNumber) => defined(this.chapters.list.get(idOrNumber)),
      set: this.setChapter,
      get: () => this.data.chapter.id
    };
    this.deltaChapter = (delta) => {
      const chs = this.chapters.list.all();
      const i = chs.findIndex((ch) => ch.id === this.vm.chapterId);
      return i === -1 ? void 0 : chs[i + delta];
    };
    this.prevChapter = () => this.deltaChapter(-1);
    this.nextChapter = () => this.deltaChapter(1);
    this.hasNextChapter = () => {
      const chs = this.chapters.list.all();
      return chs[chs.length - 1].id !== this.vm.chapterId;
    };
    this.isUpdatedRecently = () => Date.now() - this.vm.updatedAt < 300 * 1e3;
    this.toggleLike = () => {
      this.data.liked = !this.data.liked;
      this.redraw();
      this.likeToggler();
    };
    this.position = () => this.data.position;
    this.canJumpTo = (path) => this.gamebookPlay ? this.gamebookPlay.canJumpTo(path) : this.data.chapter.conceal === void 0 || this.isChapterOwner() || path_exports.contains(this.ctrl.path, path) || // can always go back
    this.ctrl.tree.lastMainlineNode(path).ply <= this.data.chapter.conceal;
    this.onJump = () => {
      var _a;
      if (this.gamebookPlay) this.gamebookPlay.onJump();
      else this.chapters.localPaths[this.vm.chapterId] = this.ctrl.path;
      (_a = this.practice) == null ? void 0 : _a.onJump();
    };
    this.onFlip = (flipped) => {
      if (this.chapters.newForm.isOpen()) return false;
      this.chapterFlipMapProp(this.data.chapter.id, flipped);
      return true;
    };
    this.isClockTicking = (path) => path !== "" && this.data.chapter.relayPath === path && !isFinished(this.data.chapter);
    this.isRelayAwayFromLive = () => !!this.relay && !isFinished(this.data.chapter) && defined(this.data.chapter.relayPath) && this.ctrl.path !== this.data.chapter.relayPath;
    this.isRelayAndInVariation = () => this.isRelayAwayFromLive() && !path_exports.contains(this.data.chapter.relayPath, this.ctrl.path);
    this.setPath = (path, node) => {
      this.arrowHistory = [];
      this.onSetPath(path);
      this.commentForm.onSetPath(this.vm.chapterId, path, node);
    };
    this.deleteNode = (path) => this.makeChange(
      "deleteNode",
      this.addChapterId({
        path,
        jumpTo: this.ctrl.path
      })
    );
    this.promote = (path, toMainline) => this.makeChange(
      "promote",
      this.addChapterId({
        toMainline,
        path
      })
    );
    this.forceVariation = (path, force) => this.makeChange(
      "forceVariation",
      this.addChapterId({
        force,
        path
      })
    );
    this.toggleSticky = () => {
      this.vm.mode.sticky = !this.vm.mode.sticky && this.data.features.sticky;
      this.xhrReload();
    };
    this.toggleWrite = () => {
      this.vm.mode.write = !this.vm.mode.write && this.members.canContribute();
      if (this.relay) this.relayRecProp(this.vm.mode.write);
      else this.nonRelayRecMapProp(this.data.id, this.vm.mode.write);
      this.xhrReload();
    };
    this.toggleStudyFormIfAllowed = () => {
      if (!this.members.isOwner()) return;
      this.form.open.toggle();
      this.redraw();
    };
    this.goToPrevChapter = () => {
      const chapter = this.prevChapter();
      if (chapter) this.setChapter(chapter.id);
    };
    this.goToNextChapter = () => {
      var _a;
      (_a = this.practice) == null ? void 0 : _a.onComplete();
      const chapter = this.nextChapter();
      if (chapter) this.setChapter(chapter.id);
    };
    this.setGamebookOverride = (o) => {
      this.vm.gamebookOverride = o;
      this.instantiateGamebookPlay();
      this.configureAnalysis();
      this.ctrl.userJump(this.ctrl.path);
      if (!o) this.xhrReload();
      else if (o === "analyse") this.ctrl.startCeval();
    };
    this.explorerGame = (gameId, insert) => this.makeChange("explorerGame", this.withPosition({ gameId, insert }));
    this.onPremoveSet = () => {
      var _a;
      return (_a = this.gamebookPlay) == null ? void 0 : _a.onPremoveSet();
    };
    this.baseUrl = () => {
      const current = location.href;
      const studyIdOffset = current.indexOf(`/${this.data.id}`);
      return studyIdOffset === -1 ? `/study/${this.data.id}` : current.slice(0, studyIdOffset + 9);
    };
    this.updateHistoryAndAddressBar = () => {
      if (this.ctrl.isEmbed) return;
      const studyUrl = this.baseUrl();
      const chapterUrl = `${studyUrl}/${this.vm.chapterId}`;
      if (this.relay) this.relay.updateAddressBar(studyUrl, chapterUrl);
      else if (chapterUrl !== location.href) history.replaceState({}, "", chapterUrl);
    };
    this.socketSendNodeData = () => {
      if (!this.isWriting()) return false;
      const data = { ch: this.vm.chapterId };
      if (!this.vm.mode.sticky) data.sticky = false;
      return data;
    };
    this.socketHandler = (t, d) => {
      var _a;
      const handler = this.socketHandlers[t];
      if (handler) {
        handler(d);
        return true;
      }
      return !!((_a = this.relay) == null ? void 0 : _a.socketHandler(t, d));
    };
    this.embeddablePath = (path) => {
      if (!this.ctrl.isEmbed) return path;
      const p = `${path.startsWith("/embed/") ? "" : "/embed"}${path}`;
      if (!location.search) return p;
      const s = p.split("#");
      return `${s[0]}${location.search}${s[1] ? `#${s[1]}` : ""}`;
    };
    this.hideMoves = () => this.ctrl.actionMenu() && !this.relay;
    this.socketHandlers = {
      path: (d) => {
        const position = d.p, who = d.w;
        this.setMemberActive(who);
        if (!this.vm.mode.sticky) {
          this.vm.behind++;
          return this.redraw();
        }
        if (position.chapterId !== this.data.position.chapterId || !this.ctrl.tree.pathExists(position.path))
          return this.xhrReload();
        this.data.position.path = position.path;
        if (who && who.s === site.sri) return;
        this.ctrl.userJump(position.path);
        this.redraw();
      },
      addNode: (d) => {
        var _a, _b;
        const position = d.p, node = completeNode(this.ctrl.variantKey)(d.n), who = d.w, sticky = d.s;
        if (d.relayPath === "!") d.relayPath = d.p.path + d.n.id;
        this.setMemberActive(who);
        this.chapters.addNode(d);
        (_a = this.multiCloudEval) == null ? void 0 : _a.addNode(d);
        (_b = this.relay) == null ? void 0 : _b.onAddNode();
        if (sticky && !this.vm.mode.sticky) this.vm.behind++;
        if (this.wrongChapter(d)) {
          if (sticky && !this.vm.mode.sticky) this.redraw();
          return;
        }
        if (sticky && (who == null ? void 0 : who.s) === site.sri) {
          this.data.position.path = position.path + node.id;
          return;
        }
        this.data.chapter.relayPath = d.relayPath;
        const newPath = this.ctrl.tree.addNode(node, position.path);
        if (!newPath) return this.xhrReload();
        if (d.relayPath && !this.ctrl.tree.pathIsMainline(d.relayPath))
          this.ctrl.tree.promoteAt(d.relayPath, true);
        if (sticky) this.data.position.path = newPath;
        if (sticky && this.vm.mode.sticky || position.path === this.ctrl.path && (position.path === path_exports.fromNodeList(this.ctrl.mainline) || d.relayPath === newPath))
          this.ctrl.jump(newPath);
        return this.redraw();
      },
      deleteNode: (d) => {
        const position = d.p, who = d.w;
        this.setMemberActive(who);
        if (this.wrongChapter(d)) return;
        if (who && who.s === site.sri) return;
        if (!this.ctrl.tree.pathExists(d.p.path)) return this.xhrReload();
        this.ctrl.tree.deleteNodeAt(position.path);
        if (this.vm.mode.sticky) this.ctrl.jump(this.ctrl.path);
        return this.redraw();
      },
      promote: (d) => {
        const position = d.p, who = d.w;
        this.setMemberActive(who);
        if (this.wrongChapter(d) || who && who.s === site.sri) return;
        if (!this.ctrl.tree.pathExists(d.p.path)) return this.xhrReload();
        this.ctrl.tree.promoteAt(position.path, d.toMainline);
        if (this.vm.mode.sticky) this.ctrl.jump(this.ctrl.path);
        else if (this.relay) this.ctrl.jump(d.p.path);
        return this.redraw();
      },
      reload: (d) => {
        if ((d == null ? void 0 : d.reason) === "overweight") alert("This chapter is too big to add moves.");
        this.xhrReload();
      },
      changeChapter: (d) => {
        this.setMemberActive(d.w);
        this.data.position = d.p;
        if (this.vm.mode.sticky) {
          this.chapters.scroller.request("smooth");
          this.xhrReload();
        } else {
          this.vm.behind++;
          this.redraw();
        }
      },
      reloadStudy: (d) => {
        this.setMemberActive(d.w);
        this.xhrReload();
      },
      descChapter: (d) => {
        this.setMemberActive(d.w);
        if (d.w && d.w.s === site.sri) return;
        if (this.data.chapter.id === d.chapterId) {
          this.data.chapter.description = d.desc;
          this.chapterDesc.set(d.desc);
        }
        this.redraw();
      },
      descStudy: (d) => {
        this.setMemberActive(d.w);
        if (d.w && d.w.s === site.sri) return;
        this.data.description = d.desc;
        this.studyDesc.set(d.desc);
        this.redraw();
      },
      setTopics: (d) => {
        this.setMemberActive(d.w);
        this.data.topics = d.topics;
        this.redraw();
      },
      addChapter: (d) => {
        var _a;
        this.setMemberActive(d.w);
        if (d.s && !this.vm.mode.sticky) this.vm.behind++;
        if (d.s) this.data.position = d.p;
        if (((_a = d.w) == null ? void 0 : _a.s) === site.sri) {
          this.vm.mode.write = this.relay ? this.relayRecProp() : this.nonRelayRecMapProp(this.data.id);
          this.vm.chapterId = d.p.chapterId;
          this.vm.nextChapterId = d.p.chapterId;
          this.chapters.scroller.request("instant");
        } else this.chapters.scroller.request("smooth");
        this.xhrReload(true);
      },
      members: (d) => {
        this.members.update(d);
        this.configureAnalysis();
        this.redraw();
      },
      chapters: (d) => {
        const prevChapters = this.chapters.list.all();
        this.chapters.loadFromServer(d);
        if (!this.currentChapter()) {
          const prevIndex = prevChapters.findIndex((ch) => ch.id === this.vm.chapterId);
          const newIndex = prevIndex === -1 ? 0 : prevIndex >= d.length ? d.length - 1 : prevIndex;
          this.vm.chapterId = d[newIndex].id;
          if (!this.vm.mode.sticky) this.xhrReload();
        }
        this.redraw();
      },
      shapes: (d) => {
        var _a, _b;
        const position = d.p, who = d.w;
        this.setMemberActive(who);
        if (d.p.chapterId !== this.vm.chapterId) return;
        if (who && who.s === site.sri) return this.redraw();
        if (this.ctrl.path === position.path) {
          this.arrowHistory.push((_b = (_a = this.ctrl.node.shapes) == null ? void 0 : _a.slice()) != null ? _b : []);
          this.ctrl.withCg((cg) => cg.setShapes(d.s));
        }
        this.ctrl.tree.setShapes(d.s, position.path);
        this.redraw();
      },
      validationError: (d) => {
        alert(d.error);
      },
      setComment: (d) => {
        const position = d.p, who = d.w;
        this.setMemberActive(who);
        if (this.wrongChapter(d)) return;
        this.ctrl.tree.setCommentAt(d.c, position.path);
        this.redraw();
      },
      setTags: (d) => {
        var _a;
        this.setMemberActive(d.w);
        this.chapters.setTags(d.chapterId, d.tags);
        if (d.chapterId !== this.vm.chapterId) return;
        this.data.chapter.tags = d.tags;
        (_a = this.relay) == null ? void 0 : _a.onNewTags(d.chapterId, d.tags);
        this.redraw();
      },
      deleteComment: (d) => {
        const position = d.p, who = d.w;
        this.setMemberActive(who);
        if (this.wrongChapter(d)) return;
        this.ctrl.tree.deleteCommentAt(d.id, position.path);
        this.redraw();
      },
      glyphs: (d) => {
        const position = d.p, who = d.w;
        this.setMemberActive(who);
        if (this.wrongChapter(d)) return;
        this.ctrl.tree.setGlyphsAt(d.g, position.path);
        if (this.ctrl.path === position.path) this.ctrl.setAutoShapes();
        this.redraw();
      },
      clock: (d) => {
        var _a;
        const position = d.p, who = d.w;
        this.setMemberActive(who);
        if (d.relayClocks) (_a = this.relay) == null ? void 0 : _a.setClockToChapterPreview(d, d.relayClocks);
        if (this.wrongChapter(d)) return;
        this.ctrl.tree.setClockAt(d.c, position.path);
        this.redraw();
      },
      forceVariation: (d) => {
        const position = d.p, who = d.w;
        this.setMemberActive(who);
        if (this.wrongChapter(d)) return;
        this.ctrl.tree.forceVariationAt(position.path, d.force);
        this.redraw();
      },
      conceal: (d) => {
        if (this.wrongChapter(d)) return;
        this.data.chapter.conceal = d.ply;
        this.redraw();
      },
      liking: (d) => {
        this.data.likes = d.l.likes;
        if (d.w && d.w.s === site.sri) this.data.liked = d.l.me;
        this.redraw();
      },
      error(msg) {
        alert(msg);
      },
      evalHitMulti: (e) => {
        ("multi" in e ? e.multi : [e]).forEach((ev) => {
          var _a;
          (_a = this.multiBoard.multiCloudEval) == null ? void 0 : _a.onCloudEval(ev);
        });
      }
    };
    var _a, _b;
    this.data = data;
    this.notif = new NotifCtrl(ctrl.redraw);
    const isManualChapter = data.chapter.id !== data.position.chapterId;
    const sticked = data.features.sticky && !ctrl.initialPath && ctrl.requestInitialPly === void 0 && !isManualChapter && !practiceData;
    this.vm = {
      loading: false,
      tab: prop(!relayData && ((_a = data.chapters) == null ? void 0 : _a[1]) ? "chapters" : "members"),
      toolTab: prop(relayData ? "multiBoard" : "tags"),
      chapterId: sticked ? data.position.chapterId : data.chapter.id,
      // path is at ctrl.path
      mode: {
        sticky: sticked,
        write: relayData ? this.relayRecProp() : this.nonRelayRecMapProp(data.id)
      },
      // how many events missed because sync=off
      behind: 0,
      // how stale is the study
      updatedAt: Date.now() - data.secondsSinceUpdate * 1e3,
      gamebookOverride: void 0
    };
    this.members = new StudyMemberCtrl({
      initDict: data.members,
      myId: practiceData ? void 0 : ctrl.opts.userId,
      ownerId: data.ownerId,
      send: this.send,
      tab: this.vm.tab,
      startTour: this.startTour,
      notif: this.notif,
      onBecomingContributor: () => this.vm.mode.write = !relayData || this.relayRecProp(),
      admin: data.admin,
      redraw: ctrl.redraw
    });
    this.chapters = new StudyChaptersCtrl(
      data.chapters,
      this.send,
      defined(relayData),
      () => this.setTab("chapters"),
      (chapterId) => chapterConfig(data.id, chapterId),
      this.ctrl,
      () => this.data.chapter
    );
    this.multiCloudEval = this.isCevalAllowed() ? new MultiCloudEval(this.redraw, () => this.ctrl.variantKey, this.chapters.list, this.send) : void 0;
    if (relayData) this.relay = new RelayCtrl(this, relayData);
    this.multiBoard = new MultiBoardCtrl(this.chapters.list, this.relay, this.multiCloudEval, this.redraw);
    this.form = new StudyForm(
      (d, isNew) => {
        this.send("editStudy", d);
        if (isNew && data.chapter.setup.variant.key === "standard" && ctrl.mainline.length === 1 && !data.chapter.setup.fromFen && !this.relay) {
          this.chapters.newForm.openInitial();
        }
      },
      () => data,
      this.redraw,
      this.relay
    );
    this.commentForm = new CommentForm(ctrl);
    this.glyphForm = new GlyphForm(ctrl);
    this.tags = new TagsForm(this, tagTypes);
    this.studyDesc = new DescriptionCtrl(
      data.description,
      debounce((t) => {
        data.description = t;
        this.send("descStudy", t);
      }, 500),
      this.redraw
    );
    this.chapterDesc = new DescriptionCtrl(
      data.chapter.description,
      debounce((t) => {
        data.chapter.description = t;
        this.send("descChapter", { id: this.vm.chapterId, desc: t });
      }, 500),
      this.redraw
    );
    this.serverEval = new ServerEval(ctrl, () => this.vm.chapterId);
    this.search = new SearchCtrl(
      ((_b = this.relay) == null ? void 0 : _b.fullRoundName()) || data.name,
      this.chapters.list,
      this.setChapter,
      this.redraw
    );
    this.topics = new TopicsCtrl(
      (topics) => this.send("setTopics", topics),
      () => data.topics || [],
      this.redraw
    );
    this.share = new StudyShare(
      data,
      this.currentChapter,
      this.currentNode,
      this.onMainline,
      this.bottomColor,
      this.relay,
      this.redraw
    );
    this.practice = practiceData && new StudyPracticeCtrl(ctrl, data, practiceData);
    if (this.vm.mode.sticky && !this.isGamebookPlay()) this.ctrl.userJump(this.data.position.path);
    else if (this.data.chapter.relayPath && !defined(this.ctrl.requestInitialPly) && !(this.relay && !this.multiBoard.showResults()))
      this.ctrl.userJump(this.data.chapter.relayPath);
    this.configureAnalysis();
    this.ctrl.flipped = this.chapterFlipMapProp(this.data.chapter.id);
    if (this.members.canContribute()) this.form.openIfNew();
    this.instantiateGamebookPlay();
    studyKeyboard(this);
    window.addEventListener("popstate", () => window.location.reload());
  }
};

// ../analyse/src/study/gamebook/gamebookEdit.ts
var gamebookEdit_exports = {};
__export(gamebookEdit_exports, {
  render: () => render,
  running: () => running
});
var running = (ctrl) => !!ctrl.study && ctrl.study.data.chapter.gamebook && !ctrl.gamebookPlay() && ctrl.study.vm.gamebookOverride !== "analyse";
function render(ctrl) {
  const study = ctrl.study, isMyMove = ctrl.turnColor() === ctrl.data.orientation, isCommented = (ctrl.node.comments || []).some((c) => c.text.length > 2), hasVariation = ctrl.tree.parentNode(ctrl.path).children.length > 1;
  let content;
  const commentHook = bind(
    "click",
    () => {
      study.commentForm.start(study.vm.chapterId, ctrl.path, ctrl.node);
      study.vm.toolTab("comments");
      requestIdleCallbackSafe(
        () => $("#comment-text").each(function() {
          this.focus();
        }),
        500
      );
    },
    ctrl.redraw
  );
  if (!ctrl.path) {
    if (isMyMove)
      content = [
        h("div.legend.todo.clickable", { hook: commentHook, class: { done: isCommented } }, [
          icon(licon.BubbleSpeech)(),
          h("p", "Help the player find the initial move, with a comment.")
        ]),
        renderHint(ctrl)
      ];
    else
      content = [
        h("div.legend.clickable", { hook: commentHook }, [
          icon(licon.BubbleSpeech)(),
          h("p", "Introduce the gamebook with a comment")
        ]),
        h("div.legend.todo", { class: { done: !!ctrl.node.children[0] } }, [
          icon(licon.PlayTriangle)(),
          h("p", "Put the opponent's first move on the board.")
        ])
      ];
  } else if (ctrl.onMainline) {
    if (isMyMove)
      content = [
        h("div.legend.todo.clickable", { hook: commentHook, class: { done: isCommented } }, [
          icon(licon.BubbleSpeech)(),
          h("p", "Explain the opponent move, and help the player find the next move, with a comment.")
        ]),
        renderHint(ctrl)
      ];
    else
      content = [
        h("div.legend.clickable", { hook: commentHook }, [
          icon(licon.BubbleSpeech)(),
          h(
            "p",
            "You may reflect on the player's correct move, with a comment; or leave empty to jump immediately to the next move."
          )
        ]),
        hasVariation ? null : h("div.legend.clickable", { hook: bind("click", ctrl.navigate.prev, ctrl.redraw) }, [
          icon(licon.PlayTriangle)(),
          h("p", "Add variation moves to explain why specific other moves are wrong.")
        ]),
        renderDeviation(ctrl)
      ];
  } else
    content = [
      h("div.legend.todo.clickable", { hook: commentHook, class: { done: isCommented } }, [
        icon(licon.BubbleSpeech)(),
        h("p", "Explain why this move is wrong in a comment")
      ]),
      h("div.legend", [h("p", "Or promote it as the mainline if it is the right move.")])
    ];
  return h(
    "div.gamebook-edit",
    { hook: onInsert(() => site.asset.loadCssPath("analyse.gamebook.edit")) },
    content
  );
}
function renderDeviation(ctrl) {
  const field = "deviation";
  return h("div.deviation", [
    h("div.legend.todo", { class: { done: nodeGamebookValue(ctrl.node, field).length > 2 } }, [
      icon(licon.BubbleSpeech)(),
      h("p", "When any other wrong move is played:")
    ]),
    h("textarea", {
      attrs: { placeholder: "Explain why all other moves are wrong" },
      hook: textareaHook(ctrl, field)
    })
  ]);
}
var renderHint = (ctrl) => h("div.hint", [
  h("div.legend", [icon(licon.InfoCircle)(), h("p", "Optional, on-demand hint for the player:")]),
  h("textarea", {
    attrs: { placeholder: "Give the player a tip so they can find the right move" },
    hook: textareaHook(ctrl, "hint")
  })
]);
var saveNode = throttle(500, (ctrl, gamebook) => {
  ctrl.socket.send("setGamebook", {
    path: ctrl.path,
    ch: ctrl.study.vm.chapterId,
    gamebook
  });
  ctrl.redraw();
});
var nodeGamebookValue = (node, field) => {
  var _a;
  return ((_a = node.gamebook) == null ? void 0 : _a[field]) || "";
};
function textareaHook(ctrl, field) {
  const value = nodeGamebookValue(ctrl.node, field);
  return {
    insert(vnode) {
      const el = vnode.elm;
      el.value = value;
      el.oninput = () => {
        const node = ctrl.node;
        node.gamebook = node.gamebook || {};
        node.gamebook[field] = el.value.trim();
        saveNode(ctrl, node.gamebook);
      };
      vnode.data.path = ctrl.path;
    },
    postpatch(old, vnode) {
      if (old.data.path !== ctrl.path) vnode.elm.value = value;
      vnode.data.path = ctrl.path;
    }
  };
}

// ../analyse/src/study/gamebook/gamebookPlayView.ts
var gamebookPlayView_exports = {};
__export(gamebookPlayView_exports, {
  render: () => render2
});
function render2(ctrl) {
  const state = ctrl.state;
  return hl("div.gamebook", { hook: onInsert(() => site.asset.loadCssPath("analyse.gamebook.play")) }, [
    (state.comment || state.feedback === "play" || state.feedback === "end") && hl("div.comment", { class: { hinted: state.showHint } }, [
      state.comment ? hl("div.content", { hook: richHTML(state.comment) }) : hl(
        "div.content",
        state.feedback === "play" ? i18n.study.whatWouldYouPlay : state.feedback === "end" && i18n.study.youCompletedThisLesson
      ),
      hintZone(ctrl)
    ]),
    hl("div.floor", [
      renderFeedback(ctrl, state),
      hl("img.mascot", {
        attrs: { width: 120, height: 120, src: site.asset.url("images/mascot/octopus.svg") }
      })
    ])
  ]);
}
function hintZone(ctrl) {
  const state = ctrl.state, buttonData = () => ({ attrs: { type: "button" }, hook: bind("click", ctrl.hint, ctrl.redraw) });
  if (state.showHint) return hl("button", buttonData(), [hl("div.hint", { hook: richHTML(state.hint) })]);
  if (state.hint) return hl("button.hint", buttonData(), i18n.site.getAHint);
  return void 0;
}
function renderFeedback(ctrl, state) {
  const fb = state.feedback, color = ctrl.root.turnColor();
  if (fb === "bad")
    return hl(
      "button.feedback.act.bad" + (state.comment ? ".com" : ""),
      { attrs: { type: "button" }, hook: bind("click", ctrl.retry) },
      [icon(licon.Reload)(), hl("span", i18n.site.retry)]
    );
  if (fb === "good" && state.comment)
    return hl("button.feedback.act.good.com", { attrs: { type: "button" }, hook: bind("click", ctrl.next) }, [
      hl("span.text", { attrs: dataIcon(licon.PlayTriangle) }, i18n.study.next),
      hl("kbd", "space")
    ]);
  if (fb === "end") return renderEnd(ctrl);
  return hl(
    "div.feedback.info." + fb + (state.init ? ".init" : ""),
    hl(
      "div",
      fb === "play" ? [
        hl("div.no-square", hl("piece.king." + color)),
        hl("div.instruction", [
          hl("strong", i18n.site.yourTurn),
          requiresI18n(
            "puzzle",
            ctrl.redraw,
            (cat) => hl("em", cat[color === "white" ? "findTheBestMoveForWhite" : "findTheBestMoveForBlack"])
          )
        ])
      ] : i18n.study.goodMove
    )
  );
}
function renderEnd(ctrl) {
  const study = ctrl.root.study;
  return hl("div.feedback.end", [
    study.nextChapter() && hl(
      "button.next.text",
      {
        attrs: { "data-icon": licon.PlayTriangle, type: "button" },
        hook: bind("click", study.goToNextChapter)
      },
      i18n.study.nextChapter
    ),
    hl(
      "button.retry",
      {
        attrs: { "data-icon": licon.Reload, type: "button" },
        hook: bind("click", () => ctrl.root.userJump(""), ctrl.redraw)
      },
      i18n.study.playAgain
    ),
    !study.vm.gamebookOverride && hl(
      "button.analyse",
      {
        attrs: { "data-icon": licon.Microscope, type: "button" },
        hook: bind("click", () => study.setGamebookOverride("analyse"), ctrl.redraw)
      },
      i18n.site.analysis
    )
  ]);
}

// ../analyse/src/study/analyse.study.ts
var start = start_default(patch, studyDeps_exports);
async function initModule(cfg) {
  var _a;
  await site.asset.loadPieces;
  cfg.socketSend = wsConnect(cfg.socketUrl || "/analysis/socket/v5", (_a = cfg.socketVersion) != null ? _a : false, {
    options: { reloadOnResume: true },
    receive: (t, d) => analyse.socketReceive(t, d),
    ...cfg.embed ? { params: { flag: "embed" } } : {}
  }).send;
  const analyse = start(cfg);
}
export {
  initModule,
  patch
};
//# sourceMappingURL=analyse.study.WJEJ4V5Q.js.map

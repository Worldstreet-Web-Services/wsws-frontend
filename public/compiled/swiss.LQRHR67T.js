import {
  maxPerPage,
  myPage,
  numberRow,
  pagerData,
  redirectFirst,
  renderPager,
  searchButton,
  searchInput
} from "./lib.LA42O6YY.js";
import {
  standaloneChat
} from "./lib.KFU67WIY.js";
import {
  esm_default
} from "./lib.TCRGWMNK.js";
import "./lib.ADE2DDSZ.js";
import "./lib.WSONNVTW.js";
import {
  watchers
} from "./lib.MG4T3NDN.js";
import {
  fullName,
  userLine,
  userLink,
  userRating
} from "./lib.RU54GHQA.js";
import "./lib.FNBK74W3.js";
import {
  use24h
} from "./lib.EJQKEWZT.js";
import "./lib.3VFZRSDR.js";
import {
  icon,
  initMiniGames,
  prompt,
  renderClock,
  setClockWidget,
  spinnerVdom
} from "./lib.LY6FZSW3.js";
import "./lib.KC3NJ77S.js";
import "./lib.NNS7OYZ5.js";
import "./lib.LYPETE66.js";
import {
  opposite
} from "./lib.ILS4LNPZ.js";
import "./lib.GSUEVEQG.js";
import "./lib.JUCKJNFH.js";
import "./lib.PM233RJM.js";
import "./lib.23HTWUBN.js";
import {
  wsConnect
} from "./lib.GOC3UD5K.js";
import {
  bind,
  dataIcon,
  hl,
  onInsert
} from "./lib.WVJXH4CQ.js";
import {
  attributesModule,
  classModule,
  h,
  init
} from "./lib.2L7Z4FRN.js";
import "./lib.YID4KMSR.js";
import {
  licon
} from "./lib.2DWRH35C.js";
import {
  form,
  json
} from "./lib.M3IF75DN.js";
import {
  once,
  throttlePromiseDelay
} from "./lib.AXX3QIAX.js";
import {
  defined
} from "./lib.GK2I5IFJ.js";
import "./lib.KO2KTNGK.js";

// ../swiss/src/socket.ts
function makeSocket(send, ctrl) {
  const handlers = {
    reload() {
      const delay = Math.min(ctrl.data.nbPlayers * 10, 4e3);
      if (delay > 500) setTimeout(ctrl.askReload, Math.floor(Math.random() * delay));
      else ctrl.askReload();
    },
    redirect(fullId) {
      redirectFirst(fullId.slice(0, 8), true);
      return true;
    }
  };
  return {
    send,
    receive(tpe, data) {
      if (handlers[tpe]) return handlers[tpe](data);
      return false;
    }
  };
}

// ../swiss/src/util.ts
var isOutcome = (s) => s === "absent" || s === "late" || s === "bye";

// ../swiss/src/xhr.ts
var onFail = () => site.reload();
var join = (ctrl, password) => json(`/api/swiss/${ctrl.data.id}/join`, {
  method: "post",
  body: form({
    password: password || ""
  })
}).catch(onFail);
var withdraw = (ctrl) => json(`/api/swiss/${ctrl.data.id}/withdraw`, { method: "post" }).catch(onFail);
var loadPage = (ctrl, p) => json(`/swiss/${ctrl.data.id}/standing/${p}`).then((data) => {
  ctrl.loadPage(data);
  ctrl.redraw();
});
var loadPageOf = (ctrl, userId) => json(`/swiss/${ctrl.data.id}/page-of/${userId}`);
var reload = (ctrl) => json(
  `/swiss/${ctrl.data.id}?page=${ctrl.focusOnMe ? "" : ctrl.page}&playerInfo=${ctrl.playerInfoId || ""}`
).then((data) => {
  ctrl.reload(data);
  ctrl.redraw();
}, onFail);
var playerInfo = (ctrl, userId) => json(`/swiss/${ctrl.data.id}/player/${userId}`).then((data) => {
  ctrl.data.playerInfo = data;
  ctrl.redraw();
}, onFail);
var readSheetMin = (str) => str ? str.split("|").map(
  (s) => isOutcome(s) ? s : {
    g: s.slice(0, 8),
    o: s[8] === "o",
    w: s[8] === "w" ? true : s[8] === "l" ? false : void 0
  }
) : [];
var xhr_default = {
  join: throttlePromiseDelay(() => 1e3, join),
  withdraw: throttlePromiseDelay(() => 1e3, withdraw),
  loadPage: throttlePromiseDelay(() => 1e3, loadPage),
  loadPageOf,
  reloadNow: reload,
  playerInfo,
  readSheetMin
};

// ../swiss/src/ctrl.ts
var SwissCtrl = class {
  constructor(opts, redraw) {
    this.opts = opts;
    this.redraw = redraw;
    this.pages = {};
    this.joinSpinner = false;
    this.disableClicks = true;
    this.searching = false;
    this.reload = (data) => {
      this.data = { ...this.data, ...this.readData(data) };
      this.data.me = data.me;
      this.data.nextRound = data.nextRound;
      this.loadPage(this.data.standing);
      if (this.focusOnMe) this.scrollToMe();
      this.joinSpinner = false;
      this.redirectToMyGame();
      this.redrawNbRounds();
    };
    this.isCreated = () => this.data.status === "created";
    this.isStarted = () => this.data.status === "started";
    this.isFinished = () => this.data.status === "finished";
    this.myGameId = () => {
      var _a;
      return (_a = this.data.me) == null ? void 0 : _a.gameId;
    };
    this.join = (password) => {
      xhr_default.join(this, password);
      this.joinSpinner = true;
      this.focusOnMe = true;
    };
    this.scrollToMe = () => this.setPage(myPage(this));
    this.pager = () => pagerData(this);
    this.loadPage = (data) => {
      this.pages[data.page] = this.readStanding(data).players;
    };
    this.setPage = (page) => {
      if (page && page !== this.page && page >= 1 && page <= this.pager().nbPages) {
        this.page = page;
        xhr_default.loadPage(this, page);
      }
    };
    this.toggleFocusOnMe = () => {
      if (this.data.me) {
        this.focusOnMe = !this.focusOnMe;
        if (this.focusOnMe) this.scrollToMe();
      }
    };
    this.toggleSearch = () => this.searching = !this.searching;
    this.jumpToPageOf = (name) => {
      const userId = name.toLowerCase();
      xhr_default.loadPageOf(this, userId).then((data) => {
        this.loadPage(data);
        this.page = data.page;
        this.searching = false;
        this.focusOnMe = false;
        this.pages[this.page].filter((p) => p.user.id === userId).forEach(this.showPlayerInfo);
        this.redraw();
      });
    };
    this.jumpToRank = (rank) => {
      const page = 1 + Math.floor((rank - 1) / maxPerPage);
      const row = (rank - 1) % maxPerPage;
      xhr_default.loadPage(this, page).then(() => {
        if (!this.pages[page] || row >= this.pages[page].length) return;
        this.page = page;
        this.searching = false;
        this.focusOnMe = false;
        this.showPlayerInfo(this.pages[page][row]);
        this.redraw();
      });
    };
    this.userSetPage = (page) => {
      this.focusOnMe = false;
      this.setPage(page);
    };
    this.userNextPage = () => this.userSetPage(this.page + 1);
    this.userPrevPage = () => this.userSetPage(this.page - 1);
    this.userLastPage = () => this.userSetPage(this.pager().nbPages);
    this.showPlayerInfo = (player2) => {
      this.playerInfoId = this.playerInfoId === player2.user.id ? void 0 : player2.user.id;
      if (this.playerInfoId) xhr_default.playerInfo(this, this.playerInfoId);
    };
    this.askReload = () => {
      if (this.joinSpinner || this.data.nextRound && this.data.me) xhr_default.reloadNow(this);
      else this.reloadSoon();
    };
    this.withdraw = () => {
      xhr_default.withdraw(this);
      this.joinSpinner = true;
    };
    this.reloadSoon = () => {
      if (!this.reloadSoonThrottle)
        this.reloadSoonThrottle = throttlePromiseDelay(
          () => Math.max(2e3, Math.min(5e3, this.data.nbPlayers * 20)),
          () => xhr_default.reloadNow(this)
        );
      this.reloadSoonThrottle();
    };
    this.isIn = () => !!this.data.me && !this.data.me.absent;
    this.redrawNbRounds = () => $(".swiss__meta__round").text(
      i18n.swiss.nbRounds.asArray(this.data.nbRounds, `${this.data.round}/${this.data.nbRounds}`).join("")
    );
    this.readData = (data) => ({
      ...data,
      standing: this.readStanding(data.standing)
    });
    this.readStanding = (standing2) => ({
      ...standing2,
      players: standing2.players.map((p) => ({
        ...p,
        sheet: xhr_default.readSheetMin(p.sheetMin)
      }))
    });
    this.data = this.readData(opts.data);
    this.socket = makeSocket(opts.socketSend, this);
    this.page = this.data.standing.page;
    this.focusOnMe = this.isIn();
    setTimeout(() => this.disableClicks = false, 1500);
    this.loadPage(this.data.standing);
    this.scrollToMe();
    this.redirectToMyGame();
  }
  redirectToMyGame() {
    const gameId = this.myGameId();
    if (gameId) redirectFirst(gameId);
  }
};

// ../swiss/src/view/util.ts
function player(p, asLink, withRating) {
  return h(
    "a.ulpt.user-link.online" + (((p.user.title || "") + p.user.name).length > 15 ? ".long" : ""),
    {
      attrs: asLink ? { href: "/@/" + p.user.name } : { "data-href": "/@/" + p.user.name },
      hook: { destroy: (vnode) => $.powerTip.destroy(vnode.elm) }
    },
    [
      p.user.patronColor && userLine({ patronColor: p.user.patronColor }),
      h("span.name", fullName(p.user)),
      withRating ? h("span.rating", userRating({ ...p, brackets: false })) : null
    ]
  );
}

// ../swiss/src/view/boards.ts
function many(boards, opts) {
  return h("div.swiss__boards.now-playing", boards.map(renderBoard(opts)));
}
function top(boards, opts) {
  return h("div.swiss__board__top.swiss__table", boards.slice(0, 1).map(renderBoard(opts)));
}
var renderBoard = (opts) => (board) => h(
  `div.swiss__board.mini-game.mini-game-${board.id}.mini-game--init.is2d`,
  {
    key: board.id,
    attrs: { "data-state": `${board.fen},${board.orientation},${board.lastMove}`, "data-live": board.id },
    hook: {
      insert(vnode) {
        site.powertip.manualUserIn(vnode.elm);
      }
    }
  },
  [
    boardPlayer(board, opposite(board.orientation), opts),
    h("a.cg-wrap", { attrs: { href: `/${board.id}/${board.orientation}` } }),
    boardPlayer(board, board.orientation, opts)
  ]
);
function boardPlayer(board, color, opts) {
  const player2 = board[color];
  return h("span.mini-game__player", [
    h("span.mini-game__user", [h("strong", "#" + player2.rank), player(player2, true, opts.showRatings)]),
    board.clock ? renderClock(color, board.clock[color]) : h("span.mini-game__result", board.winner ? board.winner === color ? 1 : 0 : "\xBD")
  ]);
}

// ../swiss/src/view/header.ts
var startClock = (time) => ({
  insert: (vnode) => setClockWidget(vnode.elm, { time })
});
var oneDayInSeconds = 60 * 60 * 24;
function clock(ctrl) {
  const next = ctrl.data.nextRound;
  if (!next) return void 0;
  if (next.in > oneDayInSeconds)
    return h("div.clock", [
      h("time.timeago.shy", {
        attrs: { datetime: Date.now() + next.in * 1e3 },
        hook: onInsert((el) => el.setAttribute("datetime", String(Date.now() + next.in * 1e3)))
      })
    ]);
  return h(`div.clock.clock-created.time-cache-${next.at}`, [
    h("span.shy", ctrl.data.status === "created" ? i18n.site.startingIn : i18n.swiss.nextRound),
    h("span.time.text", { hook: startClock(next.in + 1) })
  ]);
}
function ongoing(ctrl) {
  const nb = ctrl.data.nbOngoing;
  return nb ? h("div.ongoing", [h("span.nb", [nb]), h("span.shy", i18n.swiss.ongoingGames(nb))]) : void 0;
}
function header_default(ctrl) {
  const greatPlayer = ctrl.data.greatPlayer;
  return h("div.swiss__main__header", [
    icon(licon.Trophy)(".img"),
    h(
      "h1",
      greatPlayer ? [h("a", { attrs: { href: greatPlayer.url, target: "_blank" } }, greatPlayer.name), " Tournament"] : [ctrl.data.name]
    ),
    ctrl.data.status === "finished" ? void 0 : clock(ctrl) || ongoing(ctrl)
  ]);
}

// ../swiss/src/view/playerInfo.ts
function playerInfo_default(ctrl) {
  if (!ctrl.playerInfoId) return void 0;
  const data = ctrl.data.playerInfo;
  const tag = "div.swiss__player-info.swiss__table";
  if ((data == null ? void 0 : data.user.id) !== ctrl.playerInfoId)
    return hl(tag, [hl("div.stats", [hl("h2", ctrl.playerInfoId), spinnerVdom()])]);
  const games = data.sheet.filter((p) => !isOutcome(p) && p.g).length;
  const wins = data.sheet.filter((p) => !isOutcome(p) && p.w).length;
  const avgOp = games ? Math.round(data.sheet.reduce((r, p) => r + (!isOutcome(p) ? p.rating : 1), 0) / games) : void 0;
  return hl(tag, { hook: { insert: setup, postpatch: (_, vnode) => setup(vnode) } }, [
    hl("button.close", {
      attrs: dataIcon(licon.X),
      hook: bind("click", () => ctrl.showPlayerInfo(data), ctrl.redraw)
    }),
    hl("div.stats", [
      hl("h2", [hl("span.rank", data.rank + ". "), player(data, true, false)]),
      hl("table", [
        numberRow(i18n.site.points, data.points, "raw"),
        numberRow(i18n.swiss.tieBreak, data.tieBreak, "raw"),
        games !== 0 && [
          !!data.performance && ctrl.opts.showRatings && numberRow(i18n.site.performance, data.performance + (games < 3 ? "?" : ""), "raw"),
          numberRow(i18n.site.winRate, [wins, games], "percent"),
          ctrl.opts.showRatings && numberRow(i18n.site.averageOpponent, avgOp, "raw")
        ]
      ])
    ]),
    hl("div", [
      hl(
        "table.pairings.sublist",
        {
          hook: bind("click", (e) => {
            const href = e.target.parentNode.getAttribute("data-href");
            if (href) window.open(href, "_blank");
          })
        },
        data.sheet.map((p, i) => {
          const round = ctrl.data.round - i;
          if (isOutcome(p))
            return hl("tr." + p, { key: round }, [
              hl("th", round),
              hl("td.outcome", { attrs: { colspan: 3 } }, p),
              hl("td", p === "absent" ? "-" : p === "bye" ? "1" : "\xBD")
            ]);
          const res = result(p);
          return hl(
            "tr.glpt." + (res === "1" ? ".win" : res === "0" ? ".loss" : ""),
            {
              key: round,
              attrs: { "data-href": "/" + p.g + (p.c ? "" : "/black") },
              hook: { destroy: (vnode) => $.powerTip.destroy(vnode.elm) }
            },
            [
              hl("th", round),
              hl("td", fullName(p.user)),
              ctrl.opts.showRatings && hl("td", p.rating),
              hl("td.is.color-icon." + (p.c ? "white" : "black")),
              hl("td.result", res)
            ]
          );
        })
      )
    ])
  ]);
}
function result(p) {
  switch (p.w) {
    case true:
      return "1";
    case false:
      return "0";
    default:
      return p.o ? "*" : "\xBD";
  }
}
function setup(vnode) {
  const el = vnode.elm, p = site.powertip;
  p.manualUserIn(el);
  p.manualGameIn(el);
}

// ../swiss/src/view/podium.ts
var podiumStats = (p, ctrl) => h("table.stats", [
  h("tr", [h("th", i18n.site.points), h("td", p.points)]),
  h("tr", [h("th", i18n.swiss.tieBreak), h("td", p.tieBreak)]),
  p.performance && ctrl.opts.showRatings ? h("tr", [h("th", i18n.site.performance), h("td", p.performance)]) : null
]);
function podiumPosition(p, pos, ctrl) {
  if (!p) return void 0;
  const patron = defined(p.user.patronColor);
  return h("div." + pos, { class: { lame: !!p.lame } }, [
    h("div.trophy"),
    userLink({ ...p.user, line: patron, online: patron }),
    podiumStats(p, ctrl)
  ]);
}
function podium(ctrl) {
  const p = ctrl.data.podium || [];
  return h("div.podium", [
    podiumPosition(p[1], "second", ctrl),
    podiumPosition(p[0], "first", ctrl),
    podiumPosition(p[2], "third", ctrl)
  ]);
}

// ../swiss/src/view/standing.ts
function playerTr(ctrl, player2) {
  var _a;
  const userId = player2.user.id;
  return h(
    "tr",
    {
      key: userId,
      class: { me: ((_a = ctrl.data.me) == null ? void 0 : _a.id) === userId, active: ctrl.playerInfoId === userId },
      hook: bind("click", (_) => ctrl.showPlayerInfo(player2), ctrl.redraw)
    },
    [
      h(
        "td.rank",
        player2.absent && ctrl.data.status !== "finished" ? icon(licon.Pause)({ title: "Absent" }) : player2.rank
      ),
      h("td.player", player(player2, false, ctrl.opts.showRatings)),
      h(
        "td.pairings",
        h(
          "div",
          player2.sheet.map(
            (p) => p === "absent" ? h(p, title("Absent"), "-") : p === "bye" ? h(p, title("Bye"), "1") : p === "late" ? h(p, title("Late"), "\xBD") : h(
              "a.glpt." + (p.o ? "ongoing" : p.w ? "win" : p.w === false ? "loss" : "draw"),
              { attrs: { key: p.g, href: `/${p.g}` }, hook: onInsert(site.powertip.manualGame) },
              p.o ? "*" : p.w ? "1" : p.w === false ? "0" : "\xBD"
            )
          ).concat([...Array(Math.max(0, ctrl.data.nbRounds - player2.sheet.length))].map((_) => h("r")))
        )
      ),
      h("td.points", title("Points"), player2.points),
      h("td.tieBreak", title("Tie Break"), player2.tieBreak)
    ]
  );
}
var title = (str) => ({ attrs: { title: str } });
var lastBody;
var preloadUserTips = (vn) => site.powertip.manualUserIn(vn.elm);
function standing(ctrl, klass) {
  const pag = ctrl.pager();
  const tableBody = pag.currentPageResults ? pag.currentPageResults.map((res) => playerTr(ctrl, res)) : lastBody;
  if (pag.currentPageResults) lastBody = tableBody;
  return h(
    "table.slist.swiss__standing" + (klass ? "." + klass : ""),
    { class: { loading: !pag.currentPageResults, long: ctrl.data.round > 10, xlong: ctrl.data.round > 20 } },
    h(
      "tbody",
      { hook: { insert: preloadUserTips, update: (_, vnode) => preloadUserTips(vnode) } },
      tableBody
    )
  );
}

// ../swiss/src/view/main.ts
function main_default(ctrl) {
  const d = ctrl.data;
  const content = d.status === "created" ? created(ctrl) : d.status === "started" ? started(ctrl) : finished(ctrl);
  return hl("main." + ctrl.opts.classes, { hook: { postpatch: () => initMiniGames() } }, [
    hl("aside.swiss__side", {
      hook: onInsert((el) => {
        $(el).replaceWith(ctrl.opts.$side);
        ctrl.opts.chat && standaloneChat(ctrl.opts.chat);
      })
    }),
    hl("div.swiss__underchat", {
      hook: onInsert((el) => $(el).replaceWith($(".swiss__underchat.none").removeClass("none")))
    }),
    playerInfo_default(ctrl) || stats(ctrl) || top(d.boards, ctrl.opts),
    hl("div.swiss__main", [hl("div.box.swiss__main-" + d.status, content), many(d.boards, ctrl.opts)]),
    ctrl.opts.chat && hl("div.chat__members.none", { hook: onInsert(watchers) })
  ]);
}
function created(ctrl) {
  return [
    header_default(ctrl),
    nextRound(ctrl),
    controls(ctrl),
    standing(ctrl, "created"),
    ctrl.data.quote && hl("blockquote.pull-quote", [hl("p", ctrl.data.quote.text), hl("footer", ctrl.data.quote.author)])
  ];
}
var notice = (ctrl) => {
  const d = ctrl.data;
  return d.me && !d.me.absent && d.status === "started" && d.nextRound && hl("div.swiss__notice.bar-glider", i18n.site.standByX(d.me.name));
};
function started(ctrl) {
  return [
    header_default(ctrl),
    joinTheGame(ctrl) || notice(ctrl),
    nextRound(ctrl),
    controls(ctrl),
    standing(ctrl, "started")
  ];
}
function finished(ctrl) {
  return [
    hl("div.podium-wrap", [confetti(ctrl.data), header_default(ctrl), podium(ctrl)]),
    controls(ctrl),
    standing(ctrl, "finished")
  ];
}
function controls(ctrl) {
  return hl("div.swiss__controls", [
    hl("div.pager", renderPager(ctrl, searchButton(ctrl), searchInput(ctrl, { swiss: ctrl.data.id }))),
    joinButton(ctrl)
  ]);
}
function nextRound(ctrl) {
  var _a;
  if (!ctrl.opts.schedule || ctrl.data.nbOngoing || ctrl.data.round === 0) return void 0;
  return hl(
    "form.schedule-next-round",
    {
      class: { required: !ctrl.data.nextRound },
      attrs: { action: `/api/swiss/${ctrl.data.id}/schedule-next-round`, method: "post" }
    },
    [
      hl("input", {
        attrs: { name: "date", placeholder: "Schedule the next round", value: ((_a = ctrl.data.nextRound) == null ? void 0 : _a.at) || "" },
        hook: onInsert(
          (el) => esm_default(el, {
            minDate: "today",
            maxDate: new Date(Date.now() + 1e3 * 3600 * 24 * 31),
            dateFormat: "Z",
            altInput: true,
            altFormat: "Y-m-d h:i K",
            enableTime: true,
            monthSelectorType: "static",
            onClose() {
              el.parentNode.submit();
            },
            time_24hr: use24h()
          })
        )
      })
    ]
  );
}
function joinButton(ctrl) {
  var _a;
  const d = ctrl.data;
  if (!ctrl.opts.userId)
    return hl(
      "a.fbt.text.highlight",
      { attrs: { href: "/login?referrer=" + window.location.pathname, "data-icon": licon.PlayTriangle } },
      i18n.site.signIn
    );
  if (d.joinTeam)
    return hl(
      "a.fbt.text.highlight",
      { attrs: { href: `/team/${d.joinTeam}`, "data-icon": licon.Group } },
      i18n.team.joinTeam
    );
  if (!d.canJoin && (((_a = d.me) == null ? void 0 : _a.absent) || !d.me)) return void 0;
  if (ctrl.joinSpinner) return spinnerVdom();
  const promptEntryCodeOrJoin = async () => {
    if (d.password) {
      const p = await prompt(i18n.site.tournamentEntryCode);
      if (p !== null) ctrl.join(p);
    } else ctrl.join();
  };
  if (d.me && d.status !== "finished")
    return d.me.absent ? hl(
      "button.fbt.text.highlight",
      { attrs: dataIcon(licon.PlayTriangle), hook: bind("click", promptEntryCodeOrJoin, ctrl.redraw) },
      i18n.site.join
    ) : hl(
      "button.fbt.text",
      { attrs: dataIcon(licon.FlagOutline), hook: bind("click", ctrl.withdraw, ctrl.redraw) },
      i18n.site.withdraw
    );
  return hl(
    "button.fbt.text.highlight",
    {
      attrs: dataIcon(licon.PlayTriangle),
      hook: bind("click", promptEntryCodeOrJoin, ctrl.redraw)
    },
    i18n.site.join
  );
}
function joinTheGame(ctrl) {
  var _a;
  const gameId = (_a = ctrl.data.me) == null ? void 0 : _a.gameId;
  return gameId && hl("a.swiss__ur-playing.button.is.is-after", { attrs: { href: "/" + gameId } }, [
    i18n.site.youArePlaying,
    hl("br"),
    i18n.site.joinTheGame
  ]);
}
function confetti(data) {
  return data.me && data.isRecentlyFinished && once("tournament.end.canvas." + data.id) && hl("canvas#confetti", {
    hook: onInsert(() => site.asset.loadEsm("bits.confetti"))
  });
}
function stats(ctrl) {
  const s = ctrl.data.stats, slots = ctrl.data.round * ctrl.data.nbPlayers;
  if (!s) return void 0;
  return hl("div.swiss__stats", [
    hl("h2", i18n.site.tournamentComplete),
    hl("table", [
      ctrl.opts.showRatings ? numberRow(i18n.site.averageElo, s.averageRating, "raw") : null,
      numberRow(i18n.site.gamesPlayed, s.games),
      numberRow(i18n.site.whiteWins, [s.whiteWins, slots], "percent"),
      numberRow(i18n.site.blackWins, [s.blackWins, slots], "percent"),
      numberRow(i18n.site.drawRate, [s.draws, slots], "percent"),
      numberRow(i18n.swiss.byes, [s.byes, slots], "percent"),
      numberRow(i18n.swiss.absences, [s.absences, slots], "percent")
    ]),
    hl("div.swiss__stats__links", [
      hl(
        "a",
        { attrs: { href: `/swiss/${ctrl.data.id}/round/1` } },
        i18n.swiss.viewAllXRounds(ctrl.data.round)
      ),
      hl("br"),
      hl(
        "a.text",
        { attrs: { "data-icon": licon.Download, href: `/swiss/${ctrl.data.id}.trf`, download: true } },
        "Download TRF file"
      ),
      hl(
        "a.text",
        { attrs: { "data-icon": licon.Download, href: `/api/swiss/${ctrl.data.id}/games`, download: true } },
        i18n.site.downloadAllGames
      ),
      hl(
        "a.text",
        {
          attrs: { "data-icon": licon.Download, href: `/api/swiss/${ctrl.data.id}/results`, download: true }
        },
        "Download results as NDJSON"
      ),
      hl(
        "a.text",
        {
          attrs: {
            "data-icon": licon.Download,
            href: `/api/swiss/${ctrl.data.id}/results?as=csv`,
            download: true
          }
        },
        "Download results as CSV"
      ),
      hl("br"),
      hl(
        "a.text",
        {
          attrs: { "data-icon": licon.InfoCircle, href: "/api#tag/swiss-tournaments" }
        },
        "Swiss API documentation"
      )
    ])
  ]);
}

// ../swiss/src/swiss.ts
var patch = init([classModule, attributesModule]);
function initModule(opts) {
  const element = document.querySelector("main.swiss");
  opts.classes = element.getAttribute("class");
  opts.socketSend = wsConnect("/swiss/" + opts.data.id, opts.data.socketVersion || 0, {
    receive: (t, d) => ctrl.socket.receive(t, d)
  }).send;
  opts.element = element;
  opts.$side = $(".swiss__side").clone();
  let vnode;
  function redraw() {
    vnode = patch(vnode, main_default(ctrl));
  }
  const ctrl = new SwissCtrl(opts, redraw);
  const blueprint = main_default(ctrl);
  element.innerHTML = "";
  vnode = patch(element, blueprint);
  redraw();
}
export {
  initModule
};
//# sourceMappingURL=swiss.LQRHR67T.js.map

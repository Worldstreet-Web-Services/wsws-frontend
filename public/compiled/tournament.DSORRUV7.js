import {
  maxPerPage,
  myPage,
  numberRow,
  pagerData,
  redirectFirst,
  renderPager,
  searchButton,
  searchInput
} from "./lib.MUFAVNSQ.js";
import {
  notification_default
} from "./lib.IKPBOCUL.js";
import {
  standaloneChat
} from "./lib.KOFCUIJ3.js";
import "./lib.LARLSDYI.js";
import "./lib.OY6DQ2TE.js";
import {
  watchers
} from "./lib.2NHX5WHM.js";
import {
  perfIcons_default
} from "./lib.ZXVUOO3F.js";
import {
  status
} from "./lib.67VUYMDO.js";
import "./lib.GD6YSPBF.js";
import {
  fullName,
  userFlair,
  userLine,
  userLinkData,
  userRating,
  userTitle
} from "./lib.BMKV23O2.js";
import "./lib.D6AFQ4TK.js";
import "./lib.EAANXKAK.js";
import "./lib.BWJ4DVGT.js";
import {
  alert,
  alerts,
  icon,
  initMiniGames,
  prompt,
  setClockWidget,
  snabDialog,
  spinnerVdom
} from "./lib.MYPIOGN5.js";
import "./lib.LRP46MC3.js";
import {
  shuffle
} from "./lib.HMFK7OOB.js";
import "./lib.AEOHBIQD.js";
import {
  opposite
} from "./lib.RPQH5UYI.js";
import "./lib.XAEDCBGD.js";
import "./lib.X7H2PLEK.js";
import "./lib.53PYQRAK.js";
import "./lib.CAO7TYYH.js";
import {
  wsConnect
} from "./lib.PNHYIP7B.js";
import {
  bind,
  dataIcon,
  hl,
  onInsert
} from "./lib.S3TIZ2HQ.js";
import {
  attributesModule,
  classModule,
  h,
  init
} from "./lib.LWF5S4ZV.js";
import {
  pubsub
} from "./lib.QPQZCXK2.js";
import {
  licon
} from "./lib.5I4BSVKX.js";
import {
  defaultInit,
  ensureOk,
  json,
  jsonHeader,
  text,
  textRaw,
  url
} from "./lib.TT4QSUKQ.js";
import {
  finallyDelay,
  once,
  storedMapAsProp,
  throttlePromiseDelay
} from "./lib.NFSQQWN5.js";
import "./lib.GMEH5BEF.js";
import {
  __export
} from "./lib.KO2KTNGK.js";

// ../tournament/src/socket.ts
function makeSocket(send, ctrl) {
  const handlers = {
    reload: ctrl.askReload,
    redirect(fullId) {
      redirectFirst(fullId.slice(0, 8), true);
      return true;
    }
  };
  return {
    send,
    receive(type, data) {
      const handler = handlers[type];
      if (handler) return handler(data);
      return false;
    }
  };
}

// ../tournament/src/sound.ts
var countDownTimeout;
function doCountDown(targetTime) {
  let started = false;
  return function curCounter() {
    const secondsToStart = (targetTime - window.performance.now()) / 1e3;
    const bestTick = Math.max(0, Math.round(secondsToStart));
    if (bestTick <= 10) site.sound.play("countDown" + bestTick);
    if (bestTick > 0) {
      const nextTick = Math.min(10, bestTick - 1);
      countDownTimeout = setTimeout(
        curCounter,
        1e3 * Math.min(1.1, Math.max(0.8, secondsToStart - nextTick))
      );
    }
    if (!started && bestTick <= 10) {
      started = true;
      notification_default("The tournament is starting!");
    }
  };
}
function end(data) {
  if (data.me && data.isRecentlyFinished && once("tournament.end.sound." + data.id)) {
    let key = "Other";
    if (data.me.rank < 4) key = "1st";
    else if (data.me.rank < 11) key = "2nd";
    else if (data.me.rank < 21) key = "3rd";
    site.sound.play("tournament" + key);
  }
}
function countDown(data) {
  if (!data.me || !data.secondsToStart) {
    if (countDownTimeout) clearTimeout(countDownTimeout);
    countDownTimeout = void 0;
    return;
  }
  if (countDownTimeout) return;
  if (data.secondsToStart > 60 * 60 * 24) return;
  countDownTimeout = setTimeout(
    doCountDown(window.performance.now() + 1e3 * data.secondsToStart - 100),
    900
  );
  for (let i = 10; i >= 0; i--) {
    const s = "countDown" + i;
    site.sound.load(s);
  }
}

// ../tournament/src/xhr.ts
var onFail = () => {
  setTimeout(site.reload, Math.floor(Math.random() * 9e3));
};
var join = throttlePromiseDelay(
  () => 5e3,
  (ctrl, password, team) => textRaw("/tournament/" + ctrl.data.id + "/join", {
    method: "POST",
    // must use JSON body for app compat
    body: JSON.stringify({
      p: password || null,
      team: team || null
    }),
    headers: { "Content-Type": "application/json" }
  }).then((res) => {
    if (!res.ok)
      res.json().then((t) => {
        if (t.error) alert(t.error);
        else site.reload();
      });
  }, onFail)
);
var withdraw = throttlePromiseDelay(
  () => 1e3,
  (ctrl) => text("/tournament/" + ctrl.data.id + "/withdraw", {
    method: "POST"
  }).then(() => {
  }, onFail)
);
var loadPage = throttlePromiseDelay(
  () => 1e3,
  (ctrl, p) => json(`/tournament/${ctrl.data.id}/standing/${p}`).then((data) => {
    ctrl.loadPage(data);
    ctrl.redraw();
  }, onFail)
);
var loadPageOf = (ctrl, userId) => json(`/tournament/${ctrl.data.id}/page-of/${userId}`);
var reloadEndpointFallback = (ctrl) => `/tournament/${ctrl.data.id}`;
var reloadNow = finallyDelay(
  (ctrl) => Math.floor(ctrl.nbWatchers / 2) * (ctrl.data.me ? 1 : 3),
  (ctrl) => fetch(
    url(ctrl.data.reloadEndpoint, {
      page: ctrl.focusOnMe ? void 0 : ctrl.page,
      playerInfo: ctrl.playerInfo.id,
      partial: true,
      me: ctrl.data.myUsername
    }),
    {
      ...defaultInit,
      headers: jsonHeader
    }
  ).then((res) => ensureOk(res).then((r) => r.json())).then(
    (data) => {
      ctrl.reload(data);
      ctrl.redraw();
    },
    () => {
      if (ctrl.data.reloadEndpoint !== reloadEndpointFallback(ctrl)) {
        ctrl.data.reloadEndpoint = reloadEndpointFallback(ctrl);
        return reloadNow(ctrl);
      } else return onFail();
    }
  )
);
var reloadSoon = throttlePromiseDelay(() => 4e3 + Math.floor(Math.random() * 1e3), reloadNow);
var playerInfo = (ctrl, userId) => json(`/tournament/${ctrl.data.id}/player/${userId}`).then((data) => {
  ctrl.setPlayerInfoData(data);
  ctrl.redraw();
}, onFail);
var teamInfo = (ctrl, teamId) => json(`/tournament/${ctrl.data.id}/team/${teamId}`).then((data) => {
  ctrl.setTeamInfo(data);
  ctrl.redraw();
}, onFail);

// ../tournament/src/ctrl.ts
var TournamentController = class {
  constructor(opts, redraw) {
    this.pages = {};
    this.joinSpinner = false;
    this.playerInfo = {};
    this.teamInfo = {};
    this.disableClicks = true;
    this.searching = false;
    this.joinWithTeamSelector = false;
    this.nbWatchers = 0;
    this.askReload = () => {
      if (this.joinSpinner) reloadNow(this);
      else reloadSoon(this);
    };
    this.reload = (data) => {
      var _a, _b, _c;
      const willChangeJoinStatus = !!this.data.me !== !!data.me || ((_a = this.data.me) == null ? void 0 : _a.withdraw) !== ((_b = data.me) == null ? void 0 : _b.withdraw);
      if (!this.data.me && data.me && this.data.private) site.reload();
      this.data = { ...this.data, ...data, me: data.me };
      if (((_c = data.playerInfo) == null ? void 0 : _c.player.id) === this.playerInfo.id) this.playerInfo.data = data.playerInfo;
      this.loadPage(data.standing);
      if (this.focusOnMe) this.scrollToMe();
      end(data);
      countDown(data);
      if (willChangeJoinStatus) this.joinSpinner = false;
      this.recountTeams();
      this.redirectToMyGame();
    };
    this.myGameId = () => {
      var _a;
      return (_a = this.data.me) == null ? void 0 : _a.gameId;
    };
    this.pager = () => pagerData(this);
    this.loadPage = (data) => {
      if (!data.failed || !this.pages[data.page]) this.pages[data.page] = data.players;
    };
    this.setPage = (page) => {
      if (page && page !== this.page && page >= 1 && page <= this.pager().nbPages) {
        this.page = page;
        loadPage(this, page);
      }
    };
    this.jumpToPageOf = (name4) => {
      const userId = name4.toLowerCase();
      loadPageOf(this, userId).then((data) => {
        this.loadPage(data);
        this.page = data.page;
        this.searching = false;
        this.focusOnMe = false;
        this.pages[this.page].filter((p) => p.name.toLowerCase() === userId).forEach(this.showPlayerInfo);
        this.redraw();
      });
    };
    this.jumpToRank = (rank) => {
      const page = 1 + Math.floor((rank - 1) / maxPerPage);
      const row = (rank - 1) % maxPerPage;
      loadPage(this, page).then(() => {
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
    this.withdraw = () => {
      withdraw(this);
      this.joinSpinner = true;
      this.focusOnMe = false;
    };
    this.join = async (team) => {
      this.joinWithTeamSelector = false;
      if (!this.data.verdicts.accepted)
        return await alerts(this.data.verdicts.list.map((v) => v.verdict).filter((v) => v !== "ok"));
      if (this.data.teamBattle && !team && !this.data.me) {
        this.joinWithTeamSelector = true;
      } else {
        let password;
        if (this.data.private && !this.data.me) {
          password = await prompt(i18n.site.tournamentEntryCode);
          if (password === null) {
            return;
          }
        }
        join(this, password, team);
        this.joinSpinner = true;
        this.focusOnMe = true;
      }
    };
    this.scrollToMe = () => this.setPage(myPage(this));
    this.toggleFocusOnMe = () => {
      if (!this.data.me) return;
      this.focusOnMe = !this.focusOnMe;
      if (this.focusOnMe) this.scrollToMe();
    };
    this.showPlayerInfo = (player2) => {
      if (this.data.secondsToStart) return;
      const userId = player2.name.toLowerCase();
      this.teamInfo.requested = void 0;
      this.playerInfo = {
        id: this.playerInfo.id === userId ? void 0 : userId,
        player: player2
      };
      if (this.playerInfo.id) playerInfo(this, this.playerInfo.id);
    };
    this.setPlayerInfoData = (data) => {
      if (data.player.id === this.playerInfo.id) this.playerInfo.data = data;
    };
    this.showTeamInfo = (teamId) => {
      this.playerInfo.id = void 0;
      this.teamInfo = {
        requested: this.teamInfo.requested === teamId ? void 0 : teamId,
        loaded: void 0
      };
      if (this.teamInfo.requested) teamInfo(this, this.teamInfo.requested);
    };
    this.setTeamInfo = (teamInfo2) => {
      if (teamInfo2.id === this.teamInfo.requested) this.teamInfo.loaded = teamInfo2;
    };
    this.toggleSearch = () => {
      this.searching = !this.searching;
    };
    this.isIn = () => !!this.data.me && !this.data.me.withdraw;
    this.willBePaired = () => this.isIn() && !this.data.pairingsClosed;
    this.opts = opts;
    this.data = opts.data;
    this.redraw = redraw;
    this.socket = makeSocket(opts.socketSend, this);
    this.page = this.data.standing.page;
    this.focusOnMe = this.isIn();
    this.collapsedDescription = storedMapAsProp(
      "tournament.collapsed-description-store",
      this.data.id,
      20,
      () => false
    );
    setTimeout(() => this.disableClicks = false, 1500);
    this.loadPage(this.data.standing);
    const playerInfo2 = opts.data.playerInfo;
    if (playerInfo2) {
      this.playerInfo = { id: playerInfo2.player.id, player: playerInfo2.player, data: playerInfo2 };
    } else this.scrollToMe();
    end(this.data);
    countDown(this.data);
    this.setupBattle();
    this.redirectToMyGame();
    pubsub.on("socket.in.crowd", (data) => {
      this.nbWatchers = data.nb;
    });
  }
  recountTeams() {
    if (this.data.teamBattle)
      this.data.teamBattle.hasMoreThanTenTeams = Object.keys(this.data.teamBattle.teams).length > 10;
  }
  setupBattle() {
    if (this.data.teamBattle) {
      this.recountTeams();
      const locationTeam = location.hash.startsWith("#team/") && location.hash.slice(6);
      if (locationTeam) this.showTeamInfo(locationTeam);
    }
  }
  redirectToMyGame() {
    const gameId = this.myGameId();
    if (gameId) redirectFirst(gameId);
  }
};

// ../tournament/src/view/battle.ts
function joinWithTeamSelector(ctrl) {
  const tb = ctrl.data.teamBattle;
  const onClose = () => {
    ctrl.joinWithTeamSelector = false;
    ctrl.redraw();
  };
  return snabDialog({
    class: "team-battle__choice",
    modal: true,
    easyClose: "clickOutside",
    onInsert(dlg) {
      $(".team-picker__team", dlg.view).on("click", (e) => {
        ctrl.join(e.target.dataset["id"]);
        dlg.close();
      });
      dlg.show();
    },
    onClose,
    vnodes: [
      h("div.team-picker", [
        h("h2", i18n.arena.pickYourTeam),
        h("br"),
        ...tb.joinWith.length ? [
          h("p", i18n.arena.whichTeamWillYouRepresentInThisBattle),
          ...tb.joinWith.map(
            (id) => h(
              "button.button.team-picker__team",
              { attrs: { "data-id": id } },
              renderTeamArray(tb.teams[id])
            )
          )
        ] : [
          h("p", i18n.arena.youMustJoinOneOfTheseTeamsToParticipate),
          h(
            "ul",
            shuffle(Object.keys(tb.teams)).map(
              (id) => h("li", h("a", { attrs: { href: "/team/" + id } }, renderTeamArray(tb.teams[id])))
            )
          )
        ]
      ])
    ]
  });
}
var renderTeamArray = (team) => team && [team[0], userFlair({ flair: team[1] })];
function teamStanding(ctrl, klass) {
  const battle = ctrl.data.teamBattle, standing2 = ctrl.data.teamStanding, bigBattle = battle && Object.keys(battle.teams).length > 10;
  return battle && standing2 ? h("table.slist.tour__team-standing" + (klass ? "." + klass : ""), [
    h("tbody", [
      ...standing2.map((rt) => teamTr(ctrl, battle, rt)),
      ...bigBattle ? [extraTeams(ctrl), myTeam(ctrl, battle)] : []
    ])
  ]) : null;
}
function extraTeams(ctrl) {
  return h(
    "tr",
    h(
      "td.more-teams",
      { attrs: { colspan: 4 } },
      h(
        "a",
        { attrs: { href: `/tournament/${ctrl.data.id}/teams` } },
        i18n.arena.viewAllXTeams(Object.keys(ctrl.data.teamBattle.teams).length)
      )
    )
  );
}
function myTeam(ctrl, battle) {
  const team = ctrl.data.myTeam;
  return team && team.rank > 10 ? teamTr(ctrl, battle, team) : void 0;
}
function teamName(battle, teamId) {
  return h(
    battle.hasMoreThanTenTeams ? "team" : "team.ttc-" + Object.keys(battle.teams).indexOf(teamId),
    renderTeamArray(battle.teams[teamId]) || teamId
  );
}
function teamTr(ctrl, battle, team) {
  const players = [];
  team.players.forEach((p, i) => {
    if (i > 0) players.push("+");
    players.push(
      h(
        "score.ulpt.user-link",
        {
          key: p.user.name,
          class: { top: i === 0 },
          attrs: { "data-href": "/@/" + p.user.name },
          hook: { destroy: (vnode) => $.powerTip.destroy(vnode.elm) }
        },
        [...i === 0 ? [h("username", fullName(p.user)), " "] : [], p.score]
      )
    );
  });
  return h(
    "tr",
    {
      key: team.id,
      class: { active: ctrl.teamInfo.requested === team.id },
      hook: bind("click", (_) => ctrl.showTeamInfo(team.id), ctrl.redraw)
    },
    [
      h("td.rank", team.rank),
      h("td.team", [teamName(battle, team.id)]),
      h(
        "td.players",
        {
          hook: bind("click", (e) => {
            const href = e.target.getAttribute("data-href");
            if (href) {
              ctrl.jumpToPageOf(href.slice(3));
              ctrl.redraw();
            }
          })
        },
        players
      ),
      h("td.total", [h("strong", team.score)])
    ]
  );
}

// ../tournament/src/view/created.ts
var created_exports = {};
__export(created_exports, {
  main: () => main,
  name: () => name,
  table: () => table
});

// ../tournament/src/view/button.ts
function orJoinSpinner(ctrl, f) {
  return ctrl.joinSpinner ? spinnerVdom() : f();
}
function withdraw2(ctrl) {
  return orJoinSpinner(ctrl, () => {
    const pause = ctrl.data.isStarted;
    return h(
      "button.fbt.text",
      {
        attrs: dataIcon(pause ? licon.Pause : licon.FlagOutline),
        hook: bind("click", ctrl.withdraw, ctrl.redraw)
      },
      i18n.site[pause ? "pause" : "withdraw"]
    );
  });
}
function join2(ctrl) {
  return orJoinSpinner(ctrl, () => {
    var _a;
    const delay = (_a = ctrl.data.me) == null ? void 0 : _a.pauseDelay;
    const joinable = ctrl.data.verdicts.accepted && !delay;
    const button = h(
      "button" + (joinable ? ".button.button-green" : ".fbt.text"),
      {
        attrs: { disabled: !joinable, "data-icon": licon.PlayTriangle },
        hook: bind("click", (_) => ctrl.join(), ctrl.redraw)
      },
      i18n.site.join
    );
    return delay ? h("div.delay-wrap", { attrs: { title: "Waiting to be able to re-join the tournament" } }, [
      h(
        "div.delay",
        {
          hook: onInsert((el) => {
            el.style.animation = `tour-delay ${delay}s linear`;
            setTimeout(() => {
              if (delay === ctrl.data.me.pauseDelay) {
                ctrl.data.me.pauseDelay = 0;
                ctrl.redraw();
              }
            }, delay * 1e3);
          })
        },
        button
      )
    ]) : button;
  });
}
function joinWithdraw(ctrl) {
  if (!ctrl.opts.userId)
    return h(
      "a.button.button-green",
      { attrs: { href: "/login?referrer=" + window.location.pathname, "data-icon": licon.PlayTriangle } },
      i18n.site.signIn
    );
  if (!ctrl.data.isFinished) return ctrl.isIn() ? withdraw2(ctrl) : join2(ctrl);
  return void 0;
}

// ../tournament/src/view/util.ts
var player = (p, asLink, withRating, defender = false, leader = false) => h(
  "a.ulpt.user-link.online" + (((p.title || "") + p.name).length > 15 ? ".long" : ""),
  {
    attrs: asLink || "ontouchstart" in window ? { href: "/@/" + p.name } : { "data-href": "/@/" + p.name },
    hook: { destroy: (vnode) => $.powerTip.destroy(vnode.elm) }
  },
  [
    h(
      "span.name" + (defender ? ".defender" : leader ? ".leader" : ""),
      defender ? { attrs: dataIcon(licon.Shield) } : leader ? { attrs: dataIcon(licon.Crown) } : {},
      [p.patronColor && userLine({ patronColor: p.patronColor }), ...fullName2(p)]
    ),
    withRating ? h("span.rating", userRating({ ...p, brackets: false })) : null
  ]
);
var fullName2 = (p) => [
  userTitle(p),
  ...p.realName ? [p.realName, h("br"), h("span.username-low", `(${p.name})`)] : [p.name],
  userFlair(p)
];

// ../tournament/src/view/arena.ts
var renderScoreString = (scoreString, streakable) => {
  const values = scoreString.split("").map((s) => parseInt(s));
  values.reverse();
  if (!streakable) return values.map((v) => h(v > 1 ? "streak" : "score", v));
  const nodes = [];
  let streak = 0;
  for (const v of values) {
    const win = v === 2 ? streak < 2 : v > 2;
    const tag = streak > 1 && v > 1 ? "double" : win ? "streak" : "score";
    if (win) {
      streak++;
    } else {
      streak = 0;
    }
    nodes.push(h(tag, v));
  }
  return nodes;
};
function playerTr(ctrl, player2) {
  const userId = player2.name.toLowerCase(), nbScores = player2.sheet.scores.length;
  const battle = ctrl.data.teamBattle;
  return h(
    "tr",
    {
      key: userId,
      class: {
        me: ctrl.opts.userId === userId,
        long: nbScores > 35,
        xlong: nbScores > 80,
        active: ctrl.playerInfo.id === userId
      },
      hook: bind("click", (_) => ctrl.showPlayerInfo(player2), ctrl.redraw)
    },
    [
      h("td.rank", player2.withdraw ? icon(licon.Pause)({ title: i18n.site.pause }) : player2.rank),
      h("td.player", [
        player(player2, false, ctrl.opts.showRatings, userId === ctrl.data.defender),
        ...battle && player2.team ? [" ", teamName(battle, player2.team)] : []
      ]),
      h("td.sheet", renderScoreString(player2.sheet.scores, !ctrl.data.noStreak)),
      h("td.total", [
        player2.sheet.fire && !ctrl.data.isFinished ? h("strong.is-gold", { attrs: dataIcon(licon.Fire) }, player2.score) : h("strong", player2.score)
      ])
    ]
  );
}
function podiumStats(p, berserkable, ctrl) {
  const nb = p.nb;
  return h("table.stats", [
    p.performance && ctrl.opts.showRatings ? h("tr", [h("th", i18n.site.performance), h("td", p.performance)]) : null,
    h("tr", [h("th", i18n.site.gamesPlayed), h("td", nb.game)]),
    ...nb.game ? [
      numberRow(i18n.site.winRate, [nb.win, nb.game], "percent"),
      berserkable ? numberRow(i18n.arena.berserkRate, [nb.berserk, nb.game], "percent") : null
    ] : []
  ]);
}
var lastBody;
function podium(ctrl) {
  const p = ctrl.data.podium || [];
  const podiumPosition = (p2, pos) => p2 ? h("div." + pos, [
    h("div.trophy"),
    h("a", userLinkData(p2), [p2.patronColor && userLine(p2), ...fullName2(p2)]),
    podiumStats(p2, ctrl.data.berserkable, ctrl)
  ]) : void 0;
  return h("div.podium", [
    podiumPosition(p[1], "second"),
    podiumPosition(p[0], "first"),
    podiumPosition(p[2], "third")
  ]);
}
function controls(ctrl) {
  return h("div.tour__controls", [
    h("div.pager", renderPager(ctrl, searchButton(ctrl), searchInput(ctrl, { tour: ctrl.data.id }))),
    joinWithdraw(ctrl)
  ]);
}
function standing(ctrl, klass) {
  const pag = ctrl.pager();
  const tableBody = pag.currentPageResults ? pag.currentPageResults.map((res) => playerTr(ctrl, res)) : lastBody;
  if (pag.currentPageResults) lastBody = tableBody;
  return h(
    "table.slist.tour__standing" + (klass ? "." + klass : ""),
    { class: { loading: !pag.currentPageResults } },
    [
      h(
        "tbody",
        {
          hook: {
            insert: (vnode) => site.powertip.manualUserIn(vnode.elm),
            update: (_, vnode) => site.powertip.manualUserIn(vnode.elm)
          }
        },
        tableBody
      )
    ]
  );
}

// ../tournament/src/view/header.ts
var startClock = (time) => ({
  insert: (vnode) => setClockWidget(vnode.elm, { time })
});
var oneDayInSeconds = 60 * 60 * 24;
var hasFreq = (freq, d) => {
  var _a;
  return ((_a = d.schedule) == null ? void 0 : _a.freq) === freq;
};
function clock(ctrl) {
  const d = ctrl.data;
  if (d.isFinished) return void 0;
  if (d.secondsToFinish) return h("div.clock", [h("div.time", { hook: startClock(d.secondsToFinish) })]);
  if (d.secondsToStart) {
    if (d.secondsToStart > oneDayInSeconds)
      return h("div.clock", [
        h("time.timeago.shy", {
          attrs: {
            title: new Date(d.startsAt).toLocaleString(),
            datetime: Date.now() + d.secondsToStart * 1e3
          },
          hook: onInsert((el) => {
            el.setAttribute("datetime", String(Date.now() + d.secondsToStart * 1e3));
          })
        })
      ]);
    return h("div.clock.clock-created", [
      h("span.shy", i18n.site.startingIn),
      h("span.time.text", { hook: startClock(d.secondsToStart) })
    ]);
  }
  return void 0;
}
function image(d) {
  if (d.isFinished) return void 0;
  if (hasFreq("shield", d) || hasFreq("marathon", d)) return void 0;
  const s = d.spotlight;
  if (s == null ? void 0 : s.iconImg) return h("img.img", { attrs: { src: site.asset.url("images/" + s.iconImg) } });
  return icon((s == null ? void 0 : s.iconFont) || licon.Trophy)(".img");
}
function title(ctrl) {
  const d = ctrl.data;
  if (hasFreq("marathon", d)) return h("h1", [icon(licon.Globe)(".fire-trophy"), d.fullName]);
  if (hasFreq("shield", d))
    return h("h1", [
      h("a.shield-trophy", { attrs: { href: "/tournament/shields" } }, perfIcons_default[d.perf.key]),
      d.fullName
    ]);
  const baseName = d.greatPlayer ? [h("a", { attrs: { href: d.greatPlayer.url, target: "_blank" } }, d.greatPlayer.name), " Arena"] : [d.fullName];
  return h("h1", [
    ...ctrl.data.botsAllowed ? [userTitle({ title: "BOT" })] : [],
    ...baseName,
    ...d.private ? [" ", h("span", { attrs: dataIcon(licon.Padlock) })] : []
  ]);
}
function header_default(ctrl) {
  return h("div.tour__main__header", [image(ctrl.data), title(ctrl), clock(ctrl)]);
}

// ../tournament/src/view/teamInfo.ts
function teamInfo_default(ctrl) {
  var _a, _b;
  const battle = ctrl.data.teamBattle, data = ctrl.teamInfo.loaded;
  if (!battle) return void 0;
  const teamTag = ctrl.teamInfo.requested ? teamName(battle, ctrl.teamInfo.requested) : null;
  const tag = "div.tour__team-info.tour__actor-info";
  if (!data || data.id !== ctrl.teamInfo.requested)
    return h(tag, [h("div.stats", [h("h2", [teamTag]), spinnerVdom()])]);
  const nbLeaders = ((_b = (_a = ctrl.data.teamStanding) == null ? void 0 : _a.find((s) => s.id === data.id)) == null ? void 0 : _b.players.length) || 0;
  const setup2 = (vnode) => {
    site.powertip.manualUserIn(vnode.elm);
  };
  return h(tag, { hook: { insert: setup2, postpatch: (_, vnode) => setup2(vnode) } }, [
    h("button.close", {
      attrs: dataIcon(licon.X),
      hook: bind("click", () => ctrl.showTeamInfo(data.id), ctrl.redraw)
    }),
    h("div.stats", [
      h("h2", h("a", { attrs: { href: `/team/${data.id}` } }, teamTag)),
      h("table", [
        numberRow(i18n.site.players, data.nbPlayers),
        ...data.rating ? [
          ctrl.opts.showRatings ? numberRow(i18n.site.averageElo, data.rating, "raw") : null,
          ...data.perf ? [
            ctrl.opts.showRatings ? numberRow(i18n.arena.averagePerformance, data.perf, "raw") : null,
            numberRow(i18n.arena.averageScore, data.score, "raw")
          ] : []
        ] : []
      ]),
      data.joined ? "You are part of this team" : h(
        "form",
        {
          attrs: {
            method: "post",
            action: `/team/${data.id}/join?referrer=${location.pathname}#team/${data.id}`
          }
        },
        [h("button.button.button-empty", { attrs: { type: "submit" } }, i18n.team.joinTeam)]
      )
    ]),
    h("div", [
      h(
        "table.players.sublist",
        data.topPlayers.map(
          (p, i) => h("tr", { key: p.name, hook: bind("click", () => ctrl.jumpToPageOf(p.name)) }, [
            h("th", i + 1),
            h("td", player(p, false, ctrl.opts.showRatings, false, i < nbLeaders)),
            h("td.total", [
              p.fire && !ctrl.data.isFinished ? h("strong.is-gold", { attrs: dataIcon(licon.Fire) }, p.score) : h("strong", p.score)
            ])
          ])
        )
      )
    ])
  ]);
}

// ../tournament/src/view/created.ts
var name = "created";
function main(ctrl) {
  return [
    header_default(ctrl),
    teamStanding(ctrl, "created"),
    controls(ctrl),
    standing(ctrl, "created"),
    h("blockquote.pull-quote", [h("p", ctrl.data.quote.text), h("footer", ctrl.data.quote.author)]),
    ctrl.opts.$faq ? h("div", { hook: onInsert((el) => $(el).replaceWith(ctrl.opts.$faq)) }) : null
  ];
}
function table(ctrl) {
  return ctrl.teamInfo.requested ? teamInfo_default(ctrl) : void 0;
}

// ../tournament/src/view/finished.ts
var finished_exports = {};
__export(finished_exports, {
  main: () => main2,
  name: () => name2,
  table: () => table2
});

// ../tournament/src/view/playerInfo.ts
var playerTitle = (player2, tourId) => hl("h2", [
  player2.rank ? hl("a.rank", { attrs: { href: `/tournament/${tourId}?player=${player2.id}` } }, `${player2.rank}. `) : "",
  player(player2, true, false, false)
]);
function setup(vnode) {
  const el = vnode.elm, p = site.powertip;
  p.manualUserIn(el);
  p.manualGameIn(el);
}
function playerInfo_default(ctrl) {
  const data = ctrl.playerInfo.data;
  const tag = "div.tour__player-info.tour__actor-info";
  if (!data || data.player.id !== ctrl.playerInfo.id)
    return hl(tag, [hl("div.stats", [playerTitle(ctrl.playerInfo.player, ctrl.data.id), spinnerVdom()])]);
  const nb = data.player.nb, pairingsLen = data.pairings.length, avgOp = pairingsLen ? Math.round(data.pairings.reduce((a, b) => a + b.op.rating, 0) / pairingsLen) : void 0;
  return hl(tag, { hook: { insert: setup, postpatch: (_, vnode) => setup(vnode) } }, [
    hl("button.close", {
      attrs: dataIcon(licon.X),
      hook: bind("click", () => ctrl.showPlayerInfo(data.player), ctrl.redraw)
    }),
    hl("div.stats", [
      playerTitle(data.player, ctrl.data.id),
      data.player.team && hl("team", { hook: bind("click", () => ctrl.showTeamInfo(data.player.team), ctrl.redraw) }, [
        teamName(ctrl.data.teamBattle, data.player.team)
      ]),
      hl("table", [
        ctrl.opts.showRatings && data.player.performance && numberRow(i18n.site.performance, data.player.performance + (nb.game < 3 ? "?" : ""), "raw"),
        numberRow(i18n.site.gamesPlayed, nb.game),
        nb.game > 0 && [
          numberRow(i18n.site.winRate, [nb.win, nb.game], "percent"),
          numberRow(i18n.arena.berserkRate, [nb.berserk, nb.game], "percent"),
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
            if (href) window.open(href, "_blank", "noopener");
          })
        },
        data.pairings.map((p, i) => {
          const score = p.status < status.mate ? "*" : p.score;
          const streak = p.win == null ? p.score === 2 : p.win ? p.score > 3 : false;
          const cls = p.win == null ? "" : streak ? "streak" : !p.win ? "loss" : "win";
          return hl(
            "tr.glpt." + cls,
            {
              key: p.id,
              attrs: { "data-href": "/" + p.id + "/" + p.color },
              hook: { destroy: (vnode) => $.powerTip.destroy(vnode.elm) }
            },
            [
              hl("th", Math.max(nb.game, pairingsLen) - i),
              hl("td", fullName2(p.op)),
              ctrl.opts.showRatings ? hl("td", `${p.op.rating}`) : null,
              berserkTd(!!p.op.berserk),
              hl("td.is.color-icon." + p.color),
              hl("td.result", score),
              berserkTd(p.berserk)
            ]
          );
        })
      )
    ])
  ]);
}
var berserkTd = (b) => b ? hl("td.berserk", { attrs: { ...dataIcon(licon.Berserk), title: "Berserk" } }) : hl("td.berserk");

// ../tournament/src/view/finished.ts
function confetti(data) {
  if (data.me && data.isRecentlyFinished && once("tournament.end.canvas." + data.id))
    return h("canvas#confetti", {
      hook: { insert: (_) => site.asset.loadEsm("bits.confetti") }
    });
  return void 0;
}
function stats(ctrl) {
  const data = ctrl.data;
  if (!data.stats) return void 0;
  const tableData = [
    ctrl.opts.showRatings ? numberRow(i18n.site.averageElo, data.stats.averageRating, "raw") : null,
    numberRow(i18n.site.gamesPlayed, data.stats.games),
    numberRow(i18n.site.movesPlayed, data.stats.moves),
    numberRow(i18n.site.whiteWins, [data.stats.whiteWins, data.stats.games], "percent"),
    numberRow(i18n.site.blackWins, [data.stats.blackWins, data.stats.games], "percent"),
    numberRow(i18n.site.drawRate, [data.stats.draws, data.stats.games], "percent")
  ];
  if (data.berserkable) {
    tableData.push(numberRow(i18n.arena.berserkRate, [data.stats.berserks / 2, data.stats.games], "percent"));
  }
  return h("div.tour__stats", [
    h("h2", i18n.site.tournamentComplete),
    h("table", tableData),
    h("div.tour__stats__links.force-ltr", [
      ...data.teamBattle ? [
        h(
          "a",
          { attrs: { href: `/tournament/${data.id}/teams` } },
          i18n.arena.viewAllXTeams(Object.keys(data.teamBattle.teams).length)
        ),
        h("br")
      ] : [],
      h(
        "a.text",
        { attrs: { "data-icon": licon.Download, href: `/api/tournament/${data.id}/games`, download: true } },
        i18n.site.downloadAllGames
      ),
      data.me && h(
        "a.text",
        {
          attrs: {
            "data-icon": licon.Download,
            href: `/api/tournament/${data.id}/games?player=${ctrl.opts.userId}`,
            download: true
          }
        },
        "Download my games"
      ),
      h(
        "a.text",
        {
          attrs: { "data-icon": licon.Download, href: `/api/tournament/${data.id}/results`, download: true }
        },
        "Download results as NDJSON"
      ),
      h(
        "a.text",
        {
          attrs: {
            "data-icon": licon.Download,
            href: `/api/tournament/${data.id}/results?as=csv`,
            download: true
          }
        },
        "Download results as CSV"
      ),
      h("br"),
      h(
        "a.text",
        { attrs: { "data-icon": licon.InfoCircle, href: "/api#tag/arena-tournaments" } },
        "Arena API documentation"
      )
    ])
  ]);
}
var name2 = "finished";
function main2(ctrl) {
  return [
    h("div.podium-wrap", [confetti(ctrl.data), header_default(ctrl), teamStanding(ctrl, "finished") || podium(ctrl)]),
    controls(ctrl),
    standing(ctrl)
  ];
}
function table2(ctrl) {
  return ctrl.playerInfo.id ? playerInfo_default(ctrl) : ctrl.teamInfo.requested ? teamInfo_default(ctrl) : stats(ctrl);
}

// ../tournament/src/view/started.ts
var started_exports = {};
__export(started_exports, {
  main: () => main3,
  name: () => name3,
  table: () => table3
});

// ../tournament/src/view/table.ts
function featuredPlayer(game, color, opts) {
  const player2 = game[color];
  return hl("span.mini-game__player", [
    hl("span.mini-game__user", [
      hl("strong", "#" + player2.rank),
      player(player2, true, opts.showRatings, false),
      player2.berserk && icon(licon.Berserk)(".berserk", { title: "Berserk" })
    ]),
    game.c ? hl(`span.mini-game__clock.mini-game__clock--${color}`, {
      attrs: { "data-time": game.c[color], "data-managed": 1 }
    }) : hl("span.mini-game__result", game.winner ? game.winner === color ? "1" : "0" : "\xBD")
  ]);
}
function featured(game, opts) {
  return hl(
    `div.tour__featured.mini-game.mini-game-${game.id}.mini-game--init.is2d`,
    {
      attrs: { "data-state": `${game.fen},${game.orientation},${game.lastMove}`, "data-live": game.id },
      hook: onInsert(site.powertip.manualUserIn)
    },
    [
      featuredPlayer(game, opposite(game.orientation), opts),
      hl("a.cg-wrap", { attrs: { href: `/${game.id}/${game.orientation}` } }),
      featuredPlayer(game, game.orientation, opts)
    ]
  );
}
var duelPlayerMeta = (p, ctrl) => [
  hl("em.rank", "#" + p.k),
  p.t && hl("em.utitle", p.t),
  ctrl.opts.showRatings && hl("em.rating", p.r)
];
function renderDuel(ctrl) {
  const battle = ctrl.data.teamBattle, duelTeams = ctrl.data.duelTeams;
  return (d) => hl("a.glpt.force-ltr", { key: d.id, attrs: { href: "/" + d.id } }, [
    battle && duelTeams && hl(
      "line.t",
      d.p.map((p) => {
        const teamId = duelTeams[p.n.toLowerCase()];
        return teamId && teamName(battle, teamId);
      })
    ),
    hl("line.a", [hl("strong", d.p[0].n), hl("span", duelPlayerMeta(d.p[1], ctrl).reverse())]),
    hl("line.b", [hl("span", duelPlayerMeta(d.p[0], ctrl)), hl("strong", d.p[1].n)])
  ]);
}
var initMiniGame = (node) => initMiniGames(node.elm);
function table_default(ctrl) {
  return hl("div.tour__table", { hook: { insert: initMiniGame, postpatch: initMiniGame } }, [
    ctrl.data.featured && featured(ctrl.data.featured, ctrl.opts),
    ctrl.data.duels.length > 0 && hl(
      "section.tour__duels",
      { hook: bind("click", (_) => !ctrl.disableClicks) },
      [hl("h2", i18n.site.topGames)].concat(ctrl.data.duels.map(renderDuel(ctrl)))
    )
  ]);
}

// ../tournament/src/view/started.ts
function joinTheGame(gameId) {
  return h("a.tour__ur-playing.button.is.is-after", { attrs: { href: "/" + gameId } }, [
    i18n.site.youArePlaying,
    h("br"),
    i18n.site.joinTheGame
  ]);
}
function notice(ctrl) {
  return ctrl.willBePaired() ? h("div.tour__notice.bar-glider", i18n.site.standByX(ctrl.data.myUsername)) : h("div.tour__notice.closed", i18n.arena.tournamentPairingsAreNowClosed);
}
var name3 = "started";
function main3(ctrl) {
  const gameId = ctrl.myGameId();
  return [
    header_default(ctrl),
    gameId ? joinTheGame(gameId) : ctrl.isIn() ? notice(ctrl) : null,
    teamStanding(ctrl, "started"),
    controls(ctrl),
    standing(ctrl, "started")
  ];
}
function table3(ctrl) {
  return ctrl.playerInfo.id ? playerInfo_default(ctrl) : ctrl.teamInfo.requested ? teamInfo_default(ctrl) : table_default(ctrl);
}

// ../tournament/src/view/main.ts
function main_default(ctrl) {
  let handler;
  if (ctrl.data.isFinished) handler = finished_exports;
  else if (ctrl.data.isStarted) handler = started_exports;
  else handler = created_exports;
  return h("main." + ctrl.opts.classes, [
    h("aside.tour__side", {
      hook: onInsert((el) => {
        const side = ctrl.opts.$side;
        $(el).replaceWith(side);
        side.toggleClass("collapsed", ctrl.collapsedDescription()).find(".disclosure").on("click", () => {
          side.toggleClass("collapsed");
          ctrl.collapsedDescription(side.hasClass("collapsed"));
        });
        ctrl.opts.chat && standaloneChat(ctrl.opts.chat);
      })
    }),
    h("div.tour__underchat", {
      hook: onInsert((el) => $(el).replaceWith($(".tour__underchat.none").removeClass("none")))
    }),
    handler.table(ctrl),
    h(
      "div.tour__main",
      h(
        "div.box." + handler.name,
        { class: { "tour__main-finished": ctrl.data.isFinished } },
        handler.main(ctrl)
      )
    ),
    ctrl.opts.chat ? h("div.chat__members.none", { hook: onInsert(watchers) }) : null,
    ctrl.joinWithTeamSelector ? joinWithTeamSelector(ctrl) : null
  ]);
}

// ../tournament/src/tournament.ts
var patch = init([classModule, attributesModule]);
function initModule(opts) {
  document.body.dataset.tournamentId = opts.data.id;
  opts.socketSend = wsConnect(`/tournament/${opts.data.id}/socket/v5`, opts.data.socketVersion, {
    receive: (t, d) => ctrl.socket.receive(t, d)
  }).send;
  opts.element = document.querySelector("main.tour");
  opts.classes = opts.element.getAttribute("class");
  opts.$side = $(".tour__side").clone();
  opts.$faq = $(".tour__faq").clone();
  const ctrl = new TournamentController(opts, redraw);
  const blueprint = main_default(ctrl);
  opts.element.innerHTML = "";
  let vnode = patch(opts.element, blueprint);
  function redraw() {
    vnode = patch(vnode, main_default(ctrl));
  }
}
export {
  initModule
};
//# sourceMappingURL=tournament.DSORRUV7.js.map

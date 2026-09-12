import {
  timeago
} from "./lib.EAANXKAK.js";
import {
  icon,
  spinnerVdom
} from "./lib.MYPIOGN5.js";
import "./lib.LRP46MC3.js";
import "./lib.HMFK7OOB.js";
import "./lib.AEOHBIQD.js";
import "./lib.RPQH5UYI.js";
import "./lib.XAEDCBGD.js";
import "./lib.X7H2PLEK.js";
import "./lib.53PYQRAK.js";
import "./lib.CAO7TYYH.js";
import "./lib.PNHYIP7B.js";
import {
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
  json,
  text,
  url
} from "./lib.TT4QSUKQ.js";
import {
  storage
} from "./lib.NFSQQWN5.js";
import "./lib.GMEH5BEF.js";
import "./lib.KO2KTNGK.js";

// ../notify/src/ctrl.ts
function makeCtrl(opts, redraw) {
  let data, initiating = true, scrolling = false;
  const readAllStorage = storage.make("notify-read-all");
  readAllStorage.listen((_) => setAllRead(false));
  function update(d) {
    data = d;
    if (opts.updateUnread(data.unread) && !scrolling) attention();
    initiating = false;
    scrolling = false;
    if (opts.isVisible() && data.pager.currentPage === 1) setAllRead();
    else redraw();
  }
  function bumpUnread() {
    data = void 0;
    opts.updateUnread("increment");
    if (opts.isVisible()) loadPage(1);
    else attention();
  }
  function attention() {
    var _a, _b;
    const id = (_b = (_a = data == null ? void 0 : data.pager.currentPageResults.find((n) => !n.read)) == null ? void 0 : _a.content.user) == null ? void 0 : _b.id;
    const playBell = storage.boolean("playBellSound").getOrDefault(true);
    if ((!site.quietMode || id === "lichess") && playBell) site.sound.playOnce("newPM");
    opts.pulse();
  }
  const loadPage = (page) => json(url("/notify", { page: page || 1 })).then(
    (d) => update(d),
    (_) => site.announce({ msg: "Failed to load notifications" })
  );
  function nextPage() {
    if (!(data == null ? void 0 : data.pager.nextPage)) return;
    scrolling = true;
    loadPage(data.pager.nextPage);
    redraw();
  }
  function previousPage() {
    if (!(data == null ? void 0 : data.pager.previousPage)) return;
    scrolling = true;
    loadPage(data.pager.previousPage);
    redraw();
  }
  function onShow() {
    if (!data || data.pager.currentPage === 1) loadPage(1);
  }
  function setAllRead(notifyOthers = true) {
    if (notifyOthers) {
      readAllStorage.fire();
      opts.setNotified();
    }
    if (data) data.unread = 0;
    opts.updateUnread(0);
    redraw();
  }
  function setMsgRead(user) {
    data == null ? void 0 : data.pager.currentPageResults.forEach((n) => {
      var _a;
      if (n.type === "privateMessage" && ((_a = n.content.user) == null ? void 0 : _a.id) === user && !n.read) {
        n.read = true;
        data.unread = Math.max(0, data.unread - 1);
        opts.updateUnread(data.unread);
      }
    });
  }
  const emptyNotifyData = {
    pager: {
      currentPage: 1,
      maxPerPage: 1,
      currentPageResults: [],
      nbResults: 0,
      nbPages: 1
    },
    unread: 0,
    i18n: {}
  };
  function clear() {
    text("/notify/clear", { method: "post" }).then(
      (_) => update(emptyNotifyData),
      (_) => site.announce({ msg: "Failed to clear notifications" })
    );
  }
  return {
    data: () => data,
    initiating: () => initiating,
    scrolling: () => scrolling,
    update,
    bumpUnread,
    nextPage,
    previousPage,
    loadPage,
    onShow,
    setMsgRead,
    setAllRead,
    clear
  };
}

// ../notify/src/renderers.ts
function makeRenderers() {
  return {
    streamStart: {
      html: (n) => generic(n, `/streamer/${n.content.sid}?redirect=1`, licon.Mic, [
        h("span", [h("strong", n.content.name), drawTime(n)]),
        h("span", i18n.site.startedStreaming)
      ]),
      text: (n) => i18n.site.xStartedStreaming(n.content.streamerName)
    },
    genericLink: {
      html: (n) => generic(n, n.content.url, n.content.icon, [
        h("span", [h("strong", n.content.title), drawTime(n)]),
        h("span", n.content.text)
      ]),
      text: (n) => n.content.title || n.content.text
    },
    broadcastRound: {
      html: (n) => generic(n, n.content.url, licon.RadioTower, [
        h("span", [h("strong", n.content.title), drawTime(n)]),
        h("span", n.content.text)
      ]),
      text: (n) => n.content.title || n.content.text
    },
    mention: {
      html: (n) => generic(n, `/forum/redirect/post/${n.content.postId}`, licon.BubbleConvo, [
        h("span", [h("strong", userFullName(n.content.mentionedBy)), drawTime(n)]),
        h("span", i18n.site.mentionedYouInX(n.content.topic))
      ]),
      text: (n) => i18n.site.xMentionedYouInY(userFullName(n.content.mentionedBy), n.content.topic)
    },
    invitedStudy: {
      html: (n) => generic(n, "/study/" + n.content.studyId, licon.StudyBoard, [
        h("span", [h("strong", userFullName(n.content.invitedBy)), drawTime(n)]),
        h("span", i18n.site.invitedYouToX(n.content.studyName))
      ]),
      text: (n) => i18n.site.xInvitedYouToY(userFullName(n.content.invitedBy), n.content.studyName)
    },
    privateMessage: {
      html: (n) => generic(n, "/inbox/" + n.content.user.name, licon.BubbleSpeech, [
        h("span", [h("strong", userFullName(n.content.user)), drawTime(n)]),
        h("span", n.content.text)
      ]),
      text: (n) => userFullName(n.content.sender) + ": " + n.content.text
    },
    teamJoined: {
      html: (n) => generic(n, "/team/" + n.content.id, licon.Group, [
        h("span", [h("strong", n.content.name), drawTime(n)]),
        h("span", i18n.site.youAreNowPartOfTeam)
      ]),
      text: (n) => i18n.site.youHaveJoinedTeamX(n.content.name)
    },
    teamUpdate: {
      html: (n) => generic(n, "/team/updates/" + n.content.id, licon.Group, [
        h("span", [h("strong", n.content.name)]),
        h("span", n.content.text)
      ]),
      text: (_) => "New team update"
    },
    titledTourney: {
      html: (n) => generic(n, "/tournament/" + n.content.id, licon.Trophy, [
        h("span", [h("strong", "Lichess Titled Arena"), drawTime(n)]),
        h("span", n.content.text)
      ]),
      text: (_) => "Lichess Titled Arena"
    },
    reportedBanned: {
      html: (n) => generic(n, void 0, licon.InfoCircle, [
        h("span", [h("strong", "Someone you reported was banned")]),
        h("span", i18n.site.thankYou)
      ]),
      text: (_) => "Someone you reported was banned"
    },
    gameEnd: {
      html: (n) => {
        let result;
        switch (n.content.win) {
          case true:
            result = i18n.site.congratsYouWon;
            break;
          case false:
            result = i18n.site.defeat;
            break;
          default:
            result = i18n.site.draw;
        }
        return generic(n, "/" + n.content.id, licon.PaperAirplane, [
          h("span", [h("strong", i18n.site.gameVsX(userFullName(n.content.opponent))), drawTime(n)]),
          h("span", result)
        ]);
      },
      text: (n) => {
        let result;
        switch (n.content.win) {
          case true:
            result = i18n.site.victory;
            break;
          case false:
            result = i18n.site.defeat;
            break;
          default:
            result = i18n.site.draw;
        }
        return i18n.site.resVsX(result, userFullName(n.content.opponent));
      }
    },
    planStart: {
      html: (n) => generic(n, "/patron", licon.Wings, [
        h("span", [h("strong", "You just became a lichess Patron."), drawTime(n)])
      ]),
      text: (_) => "You just became a lichess Patron."
    },
    planExpire: {
      html: (n) => generic(n, "/patron", licon.Wings, [h("span", [h("strong", "Patron account expired"), drawTime(n)])]),
      text: (_) => "Patron account expired"
    },
    ratingRefund: {
      html: (n) => generic(n, "/faq#rating-refund", licon.InfoCircle, [
        h("span", [h("strong", i18n.site.lostAgainstTOSViolator), drawTime(n)]),
        h("span", i18n.site.refundXpointsTimeControlY(n.content.points, n.content.perf))
      ]),
      text: (n) => i18n.site.refundXpointsTimeControlY(n.content.points, n.content.perf)
    },
    corresAlarm: {
      html: (n) => generic(n, "/" + n.content.id, licon.PaperAirplane, [
        h("span", [h("strong", i18n.site.timeAlmostUp), drawTime(n)]),
        // not a `LightUser`, could be a game against Stockfish
        h("span", i18n.site.gameVsX(n.content.op))
      ]),
      text: (_) => i18n.site.timeAlmostUp
    },
    irwinDone: jobDone("Irwin"),
    kaladinDone: jobDone("Kaladin"),
    recap: {
      html: (n) => {
        var _a, _b, _c;
        site.asset.loadI18n("recap");
        const title = ((_b = (_a = i18n.recap) == null ? void 0 : _a.recapReady) == null ? void 0 : _b.call(_a, n.content.year)) || `Your ${n.content.year} recap is ready!`;
        const text2 = ((_c = i18n.recap) == null ? void 0 : _c.awaitQuestion) || "What have you been up to this year?";
        return generic(n, "/recap", licon.Logo, [h("span", h("strong", title)), h("span", text2)]);
      },
      text: (n) => {
        var _a, _b;
        site.asset.loadI18n("recap");
        return ((_b = (_a = i18n.recap) == null ? void 0 : _a.recapReady) == null ? void 0 : _b.call(_a, n.content.year)) || `Your ${n.content.year} recap is ready!`;
      }
    }
  };
}
var jobDone = (name) => ({
  html: (n) => generic(n, "/@/" + n.content.user.name + "?mod", licon.Agent, [
    h("span", [h("strong", userFullName(n.content.user)), drawTime(n)]),
    h("span", `${name} job complete!`)
  ]),
  text: (n) => `${n.content.user.name}: ${name} job complete!`
});
function generic(n, url2, licon2, content) {
  return h(
    url2 ? "a" : "span",
    {
      class: { site_notification: true, [n.type]: true, new: !n.read },
      attrs: { key: n.date, ...url2 ? { href: url2 } : {} }
    },
    [icon(licon2)(), h("span.content", content)]
  );
}
function drawTime(n) {
  const date = new Date(n.date);
  return h("time.timeago", { attrs: { title: date.toLocaleString(), datetime: n.date } }, timeago(date));
}
function userFullName(u) {
  if (!u) return "Anonymous";
  return u.title ? u.title + " " + u.name : u.name;
}

// ../notify/src/view.ts
var renderers = makeRenderers();
function view(ctrl) {
  const d = ctrl.data();
  return hl(
    "div#notify-app.links.dropdown",
    d && !ctrl.initiating() ? renderContent(ctrl, d) : [hl("div.initiating", spinnerVdom())]
  );
}
function renderContent(ctrl, d) {
  const pager = d.pager;
  const nb = pager.currentPageResults.length;
  return [
    hl("div.pager.prev", {
      attrs: dataIcon(licon.UpTriangle),
      class: { disabled: !pager.previousPage },
      hook: clickHook(ctrl.previousPage)
    }),
    hl("a.settings.button.button-empty", {
      attrs: {
        href: "/account/preferences/notification",
        "data-icon": licon.Gear,
        title: "Notification Settings"
      }
    }),
    nb === 0 ? empty() : [
      hl("button.delete.button.button-empty", {
        attrs: { "data-icon": licon.Trash, title: "Clear" },
        hook: clickHook(ctrl.clear)
      }),
      recentNotifications(d, ctrl.scrolling())
    ],
    pager.nextPage && hl("div.pager.next", { attrs: dataIcon(licon.DownTriangle), hook: clickHook(ctrl.nextPage) }),
    !("Notification" in window) ? hl("div.browser-notification", "Browser does not support notification popups") : Notification.permission === "denied" && notificationDenied()
  ];
}
function notificationDenied() {
  return hl(
    "a.browser-notification.denied",
    { attrs: { href: "/faq#browser-notifications", target: "_blank" } },
    "Notification popups disabled by browser setting"
  );
}
function asHtml(n) {
  return renderers[n.type] ? renderers[n.type].html(n) : void 0;
}
function clickHook(f) {
  return onInsert((el) => {
    el.addEventListener("click", f);
  });
}
var contentLoaded = (vnode) => pubsub.emit("content-loaded", vnode.elm);
function recentNotifications(d, scrolling) {
  return hl(
    "div",
    {
      class: { notifications: true, scrolling },
      hook: { insert: contentLoaded, postpatch: contentLoaded }
    },
    d.pager.currentPageResults.map(asHtml)
  );
}
function empty() {
  return hl("div.empty.text", { attrs: dataIcon(licon.InfoCircle) }, "No notifications.");
}

// ../notify/src/notify.ts
var patch = init([classModule, attributesModule]);
function initModule(opts) {
  function redraw() {
    vnode = patch(vnode, view(ctrl));
  }
  function update(data) {
    "pager" in data ? ctrl.update(data) : ctrl.bumpUnread();
  }
  const ctrl = makeCtrl(opts, redraw);
  let vnode = patch(opts.el, view(ctrl));
  if (opts.data) update(opts.data);
  else ctrl.loadPage(1);
  return {
    update,
    onShow: ctrl.onShow,
    setMsgRead: ctrl.setMsgRead,
    setAllRead: ctrl.setAllRead,
    redraw
  };
}
export {
  initModule
};
//# sourceMappingURL=notify.4KUGJG37.js.map

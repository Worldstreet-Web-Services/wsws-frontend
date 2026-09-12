import {
  fullName,
  userLine,
  userLink,
  userLinkData
} from "./lib.RU54GHQA.js";
import {
  timeago
} from "./lib.EJQKEWZT.js";
import {
  alert,
  confirm,
  icon,
  makeLinkPopups,
  spinnerVdom
} from "./lib.LY6FZSW3.js";
import "./lib.KC3NJ77S.js";
import "./lib.NNS7OYZ5.js";
import "./lib.LYPETE66.js";
import "./lib.ILS4LNPZ.js";
import "./lib.GSUEVEQG.js";
import "./lib.JUCKJNFH.js";
import "./lib.PM233RJM.js";
import "./lib.23HTWUBN.js";
import "./lib.GOC3UD5K.js";
import {
  bind,
  bindSubmit,
  dataIcon,
  hookMobileMousedown,
  onInsert,
  testId
} from "./lib.WVJXH4CQ.js";
import {
  attributesModule,
  classModule,
  h,
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
  storage,
  throttle
} from "./lib.AXX3QIAX.js";
import {
  blurIfEscape,
  blurOnEscape,
  escapeHtml,
  expandMentions,
  isMoreThanText,
  linkRegex,
  linkReplace,
  newLineRegex
} from "./lib.GK2I5IFJ.js";
import "./lib.KO2KTNGK.js";

// ../msg/src/network.ts
async function loadConvo(userId) {
  const d = await json(`/inbox/${userId}`);
  return upgradeData(d);
}
async function getMore(userId, before) {
  const d = await json(`/inbox/${userId}?before=${before.getTime()}`);
  return upgradeData(d);
}
async function loadContacts() {
  const d = await json(`/inbox`);
  return upgradeData(d);
}
async function loadMoreContacts(before) {
  const d = await json(`/inbox?before=${before.getTime()}`);
  return d.contacts.map(upgradeContact);
}
async function search(q) {
  const res = await json(`/inbox/search?q=${q}`);
  return {
    ...res,
    contacts: res.contacts.map(upgradeContact)
  };
}
function block(u) {
  return json(`/api/rel/block/${u}?mini=1`, { method: "post" });
}
function unblock(u) {
  return json(`/api/rel/unblock/${u}?mini=1`, { method: "post" });
}
async function del(u) {
  const d = await json(`/inbox/${u}`, { method: "delete" });
  return upgradeData(d);
}
function post(dest, text) {
  pubsub.emit("socket.send", "msgSend", { dest, text });
}
function setRead(dest) {
  pubsub.emit("socket.send", "msgRead", dest);
}
function typing(dest) {
  pubsub.emit("socket.send", "msgType", dest);
}
function websocketHandler(ctrl) {
  pubsub.on("socket.in.msgNew", (msg) => {
    ctrl.receive({
      ...upgradeMsg(msg),
      read: false
    });
  });
  pubsub.on("socket.in.msgType", ctrl.receiveTyping);
  pubsub.on("socket.in.blockedBy", ctrl.changeBlockBy);
  pubsub.on("socket.in.unblockedBy", ctrl.changeBlockBy);
  let connected = true;
  pubsub.on("socket.close", () => {
    connected = false;
    ctrl.redraw();
  });
  pubsub.on("socket.open", () => {
    if (!connected) {
      connected = true;
      ctrl.onReconnect();
    }
  });
  return () => connected;
}
function upgradeData(d) {
  return {
    ...d,
    convo: d.convo && upgradeConvo(d.convo),
    contacts: d.contacts.map(upgradeContact)
  };
}
function upgradeMsg(m) {
  return {
    ...m,
    date: new Date(m.date)
  };
}
function upgradeUser(u) {
  return {
    ...u,
    id: u.name.toLowerCase()
  };
}
function upgradeContact(c) {
  return {
    ...c,
    user: upgradeUser(c.user),
    lastMsg: upgradeMsg(c.lastMsg)
  };
}
function upgradeConvo(c) {
  return {
    ...c,
    user: upgradeUser(c.user),
    msgs: c.msgs.map(upgradeMsg)
  };
}

// ../msg/src/view/scroller.ts
var Scroller = class {
  constructor() {
    this.enabled = false;
    this.init = (e) => {
      this.enabled = true;
      this.element = e;
      this.element.addEventListener(
        "scroll",
        throttle(500, (_) => {
          const el = this.element;
          this.enable(!!el && el.offsetHeight + el.scrollTop > el.scrollHeight - 20);
        }),
        { passive: true }
      );
    };
    this.auto = () => {
      if (this.element && this.enabled) requestAnimationFrame(() => this.element.scrollTop = 9999999);
    };
    this.enable = (v) => {
      this.enabled = v;
    };
    this.setMarker = () => {
      var _a;
      this.marker = (_a = this.element) == null ? void 0 : _a.querySelector("mine,their");
    };
    this.toMarker = () => {
      if (this.marker && this.to(this.marker)) {
        this.marker = void 0;
        return true;
      }
      return false;
    };
    this.to = (target) => {
      if (this.element) {
        const top = target.offsetTop - this.element.offsetHeight / 2 + target.offsetHeight / 2;
        if (top > 0) this.element.scrollTop = top;
        return top > 0;
      }
      return false;
    };
  }
};
var scroller = new Scroller();

// ../msg/src/ctrl.ts
var MsgCtrl = class {
  constructor(data, redraw) {
    this.redraw = redraw;
    this.search = {
      input: ""
    };
    this.loading = false;
    this.loadingContacts = false;
    this.connected = () => true;
    this.msgsPerPage = 100;
    this.canGetMoreContacts = true;
    this.openConvo = (userId) => {
      var _a;
      if (((_a = this.data.convo) == null ? void 0 : _a.user.id) !== userId) {
        this.data.convo = void 0;
        this.loading = true;
      }
      loadConvo(userId).then((data) => {
        const existingIds = new Set(this.data.contacts.map((c) => c.user.id));
        this.data = {
          ...data,
          contacts: this.data.contacts.concat(data.contacts.filter((c) => !existingIds.has(c.user.id)))
        };
        this.search.result = void 0;
        this.loading = false;
        if (data.convo) {
          history.replaceState({ contact: userId }, "", `/inbox/${data.convo.user.name}`);
          this.onLoadConvo(data.convo);
          this.redraw();
        } else this.showSide();
      });
      this.pane = "convo";
      this.redraw();
    };
    this.showSide = () => {
      this.pane = "side";
      this.redraw();
    };
    this.getMore = () => {
      if (this.data.convo && this.canGetMoreSince)
        getMore(this.data.convo.user.id, this.canGetMoreSince).then((data) => {
          if (!this.data.convo || !data.convo || data.convo.user.id !== this.data.convo.user.id || !data.convo.msgs[0])
            return;
          if (data.convo.msgs[0].date >= this.data.convo.msgs[this.data.convo.msgs.length - 1].date) return;
          this.data.convo.msgs = this.data.convo.msgs.concat(data.convo.msgs);
          this.onLoadMsgs(data.convo.msgs);
          this.redraw();
        });
      this.canGetMoreSince = void 0;
      this.redraw();
    };
    this.onLoadConvo = (convo) => {
      this.textStore = storage.make(`msg:area:${convo.user.id}`);
      this.onLoadMsgs(convo.msgs);
      if (this.typing) {
        clearTimeout(this.typing.timeout);
        this.typing = void 0;
      }
      setTimeout(this.setRead, 500);
    };
    this.onLoadMsgs = (msgs) => {
      const oldFirstMsg = msgs[this.msgsPerPage - 1];
      this.canGetMoreSince = oldFirstMsg == null ? void 0 : oldFirstMsg.date;
    };
    this.post = (text) => {
      if (this.data.convo) {
        post(this.data.convo.user.id, text);
        const msg = {
          text,
          user: this.data.me.id,
          date: /* @__PURE__ */ new Date(),
          read: true
        };
        this.data.convo.msgs.unshift(msg);
        const contact = this.currentContact();
        if (contact) this.addMsg(msg, contact);
        else
          setTimeout(
            () => loadContacts().then((data) => {
              this.data.contacts = data.contacts;
              this.redraw();
            }),
            1e3
          );
        scroller.enable(true);
        this.redraw();
      }
    };
    this.receive = (msg) => {
      var _a;
      const contact = this.findContact(msg.user);
      this.addMsg(msg, contact);
      if (contact) {
        let redrawn = false;
        if (msg.user === ((_a = this.data.convo) == null ? void 0 : _a.user.id)) {
          this.data.convo.msgs.unshift(msg);
          if (document.hasFocus()) redrawn = this.setRead();
          this.receiveTyping(msg.user, true);
        }
        if (!redrawn) this.redraw();
      } else
        loadContacts().then((data) => {
          this.data.contacts = data.contacts;
          this.redraw();
        });
    };
    this.addMsg = (msg, contact) => {
      if (contact) {
        contact.lastMsg = msg;
        this.data.contacts = [contact].concat(this.data.contacts.filter((c) => c.user.id !== contact.user.id));
      }
    };
    this.findContact = (userId) => this.data.contacts.find((c) => c.user.id === userId);
    this.currentContact = () => this.data.convo && this.findContact(this.data.convo.user.id);
    this.searchInput = (q) => {
      this.search.input = q;
      if (q.length > 2)
        search(q).then((res) => {
          this.search.result = this.search.input[1] ? res : void 0;
          this.redraw();
        });
      else {
        this.search.result = void 0;
        this.redraw();
      }
    };
    this.loadMoreContacts = () => {
      if (this.loadingContacts || !this.canGetMoreContacts) return;
      const lastContact = this.data.contacts[this.data.contacts.length - 1];
      if (!lastContact) return;
      this.loadingContacts = true;
      this.redraw();
      loadMoreContacts(lastContact.lastMsg.date).then((contacts) => {
        if (contacts.length === 0) {
          this.canGetMoreContacts = false;
        } else {
          this.data.contacts = this.data.contacts.concat(contacts);
        }
        this.loadingContacts = false;
        this.redraw();
      });
    };
    this.setRead = () => {
      var _a;
      const msg = (_a = this.currentContact()) == null ? void 0 : _a.lastMsg;
      if (msg && msg.user !== this.data.me.id) {
        pubsub.emit("notify-app.set-read", msg.user);
        if (msg.read) return false;
        msg.read = true;
        setRead(msg.user);
        this.redraw();
        return true;
      }
      return false;
    };
    this.delete = () => {
      var _a;
      const userId = (_a = this.data.convo) == null ? void 0 : _a.user.id;
      if (userId)
        del(userId).then((data) => {
          this.data.convo = data.convo;
          this.data.contacts = this.data.contacts.filter((c) => c.user.id !== userId);
          this.redraw();
          history.replaceState({}, "", "/inbox");
        });
    };
    this.block = () => {
      var _a;
      const userId = (_a = this.data.convo) == null ? void 0 : _a.user.id;
      if (userId) block(userId).then(() => this.openConvo(userId));
    };
    this.unblock = () => {
      var _a;
      const userId = (_a = this.data.convo) == null ? void 0 : _a.user.id;
      if (userId) unblock(userId).then(() => this.openConvo(userId));
    };
    this.changeBlockBy = (userId) => {
      var _a;
      if (userId === ((_a = this.data.convo) == null ? void 0 : _a.user.id)) this.openConvo(userId);
    };
    this.sendTyping = throttle(3e3, (user) => {
      var _a;
      if ((_a = this.textStore) == null ? void 0 : _a.get()) typing(user);
    });
    this.receiveTyping = (userId, cancel) => {
      var _a;
      if (this.typing) {
        clearTimeout(this.typing.timeout);
        this.typing = void 0;
      }
      if (cancel !== true && ((_a = this.data.convo) == null ? void 0 : _a.user.id) === userId) {
        this.typing = {
          user: userId,
          timeout: setTimeout(() => {
            var _a2;
            if (((_a2 = this.data.convo) == null ? void 0 : _a2.user.id) === userId) this.typing = void 0;
            this.redraw();
          }, 3e3)
        };
      }
      this.redraw();
    };
    this.onReconnect = () => {
      this.data.convo && this.openConvo(this.data.convo.user.id);
      this.redraw();
    };
    this.data = data;
    this.pane = data.convo ? "convo" : "side";
    this.connected = websocketHandler(this);
    if (this.data.convo) this.onLoadConvo(this.data.convo);
    window.addEventListener("focus", this.setRead);
  }
};

// ../msg/src/view/contact.ts
function renderContact(ctrl, contact, active) {
  const user = contact.user, msg = contact.lastMsg, isNew = !msg.read && msg.user !== ctrl.data.me.id;
  return h(
    "div.msg-app__side__contact",
    {
      key: user.id,
      class: { active: active === user.id },
      hook: hookMobileMousedown(() => ctrl.openConvo(user.id))
    },
    [
      userIcon(user, "msg-app__side__contact__icon"),
      h("div.msg-app__side__contact__user", [
        h("div.msg-app__side__contact__head", [
          h("div.msg-app__side__contact__name", contactName(user, ctrl)),
          h("div.msg-app__side__contact__date", renderDate(msg))
        ]),
        h("div.msg-app__side__contact__body", [
          h(
            "div.msg-app__side__contact__msg",
            { class: { "msg-app__side__contact__msg--new": isNew } },
            msg.text
          ),
          isNew ? icon(licon.BellOutline)(".msg-app__side__contact__new") : null
        ])
      ])
    ]
  );
}
var contactName = (user, ctrl) => ctrl.data.names[user.id] ? [ctrl.data.names[user.id]] : fullName(user);
var userIcon = (user, cls) => h("div.user-link." + cls, { class: { online: user.online } }, userLine(user));
var renderDate = (msg) => h(
  "time.timeago",
  { key: msg.date.getTime(), attrs: { title: msg.date.toLocaleString(), datetime: msg.date.getTime() } },
  timeago(msg.date)
);

// ../msg/src/view/actions.ts
function renderActions(ctrl, convo) {
  if (convo.user.id === "lichess") return [];
  const nodes = [];
  const cls = "msg-app__convo__action.button.button-empty";
  nodes.push(
    h(`a.${cls}.play`, {
      key: "play",
      attrs: {
        "data-icon": licon.Swords,
        href: `/?user=${convo.user.name}#friend`,
        title: i18n.challenge.challengeToPlay
      }
    }),
    h("div.msg-app__convo__action__sep", "|")
  );
  if (convo.relations.out === false)
    nodes.push(
      h(`button.${cls}.text.hover-text`, {
        key: "unblock",
        attrs: {
          "data-icon": licon.NotAllowed,
          title: i18n.site.blocked,
          type: "button",
          "data-hover-text": i18n.site.unblock
        },
        hook: bind("click", ctrl.unblock)
      })
    );
  else
    nodes.push(
      h(`button.${cls}.bad`, {
        key: "block",
        attrs: {
          "data-icon": licon.NotAllowed,
          type: "button",
          title: i18n.site.block
        },
        hook: bind("click", withConfirm(ctrl.block))
      })
    );
  nodes.push(
    h(`button.${cls}.bad`, {
      key: "delete",
      attrs: { "data-icon": licon.Trash, type: "button", title: i18n.site.delete },
      hook: bind("click", withConfirm(ctrl.delete))
    }),
    h(`a.${cls}.bad`, {
      key: "report",
      attrs: {
        href: "/report/inbox/" + convo.user.name,
        "data-icon": licon.CautionTriangle,
        title: i18n.site.reportXToModerators(convo.user.name)
      }
    })
  );
  return nodes;
}
var withConfirm = (f) => (e) => {
  confirm(`${e.target.getAttribute("title") || "Confirm"}?`).then((yes) => yes && f());
};

// ../msg/src/view/interact.ts
function renderInteract(ctrl, user) {
  const connected = ctrl.connected();
  return h(
    "form.msg-app__convo__post",
    {
      hook: bindSubmit((e) => {
        const area = e.target.querySelector("textarea");
        if (area) {
          area.dispatchEvent(new Event("send"));
          area.focus();
        }
      })
    },
    [
      renderTextarea(ctrl, user),
      h("button.msg-app__convo__post__submit.button", {
        class: { "button-green": connected, disabled: !connected },
        attrs: {
          type: "submit",
          "data-icon": licon.PlayTriangle,
          disabled: !connected,
          ...testId("msg-send-button")
        }
      })
    ]
  );
}
function renderTextarea(ctrl, user) {
  return h("textarea.msg-app__convo__post__text", {
    attrs: { rows: 1, enterkeyhint: "send", ...testId("msg-textarea") },
    hook: onInsert((el) => setupTextarea(el, user.id, ctrl))
  });
}
function setupTextarea(area, contact, ctrl) {
  const storage2 = ctrl.textStore;
  let prev = 0;
  function send() {
    const now = Date.now();
    if (prev > now - 1e3 || !ctrl.connected()) return;
    prev = now;
    const txt = area.value;
    if (txt.length > 8e3) {
      alert("The message is too long.");
      return;
    }
    if (txt) ctrl.post(txt);
    area.value = "";
    area.dispatchEvent(new Event("input"));
    storage2.remove();
  }
  area.value = "";
  const baseScrollHeight = area.scrollHeight;
  area.addEventListener(
    "input",
    throttle(500, () => {
      const text = area.value;
      area.rows = 1;
      if (text) area.rows = Math.min(10, 1 + Math.ceil((area.scrollHeight - baseScrollHeight) / 19));
      storage2.set(text);
      ctrl.sendTyping(contact);
    })
  );
  area.value = storage2.get() || "";
  if (area.value) area.dispatchEvent(new Event("input"));
  area.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      setTimeout(send);
    } else blurIfEscape(e);
  });
  area.addEventListener("send", send);
  if (!("ontouchstart" in window)) area.focus();
}

// ../msg/src/view/enhance.ts
var imgurRegex = /https?:\/\/(?:i\.)?imgur\.com\/(?!gallery\b)(\w{7})(?:\.jpe?g|\.png|\.gif)?/;
var giphyRegex = /https:\/\/(?:media\.giphy\.com\/media\/|giphy\.com\/gifs\/(?:\w+-)*)(\w+)(?:\/giphy\.gif)?/;
var img = (src) => `<img src="${src}" alt="${src}"/>`;
var aImg = (src) => linkReplace(src, img(src));
var expandImgur = (url) => imgurRegex.test(url) ? url.replace(imgurRegex, (_, id) => aImg(`https://i.imgur.com/${id}.jpg`)) : void 0;
var expandGiphy = (url) => giphyRegex.test(url) ? url.replace(giphyRegex, (_, id) => aImg(`https://media.giphy.com/media/${id}/giphy.gif`)) : void 0;
var expandImage = (url) => /\.(jpg|jpeg|png|gif)$/.test(url) ? aImg(url) : void 0;
var expandLink = (url) => linkReplace(url, url.replace(/^https?:\/\//, ""));
var expandUrl = (url) => expandImgur(url) || expandGiphy(url) || expandImage(url) || expandLink(url);
var expandUrls = (html) => html.replace(linkRegex, (_, space, url) => `${space}${expandUrl(url)}`);
var expandGameIds = (html) => html.replace(
  /(\s#)([\w]{8})($|[^\w-])/g,
  (_, bulkStart, id, suffix) => " " + linkReplace("/" + id, "#" + id, !bulkStart) + suffix
);
var enhance = (str) => expandGameIds(expandMentions(expandUrls(escapeHtml(str)))).replace(newLineRegex, "<br>");
var domain = window.location.host;
var gameRegex = new RegExp(
  `(?:https?://)${domain}/(?:embed/)?(?:game/)?(\\w{8})(?:(?:/(white|black))|\\w{4}|)(?:(?:#)(\\d+))?$`
);
var notGames = /* @__PURE__ */ new Set([
  "training",
  "analysis",
  "insights",
  "practice",
  "features",
  "password",
  "streamer",
  "timeline"
]);
function expandLpvs(el) {
  const expandables = [];
  el.querySelectorAll("a:not(.text)").forEach((a) => {
    const link = parseLink(a);
    if (link)
      expandables.push({
        element: a,
        link
      });
  });
  expandGames(expandables);
}
function expandGames(games) {
  if (games.length < 3) games.forEach(expandGame);
  else
    games.forEach((game) => {
      game.element.title = "Click to expand";
      game.element.classList.add("text");
      game.element.setAttribute("data-icon", licon.Expand);
      game.element.addEventListener("click", (e) => {
        if (e.button === 0) {
          e.preventDefault();
          expandGame(game);
        }
      });
    });
}
var expandGame = async (exp) => {
  var _a;
  const $lpv = $("<div>");
  const wrapper = (_a = exp.element.parentElement) == null ? void 0 : _a.parentElement;
  if (!wrapper) return;
  const backup = wrapper.cloneNode(true);
  wrapper.classList.add("has-embed");
  $(exp.element).replaceWith($("<div>").prepend($lpv));
  try {
    await site.asset.loadEsm("bits.lpv", {
      init: { el: $lpv[0], url: exp.link.src, lpvOpts: exp.link.opts }
    });
  } catch (_) {
    $(wrapper).replaceWith(backup);
  }
  scroller.auto();
};
function parseLink(a) {
  const [id, orientation, initialPly] = Array.from(a.href.match(gameRegex) || []).slice(1);
  if (id && !notGames.has(id))
    return {
      type: "game",
      src: `/embed/game/${id}`,
      opts: {
        orientation,
        initialPly
      }
    };
  return void 0;
}

// ../msg/src/view/msgs.ts
function renderMsgs(ctrl, convo) {
  return h("div.msg-app__convo__msgs", { hook: { insert: setupMsgs(true), postpatch: setupMsgs(false) } }, [
    h("div.msg-app__convo__msgs__init"),
    h("div.msg-app__convo__msgs__content", [
      ctrl.canGetMoreSince ? h(
        "button.msg-app__convo__msgs__more.button.button-empty",
        {
          key: "more",
          attrs: { type: "button" },
          hook: bind("click", (_) => {
            scroller.setMarker();
            ctrl.getMore();
          })
        },
        "Load more"
      ) : null,
      ...contentMsgs(ctrl, convo.msgs),
      h("div.msg-app__convo__msgs__typing", ctrl.typing ? `${convo.user.name} is typing...` : null)
    ])
  ]);
}
function contentMsgs(ctrl, msgs) {
  const dailies = groupMsgs(msgs);
  const nodes = [];
  dailies.forEach((daily) => nodes.push(...renderDaily(ctrl, daily)));
  return nodes;
}
function renderDaily(ctrl, daily) {
  return [
    h("day", renderDate2(daily.date)),
    ...daily.msgs.map(
      (group) => h(
        "group",
        group.map((msg) => renderMsg(ctrl, msg))
      )
    )
  ];
}
function renderMsg(ctrl, msg) {
  const tag = msg.user === ctrl.data.me.id ? "mine" : "their";
  return h(tag, [renderText(msg), h("em", `${pad2(msg.date.getHours())}:${pad2(msg.date.getMinutes())}`)]);
}
var pad2 = (num) => (num < 10 ? "0" : "") + num;
function groupMsgs(msgs) {
  let prev = msgs[0];
  if (!prev) return [{ date: /* @__PURE__ */ new Date(), msgs: [] }];
  const dailies = [{ date: prev.date, msgs: [[prev]] }];
  msgs.slice(1).forEach((msg) => {
    if (sameDay(msg.date, prev.date)) {
      if (msg.user === prev.user) dailies[0].msgs[0].unshift(msg);
      else dailies[0].msgs.unshift([msg]);
    } else dailies.unshift({ date: msg.date, msgs: [[msg]] });
    prev = msg;
  });
  return dailies;
}
var today = /* @__PURE__ */ new Date();
var yesterday = /* @__PURE__ */ new Date();
yesterday.setDate(yesterday.getDate() - 1);
function renderDate2(date) {
  if (sameDay(date, today)) return i18n.site.today.toUpperCase();
  if (sameDay(date, yesterday)) return i18n.site.yesterday.toUpperCase();
  return renderFullDate(date);
}
var renderFullDate = (date) => {
  const options = { year: "numeric", month: "numeric", day: "numeric" };
  return date.toLocaleDateString(void 0, options);
};
var sameDay = (d, e) => d.getDate() === e.getDate() && d.getMonth() === e.getMonth() && d.getFullYear() === e.getFullYear();
var renderText = (msg) => isMoreThanText(msg.text) ? h("t", {
  hook: {
    create(_, vnode) {
      const el = vnode.elm;
      el.innerHTML = enhance(msg.text);
      el.querySelectorAll("img").forEach(
        (c) => c.addEventListener("load", scroller.auto, { once: true })
      );
      $("form.unsub", el).on("submit", function() {
        teamUnsub(this);
        return false;
      });
    }
  }
}) : h("t", msg.text);
var setupMsgs = (insert) => (vnode) => {
  const el = vnode.elm;
  if (insert) scroller.init(el);
  expandLpvs(el);
  makeLinkPopups(el, 'their a[href^="http"]');
  scroller.toMarker() || scroller.auto();
};
var teamUnsub = async (form2) => {
  if (await confirm("Unsubscribe?"))
    json(form2.action, {
      method: "post",
      body: form({ subscribe: false })
    }).then(() => alert("Done!"));
};

// ../msg/src/view/convo.ts
function renderConvo(ctrl, convo) {
  var _a, _b;
  const user = convo.user;
  return h("div.msg-app__convo", { key: user.id }, [
    h("div.msg-app__convo__head", [
      h("div.msg-app__convo__head__left", [
        h("span.msg-app__convo__head__back", {
          attrs: dataIcon(licon.LessThan),
          hook: hookMobileMousedown(ctrl.showSide)
        }),
        contactLink(user, ctrl),
        ((_a = convo.modDetails) == null ? void 0 : _a.kid) ? h("bad", "KID") : void 0,
        ((_b = convo.modDetails) == null ? void 0 : _b.openInbox) === false ? h("bad", "doesn't want messages") : void 0
      ]),
      h("div.msg-app__convo__head__actions", renderActions(ctrl, convo))
    ]),
    renderMsgs(ctrl, convo),
    h("div.msg-app__convo__reply", [
      convo.relations.out === false || convo.relations.in === false ? blocked("This conversation is blocked.") : ctrl.data.me.bot ? blocked("Bot accounts cannot send nor receive messages.") : convo.postable ? renderInteract(ctrl, user) : blocked(`${user.name} doesn't accept new messages.`)
    ])
  ]);
}
var contactLink = (user, ctrl) => {
  const realName = ctrl.data.names[user.id];
  return realName ? h("a", userLinkData(user), [userLine(user), realName]) : userLink({ ...user, moderator: user.id === "lichess" });
};
var blocked = (msg) => h("div.msg-app__convo__reply__block.text", { attrs: dataIcon(licon.NotAllowed) }, msg);

// ../msg/src/view/search.ts
var renderInput = (ctrl) => h("div.msg-app__side__search", [
  h("input", {
    attrs: { value: "", placeholder: i18n.site.searchOrStartNewDiscussion },
    hook: onInsert((input) => {
      input.addEventListener(
        "input",
        throttle(500, () => ctrl.searchInput(input.value.trim()))
      );
      blurOnEscape(input);
      input.addEventListener(
        "blur",
        () => setTimeout(() => {
          input.value = "";
          ctrl.searchInput("");
        }, 500)
      );
    })
  })
]);
function renderResults(ctrl, res) {
  return h("div.msg-app__search.msg-app__side__content", [
    res.contacts[0] && h("section", [
      h("h2", i18n.site.discussions),
      h(
        "div.msg-app__search__contacts",
        res.contacts.map((t) => renderContact(ctrl, t))
      )
    ]),
    res.friends[0] && h("section", [
      h("h2", i18n.site.friends),
      h(
        "div.msg-app__search__users",
        res.friends.map((u) => renderUser(ctrl, u))
      )
    ]),
    res.users[0] && h("section", [
      h("h2", i18n.site.players),
      h(
        "div.msg-app__search__users",
        res.users.map((u) => renderUser(ctrl, u))
      )
    ])
  ]);
}
function renderUser(ctrl, user) {
  return h(
    "div.msg-app__side__contact",
    { key: user.id, hook: hookMobileMousedown(() => ctrl.openConvo(user.id)) },
    [
      userIcon(user, "msg-app__side__contact__icon"),
      h("div.msg-app__side__contact__user", [
        h("div.msg-app__side__contact__head", [h("div.msg-app__side__contact__name", fullName(user))])
      ])
    ]
  );
}

// ../msg/src/view/main.ts
function main_default(ctrl) {
  var _a;
  const activeId = (_a = ctrl.data.convo) == null ? void 0 : _a.user.id;
  return h("main.box.msg-app", { class: { [`pane-${ctrl.pane}`]: true } }, [
    h("div.msg-app__side", [
      renderInput(ctrl),
      ctrl.search.result ? renderResults(ctrl, ctrl.search.result) : h(
        "div.msg-app__contacts.msg-app__side__content",
        {
          hook: onInsert((el) => {
            el.addEventListener("scroll", () => {
              if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
                ctrl.loadMoreContacts();
              }
            });
          })
        },
        [
          ...ctrl.data.contacts.map((t) => renderContact(ctrl, t, activeId)),
          ctrl.loadingContacts ? h("div.msg-app__contacts__loading", spinnerVdom()) : null
        ]
      )
    ]),
    ctrl.data.convo ? renderConvo(ctrl, ctrl.data.convo) : ctrl.loading ? h("div.msg-app__convo", { key: ":" }, [h("div.msg-app__convo__head"), spinnerVdom()]) : ""
  ]);
}

// ../msg/src/msg.ts
function initModule(opts) {
  const element = document.querySelector(".msg-app"), patch = init([classModule, attributesModule]), appHeight = () => document.body.style.setProperty("---app-height", `${window.innerHeight}px`);
  window.addEventListener("resize", appHeight);
  appHeight();
  const ctrl = new MsgCtrl(upgradeData(opts.data), redraw);
  const blueprint = main_default(ctrl);
  element.innerHTML = "";
  let vnode = patch(element, blueprint);
  function redraw() {
    vnode = patch(vnode, main_default(ctrl));
  }
  redraw();
}
export {
  initModule
};
//# sourceMappingURL=msg.ELK4L7BX.js.map

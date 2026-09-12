import {
  asset_exports,
  jsModule,
  loadCssPath,
  loadEsm,
  url
} from "./lib.D3WZBGDC.js";
import {
  api
} from "./lib.2PZT4GMW.js";
import {
  watchers
} from "./lib.MG4T3NDN.js";
import {
  dispatchChessgroundResize
} from "./lib.3NURFI3P.js";
import "./lib.TSMVECCD.js";
import {
  speakable
} from "./lib.JAWNVB2A.js";
import {
  userComplete
} from "./lib.FNBK74W3.js";
import {
  commonDateFormat,
  displayLocale,
  formatAgo,
  timeago,
  toDate
} from "./lib.EJQKEWZT.js";
import "./lib.3VFZRSDR.js";
import {
  alert,
  confirm,
  domDialog,
  finishMiniGame,
  initMiniBoards,
  initMiniGames,
  spinnerHtml,
  toggleBoxInit,
  updateMiniGame
} from "./lib.LY6FZSW3.js";
import "./lib.KC3NJ77S.js";
import {
  clamp,
  isEquivalent,
  randomToken
} from "./lib.NNS7OYZ5.js";
import "./lib.LYPETE66.js";
import "./lib.ILS4LNPZ.js";
import "./lib.GSUEVEQG.js";
import "./lib.JUCKJNFH.js";
import "./lib.PM233RJM.js";
import "./lib.23HTWUBN.js";
import {
  eventuallySetupDefaultConnection,
  log,
  wsDestroy,
  wsSend
} from "./lib.GOC3UD5K.js";
import {
  isIos,
  isSafari,
  isTouchDevice,
  isWebkit,
  prefersLightThemeQuery
} from "./lib.WVJXH4CQ.js";
import "./lib.2L7Z4FRN.js";
import {
  pubsub
} from "./lib.YID4KMSR.js";
import {
  licon
} from "./lib.2DWRH35C.js";
import {
  text,
  writeTextClipboard
} from "./lib.M3IF75DN.js";
import {
  once,
  promiseTimeout,
  storage,
  throttle
} from "./lib.AXX3QIAX.js";
import {
  blurIfEscape,
  blurIfPrimaryClick,
  defined,
  escapeHtml,
  frag,
  memoize,
  requestIdleCallbackSafe,
  scrollToInnerSelector
} from "./lib.GK2I5IFJ.js";
import "./lib.KO2KTNGK.js";

// ../site/src/announce.ts
var timeout;
var kill = () => {
  if (timeout) clearTimeout(timeout);
  timeout = void 0;
  $("#announce").remove();
};
var display = (d) => {
  kill();
  if (d.msg) {
    $("body").append(
      '<div id="announce" class="announce">' + escapeHtml(d.msg) + (d.date ? '<time class="timeago" datetime="' + d.date + '"></time>' : "") + '<div class="actions"><a class="close">\xD7</a></div></div>'
    ).find("#announce .close").on("click", kill);
    const millis = d.date ? new Date(d.date).getTime() - Date.now() : 5e3;
    if (millis > 0) timeout = setTimeout(kill, millis);
    else kill();
    if (d.date) pubsub.emit("content-loaded");
  }
};
var fromPage = () => {
  const pageAnnounce = document.body.getAttribute("data-announce");
  return pageAnnounce && JSON.parse(pageAnnounce);
};
var announcement = fromPage();
if (announcement) display(announcement);

// ../../node_modules/.pnpm/ab@https+++codeload.github.com+lichess-org+ab-stub+tar.gz+e391b56a82b7c71e7663082a797f6fc21b18776d/node_modules/ab/site.js
function init() {
}

// ../site/src/browserSupport.ts
async function loadPolyfills() {
  await Promise.all([dialogPolyfill(), resizePolyfill()]);
}
async function dialogPolyfill() {
  let registerDialog = void 0;
  try {
    if (typeof window.HTMLDialogElement === "undefined") {
      registerDialog = (await import(site.asset.url("npm/dialog-polyfill.esm.js"))).default.registerDialog;
    }
  } finally {
    pubsub.complete("polyfill.dialog", registerDialog);
  }
}
async function resizePolyfill() {
  if (typeof window.ResizeObserver === "undefined") {
    window.ResizeObserver = (await import("./lib.ZO6BOKDT.js")).ResizeObserver;
  }
}
function fixBrowserStyle() {
  if (isSafari()) {
    document.head.append(frag("<style>legend { display: contents; }</style>"));
  }
  if (isIos() && !("MSStream" in window)) {
    const el = document.querySelector("meta[name=viewport]");
    el == null ? void 0 : el.setAttribute("content", el.getAttribute("content") + ",maximum-scale=1.0");
  }
}
function upgradeNag() {
  if (isWebkit({ below: "15.4" }) && once("upgrade.nag", { days: 14 })) {
    pubsub.after("polyfill.dialog").then(() => alert("Your browser is out of date.\nLichess may not work properly."));
  }
}

// ../lib/src/menuKeyboardInteractions.ts
function menuKeyboardInteractions() {
  if ("ontouchstart" in window) return;
  const $nav = $("#topnav");
  const handleKeyDown = (ev) => {
    const $target = $(ev.target);
    const $section = $target.parent().is("section") ? $target.parent() : $target.parent().parent();
    if (ev.code === "Tab") {
      if (ev.shiftKey ? $target.is(":first-child") : $target.is(":last-child")) {
        $section.removeClass("active");
      }
    } else if (ev.code === "Space") {
      $section.toggleClass("active");
      ev.preventDefault();
      ev.stopPropagation();
    } else if (!ev.shiftKey) {
      $section.removeClass("active");
    }
  };
  const handleFocusOut = (ev) => {
    var _a;
    const focusTarget = ev.relatedTarget;
    const hasFocus = focusTarget && ($nav[0] === focusTarget || ((_a = $nav[0]) == null ? void 0 : _a.contains(focusTarget)));
    if (!hasFocus) {
      $nav.find("section.active").removeClass("active");
    }
  };
  const handleSwitchToMouse = () => {
    var _a;
    $nav.find("section.active").removeClass("active");
    (_a = document.activeElement) == null ? void 0 : _a.blur();
  };
  $nav.on("keydown", handleKeyDown).on("focusout", handleFocusOut).on("mouseover", handleSwitchToMouse);
}

// ../site/src/topBar.ts
function topBar_default() {
  var _a;
  const top = document.getElementById("top");
  const initiatingHtml = `<div class="initiating">${spinnerHtml}</div>`, isVisible = (selector) => {
    const el = document.querySelector(selector), display2 = el && window.getComputedStyle(el).display;
    return display2 && display2 !== "none";
  };
  if ("ontouchstart" in window && window.matchMedia("(min-width: 1020px)").matches)
    $("#topnav section > a").removeAttr("href");
  const blockBodyScroll = (e) => {
    if (!document.getElementById("topnav").contains(e.target)) e.preventDefault();
  };
  $("#tn-tg").on("change", (e) => {
    const menuOpen = e.target.checked;
    if (menuOpen) {
      document.body.addEventListener("touchmove", blockBodyScroll, { passive: false });
      $(e.target).addClass("opened");
    } else {
      document.body.removeEventListener("touchmove", blockBodyScroll);
      setTimeout(() => $(e.target).removeClass("opened"), 200);
    }
    document.body.classList.toggle("masked", menuOpen);
  });
  $(top).on("click", ".toggle", function(e) {
    blurIfPrimaryClick(e);
    const $p = $(this).parent().toggleClass("shown");
    $p.siblings(".shown").removeClass("shown");
    setTimeout(() => {
      const handler = (e2) => {
        var _a2;
        const target = e2.target;
        if (!target.isConnected || ((_a2 = $p[0]) == null ? void 0 : _a2.contains(target))) return;
        $p.removeClass("shown");
        $("html").off("click", handler);
      };
      $("html").on("click", handler);
    }, 10);
    return false;
  });
  {
    let instance;
    const $toggle = $("#challenge-toggle"), $countSpan = $toggle.find("span");
    $toggle.one("mouseover click", () => load());
    const load = function(data) {
      if (instance) return;
      const $el = $("#challenge-app").html(initiatingHtml);
      loadCssPath("challenge");
      instance = loadEsm("challenge", {
        init: {
          el: $el[0],
          data,
          show() {
            if (!isVisible("#challenge-app")) $toggle.trigger("click");
          },
          setCount(nb) {
            const newTitle = $countSpan.attr("title").replace(/\d+/, nb.toString());
            $countSpan.data("count", nb).attr("title", newTitle).attr("aria-label", newTitle);
          },
          pulse() {
            $toggle.addClass("pulse");
          }
        }
      });
    };
    pubsub.on("socket.in.challenges", async (data) => {
      if (!instance) load(data);
      else (await instance).update(data);
    });
    pubsub.on("challenge-app.open", () => $toggle.trigger("click"));
  }
  {
    let instance;
    const $toggle = $("#notify-toggle"), $countSpan = $toggle.find("span"), selector = "#notify-app";
    const load = (data) => {
      if (instance) return;
      const $el = $("#notify-app").html(initiatingHtml);
      loadCssPath("notify");
      instance = loadEsm("notify", {
        init: {
          el: $el.empty()[0],
          data,
          isVisible: () => isVisible(selector),
          updateUnread(nb) {
            const existing = $countSpan.data("count") || 0;
            if (nb === "increment") nb = existing + 1;
            if (this.isVisible()) nb = 0;
            const newTitle = $countSpan.attr("title").replace(/\d+/, nb.toString());
            $countSpan.data("count", nb).attr("title", newTitle).attr("aria-label", newTitle);
            return nb && nb !== existing;
          },
          show() {
            if (!isVisible(selector)) $toggle.trigger("click");
          },
          setNotified() {
            wsSend("notified");
          },
          pulse() {
            $toggle.addClass("pulse");
          }
        }
      });
    };
    $toggle.one("mouseover click", () => load()).on("click", () => {
      if ("Notification" in window) Notification.requestPermission();
      setTimeout(async () => {
        if (instance && isVisible(selector)) (await instance).onShow();
      }, 200);
    });
    pubsub.on("socket.in.notifications", async (data) => {
      if (!instance) load(data);
      else (await instance).update(data);
    });
    pubsub.on("notify-app.set-read", async (user) => {
      if (!instance) load();
      else (await instance).setMsgRead(user);
    });
  }
  {
    const load = memoize(() => loadEsm("dasher"));
    $("#top .dasher .toggle").one("mouseover click", function() {
      $(this).removeAttr("href");
      loadCssPath("dasher");
      load();
    });
  }
  {
    const $wrap = $("#clinput");
    if (!$wrap.length) return;
    const $input = $wrap.find("input");
    let booted = false, clicked = false;
    const boot2 = () => {
      if (booted) return;
      booted = true;
      loadEsm("cli", { init: { input: $input[0] } }).catch(() => booted = false);
    };
    $input.on({
      keydown: blurIfEscape,
      click: () => {
        clicked = true;
      },
      blur() {
        clicked = false;
        $input.val("");
        $("body").removeClass("clinput");
      },
      focus() {
        boot2();
        $("body").addClass("clinput");
      }
    });
    $wrap.find("a").on({
      mouseover: boot2,
      click() {
        $("body").hasClass("clinput") ? $input[0].blur() : $input[0].focus();
      }
    });
    $wrap.on("mouseenter", () => {
      if ($input[0] !== document.activeElement) $input[0].focus();
    });
    $wrap.on("mouseleave", () => {
      if (!clicked && !$input.val()) $input[0].blur();
    });
    site.mousetrap.bind("/", () => {
      $input.val("/");
      $input[0].focus();
      top.classList.remove("hide");
    }).bind("s", () => {
      $input[0].focus();
      top.classList.remove("hide");
    });
  }
  {
    let lastY = window.scrollY;
    if (lastY > 0) top.classList.add("scrolled");
    window.addEventListener(
      "scroll",
      () => {
        const y = window.scrollY;
        top.classList.toggle("scrolled", y > 0);
        if (y > lastY + 10) top.classList.add("hide");
        else if (y <= clamp(lastY - 20, { min: 0, max: document.body.scrollHeight - window.innerHeight }))
          top.classList.remove("hide");
        else return;
        lastY = Math.max(0, y);
      },
      { passive: true }
    );
    if (!isTouchDevice() || site.blindMode || !document.querySelector("main.analyse")) return;
    (_a = document.querySelector(".main-board")) == null ? void 0 : _a.addEventListener(
      "dblclick",
      (e) => {
        lastY = -9999;
        window.scrollTo({
          top: parseInt(window.getComputedStyle(document.body).getPropertyValue("---site-header-height")),
          behavior: "instant"
        });
        e.preventDefault();
      },
      { passive: true }
    );
  }
}

// ../site/src/domHandlers.ts
function addWindowHandlers() {
  let animFrame;
  window.addEventListener("resize", () => {
    cancelAnimationFrame(animFrame);
    animFrame = requestAnimationFrame(setViewportHeight);
  });
  function setViewportHeight() {
    document.body.style.setProperty("---viewport-height", `${window.innerHeight}px`);
  }
}
function addDomHandlers() {
  topBar_default();
  menuKeyboardInteractions();
  $("#main-wrap").on("click", ".copy-me__button", function(e) {
    blurIfPrimaryClick(e);
    const showCheckmark = () => {
      $(this).attr("data-icon", licon.Checkmark).removeClass("button-metal");
      setTimeout(() => $(this).attr("data-icon", licon.Clipboard).addClass("button-metal"), 1e3);
    };
    const fetchContent = $(this).parent().hasClass("fetch-content");
    $(this.parentElement.firstElementChild).each(function() {
      try {
        if (this instanceof HTMLAnchorElement) {
          if (fetchContent) writeTextClipboard(this.href, showCheckmark);
          else navigator.clipboard.writeText(this.href).then(showCheckmark);
        } else if (this instanceof HTMLInputElement) {
          navigator.clipboard.writeText(this.value).then(showCheckmark);
        }
      } catch (e2) {
        console.error(e2);
      }
    });
    return false;
  }).on("click", ".yes-no-confirm, .ok-cancel-confirm", async function(e) {
    var _a;
    if (!e.isTrusted) return;
    e.preventDefault();
    const [confirmText, cancelText] = this.classList.contains("yes-no-confirm") ? [i18n.site.yes, i18n.site.no] : [i18n.site.ok, i18n.site.cancel];
    if (await confirm(this.title || "Confirm this action?", confirmText, cancelText))
      (_a = e.target) == null ? void 0 : _a.click();
  }).on("click", "a.bookmark", function() {
    const t = $(this).toggleClass("bookmarked");
    text(this.href, { method: "post" });
    const count = (parseInt(t.text(), 10) || 0) + (t.hasClass("bookmarked") ? 1 : -1);
    t.find("span").html(count > 0 ? String(count) : "");
    return false;
  });
  $("body").on("click", ".relation-button", function() {
    const $a = $(this).addClass("processing").css("opacity", 0.3);
    const dropdownOverflowParent = this.closest(".dropdown-overflow");
    if (dropdownOverflowParent) {
      dropdownOverflowParent.dispatchEvent(new CustomEvent("reload", { detail: this.href }));
    } else {
      text(this.href, { method: "post" }).then((html) => {
        if ($a.hasClass("aclose")) $a.hide();
        else if (html.includes("relation-actions")) $a.parent().replaceWith(html);
        else $a.replaceWith(html);
      });
    }
    return false;
  });
  $(".user-autocomplete").each(function() {
    const focus = this.autofocus;
    const start = () => userComplete({
      input: this,
      friend: !!this.dataset.friend,
      tag: this.dataset.tag,
      focus
    });
    if (focus) start();
    else $(this).one("focus", start);
  });
}

// ../site/src/friends.ts
var OnlineFriends = class {
  constructor(el) {
    this.el = el;
    this.loaded = false;
    this.receive = (friends, msg) => {
      this.users.clear();
      friends.forEach((f, i) => {
        const friend = this.insert(f);
        friend.patronColor = msg.patronColors[i];
        friend.playing = msg.playing.includes(friend.id);
      });
      this.repaint();
    };
    this.repaint = () => {
      if (this.loaded)
        requestAnimationFrame(() => {
          var _a;
          const ids = Array.from(this.users.keys()).sort();
          this.titleEl.innerHTML = i18n.site.nbFriendsOnline(
            ids.length,
            this.loaded ? `<strong>${ids.length}</strong>` : "-"
          );
          (_a = this.el.querySelector(".nobody")) == null ? void 0 : _a.classList.toggle("none", !!ids[0]);
          this.el.querySelector(".list").innerHTML = ids.map((id) => this.renderFriend(this.users.get(id))).join("");
        });
    };
    this.renderFriend = (friend) => {
      const patronCls = friend.patronColor ? ` patron paco${friend.patronColor}` : "";
      const icon = `<icon class="line${patronCls}"></icon>`, titleTag = friend.title ? `<span class="utitle"${friend.title === "BOT" ? " data-bot" : ""}>${friend.title}</span>&nbsp;` : "", url2 = "/@/" + friend.name, tvButton = friend.playing ? `<a data-icon="${licon.AnalogTv}" class="tv ulpt" data-pt-pos="nw" href="${url2}/tv" data-href="${url2}"></a>` : "";
      return `<div><a class="online user-link ulpt" data-pt-pos="nw" href="${url2}">${icon}${titleTag}${friend.name}</a>${tvButton}</div>`;
    };
    this.enters = (titleName, msg) => {
      const friend = this.insert(titleName);
      friend.playing = msg.playing;
      friend.patronColor = msg.patronColor;
      this.repaint();
    };
    this.leaves = (titleName) => {
      this.users.delete(this.getId(titleName));
      this.repaint();
    };
    this.playing = (titleName) => {
      this.insert(titleName).playing = true;
      this.repaint();
    };
    this.stopped_playing = (titleName) => {
      this.insert(titleName).playing = false;
      this.repaint();
    };
    this.insert = (titleName) => {
      const id = this.getId(titleName);
      const found = this.users.get(id);
      if (found) return found;
      const newFriend = this.toFriend(titleName);
      this.users.set(id, newFriend);
      return newFriend;
    };
    this.getId = (titleName) => titleName.toLowerCase().replace(/^\w+\s/, "");
    this.toFriend = (titleName) => {
      const split = titleName.split(" ");
      return {
        id: split[split.length - 1].toLowerCase(),
        name: split[split.length - 1],
        title: split.length > 1 ? split[0] : void 0,
        playing: false
      };
    };
    const api2 = api.onlineFriends;
    this.titleEl = this.el.querySelector(".friend_box_title");
    this.titleEl.addEventListener("click", () => {
      var _a;
      (_a = this.el.querySelector(".content_wrap")) == null ? void 0 : _a.classList.toggle("none");
      if (!this.loaded) {
        this.loaded = true;
        api2.request();
      }
    });
    this.users = /* @__PURE__ */ new Map();
    api2.events.on("onlines", this.receive);
    api2.events.on("enters", this.enters);
    api2.events.on("leaves", this.leaves);
    api2.events.on("playing", this.playing);
    api2.events.on("stopped_playing", this.stopped_playing);
  }
};

// ../site/src/powertip.ts
var inCrosstable = (el) => {
  var _a;
  return (_a = document.querySelector(".crosstable")) == null ? void 0 : _a.contains(el);
};
var onPowertipPreRender = (id, preload) => (el) => {
  const url2 = (el.dataset.href || el.href).replace(/\?.+$/, "");
  if (preload) preload(url2);
  text(url2 + "/mini").then((html) => {
    const el2 = document.getElementById(id);
    el2.innerHTML = html;
    pubsub.emit("content-loaded", el2);
  });
};
var uptA = (url2, icon) => `<a class="btn-rack__btn" href="${url2}" data-icon="${icon}"></a>`;
var userPowertip = (el, pos) => $(el).removeClass("ulpt").powerTip({
  preRender: onPowertipPreRender("powerTip", (url2) => {
    const u = url2.split("@/")[1];
    if (!u) return;
    const name = el.dataset.name || $(el).html();
    $("#powerTip").html(
      '<div class="upt__info"><div class="upt__info__top"><span class="user-link offline">' + name + '</span></div></div><div class="upt__actions btn-rack">' + uptA("/@/" + u + "/tv", licon.AnalogTv) + uptA("/inbox/new?user=" + u, licon.BubbleSpeech) + uptA("/?user=" + u + "#friend", licon.Swords) + '<a class="btn-rack__btn relation-button" disabled></a></div>'
    );
  }),
  placement: pos || el.getAttribute("data-pt-pos") || (inCrosstable(el) ? "n" : "s")
});
var gamePowertip = (el) => $(el).removeClass("glpt").powerTip({
  preRender: onPowertipPreRender("miniGame", () => spinnerHtml),
  placement: inCrosstable(el) ? "n" : "w",
  defaultSize: [264, 264],
  popupId: "miniGame"
});
function powerTipWith(el, ev, f) {
  if ("ontouchstart" in window && !el.classList.contains("mobile-powertip")) return;
  f(el);
  $.powerTip.show(el, ev);
}
function onIdleForAll(par, sel, f) {
  requestIdleCallbackSafe(
    () => Array.prototype.forEach.call(par.querySelectorAll(sel), (el) => f(el)),
    // do not codegolf to `f`
    800
  );
}
function $as(cashOrHtml) {
  return (typeof cashOrHtml === "string" ? $(cashOrHtml) : cashOrHtml)[0];
}
var powertip = {
  watchMouse() {
    document.body.addEventListener("mouseover", (e) => {
      const t = e.target;
      if (t.classList.contains("ulpt")) powerTipWith(t, e, userPowertip);
      else if (t.classList.contains("glpt")) powerTipWith(t, e, gamePowertip);
    });
  },
  manualGameIn(parent) {
    onIdleForAll(parent, ".glpt", gamePowertip);
  },
  manualGame: gamePowertip,
  manualUser: userPowertip,
  manualUserIn(parent) {
    onIdleForAll(parent, ".ulpt", userPowertip);
  }
};
var powertip_default = powertip;
var session = {
  // for each popupId
  scoped: {
    // isTipOpen: false,
    // isClosing: false,
    // tipOpenImminent: false,
    // activeHover: null,
    // desyncTimeout: null,
    // delayInProgress: false,
  },
  currentX: 0,
  currentY: 0,
  previousX: 0,
  previousY: 0,
  mouseTrackingActive: false,
  delayInProgress: false,
  windowWidth: 0,
  windowHeight: 0,
  scrollTop: 0,
  scrollLeft: 0
};
var Collision = {
  none: 0,
  top: 1,
  bottom: 2,
  left: 4,
  right: 8
};
$.fn.powerTip = function(opts) {
  if (!this.length) {
    return this;
  }
  const options = Object.assign({}, defaults, opts), tipController = new TooltipController(options);
  requestIdleCallbackSafe(() => initTracking());
  this.each((_, el) => {
    const $this = $(el);
    if ("displayController" in el) {
      $.powerTip.destroy(el);
    }
    el.displayController = new DisplayController($this, options, tipController);
  });
  this.on({
    // mouse events
    mouseenter(event) {
      $.powerTip.show(this, event);
    },
    mouseleave() {
      $.powerTip.hide(this);
    }
  });
  return this;
};
var defaults = {
  popupId: "powerTip",
  intentSensitivity: 7,
  intentPollInterval: 150,
  closeDelay: 150,
  placement: "n",
  smartPlacement: true,
  defaultSize: [260, 120],
  offset: 10
};
var smartPlacementLists = {
  n: ["n", "ne", "nw", "s", "se", "sw", "e", "w"],
  e: ["e", "ne", "se", "w", "nw", "sw", "n", "s"],
  s: ["s", "se", "sw", "n", "ne", "nw", "e", "w"],
  w: ["w", "nw", "sw", "e", "ne", "se", "n", "s"],
  nw: ["nw", "w", "sw", "n", "s", "se", "nw", "e"],
  ne: ["ne", "e", "se", "n", "s", "sw", "ne", "w"],
  sw: ["sw", "w", "nw", "s", "n", "ne", "sw", "e"],
  se: ["se", "e", "ne", "s", "n", "nw", "se", "w"]
};
$.powerTip = {
  show(element, event) {
    if (event) {
      trackMouse(event);
      session.previousX = event.pageX;
      session.previousY = event.pageY;
      element.displayController.show();
    } else {
      element.displayController.show(true, true);
    }
    return element;
  },
  reposition(element) {
    element.displayController.resetPosition();
    return element;
  },
  hide(element, immediate) {
    element.displayController.hide(immediate);
    return element;
  },
  destroy(element) {
    var _a;
    (_a = element.displayController) == null ? void 0 : _a.hide(true);
  }
};
function cssCoordinates() {
  return { left: "auto", top: "auto", right: "auto", bottom: "auto" };
}
var DisplayController = class {
  constructor(element, options, tipController) {
    this.element = element;
    this.options = options;
    this.tipController = tipController;
    this.scoped = {};
    this.el = $as(element);
    this.scoped = session.scoped[options.popupId];
  }
  show(immediate, forceOpen) {
    this.cancel();
    if (!this.el.hasActiveHover) {
      if (!immediate) {
        this.scoped.tipOpenImminent = true;
        this.hoverTimer = setTimeout(() => {
          this.hoverTimer = void 0;
          this.checkForIntent();
        }, this.options.intentPollInterval);
      } else {
        if (forceOpen) {
          this.el.forcedOpen = true;
        }
        this.tipController.showTip(this.element);
      }
    }
  }
  hide(disableDelay) {
    this.cancel();
    this.scoped.tipOpenImminent = false;
    if (this.el.hasActiveHover) {
      this.el.forcedOpen = false;
      if (!disableDelay) {
        this.scoped.delayInProgress = true;
        this.hoverTimer = setTimeout(() => {
          this.hoverTimer = void 0;
          this.tipController.hideTip(this.element);
          session.delayInProgress = false;
        }, this.options.closeDelay);
      } else {
        this.tipController.hideTip(this.element);
      }
    }
  }
  checkForIntent() {
    var _a;
    const xDifference = Math.abs(session.previousX - session.currentX), yDifference = Math.abs(session.previousY - session.currentY), totalDifference = xDifference + yDifference;
    if (totalDifference < ((_a = this.options.intentSensitivity) != null ? _a : 0)) {
      this.tipController.showTip(this.element);
    } else {
      session.previousX = session.currentX;
      session.previousY = session.currentY;
      this.show();
    }
  }
  cancel() {
    clearTimeout(this.hoverTimer);
    this.scoped.delayInProgress = false;
  }
  resetPosition() {
    this.tipController.resetPosition(this.element);
  }
};
function placementCalculator() {
  return {
    compute(element, placement, tipWidth, tipHeight, offset) {
      var _a, _b, _c;
      placement = (_c = (_b = (_a = site.powertip).forcePlacementHook) == null ? void 0 : _b.call(_a, element[0])) != null ? _c : placement;
      const placementBase = placement.split("-")[0];
      const coords = cssCoordinates();
      const position = getHtmlPlacement(element, placementBase);
      switch (placement) {
        case "n":
          coords.left = position.left - tipWidth / 2;
          coords.bottom = session.windowHeight - position.top + offset;
          break;
        case "e":
          coords.left = position.left + offset;
          coords.top = position.top - tipHeight / 2;
          break;
        case "s":
          coords.left = position.left - tipWidth / 2;
          coords.top = position.top + offset;
          break;
        case "w":
          coords.top = position.top - tipHeight / 2;
          coords.right = session.windowWidth - position.left + offset;
          break;
        case "nw":
          coords.bottom = session.windowHeight - position.top + offset;
          coords.right = session.windowWidth - position.left - 20;
          break;
        case "ne":
          coords.left = position.left - 20;
          coords.bottom = session.windowHeight - position.top + offset;
          break;
        case "sw":
          coords.top = position.top + offset;
          coords.right = session.windowWidth - position.left - 20;
          break;
        case "se":
          coords.left = position.left - 20;
          coords.top = position.top + offset;
          break;
      }
      return coords;
    }
  };
  function getHtmlPlacement(element, placement) {
    const objectOffset = element.offset();
    const objectWidth = element.outerWidth();
    const objectHeight = element.outerHeight();
    let left = 0;
    let top = 0;
    switch (placement) {
      case "n":
        left = objectOffset.left + objectWidth / 2;
        top = objectOffset.top;
        break;
      case "e":
        left = objectOffset.left + objectWidth;
        top = objectOffset.top + objectHeight / 2;
        break;
      case "s":
        left = objectOffset.left + objectWidth / 2;
        top = objectOffset.top + objectHeight;
        break;
      case "w":
        left = objectOffset.left;
        top = objectOffset.top + objectHeight / 2;
        break;
      case "nw":
        left = objectOffset.left;
        top = objectOffset.top;
        break;
      case "ne":
        left = objectOffset.left + objectWidth;
        top = objectOffset.top;
        break;
      case "sw":
        left = objectOffset.left;
        top = objectOffset.top + objectHeight;
        break;
      case "se":
        left = objectOffset.left + objectWidth;
        top = objectOffset.top + objectHeight;
        break;
    }
    return { left, top };
  }
}
var TooltipController = class {
  constructor(options) {
    this.options = options;
    this.placementCalculator = placementCalculator();
    this.isBasePlacement = (p) => p in smartPlacementLists;
    this.tipElement = $("#" + options.popupId);
    if (!session.scoped[options.popupId]) session.scoped[options.popupId] = {};
    this.scoped = session.scoped[options.popupId];
    if (this.tipElement.length === 0) {
      const tip = document.createElement("div");
      tip.id = options.popupId;
      this.tipElement = $(tip);
      $("body").append(this.tipElement);
    }
    this.tipElement.on({
      mouseenter: () => {
        if (this.scoped.activeHover) {
          this.scoped.activeHover[0].displayController.cancel();
        }
      },
      mouseleave: () => {
        if (this.scoped.activeHover) {
          this.scoped.activeHover[0].displayController.hide();
        }
      }
    });
  }
  showTip(element) {
    $as(element).hasActiveHover = true;
    this.doShowTip(element);
  }
  doShowTip(element) {
    if (!$as(element).hasActiveHover) return;
    if (this.scoped.isTipOpen) {
      if (!this.scoped.isClosing) {
        this.hideTip(this.scoped.activeHover);
      }
      setTimeout(() => {
        this.doShowTip(element);
      }, 100);
      return;
    }
    this.resetPosition(element);
    if (this.options.preRender) {
      this.tipElement.empty();
      this.options.preRender($as(element));
    }
    this.scoped.activeHover = element;
    this.scoped.isTipOpen = true;
    this.tipElement.css("visibility", "visible");
    if (!this.scoped.desyncTimeout) {
      this.scoped.desyncTimeout = setInterval(() => this.closeDesyncedTip(), 500);
    }
  }
  hideTip(element) {
    this.scoped.isClosing = true;
    this.scoped.activeHover = null;
    this.scoped.isTipOpen = false;
    this.scoped.desyncTimeout = clearInterval(this.scoped.desyncTimeout);
    $as(element).hasActiveHover = false;
    $as(element).forcedOpen = false;
    this.tipElement.css("visibility", "hidden");
    const coords = cssCoordinates();
    coords.top = -9999;
    coords.left = -9999;
    this.tipElement.css(coords);
    this.scoped.isClosing = false;
    this.tipElement.removeClass();
  }
  resetPosition(element) {
    const { placement, defaultSize } = this.options;
    if (this.options.smartPlacement && placement && this.isBasePlacement(placement)) {
      let priorityList = smartPlacementLists[placement];
      if ($as(element).classList.contains("mobile-powertip")) {
        priorityList = [...priorityList, "s"];
      }
      const elementWidth = this.tipElement.outerWidth() || defaultSize[0];
      const elementHeight = this.tipElement.outerHeight() || defaultSize[1];
      $.each(priorityList, (_, pos) => {
        const coords = this.placeTooltip(element, pos);
        const collisions = getViewportCollisions(coords, elementWidth, elementHeight);
        if (collisions & (Collision.left | Collision.right)) {
          const nudged = nudgeToFit(coords, collisions, elementWidth);
          if (nudged) {
            this.tipElement.css(nudged);
            return false;
          }
        }
        return collisions !== Collision.none;
      });
    } else {
      this.placeTooltip(element, placement);
    }
  }
  placeTooltip(element, placement) {
    let iterationCount = 0, tipWidth, tipHeight, coords = cssCoordinates();
    do {
      tipWidth = this.tipElement.outerWidth() || this.options.defaultSize[0];
      tipHeight = this.tipElement.outerHeight() || this.options.defaultSize[1];
      coords = this.placementCalculator.compute(
        element,
        placement,
        tipWidth,
        tipHeight,
        this.options.offset
      );
      this.tipElement.css(coords);
    } while (
      // sanity check: limit to 5 iterations, and...
      ++iterationCount <= 5 && // try again if the dimensions changed after placement
      (tipWidth !== this.tipElement.outerWidth() || tipHeight !== this.tipElement.outerHeight())
    );
    return coords;
  }
  closeDesyncedTip() {
    let isDesynced = false;
    if (this.scoped.isTipOpen && !this.scoped.isClosing && !this.scoped.delayInProgress) {
      if (this.scoped.activeHover[0].hasActiveHover === false || this.scoped.activeHover.is(":disabled")) {
        isDesynced = true;
      } else {
        if (!isMouseOver(this.scoped.activeHover) && !this.scoped.activeHover.is(":focus") && !this.scoped.activeHover[0].forcedOpen) {
          if (!isMouseOver(this.tipElement)) {
            isDesynced = true;
          }
        }
      }
      if (isDesynced) {
        this.hideTip(this.scoped.activeHover);
      }
    }
  }
};
function initTracking() {
  if (!session.mouseTrackingActive) {
    session.mouseTrackingActive = true;
    const $window = $(window);
    session.scrollLeft = window.scrollX;
    session.scrollTop = window.scrollY;
    session.windowWidth = $window.width();
    session.windowHeight = $window.height();
    document.addEventListener("mousemove", trackMouse);
    window.addEventListener(
      "resize",
      function() {
        session.windowWidth = $window.width();
        session.windowHeight = $window.height();
      },
      { passive: true }
    );
    window.addEventListener(
      "scroll",
      function() {
        const x = window.scrollX, y = window.scrollY;
        if (x !== session.scrollLeft) {
          session.currentX += x - session.scrollLeft;
          session.scrollLeft = x;
        }
        if (y !== session.scrollTop) {
          session.currentY += y - session.scrollTop;
          session.scrollTop = y;
        }
      },
      { passive: true }
    );
  }
}
function trackMouse(event) {
  session.currentX = event.pageX;
  session.currentY = event.pageY;
}
function isMouseOver(element) {
  const elementPosition = element.offset();
  return session.currentX >= elementPosition.left && session.currentX <= elementPosition.left + element.outerWidth() && session.currentY >= elementPosition.top && session.currentY <= elementPosition.top + element.outerHeight();
}
function nudgeToFit(coords, collisions, tipWidth) {
  const hasHoriz = collisions & (Collision.left | Collision.right);
  const nudged = { ...coords };
  const EDGE_OFFSET = 4;
  if (hasHoriz && typeof coords.left === "number") {
    const vLeft = session.scrollLeft;
    const vRight = session.scrollLeft + session.windowWidth;
    if (collisions & Collision.left) {
      if (vLeft - coords.left > tipWidth / 2) return null;
      nudged.left = vLeft - EDGE_OFFSET;
    } else {
      if (coords.left + tipWidth - vRight > tipWidth / 2) return null;
      nudged.left = vRight - tipWidth - EDGE_OFFSET;
    }
  }
  return nudged;
}
function getViewportCollisions(coords, elementWidth, elementHeight) {
  const viewportTop = session.scrollTop, viewportLeft = session.scrollLeft, viewportBottom = viewportTop + session.windowHeight, viewportRight = viewportLeft + session.windowWidth;
  let collisions = Collision.none;
  if (coords.top < viewportTop || Math.abs(Number(coords.bottom) - session.windowHeight) - elementHeight < viewportTop) {
    collisions |= Collision.top;
  }
  if (Number(coords.top) + elementHeight > viewportBottom || Math.abs(Number(coords.bottom) - session.windowHeight) > viewportBottom) {
    collisions |= Collision.bottom;
  }
  if (coords.left < viewportLeft || Number(coords.right) + elementWidth > viewportRight) {
    collisions |= Collision.left;
  }
  if (Number(coords.left) + elementWidth > viewportRight || coords.right < viewportLeft) {
    collisions |= Collision.right;
  }
  return collisions;
}

// ../site/src/renderTimeAgo.ts
var renderTimeAgo = (parent) => requestAnimationFrame(() => {
  const now = Date.now();
  [].slice.call((parent || document).getElementsByClassName("timeago"), 0, 99).forEach((node) => {
    const cl = node.classList, abs = cl.contains("abs"), set = cl.contains("set");
    node.lichessDate = node.lichessDate || toDate(node.getAttribute("datetime"));
    if (!set) {
      const str = commonDateFormat(node.lichessDate);
      if (abs) node.textContent = str;
      else node.setAttribute("title", str);
      cl.add("set");
      if (abs || cl.contains("once")) cl.remove("timeago");
    }
    if (cl.contains("remaining")) {
      const diff = (node.lichessDate.getTime() - now) / 1e3;
      node.textContent = formatRemaining(diff);
    } else if (!abs) {
      const diff = (now - node.lichessDate.getTime()) / 1e3;
      node.textContent = formatAgo(diff);
      if (Math.abs(diff) > 9999) cl.remove("timeago");
    }
    if (site.blindMode) {
      node.removeAttribute("title");
      node.removeAttribute("datetime");
    }
  });
});
var updateTimeAgo = (interval) => {
  renderTimeAgo();
  setTimeout(() => updateTimeAgo(interval * 1.1), interval);
};
var renderLocalizedTimestamps = () => {
  requestAnimationFrame(() => {
    [].slice.call(document.querySelectorAll("time[format]"), 0, 99).forEach((node) => {
      const format = node.getAttribute("format");
      if (format) {
        const date = toDate(node.getAttribute("datetime"));
        node.textContent = datetimeFormat(date, format);
      }
    });
  });
};
var discordFormats = {
  d: { year: "numeric", month: "2-digit", day: "2-digit" },
  // 12/31/2025
  D: { year: "numeric", month: "long", day: "numeric" },
  // December 31st, 2025
  t: { hour: "numeric", minute: "numeric" },
  // 6:26 PM
  T: { hour: "numeric", minute: "numeric", second: "numeric" },
  // 6:26:00 PM
  f: {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric"
  },
  // December 31st, 2025 at 6:26 PM
  F: {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric"
  },
  // Wednesday, December 31st, 2025 at 6:26 PM
  s: {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "numeric"
  },
  // 12/31/2025, 6:26 PM
  S: {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "numeric",
    second: "numeric"
  }
  // 12/31/2025, 6:26:00 PM
};
var datetimeFormat = (date, formatStr) => {
  if (formatStr === "R") {
    return timeago(date);
  }
  const fmt = discordFormats[formatStr];
  if (fmt) {
    const formatter = new Intl.DateTimeFormat(displayLocale, fmt);
    return formatter.format(date);
  }
  return date.toString();
};
var formatRemaining = (seconds) => seconds < 1 ? i18n.timeago.completed : seconds < 3600 ? i18n.timeago.nbMinutesRemaining(Math.floor(seconds / 60)) : i18n.timeago.nbHoursRemaining(Math.floor(seconds / 3600));

// ../site/src/serviceWorker.ts
async function serviceWorker_default() {
  if (!("serviceWorker" in navigator && "Notification" in window && "PushManager" in window)) return;
  const workerUrl = new URL(url(jsModule("serviceWorker"), { pathOnly: true }), self.location.href);
  workerUrl.searchParams.set("asset-url", document.body.getAttribute("data-asset-url"));
  let newSub = void 0;
  try {
    const reg = await navigator.serviceWorker.register(workerUrl.href, { scope: "/", updateViaCache: "all" });
    const store = storage.make("push-subscribed");
    const resub = parseInt(store.get() || "0", 10) + 432e5 < Date.now();
    const vapid = document.body.getAttribute("data-vapid");
    const sub = await reg.pushManager.getSubscription();
    if (!vapid || Notification.permission !== "granted") return store.remove();
    else if (sub && !resub) return;
    newSub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapid });
    if (!newSub) throw new Error(JSON.stringify(await reg.pushManager.permissionState()));
    const res = await fetch("/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSub)
    });
    if (res.ok && !res.redirected) store.set(String(Date.now()));
    else throw new Error(res.statusText);
  } catch (err) {
    log("serviceWorker.ts:", err.message, newSub);
    if (newSub == null ? void 0 : newSub.endpoint) await (newSub == null ? void 0 : newSub.unsubscribe());
  }
}

// ../site/src/unhandledError.ts
function terseHref() {
  return window.location.href.replace(/^(https:\/\/)?(?:lichess|lichess1)\.org\//, "/");
}
function addExceptionListeners() {
  window.addEventListener("error", async (e) => {
    var _a, _b, _c, _d;
    const loc = e.filename ? ` - (${e.filename}:${e.lineno}:${e.colno})` : "";
    await log(`${terseHref()} - ${e.message}${loc}
${(_b = (_a = e.error) == null ? void 0 : _a.stack) != null ? _b : ""}`.trim());
    if (site.debug)
      await domDialog({
        htmlText: escapeHtml(`${e.message}${loc}
${(_d = (_c = e.error) == null ? void 0 : _c.stack) != null ? _d : ""}`),
        class: "debug",
        easyClose: "clickOutside",
        show: true
      });
  });
  window.addEventListener("unhandledrejection", async (e) => {
    let reason = e.reason;
    if (typeof reason !== "string")
      try {
        reason = JSON.stringify(e.reason);
      } catch (_) {
        reason = "unhandled rejection, reason not a string";
      }
    await log(`${terseHref()} - ${reason}`);
    if (site.debug)
      await domDialog({
        htmlText: escapeHtml(reason),
        class: "debug",
        easyClose: "clickOutside",
        show: true
      });
  });
}

// ../site/src/boot.ts
function boot() {
  addExceptionListeners();
  const setBlind = location.hash === "#blind";
  const showDebug = location.hash.startsWith("#debug");
  requestAnimationFrame(() => {
    initMiniBoards();
    initMiniGames();
    pubsub.on("content-loaded", initMiniBoards);
    pubsub.on("content-loaded", initMiniGames);
    updateTimeAgo(1e3);
    pubsub.on("content-loaded", renderTimeAgo);
    renderLocalizedTimestamps();
    pubsub.on("content-loaded", toggleBoxInit);
  });
  requestIdleCallbackSafe(() => {
    const friendsEl = document.getElementById("friend_box");
    if (friendsEl) new OnlineFriends(friendsEl);
    const chatMembers = document.querySelector(".chat__members");
    if (chatMembers) watchers(chatMembers);
    $(".subnav__inner").each(function() {
      scrollToInnerSelector(this, ".active", true);
    });
    powertip_default.watchMouse();
    addDomHandlers();
    toggleBoxInit();
    window.addEventListener("resize", dispatchChessgroundResize);
    init();
    if (setBlind && !site.blindMode) setTimeout(() => $("#blind-mode button").trigger("click"), 1500);
    if (site.debug) site.asset.loadEsm("bits.devMode");
    if (showDebug) site.asset.loadEsm("bits.diagnosticDialog");
    serviceWorker_default();
    console.info("Lichess is open source! See https://lichess.org/source");
    eventuallySetupDefaultConnection();
    pubsub.on("socket.in.redirect", (d) => {
      site.unload.expected = true;
      site.redirect(d);
    });
    pubsub.on(
      "socket.in.fen",
      (e) => document.querySelectorAll(".mini-game-" + e.id).forEach((el) => updateMiniGame(el, e))
    );
    pubsub.on(
      "socket.in.finish",
      (e) => document.querySelectorAll(".mini-game-" + e.id).forEach((el) => finishMiniGame(el, e.win))
    );
    pubsub.on("socket.in.announce", display);
    pubsub.on("socket.in.tournamentReminder", (data) => {
      if ($("#announce").length || document.body.dataset.tournamentId === data.id) return;
      const url2 = "/tournament/" + data.id;
      $("body").append(
        $('<div id="announce">').append($(`<a data-icon="${licon.Trophy}" class="text">`).attr("href", url2).text(data.name)).append(
          $('<div class="actions">').append(
            $(`<a class="withdraw text" data-icon="${licon.Pause}">`).attr("href", url2 + "/withdraw").text(i18n.site.pause).on("click", function() {
              text(this.href, { method: "post" });
              $("#announce").remove();
              return false;
            })
          ).append(
            $(`<a class="text" data-icon="${licon.PlayTriangle}">`).attr("href", url2).text(i18n.site.resume)
          )
        )
      );
    });
    const mql = prefersLightThemeQuery();
    if (typeof mql.addEventListener === "function")
      mql.addEventListener("change", (e) => {
        if (document.body.dataset.theme === "system")
          document.documentElement.className = e.matches ? "light" : "dark";
      });
    upgradeNag();
    mirrorCheck();
  }, 800);
}
function mirrorCheck() {
  const mirrors = ["bealive.fit"];
  if (mirrors.includes(location.host)) location.href = "https://lichess.org" + location.pathname;
}

// ../site/src/mousetrap.ts
var KEY_MAP = {
  Backspace: "backspace",
  Tab: "tab",
  Enter: "enter",
  Shift: "shift",
  Control: "ctrl",
  Alt: "alt",
  CapsLock: "capslock",
  Escape: "esc",
  " ": "space",
  PageUp: "pageup",
  PageDown: "pagedown",
  End: "end",
  Home: "home",
  ArrowLeft: "left",
  ArrowUp: "up",
  ArrowRight: "right",
  ArrowDown: "down",
  Insert: "ins",
  Delete: "del",
  Meta: "meta",
  Digit1: "1",
  Digit2: "2",
  Digit3: "3",
  Digit4: "4",
  Digit5: "5",
  Digit6: "6",
  Digit7: "7",
  Digit8: "8",
  Digit9: "9",
  Digit0: "0"
};
var SPECIAL_KEYS = new Set(Object.values(KEY_MAP));
for (let i = 1; i < 20; ++i) SPECIAL_KEYS.add("f" + i);
var SPECIAL_ALIASES = {
  option: "alt",
  command: "meta",
  return: "enter",
  escape: "esc",
  plus: "+",
  mod: /Mac|iPod|iPhone|iPad/.test(navigator.platform) ? "meta" : "ctrl"
};
var keyFromEvent = (e) => {
  var _a, _b, _c, _d;
  if (e.type === "keypress") {
    return e.shiftKey ? e.key : (_a = e.key) == null ? void 0 : _a.toLowerCase();
  }
  return (_d = (_b = KEY_MAP[e.key]) != null ? _b : KEY_MAP[e.code]) != null ? _d : (_c = e.key) == null ? void 0 : _c.toLowerCase();
};
var modifiersMatch = (a, b) => a.sort().join(",") === b.sort().join(",");
var eventModifiers = (e) => {
  const modifiers = [];
  if (e.shiftKey) modifiers.push("shift");
  if (e.altKey) modifiers.push("alt");
  if (e.ctrlKey) modifiers.push("ctrl");
  if (e.metaKey) modifiers.push("meta");
  return modifiers;
};
var isModifier = (key) => key === "shift" || key === "ctrl" || key === "alt" || key === "meta";
var pickBestAction = (key, modifiers, action) => {
  action = action || (SPECIAL_KEYS.has(key) ? "keydown" : "keypress");
  if (action === "keypress" && modifiers.length) return "keydown";
  return action;
};
var keysFromString = (combination) => combination === "+" ? ["+"] : combination.replace(/\+{2}/g, "+plus").split("+");
var getKeyInfo = (combination, action) => {
  let key;
  const modifiers = [];
  for (key of keysFromString(combination)) {
    key = SPECIAL_ALIASES[key] || key;
    if (isModifier(key)) modifiers.push(key);
  }
  return {
    key,
    modifiers,
    action: pickBestAction(key, modifiers, action)
  };
};
var Mousetrap = class {
  constructor(targetElement = document) {
    this.bindings = {};
    /**
     * Binds an event to mousetrap.
     *
     * Can be a single key, a combination of keys separated with +,
     * or an array of such combinations.
     *
     * When adding modifiers, list the actual key last.
     */
    this.bind = (combinations, callback, action, multiple = true) => {
      var _a, _b, _c;
      for (const combo of Array.isArray(combinations) ? combinations : [combinations]) {
        const info = getKeyInfo(combo, action);
        (_c = (_a = this.bindings)[_b = info.key]) != null ? _c : _a[_b] = [];
        if (multiple || !this.bindings[info.key].some((b) => isEquivalent(b.modifiers, info.modifiers)))
          this.bindings[info.key].push({
            combination: combo,
            callback,
            modifiers: info.modifiers,
            action: info.action
          });
      }
      return this;
    };
    this.unbind = (key) => {
      var _a;
      (_a = this.bindings[key]) == null ? void 0 : _a.forEach((b, i) => {
        if (b.modifiers.length === 0) this.bindings[key].splice(i, 1);
      });
    };
    this.handleKeyEvent = (e) => {
      const el = e.target;
      for (const binding of this.getMatches(e)) {
        if (binding.combination === "esc" || !["INPUT", "SELECT", "OPTION", "TEXTAREA"].includes(el.tagName) && !el.isContentEditable && !el.hasAttribute("trap-bypass")) {
          binding.callback(e);
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };
    this.getMatches = (e) => {
      const key = keyFromEvent(e);
      const action = e.type;
      const modifiers = action === "keyup" && isModifier(key) ? [key] : eventModifiers(e);
      return (this.bindings[key] || []).filter(
        (binding) => action === binding.action && // Chrome will not fire a keypress if meta or control is down,
        // Safari will fire a keypress if meta or meta+shift is down,
        // Firefox will fire a keypress if meta or control is down
        (action === "keypress" && !e.metaKey && !e.ctrlKey || modifiersMatch(modifiers, binding.modifiers))
      );
    };
    targetElement.addEventListener("keypress", this.handleKeyEvent);
    targetElement.addEventListener("keydown", this.handleKeyEvent);
    targetElement.addEventListener("keyup", this.handleKeyEvent);
  }
};

// ../site/src/reload.ts
var redirectInProgress = false;
var redirect = async (opts, beep) => {
  try {
    if (beep) await promiseTimeout(site.sound.play("genericNotify"), 1e3);
  } catch (e) {
    console.warn(e);
  }
  let url2;
  if (typeof opts === "string") url2 = opts;
  else {
    url2 = opts.url;
    if (opts.cookie) {
      document.cookie = [
        encodeURIComponent(opts.cookie.name) + "=" + opts.cookie.value,
        "; max-age=" + opts.cookie.maxAge,
        "; path=/",
        "; domain=" + location.hostname
      ].join("");
    }
  }
  const href = "//" + location.host + "/" + url2.replace(/^\//, "");
  redirectInProgress = href;
  location.href = href;
};
var unload = {
  expected: false
};
var reload = (err) => {
  if (err) console.warn(err);
  if (redirectInProgress) return;
  unload.expected = true;
  wsDestroy();
  if (location.hash) location.reload();
  else location.assign(location.href);
};

// ../site/src/sound.ts
var sound_default = new class {
  constructor() {
    this.listeners = /* @__PURE__ */ new Set();
    this.sounds = /* @__PURE__ */ new Map();
    // All loaded sounds and their instances
    this.paths = /* @__PURE__ */ new Map();
    // sound names to paths
    this.theme = document.body.dataset.soundSet;
    this.speechStorage = storage.boolean("speech.enabled");
    this.voiceStorage = storage.make("speech.voice");
    this.volumeStorage = storage.make("sound-volume");
    this.primerEvents = ["touchend", "pointerup", "pointerdown", "mousedown", "keydown"];
    this.primer = async () => {
      const ctx = await this.ctxPromise;
      await ctx.resume();
      setTimeout(() => $("#warn-no-autoplay").removeClass("shown"), 500);
      for (const e of this.primerEvents) window.removeEventListener(e, this.primer, { capture: true });
    };
    this.throttled = throttle(100, (name, volume) => this.play(name, volume));
    this.setVolume = this.volumeStorage.set;
    this.getVolume = () => {
      const v = parseFloat(this.volumeStorage.get() || "");
      return v >= 0 ? v : 0.7;
    };
    this.getVoice = () => {
      var _a, _b;
      let o = { name: "", lang: document.documentElement.lang.split("-")[0] };
      try {
        o = JSON.parse((_a = this.voiceStorage.get()) != null ? _a : JSON.stringify(o));
      } catch (e) {
      }
      const voiceMap = this.getVoiceMap();
      return (_b = voiceMap.get(o.name)) != null ? _b : [...voiceMap.values()].find((v) => v.lang.startsWith(o.lang));
    };
    this.getVoiceMap = () => {
      const voices = speechSynthesis.getVoices();
      const voiceMap = /* @__PURE__ */ new Map();
      for (const code of ["en", document.documentElement.lang.split("-")[0], document.documentElement.lang]) {
        voices.filter((v) => v.lang.startsWith(code)).sort((a, b) => a.lang.localeCompare(b.lang)).forEach((v) => voiceMap.set(v.name, v));
      }
      return voiceMap;
    };
    this.setVoice = (o) => {
      if (!o) this.voiceStorage.remove();
      else this.voiceStorage.set(JSON.stringify({ name: o.name, lang: o.lang }));
    };
    this.enabled = () => this.theme !== "silent" && this.getVolume() !== 0;
    this.speech = (v) => {
      if (defined(v)) this.speechStorage.set(v);
      return this.speechStorage.get();
    };
    this.say = (text2, cut = false, force = false, translated = false) => this.sayLazy(() => text2, cut, force, translated);
    this.sayLazy = (text2, cut = false, force = false, translated = false) => {
      if (typeof window.speechSynthesis === "undefined") return false;
      try {
        if (cut) speechSynthesis.cancel();
        if (!this.speech() && !force) return false;
        const msg = new SpeechSynthesisUtterance(text2());
        const selectedVoice = this.getVoice();
        if (selectedVoice) {
          msg.voice = selectedVoice;
        } else {
          msg.lang = translated ? document.documentElement.lang : "en-GB";
        }
        msg.volume = this.getVolume();
        if (!isIos()) {
          msg.onstart = () => this.listeners.forEach((l) => l("start", text2()));
          msg.onend = msg.onerror = () => this.listeners.forEach((l) => l("stop"));
        }
        window.speechSynthesis.speak(msg);
        return true;
      } catch (err) {
        console.error(err);
        return false;
      }
    };
    this.saySan = (san, cut, force) => this.sayLazy(() => speakable(san), cut, force);
    this.sayOrPlay = (name, text2, cut = false) => this.say(text2, cut) || this.play(name);
    this.changeSet = (s) => {
      var _a;
      if (isIos()) (_a = this.ctx) == null ? void 0 : _a.resume();
      this.theme = s;
    };
    this.primerEvents.forEach((e) => window.addEventListener(e, this.primer, { capture: true }));
    this.ctxPromise = new Promise((resolve, fail) => {
      requestIdleCallbackSafe(() => {
        var _a;
        this.ctx = makeAudioContext();
        if (this.ctx) resolve(this.ctx);
        else fail(new Error("AudioContext not supported"));
        (_a = window.speechSynthesis) == null ? void 0 : _a.getVoices();
      });
    });
  }
  async load(name, path) {
    var _a;
    const ctx = await this.ctxPromise;
    if (path) this.paths.set(name, path);
    else path = (_a = this.paths.get(name)) != null ? _a : this.resolvePath(name);
    if (!path) return void 0;
    if (this.sounds.has(path)) return this.sounds.get(path);
    const result = await fetch(path);
    if (!result.ok) throw new Error(`${path} failed ${result.status}`);
    const arrayBuffer = await result.arrayBuffer();
    const audioBuffer = await new Promise((resolve, reject) => {
      if (ctx.decodeAudioData.length === 1) ctx.decodeAudioData(arrayBuffer).then(resolve).catch(reject);
      else ctx.decodeAudioData(arrayBuffer, resolve, reject);
    });
    const sound = new Sound(ctx, audioBuffer);
    this.sounds.set(path, sound);
    return sound;
  }
  resolvePath(name) {
    if (!this.enabled()) return void 0;
    let dir = this.theme;
    if (this.theme === "music" || this.speech()) {
      if (["move", "capture", "check", "checkmate"].includes(name)) return void 0;
      dir = "standard";
    }
    return this.url(`${dir}/${name[0].toUpperCase() + name.slice(1)}.mp3`);
  }
  url(name) {
    return site.asset.url(`sound/${name}`);
  }
  async play(name, volume = 1) {
    if (!this.enabled()) return;
    const sound = await this.load(name);
    if (sound && await this.resumeWithTest()) await sound.play(this.getVolume() * volume);
  }
  async move(o) {
    var _a, _b, _c, _d, _e;
    const volume = (_a = o == null ? void 0 : o.volume) != null ? _a : 1;
    if ((o == null ? void 0 : o.filter) !== "music" && this.theme !== "music") {
      if (o == null ? void 0 : o.name) this.throttled(o.name, volume);
      else {
        if ((_b = o == null ? void 0 : o.san) == null ? void 0 : _b.includes("x")) this.throttled("capture", volume);
        else this.throttled("move", volume);
        if ((_c = o == null ? void 0 : o.san) == null ? void 0 : _c.includes("#")) {
          this.throttled("checkmate", volume);
        } else if ((_d = o == null ? void 0 : o.san) == null ? void 0 : _d.includes("+")) {
          this.throttled("check", volume);
        }
      }
    }
    if ((o == null ? void 0 : o.filter) === "game" || this.theme !== "music") return;
    (_e = this.music) != null ? _e : this.music = await site.asset.loadEsm("bits.soundMove");
    this.music(o);
  }
  async playAndDelayMateResultIfNecessary(name) {
    if (this.theme === "standard") this.play(name);
    else setTimeout(() => this.play(name), 600);
  }
  async countdown(count, interval = 500) {
    if (!this.enabled()) return;
    try {
      while (count > 0) {
        const promises = [new Promise((r) => setTimeout(r, interval)), this.play(`countDown${count}`)];
        if (--count > 0) promises.push(this.load(`countDown${count}`));
        await Promise.all(promises);
      }
      await this.play("genericNotify");
    } catch (e) {
      console.error(e);
    }
  }
  playOnce(name) {
    const doIt = () => {
      const store = storage.make("just-played");
      if (Date.now() - parseInt(store.get(), 10) < 2e3) return;
      store.set(String(Date.now()));
      this.play(name);
    };
    if (document.hasFocus()) doIt();
    else setTimeout(doIt, 10 + Math.random() * 500);
  }
  preloadBoardSounds() {
    for (const name of ["move", "capture", "check", "checkmate", "genericNotify"]) this.load(name);
  }
  async resumeWithTest() {
    var _a, _b;
    if (!this.ctx) return false;
    if (this.ctx.state !== "running" && this.ctx.state !== "suspended") {
      if (this.ctx.state !== "closed") this.ctx.close();
      this.ctx = makeAudioContext();
      if (this.ctx) {
        for (const s of this.sounds.values()) s.rewire(this.ctx);
      }
    }
    if (((_a = this.ctx) == null ? void 0 : _a.state) === "suspended") {
      await Promise.race([
        this.ctx.resume(),
        new Promise((resolve) => {
          setTimeout(() => {
            $("#warn-no-autoplay").addClass("shown");
            resolve();
          }, 400);
        })
      ]);
    }
    if (((_b = this.ctx) == null ? void 0 : _b.state) !== "running") return false;
    $("#warn-no-autoplay").removeClass("shown");
    return true;
  }
}();
var Sound = class {
  constructor(ctx, buffer) {
    this.buffer = buffer;
    this.rewire(ctx);
  }
  play(volume = 1) {
    this.node.gain.setValueAtTime(volume, this.ctx.currentTime);
    const source = this.ctx.createBufferSource();
    source.buffer = this.buffer;
    source.connect(this.node);
    return new Promise((resolve) => {
      source.onended = () => {
        source.disconnect();
        resolve();
      };
      source.start(0);
    });
  }
  rewire(ctx) {
    var _a;
    (_a = this.node) == null ? void 0 : _a.disconnect();
    this.ctx = ctx;
    this.node = this.ctx.createGain();
    this.node.connect(this.ctx.destination);
  }
};
function makeAudioContext() {
  return window.webkitAudioContext ? new window.webkitAudioContext({ latencyHint: "interactive" }) : typeof AudioContext !== "undefined" ? new AudioContext({ latencyHint: "interactive" }) : void 0;
}

// ../site/src/site.ts
var site2 = window.site;
site2.sri = randomToken();
site2.displayLocale = displayLocale;
site2.blindMode = document.body.classList.contains("blind-mode");
site2.mousetrap = new Mousetrap(document);
site2.powertip = powertip_default;
site2.asset = asset_exports;
site2.unload = unload;
site2.redirect = redirect;
site2.reload = reload;
site2.announce = display;
site2.sound = sound_default;
window.lichess = api;
loadPolyfills();
fixBrowserStyle();
addWindowHandlers();
site2.load.then(boot);
//# sourceMappingURL=site.YWY3PQTQ.js.map

import {
  get,
  set
} from "./lib.OGKZ2C6M.js";
import {
  allTimeModeKeys,
  blindModeColorPicker,
  colorButtons,
  option,
  timeControlFromStoredValues,
  timeModes,
  timePickerAndSliders
} from "./lib.WVEXC6VT.js";
import {
  colors
} from "./lib.LXQPVRII.js";
import {
  perfIcons_default
} from "./lib.ZXVUOO3F.js";
import "./lib.67VUYMDO.js";
import "./lib.GD6YSPBF.js";
import {
  numberFormat,
  timeago
} from "./lib.EAANXKAK.js";
import {
  require_dist
} from "./lib.BWJ4DVGT.js";
import {
  a,
  alert,
  button,
  confirm,
  div,
  enter,
  icon,
  initMiniBoard,
  makeExoticTag,
  snabDialog,
  span,
  spinnerVdom,
  table,
  tbody,
  td,
  th,
  thead,
  time,
  tr
} from "./lib.MYPIOGN5.js";
import "./lib.LRP46MC3.js";
import "./lib.HMFK7OOB.js";
import "./lib.AEOHBIQD.js";
import "./lib.RPQH5UYI.js";
import "./lib.XAEDCBGD.js";
import {
  INITIAL_FEN
} from "./lib.X7H2PLEK.js";
import "./lib.53PYQRAK.js";
import "./lib.CAO7TYYH.js";
import {
  idleTimer,
  wsConnect,
  wsPingInterval
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
  eventListenersModule,
  h,
  init,
  propsModule,
  thunk
} from "./lib.LWF5S4ZV.js";
import {
  pubsub
} from "./lib.QPQZCXK2.js";
import {
  licon
} from "./lib.5I4BSVKX.js";
import {
  form,
  json,
  text,
  textRaw,
  url
} from "./lib.TT4QSUKQ.js";
import {
  debounce,
  storage,
  storedJsonProp
} from "./lib.NFSQQWN5.js";
import {
  frag,
  propWithEffect,
  requestIdleCallbackSafe,
  toggle
} from "./lib.GMEH5BEF.js";
import {
  __toESM
} from "./lib.KO2KTNGK.js";

// ../lobby/src/form.ts
var toFormLines = (form2) => Array.from(new FormData(form2).entries()).filter(([k]) => !k.includes("_range")).reduce((o, [k, v]) => typeof v === "string" ? (o[k] = v, o) : o, {});
var toFormObject = (lines) => Object.keys(lines).reduce((o, k) => {
  const i = k.indexOf("[");
  const fk = i > 0 ? k.slice(0, i) : k;
  return i > 0 ? { ...o, [fk]: [...o[fk] || [], lines[k]] } : { ...o, [fk]: lines[k] };
}, {});
var makeStore = (storage2) => ({
  get: () => JSON.parse(storage2.get() || "null"),
  set: (lines) => storage2.set(JSON.stringify(lines)),
  remove: () => storage2.remove()
});

// ../lobby/src/filter.ts
var Filter = class {
  // used to force re-init of filter UI
  constructor(storage2, root) {
    this.root = root;
    this.open = false;
    this.uiCacheBuster = 1;
    this.toggle = () => {
      this.open = !this.open;
    };
    this.set = (data) => {
      this.data = data && {
        form: data,
        filter: toFormObject(data)
      };
    };
    this.save = (form2) => {
      const lines = form2 && toFormLines(form2);
      if (lines) this.store.set(lines);
      else this.store.remove();
      this.set(lines);
      this.root.onSetFilter();
    };
    this.filter = (hooks2) => {
      var _a;
      if (!this.data) return { visible: hooks2, hidden: 0 };
      const f = this.data.filter, ratingRange = (_a = f.ratingRange) == null ? void 0 : _a.split("-").map((r) => parseInt(r, 10)), seen = [], visible = [];
      let variant, hidden = 0;
      hooks2.forEach((hook) => {
        var _a2, _b, _c, _d;
        variant = hook.variant;
        if (hook.action === "cancel") visible.push(hook);
        else {
          if (!((_a2 = f.variant) == null ? void 0 : _a2.includes(variant)) || !((_b = f.speed) == null ? void 0 : _b.includes((hook.s || 1).toString())) || ((_c = f.mode) == null ? void 0 : _c.length) === 1 && f.mode[0] !== (hook.ra || 0).toString() || ((_d = f.increment) == null ? void 0 : _d.length) === 1 && f.increment[0] !== hook.i.toString() || ratingRange && (!hook.rating || hook.rating < ratingRange[0] || hook.rating > ratingRange[1])) {
            hidden++;
          } else {
            const hash = hook.ra + variant + hook.t + hook.rating;
            if (!seen.includes(hash)) visible.push(hook);
            seen.push(hash);
          }
        }
      });
      return { visible, hidden };
    };
    this.store = makeStore(storage2);
    this.set(this.store.get());
  }
};

// ../lobby/src/hookRepo.ts
function ratingOrder(a2, b) {
  return (a2.rating || 0) > (b.rating || 0) ? -1 : 1;
}
function timeOrder(a2, b) {
  return a2.t < b.t ? -1 : 1;
}
function sort(ctrl, hooks2) {
  hooks2.sort(ctrl.sort === "time" ? timeOrder : ratingOrder);
}
function init2(hook) {
  hook.action = hook.sri === site.sri ? "cancel" : "join";
  hook.variant = hook.variant || "standard";
}
function initAll(ctrl) {
  ctrl.data.hooks.forEach(init2);
}
function add(ctrl, hook) {
  init2(hook);
  ctrl.data.hooks.push(hook);
}
function setAll(ctrl, hooks2) {
  ctrl.data.hooks = hooks2;
  initAll(ctrl);
}
function remove(ctrl, id) {
  ctrl.data.hooks = ctrl.data.hooks.filter((h2) => h2.id !== id);
  ctrl.stepHooks.forEach((h2) => {
    if (h2.id === id) h2.disabled = true;
  });
}
function syncIds(ctrl, ids) {
  ctrl.data.hooks = ctrl.data.hooks.filter((h2) => ids.includes(h2.id));
}
function find(ctrl, id) {
  return ctrl.data.hooks.find((h2) => h2.id === id);
}

// ../lobby/src/seekRepo.ts
function sort2(ctrl) {
  ctrl.data.seeks.sort((a2, b) => a2.rating > b.rating ? -1 : 1);
}
function initAll2(ctrl) {
  ctrl.data.seeks.forEach((seek) => {
    seek.action = ctrl.me && seek.username === ctrl.me.username ? "cancelSeek" : "joinSeek";
  });
  sort2(ctrl);
}
function find2(ctrl, id) {
  return ctrl.data.seeks.find((s) => s.id === id);
}

// ../lobby/src/options.ts
var variants = [
  {
    id: 1,
    icon: licon.CrownElite,
    key: "standard",
    name: i18n.variant.standard,
    description: i18n.variant.standardTitle
  },
  {
    id: 2,
    icon: licon.DieSix,
    key: "chess960",
    name: i18n.variant.chess960,
    description: i18n.variant.chess960Title
  },
  {
    id: 4,
    icon: licon.FlagKingHill,
    key: "kingOfTheHill",
    name: i18n.variant.kingOfTheHill,
    description: i18n.variant.kingOfTheHillTitle
  },
  {
    id: 5,
    icon: licon.ThreeCheckStack,
    key: "threeCheck",
    name: i18n.variant.threeCheck,
    description: i18n.variant.threeCheckTitle
  },
  {
    id: 10,
    icon: licon.Crazyhouse,
    key: "crazyhouse",
    name: i18n.variant.crazyhouse,
    description: i18n.variant.crazyhouseTitle
  },
  {
    id: 6,
    icon: licon.Antichess,
    key: "antichess",
    name: i18n.variant.antichess,
    description: i18n.variant.antichessTitle
  },
  {
    id: 7,
    icon: licon.Atom,
    key: "atomic",
    name: i18n.variant.atomic,
    description: i18n.variant.atomicTitle
  },
  { id: 8, icon: licon.Keypad, key: "horde", name: i18n.variant.horde, description: i18n.variant.hordeTitle },
  {
    id: 9,
    icon: licon.FlagRacingKings,
    key: "racingKings",
    name: i18n.variant.racingKings,
    description: i18n.variant.racingKingsTitle
  },
  {
    id: 3,
    icon: licon.Pencil,
    key: "fromPosition",
    name: i18n.variant.fromPosition,
    description: i18n.variant.fromPositionTitle
  }
];
var variantsForGameType = (baseVariants, gameType) => gameType === "hook" ? baseVariants.filter(({ key }) => key !== "fromPosition") : baseVariants;
var variantsWhereWhiteIsBetter = [
  "antichess",
  "atomic",
  "horde",
  "racingKings",
  "threeCheck"
];
var speeds = [
  { icon: licon.UltraBullet, key: "ultraBullet", name: i18n.site.ultraBullet },
  { icon: licon.Bullet, key: "bullet", name: i18n.site.bullet },
  { icon: licon.FlameBlitz, key: "blitz", name: i18n.site.blitz },
  { icon: licon.Rabbit, key: "rapid", name: i18n.site.rapid },
  { icon: licon.Turtle, key: "classical", name: i18n.site.classical },
  { icon: licon.PaperAirplane, key: "correspondence", name: i18n.site.correspondence }
];
var keyToId = (key, items) => items.find((item) => item.key === key).id;
var gameModes = [
  { key: "casual", name: i18n.site.casual },
  { key: "rated", name: i18n.site.rated }
];

// ../lobby/src/setupCtrl.ts
var getPerf = (variant, tc) => variant !== "standard" && variant !== "fromPosition" ? variant : tc.speed();
var SetupController = class {
  constructor(ctrl) {
    this.gameType = null;
    this.lastValidFen = "";
    this.fenError = false;
    this.friendUser = "";
    this.loading = false;
    this.variantMenuOpen = toggle(false);
    // Namespace the store by username for user specific modal settings
    this.storeKey = (gameType) => {
      var _a;
      return `lobby.setup.${((_a = this.root.me) == null ? void 0 : _a.username) || "anon"}.${gameType}`;
    };
    this.makeSetupStore = (gameType) => storedJsonProp(this.storeKey(gameType), () => ({
      variant: "standard",
      fen: "",
      timeMode: gameType === "hook" ? "realTime" : "unlimited",
      time: 5,
      increment: 3,
      days: 2,
      gameMode: gameType === "ai" || !this.root.me ? "casual" : "rated",
      color: "random",
      ratingMin: -500,
      ratingMax: 500,
      aiLevel: 1
    }));
    this.loadPropsFromStore = (forceOptions) => {
      var _a, _b, _c, _d;
      const storeProps = this.store[this.gameType]();
      this.variant = propWithEffect((forceOptions == null ? void 0 : forceOptions.variant) || storeProps.variant, this.onDropdownChange);
      this.fen = this.propWithApply((forceOptions == null ? void 0 : forceOptions.fen) || storeProps.fen);
      const canChangeTimeMode = !!this.root.me || this.gameType !== "hook";
      this.timeControl = timeControlFromStoredValues(
        propWithEffect((forceOptions == null ? void 0 : forceOptions.timeMode) || storeProps.timeMode, this.onDropdownChange),
        canChangeTimeMode ? allTimeModeKeys : ["realTime"],
        (_a = forceOptions == null ? void 0 : forceOptions.time) != null ? _a : storeProps.time,
        (_b = forceOptions == null ? void 0 : forceOptions.increment) != null ? _b : storeProps.increment,
        (_c = forceOptions == null ? void 0 : forceOptions.days) != null ? _c : storeProps.days,
        this.onPropChange,
        this.root.pools
      );
      this.gameMode = this.propWithApply((_d = forceOptions == null ? void 0 : forceOptions.mode) != null ? _d : storeProps.gameMode);
      this.ratingMin = this.propWithApply(storeProps.ratingMin);
      this.ratingMax = this.propWithApply(storeProps.ratingMax);
      this.aiLevel = this.propWithApply(storeProps.aiLevel);
      this.color((forceOptions == null ? void 0 : forceOptions.color) || storeProps.color || "random");
      this.enforcePropRules();
      this.savePropsToStore();
    };
    this.enforcePropRules = () => {
      if (this.variant() === "fromPosition") this.fen = this.propWithApply(this.fen().replace(/_/g, " "));
      if (this.gameMode() === "rated" && this.ratedModeDisabled()) {
        this.gameMode = this.propWithApply("casual");
      }
      this.ratingMin = this.propWithApply(Math.min(0, this.ratingMin()));
      this.ratingMax = this.propWithApply(Math.max(0, this.ratingMax()));
      if (this.ratingMin() === 0 && this.ratingMax() === 0) {
        this.ratingMax = this.propWithApply(50);
      }
    };
    this.savePropsToStore = (override = {}) => {
      var _a, _b, _c;
      if (!this.gameType) return;
      const prevSetup = ((_a = this.forced) == null ? void 0 : _a.fen) ? this.store[this.gameType]() : void 0;
      this.store[this.gameType]({
        variant: (_b = prevSetup == null ? void 0 : prevSetup.variant) != null ? _b : this.variant(),
        fen: (_c = prevSetup == null ? void 0 : prevSetup.fen) != null ? _c : this.fen(),
        timeMode: this.timeControl.mode(),
        time: this.timeControl.time(),
        increment: this.timeControl.increment(),
        days: this.timeControl.days(),
        gameMode: this.gameMode(),
        color: this.color(),
        ratingMin: this.ratingMin(),
        ratingMax: this.ratingMax(),
        aiLevel: this.aiLevel(),
        ...override
      });
    };
    this.savePropsToStoreExceptRating = () => this.gameType && this.savePropsToStore({
      ratingMin: this.store[this.gameType]().ratingMin,
      ratingMax: this.store[this.gameType]().ratingMax
    });
    this.myRating = () => this.root.data.ratingMap && Math.abs(this.root.data.ratingMap[this.selectedPerf()]);
    this.isProvisional = () => this.root.data.ratingMap ? this.root.data.ratingMap[this.selectedPerf()] < 0 : true;
    this.onPropChange = () => {
      if (this.isProvisional()) this.savePropsToStoreExceptRating();
      else this.savePropsToStore();
      this.root.redraw();
    };
    this.onDropdownChange = () => {
      this.enforcePropRules();
      if (this.isProvisional()) {
        this.ratingMin(-500);
        this.ratingMax(500);
        this.savePropsToStoreExceptRating();
      } else {
        if (this.gameType) {
          this.ratingMin(this.store[this.gameType]().ratingMin);
          this.ratingMax(this.store[this.gameType]().ratingMax);
        }
        this.savePropsToStore();
      }
      this.root.redraw();
    };
    this.propWithApply = (value) => propWithEffect(value, this.onPropChange);
    this.openModal = (gameType, forceOptions, friendUser) => {
      this.root.leavePool();
      this.gameType = gameType;
      this.loading = false;
      this.fenError = false;
      this.lastValidFen = "";
      this.friendUser = friendUser || "";
      this.variantMenuOpen(false);
      this.forced = forceOptions;
      this.loadPropsFromStore(forceOptions);
    };
    // managed by view/setup/modal.ts
    this.toggleVariantMenu = () => {
      this.variantMenuOpen.toggle();
      this.root.redraw();
    };
    this.validateFen = debounce(() => {
      const fen = this.fen();
      if (!fen) return;
      text(
        url("/setup/validate-fen", {
          fen,
          strict: this.gameType === "ai" ? 1 : void 0
        })
      ).then(
        () => {
          this.fenError = false;
          this.lastValidFen = fen;
          this.root.redraw();
        },
        () => {
          this.fenError = true;
          this.root.redraw();
        }
      );
    }, 300);
    this.ratedModeDisabled = () => (
      // anonymous games cannot be rated
      !this.root.me || this.timeControl.mode() === "unlimited" || this.variant() === "fromPosition" && this.fen() !== INITIAL_FEN || // variants with very low time cannot be rated
      this.variant() !== "standard" && this.timeControl.notForRatedVariant()
    );
    this.selectedPerf = () => getPerf(this.variant(), this.timeControl);
    this.ratingRange = () => {
      const rating = this.myRating();
      return rating ? `${Math.max(100, rating + this.ratingMin())}-${rating + this.ratingMax()}` : "";
    };
    this.hookToPoolMember = (color) => {
      const valid = color === "random" && this.gameType === "hook" && this.variant() === "standard" && this.gameMode() === "rated" && this.timeControl.isRealTime();
      const id = this.timeControl.clockStr();
      return valid && this.root.pools.some((p) => p.id === id) ? {
        id,
        range: this.ratingRange()
      } : null;
    };
    this.propsToFormData = (color) => form({
      variant: keyToId(this.variant(), variants).toString(),
      fen: this.variant() === "fromPosition" ? this.fen() : void 0,
      timeMode: keyToId(this.timeControl.mode(), timeModes).toString(),
      time: this.timeControl.time().toString(),
      time_range: this.timeControl.timeV().toString(),
      increment: this.timeControl.increment().toString(),
      increment_range: this.timeControl.incrementV().toString(),
      days: this.timeControl.days().toString(),
      days_range: this.timeControl.daysV().toString(),
      mode: this.gameMode() === "casual" ? "0" : "1",
      ratingRange: this.ratingRange(),
      ratingRange_range_min: this.ratingMin().toString(),
      ratingRange_range_max: this.ratingMax().toString(),
      level: this.aiLevel().toString(),
      color
    });
    this.validFen = () => this.variant() !== "fromPosition" || !this.fenError && !!this.fen();
    this.valid = () => this.validFen() && this.timeControl.valid(this.minimumTimeIfReal()) && this.validConstraints();
    this.invalid = (forced, current) => forced !== void 0 && forced !== current;
    this.validConstraints = () => {
      var _a;
      if (this.forced) {
        if (this.invalid(this.forced.variant, this.variant())) return false;
        if (this.invalid(this.forced.mode, this.gameMode())) return false;
        if (this.invalid(this.forced.timeMode, this.timeControl.mode())) return false;
        if (this.invalid(this.forced.color, this.color())) return false;
        if (this.timeControl.mode() === "correspondence" && this.invalid(this.forced.days, this.timeControl.days()))
          return false;
        if (this.timeControl.mode() === "realTime") {
          if (this.invalid(this.forced.time, this.timeControl.time())) return false;
          if (this.invalid(this.forced.increment, this.timeControl.increment())) return false;
        }
        if (this.invalid((_a = this.forced.fen) == null ? void 0 : _a.replace(/_/g, " "), this.fen())) return false;
      }
      return true;
    };
    this.minimumTimeIfReal = () => this.gameType === "ai" && this.variant() === "fromPosition" ? 1 : 0;
    this.submit = async () => {
      var _a, _b, _c;
      const color = this.color();
      const poolMember = this.hookToPoolMember(color);
      if (poolMember) {
        this.root.enterPool(poolMember);
        (_a = this.closeModal) == null ? void 0 : _a.call(this);
        return;
      }
      if (this.gameType === "hook") this.root.setTab(this.timeControl.isRealTime() ? "real_time" : "seeks");
      this.loading = true;
      this.root.redraw();
      let urlPath = `/setup/${this.gameType}`;
      if (this.gameType === "hook") urlPath += `/${site.sri}`;
      const urlParams = { user: this.friendUser || void 0 };
      let response;
      try {
        response = await textRaw(url(urlPath, urlParams), {
          method: "post",
          body: this.propsToFormData(color)
        });
      } catch (_) {
        this.loading = false;
        this.root.redraw();
        await alert("Sorry, we encountered an error while creating your game. Please try again.");
        return;
      }
      const { ok, redirected, url: url2 } = response;
      if (!ok) {
        const errs = await response.json();
        await alert(
          errs ? Object.keys(errs).map((k) => `${k}: ${errs[k]}`).join("\n") : "Invalid setup"
        );
        if (response.status === 403) {
          (_b = this.closeModal) == null ? void 0 : _b.call(this);
        }
      } else if (redirected) {
        location.href = url2;
      } else {
        this.loading = false;
        (_c = this.closeModal) == null ? void 0 : _c.call(this);
      }
    };
    this.root = ctrl;
    this.color = propWithEffect("random", this.onPropChange);
    this.store = {
      hook: this.makeSetupStore("hook"),
      friend: this.makeSetupStore("friend"),
      ai: this.makeSetupStore("ai")
    };
  }
};

// ../lobby/src/socket.ts
var LobbySocket = class {
  constructor(send, ctrl) {
    this.send = send;
    this.receive = (tpe, data) => {
      if (this.handlers[tpe]) {
        this.handlers[tpe](data);
        return true;
      }
      return false;
    };
    this.handlers = {
      had(hook) {
        add(ctrl, hook);
        if (hook.action === "cancel") ctrl.flushHooks(true);
        ctrl.redraw();
      },
      hrm(ids) {
        ids.match(/.{8}/g).forEach(function(id) {
          remove(ctrl, id);
        });
        ctrl.redraw();
      },
      hooks(hooks2) {
        setAll(ctrl, hooks2);
        ctrl.flushHooks(true);
        ctrl.redraw();
      },
      hli(ids) {
        syncIds(ctrl, ids.match(/.{8}/g) || []);
        ctrl.redraw();
      },
      reload_seeks() {
        if (ctrl.tab === "seeks") ctrl.fetchSeeks();
      }
    };
    idleTimer(
      3 * 60 * 1e3,
      () => send("idle", true),
      () => {
        send("idle", false);
        ctrl.awake();
      }
    );
  }
  realTimeIn() {
    this.send("hookIn");
  }
  realTimeOut() {
    this.send("hookOut");
  }
  poolIn(member) {
    this.send("poolIn", member, {}, true);
  }
  poolOut(member) {
    this.send("poolOut", member.id);
  }
};

// ../lobby/src/store.ts
function isTab(value) {
  return value === "pools" || value === "real_time" || value === "seeks" || value === "now_playing";
}
function isMode(value) {
  return value === "list" || value === "chart";
}
function isSort(value) {
  return value === "rating" || value === "time";
}
var tab = {
  key: "lobby.tab",
  fix(t) {
    if (isTab(t)) return t;
    return "pools";
  }
};
var mode = {
  key: "lobby.mode",
  fix(m) {
    if (isMode(m)) return m;
    return "list";
  }
};
var sort3 = {
  key: "lobby.sort",
  fix(s) {
    if (isSort(s)) return s;
    return "rating";
  }
};
function makeStore2(conf, userId) {
  const fullKey = conf.key + ":" + (userId || "-");
  return {
    set(v) {
      const t = conf.fix(v);
      storage.set(fullKey, String(t));
      return t;
    },
    get() {
      return conf.fix(storage.get(fullKey));
    }
  };
}
function make(userId) {
  return {
    tab: makeStore2(tab, userId),
    mode: makeStore2(mode, userId),
    sort: makeStore2(sort3, userId)
  };
}

// ../lobby/src/variant.ts
var variantConfirms = {
  chess960: `${i18n.variant.chess960}

${i18n.variant.chess960Title}`,
  kingOfTheHill: `${i18n.variant.kingOfTheHill}

${i18n.variant.kingOfTheHillTitle}`,
  threeCheck: `${i18n.variant.threeCheck}

${i18n.variant.threeCheckTitle}`,
  antichess: `${i18n.variant.antichess}

${i18n.variant.antichessTitle}`,
  atomic: `${i18n.variant.atomic}

${i18n.variant.atomicTitle}`,
  horde: `${i18n.variant.horde}

${i18n.variant.hordeTitle}`,
  racingKings: `${i18n.variant.racingKings}

${i18n.variant.racingKingsTitle}`,
  crazyhouse: `${i18n.variant.crazyhouse}

${i18n.variant.crazyhouseTitle}`
};
var storageKey = (key) => "lobby.variant." + key;
async function variant_default(variant) {
  if (!variant || !variantConfirms[variant] || storage.get(storageKey(variant))) return true;
  const confirmed = await confirm(variantConfirms[variant]);
  if (confirmed) storage.set(storageKey(variant), "1");
  return confirmed;
}

// ../lobby/src/xhr.ts
var import_debounce_promise = __toESM(require_dist(), 1);
var seeks = (0, import_debounce_promise.default)(() => json("/lobby/seeks"), 3e3, { leading: true });
var nowPlaying = () => json("/account/now-playing");
var anonPoolSeek = (pool) => json("/setup/hook/" + site.sri, {
  method: "POST",
  body: form({
    variant: 1,
    timeMode: 1,
    time: pool.lim,
    increment: pool.inc,
    days: 1,
    color: "random"
  })
});

// ../lobby/src/ctrl.ts
var LobbyController = class {
  constructor(opts, redraw) {
    this.opts = opts;
    this.redraw = redraw;
    this.stepHooks = [];
    this.stepping = false;
    this.redirecting = false;
    this.alreadyWatching = [];
    this.initNumberSpreader = (elm, nbSteps, initialCount) => {
      let previous = initialCount;
      let timeouts = [];
      const display = (prev, cur, it) => {
        elm.textContent = numberFormat(Math.round((prev * (nbSteps - 1 - it) + cur * (it + 1)) / nbSteps));
      };
      return (nb) => {
        if (!nb && nb !== 0) return;
        timeouts.forEach(clearTimeout);
        timeouts = [];
        const interv = Math.abs(wsPingInterval() / nbSteps);
        const prev = previous || nb;
        previous = nb;
        for (let i = 0; i < nbSteps; i++)
          timeouts.push(setTimeout(() => display(prev, nb, i), Math.round(i * interv)));
      };
    };
    this.flushHooks = (now) => {
      if (this.flushHooksTimeout) clearTimeout(this.flushHooksTimeout);
      if (now) this.doFlushHooks();
      else {
        this.stepping = true;
        if (this.tab === "real_time") this.redraw();
        setTimeout(() => {
          this.stepping = false;
          this.doFlushHooks();
        }, 500);
      }
      this.flushHooksTimeout = this.flushHooksSchedule();
    };
    this.flushHooksSchedule = () => setTimeout(this.flushHooks, 8e3);
    this.setTab = (tab3) => {
      if (tab3 !== this.tab) {
        if (tab3 === "seeks") this.fetchSeeks();
        else if (tab3 === "real_time") this.socket.realTimeIn();
        else if (this.tab === "real_time") {
          this.socket.realTimeOut();
          this.data.hooks = [];
        }
        this.tab = this.stores.tab.set(tab3);
        this.redraw();
      }
      this.filter.open = false;
    };
    this.setMode = (mode2) => {
      this.mode = this.stores.mode.set(mode2);
      this.filter.open = false;
    };
    this.setSort = (sort4) => {
      this.sort = this.stores.sort.set(sort4);
    };
    this.onSetFilter = () => {
      this.flushHooks(true);
      if (this.tab !== "real_time") this.redraw();
    };
    this.clickHook = async (id) => {
      const hook = find(this, id);
      if (!hook || hook.disabled || this.stepping || this.redirecting) return;
      if (hook.action === "cancel" || await variant_default(hook.variant))
        this.socket.send(hook.action, hook.id);
    };
    this.clickSeek = async (id) => {
      var _a;
      const seek = find2(this, id);
      if (!seek || this.redirecting) return;
      if (seek.action === "cancelSeek" || await variant_default((_a = seek.variant) == null ? void 0 : _a.key))
        this.socket.send(seek.action, seek.id);
    };
    this.fetchSeeks = async () => {
      this.data.seeks = await seeks();
      initAll2(this);
      this.redraw();
    };
    this.clickPool = (id) => {
      var _a;
      if (!this.me) {
        anonPoolSeek(this.pools.find((p) => p.id === id));
        this.setTab("real_time");
      } else if (((_a = this.poolMember) == null ? void 0 : _a.id) === id) this.leavePool();
      else this.enterPool({ id });
      this.redraw();
    };
    this.enterPool = (member) => {
      var _a;
      set((_a = this.me) == null ? void 0 : _a.username, member.id, member.range);
      this.setTab("pools");
      this.poolMember = member;
      this.poolIn();
      site.mousetrap.bind(
        "esc",
        () => {
          this.leavePool();
          this.redraw();
        },
        void 0,
        false
      );
    };
    this.leavePool = () => {
      if (!this.poolMember) return;
      this.socket.poolOut(this.poolMember);
      this.poolMember = void 0;
    };
    this.poolIn = () => {
      if (!this.poolMember) return;
      this.poolInStorage.fire();
      this.socket.poolIn(this.poolMember);
    };
    this.hasOngoingRealTimeGame = (requireTurn) => this.data.nowPlaying.some(
      (nowPlaying2) => nowPlaying2.speed !== "correspondence" && (nowPlaying2.isMyTurn || !requireTurn) && !nowPlaying2.opponent.ai
    );
    this.gameActivity = (gameId) => {
      if (this.data.nowPlaying.some((p) => p.gameId === gameId))
        nowPlaying().then((res) => {
          this.data.nowPlaying = res.nowPlaying;
          this.data.nbMyTurn = res.nbMyTurn;
          this.startWatching();
          this.redraw();
        });
    };
    this.setRedirecting = () => {
      this.redirecting = true;
      setTimeout(() => {
        this.redirecting = false;
        this.redraw();
      }, 4e3);
      this.redraw();
    };
    this.awake = () => {
      switch (this.tab) {
        case "real_time":
          this.data.hooks = [];
          this.socket.realTimeIn();
          break;
        case "seeks":
          this.fetchSeeks();
          break;
      }
    };
    // after click on round "new opponent" button
    // also handles onboardink link for anon users
    this.joinPoolFromLocationHash = () => {
      var _a;
      if (location.hash.startsWith("#pool/")) {
        const regex = /^#pool\/(\d+\+\d+)(?:\/(.+))?$/, match = regex.exec(location.hash), member = { id: match[1], blocking: match[2] }, range = get((_a = this.me) == null ? void 0 : _a.username, member.id);
        if (range) member.range = range;
        if (match) {
          this.setTab("pools");
          if (this.me) this.enterPool(member);
          else setTimeout(() => this.clickPool(member.id), 1500);
          history.replaceState(null, "", "/");
        }
      }
    };
    var _a, _b, _c;
    this.data = {
      ...opts.data,
      hooks: [],
      seeks: []
    };
    this.me = opts.data.me;
    this.pools = opts.pools;
    this.playban = opts.playban;
    this.filter = new Filter(storage.make("lobby.filter"), this);
    this.setupCtrl = new SetupController(this);
    initAll(this);
    initAll2(this);
    this.socket = new LobbySocket(opts.socketSend, this);
    this.stores = make((_a = this.me) == null ? void 0 : _a.username.toLowerCase());
    if ((_b = this.me) == null ? void 0 : _b.isBot) this.tab = "now_playing";
    else {
      if (this.stores.tab.get() === "now_playing" && this.data.nbNowPlaying === 0)
        this.stores.tab.set("pools");
      else if (this.hasOngoingRealTimeGame(false)) this.stores.tab.set("now_playing");
      this.tab = this.stores.tab.get();
    }
    this.mode = this.stores.mode.get();
    this.sort = this.me ? this.stores.sort.get() : "time";
    const locationHash = location.hash.replace("#", "");
    if (["ai", "friend", "hook"].includes(locationHash)) {
      const forceOptions = {};
      const urlParams = new URLSearchParams(location.search);
      const friendUser = (_c = urlParams.get("user")) != null ? _c : void 0;
      const variant = urlParams.get("variant");
      if (variant) forceOptions.variant = variant;
      if (locationHash !== "hook" && urlParams.get("fen")) {
        forceOptions.fen = urlParams.get("fen");
        forceOptions.variant = "fromPosition";
      }
      let timeMode = urlParams.get("time");
      const days = urlParams.get("days");
      const minutesPerSide = urlParams.get("minutesPerSide");
      const increment = urlParams.get("increment");
      if (!timeMode) {
        if (days) timeMode = "correspondence";
        else if (minutesPerSide || increment) timeMode = "realTime";
      }
      if (timeMode === "correspondence") {
        forceOptions.timeMode = "correspondence";
        if (days) forceOptions.days = parseInt(days);
        if (locationHash === "hook") this.tab = "seeks";
      } else if (timeMode === "realTime") {
        forceOptions.timeMode = "realTime";
        if (minutesPerSide) forceOptions.time = parseFloat(minutesPerSide);
        if (increment) forceOptions.increment = parseInt(increment);
        if (locationHash === "hook") this.tab = "real_time";
      } else if (timeMode === "unlimited") {
        if (locationHash === "hook") this.tab = "seeks";
        forceOptions.timeMode = "unlimited";
        forceOptions.mode = "casual";
      }
      if (locationHash === "hook" || locationHash === "friend") {
        const gameMode = urlParams.get("gameMode");
        if (gameMode === "casual" || gameMode === "rated") {
          forceOptions.mode = gameMode;
        }
      }
      const color = urlParams.get("color");
      if (color && colors.some((c) => c.key === color)) {
        forceOptions.color = color;
      }
      pubsub.after("polyfill.dialog").then(() => {
        this.setupCtrl.openModal(locationHash, forceOptions, friendUser);
        redraw();
      });
      history.replaceState(null, "", "/");
    }
    this.poolInStorage = storage.make("lobby.pool-in");
    this.poolInStorage.listen((_) => {
      this.leavePool();
      redraw();
    });
    this.flushHooksSchedule();
    this.startWatching();
    if (this.playban) {
      if (this.playban.remainingSeconds < 86400)
        setTimeout(site.reload, this.playban.remainingSeconds * 1e3);
    } else {
      setInterval(() => {
        if (this.poolMember) this.poolIn();
        else if (this.tab === "real_time" && !this.data.hooks.length) this.socket.realTimeIn();
      }, 10 * 1e3);
      this.joinPoolFromLocationHash();
    }
    pubsub.on("socket.open", () => {
      if (this.tab === "real_time") {
        this.data.hooks = [];
        this.socket.realTimeIn();
      } else if (this.tab === "pools" && this.poolMember) this.poolIn();
      else if (this.tab === "seeks") this.fetchSeeks();
    });
    window.addEventListener("beforeunload", () => this.leavePool());
  }
  doFlushHooks() {
    this.stepHooks = this.data.hooks.slice(0);
    if (this.tab === "real_time") this.redraw();
  }
  startWatching() {
    const newIds = this.data.nowPlaying.map((p) => p.gameId).filter((id) => !this.alreadyWatching.includes(id));
    if (newIds.length) {
      setTimeout(() => this.socket.send("startWatching", newIds.join(" ")), 2e3);
      newIds.forEach((id) => this.alreadyWatching.push(id));
    }
  }
};

// ../lobby/src/view/carousel.ts
function makeCarousel({ selector, itemWidth, pauseFor, slideFor = 0.6 }) {
  let timer2 = void 0;
  requestIdleCallbackSafe(() => {
    const el = document.querySelector(selector);
    if (!el) return;
    const track = el.querySelector(".carousel__track");
    onResize();
    el.style.visibility = "visible";
    document.querySelector(".lobby__support").style.visibility = "visible";
    window.addEventListener("resize", onResize);
    function onResize() {
      const kids = [...track.children].filter((k) => k instanceof HTMLElement);
      const styleGap = toPx("gap", el);
      const gap = Number.isNaN(styleGap) ? 0 : styleGap;
      const visible = Math.floor((el.clientWidth + gap) / (itemWidth + gap));
      const itemW = (el.clientWidth - gap * (visible - 1)) / visible;
      kids.forEach((k) => k.style.width = `${itemW}px`);
      kids.forEach((k) => k.style.marginRight = `${gap}px`);
      const rotateForwards = () => {
        kids.forEach((k) => k.style.transition = `transform ${slideFor}s ease`);
        kids.forEach((k) => k.style.transform = `translateX(-${itemW + gap}px)`);
        setTimeout(() => {
          track.append(track.firstChild);
          fix(false);
        }, slideFor * 1e3);
      };
      $(el).off("click.carousel").on("click.carousel", ".carousel__prev", () => {
        track.prepend(track.lastChild);
        fix();
      }).on("click.carousel", ".carousel__next", () => {
        track.append(track.firstChild);
        fix();
      });
      const fix = (killTimer = true) => {
        kids.forEach((k) => k.style.transition = "");
        kids.forEach((k) => k.style.transform = "");
        if (killTimer) clearInterval(timer2);
      };
      fix();
      if (kids.length > visible) timer2 = setInterval(rotateForwards, pauseFor * 1e3);
    }
  });
}
function toPx(key, contextEl = document.body) {
  const style = window.getComputedStyle(contextEl);
  const el = frag(`<div style="position:absolute;visibility:hidden;width:${style[key]}"/>`);
  contextEl.append(el);
  const pixels = parseFloat(window.getComputedStyle(el).width);
  el.remove();
  return pixels;
}

// ../lobby/src/view/util.ts
var perfNames = {
  ultraBullet: i18n.site.ultraBullet,
  bullet: i18n.site.bullet,
  blitz: i18n.site.blitz,
  rapid: i18n.site.rapid,
  classical: i18n.site.classical,
  correspondence: i18n.site.correspondence,
  racingKings: i18n.variant.racingKings,
  threeCheck: i18n.variant.threeCheck,
  antichess: i18n.variant.antichess,
  horde: i18n.variant.horde,
  atomic: i18n.variant.atomic,
  crazyhouse: i18n.variant.crazyhouse,
  chess960: i18n.variant.chess960,
  kingOfTheHill: i18n.variant.kingOfTheHill
};

// ../lobby/src/view/correspondence.ts
function renderSeek(ctrl, seek) {
  const isJoinAction = seek.action === "joinSeek";
  return tr(
    `.seek.${isJoinAction ? "join" : "cancel"}`,
    {
      key: seek.id,
      role: "button",
      title: isJoinAction ? i18n.site.joinTheGame + " - " + perfNames[seek.perf.key] : i18n.site.cancel,
      "data-id": seek.id
    },
    [
      td(seek.rating ? span(".ulpt", { "data-href": "/@/" + seek.username }, seek.username) : "Anonymous"),
      td(seek.rating && ctrl.opts.showRatings ? seek.rating + (seek.provisional ? "?" : "") : ""),
      td(seek.days ? i18n.site.nbDays(seek.days) : "\u221E"),
      td([icon(perfIcons_default[seek.perf.key])(".varicon"), seek.mode === 1 ? i18n.site.rated : i18n.site.casual])
    ]
  );
}
function createSeek(ctrl) {
  if (ctrl.me && ctrl.data.seeks.length >= 8) return void 0;
  return div(".create", [
    button(
      ".button",
      {
        hook: bind(
          "click",
          () => ctrl.setupCtrl.openModal("hook", { variant: "standard", timeMode: "correspondence" }),
          ctrl.redraw
        )
      },
      i18n.site.createAGame
    )
  ]);
}
function correspondence_default(ctrl) {
  return [
    table(".hooks__list", [
      thead(tr(["player", "rating", "time", "mode"].map((k) => th(i18n.site[k])))),
      tbody(
        {
          hook: bind("click", async (e) => {
            let el = e.target;
            do {
              el = el.parentNode;
              if (el.nodeName === "TR") {
                if (!ctrl.me) {
                  if (await confirm(i18n.site.youNeedAnAccountToDoThat, i18n.site.signUp, i18n.site.cancel))
                    location.href = "/signup";
                  return;
                }
                return ctrl.clickSeek(el.dataset["id"]);
              }
            } while (el.nodeName !== "TABLE");
          })
        },
        ctrl.data.seeks.map((s) => renderSeek(ctrl, s))
      )
    ]),
    createSeek(ctrl)
  ];
}

// ../lobby/src/view/playing.ts
function timer(pov) {
  const date = Date.now() + pov.secondsLeft * 1e3;
  return time(".timeago", { hook: onInsert((el) => el.setAttribute("datetime", String(date))) }, timeago(date));
}
function playing_default({ data }) {
  return div(
    ".now-playing",
    data.nowPlaying.map(
      (pov) => a("/" + pov.fullId)(`.${pov.variant.key}`, { key: `${pov.gameId}${pov.lastMove}` }, [
        span(".mini-board.cg-wrap.is2d", {
          "data-state": `${pov.fen},${pov.orientation || pov.color},${pov.lastMove}`,
          hook: onInsert(initMiniBoard)
        }),
        span(".meta", [
          pov.opponent.ai ? i18n.site.aiNameLevelAiLevel("Stockfish", pov.opponent.ai) : pov.opponent.username,
          span(
            ".indicator",
            pov.isMyTurn ? !!pov.secondsLeft && pov.hasMoved ? timer(pov) : i18n.site.yourTurn : span("\xA0")
          )
        ])
      ])
    )
  );
}

// ../lobby/src/view/pools.ts
var createHandler = (ctrl) => (e) => {
  if (ctrl.redirecting) return;
  if (e instanceof KeyboardEvent) {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
  }
  const target = e.target;
  const id = target.dataset["id"] || target.parentNode.dataset["id"];
  if (id === "custom") ctrl.setupCtrl.openModal("hook");
  else if (id) ctrl.clickPool(id);
  ctrl.redraw();
};
var hooks = (ctrl) => onInsert((el) => {
  const handler = createHandler(ctrl);
  el.addEventListener("click", handler);
  el.addEventListener("keydown", handler);
});
var poolButton = makeExoticTag("div.lpool", {
  role: "button",
  tabindex: "0"
});
function render({ pools, poolMember, opts }) {
  return pools.map((pool) => {
    const active = (poolMember == null ? void 0 : poolMember.id) === pool.id;
    return poolButton(
      {
        class: { active, transp: !!poolMember && !active },
        "data-id": pool.id
      },
      [
        div(".clock", `${pool.lim}+${pool.inc}`),
        active ? poolMember.range && opts.showRatings ? div(".range", poolMember.range.replace("-", "\u2013")) : spinnerVdom() : div(".perf", pool.perf)
      ]
    );
  }).concat(
    poolButton(
      {
        class: { transp: !!poolMember },
        "data-id": "custom"
      },
      i18n.site.custom
    )
  );
}

// ../lobby/src/view/realTime/chart.ts
var percents = (v) => v + "%";
var ratingLog = (a2) => Math.log(a2 / 150 + 1);
function ratingY(e) {
  const rating = Math.max(1e3, Math.min(2200, e || 1500));
  let ratio;
  const mid = 2 / 5;
  if (rating === 1500) {
    ratio = mid;
  } else if (rating > 1500) {
    ratio = mid + ratingLog(rating - 1500) / ratingLog(1300) * 2 * mid;
  } else {
    ratio = mid - ratingLog(1500 - rating) / ratingLog(500) * mid;
  }
  return Math.round(ratio * 92);
}
var clockMax = 2e3;
var clockX = (dur) => {
  const durLog = (a2) => Math.log((a2 - 30) / 200 + 1);
  return Math.round(durLog(Math.min(clockMax, dur || clockMax)) / durLog(clockMax) * 100);
};
function renderPlot(ctrl, hook) {
  const bottom = Math.max(0, ratingY(hook.rating)), left = Math.max(0, clockX(hook.t)), klass = [
    hook.id,
    "plot.new",
    hook.ra ? "rated" : "casual",
    hook.action === "cancel" ? "cancel" : ""
  ].join(".");
  return h("span#" + klass, {
    key: hook.id,
    attrs: { "data-icon": perfIcons_default[hook.perf], style: `bottom:${percents(bottom)};left:${percents(left)}` },
    hook: {
      ...onInsert((el) => {
        $(el).powerTip({
          placement: hook.rating && hook.rating > 1800 ? "s" : "n",
          closeDelay: 200,
          defaultSize: [120, 80],
          popupId: "hook",
          preRender() {
            $("#hook").html(renderHook(ctrl, hook)).find(".inner-clickable").on("click", () => ctrl.clickHook(hook.id));
          }
        });
        setTimeout(() => {
          el.classList.remove("new");
        }, 20);
      }),
      destroy: (vnode) => $.powerTip.destroy(vnode.elm)
    }
  });
}
function renderHook(ctrl, hook) {
  let html = '<div class="inner">';
  if (hook.rating) {
    html += '<a class="opponent ulpt is color-icon" href="/@/' + hook.u + '">';
    html += " " + hook.u;
    if (ctrl.opts.showRatings) html += " (" + hook.rating + (hook.prov ? "?" : "") + ")";
    html += "</a>";
  } else {
    html += '<span class="opponent anon">' + i18n.site.anonymous + "</span>";
  }
  html += '<div class="inner-clickable">';
  html += `<div>${hook.clock}</div>`;
  html += '<icon data-icon="' + perfIcons_default[hook.perf] + '"> ' + i18n.site[hook.ra ? "rated" : "casual"] + "</icon>";
  html += "</div></div>";
  return html;
}
var xMarks = [1, 2, 3, 5, 7, 10, 15, 20, 30];
function renderXAxis() {
  const tags = [];
  xMarks.forEach((v) => {
    const l = clockX(v * 60);
    tags.push(
      h("span.x.label", { attrs: { style: "left:" + percents(l - 1.5) } }, v),
      h("div.grid.vert", { attrs: { style: "width:" + percents(l) } })
    );
  });
  return tags;
}
var yMarks = [1e3, 1200, 1400, 1500, 1600, 1800, 2e3];
function renderYAxis() {
  const tags = [];
  yMarks.forEach(function(v) {
    const b = ratingY(v);
    tags.push(
      h("span.y.label", { attrs: { style: "bottom:" + percents(b + 1) } }, v),
      h("div.grid.horiz", { attrs: { style: "height:" + percents(b + 0.8) } })
    );
  });
  return tags;
}
function toggle2(ctrl) {
  return h("button.toggle", {
    key: "set-mode-list",
    attrs: { title: i18n.site.list, "data-icon": licon.List },
    hook: bind("click", (_) => ctrl.setMode("list"), ctrl.redraw)
  });
}
function render2(ctrl, hooks2) {
  return h("div.hooks__chart", [
    h(
      "div.canvas",
      {
        hook: bind(
          "click",
          (e) => {
            if (e.target.classList.contains("plot"))
              ctrl.clickHook(e.target.id);
          },
          ctrl.redraw
        )
      },
      hooks2.map((hook) => renderPlot(ctrl, hook))
    ),
    ...renderYAxis(),
    ...renderXAxis()
  ]);
}

// ../lobby/src/view/realTime/filter.ts
function initialize(ctrl, el) {
  var _a;
  const f = (_a = ctrl.filter.data) == null ? void 0 : _a.form, $div = $(el), $ratingRange = $div.find(".rating-range"), $rangeInput = $ratingRange.find('input[name="ratingRange"]'), $minInput = $ratingRange.find(".rating-range__min"), $maxInput = $ratingRange.find(".rating-range__max");
  if (f)
    Object.keys(f).forEach((k) => {
      const input = $div.find(`input[name="${k}"]`)[0];
      if (!input) return;
      if (input.type === "checkbox") input.checked = true;
      else input.value = f[k];
    });
  else $div.find("input").prop("checked", true);
  const save = () => ctrl.filter.save($div.find("form")[0]);
  $div.find("input").on("change", save);
  $div.find("form").on("reset", (e) => {
    e.preventDefault();
    ctrl.filter.save(null);
    ctrl.filter.uiCacheBuster++;
    ctrl.redraw();
  }).on("submit", (e) => {
    e.preventDefault();
    ctrl.filter.open = false;
    ctrl.redraw();
  });
  function changeRatingRange(e) {
    const minVal = $minInput.val();
    const maxVal = $maxInput.val();
    $rangeInput.val(minVal + "-" + maxVal);
    $minInput.attr({ max: maxVal, "aria-label": i18n.site.maxRatingX(minVal) });
    $maxInput.attr({ min: minVal, "aria-label": i18n.site.minRatingX(maxVal) });
    const $range = $ratingRange.siblings(".range").empty();
    $("<span>").text(minVal).appendTo($range);
    $("<span>").text("\u2013").appendTo($range);
    $("<span>").text(maxVal).appendTo($range);
    if (e) save();
  }
  const rangeValues = $rangeInput.val() ? $rangeInput.val().split("-") : [];
  const minValue = rangeValues[0] || $minInput.attr("min");
  $minInput.attr({ step: "50", value: minValue }).on("input", changeRatingRange);
  const maxValue = rangeValues[1] || $minInput.attr("max");
  $maxInput.attr({ step: "50", value: maxValue }).on("input", changeRatingRange);
  changeRatingRange();
}
function toggle3({ filter, redraw }, nbFiltered) {
  return h("button.toggle.toggle-filter", {
    class: { gamesFiltered: nbFiltered > 0, active: filter.open },
    hook: bind("click", filter.toggle, redraw),
    attrs: {
      "data-icon": filter.open ? licon.X : licon.Gear,
      title: filter.open ? i18n.site.close : i18n.site.filterGames
    }
  });
}
var render3 = (ctrl) => h("div.hook__filters.cache-buster-" + ctrl.filter.uiCacheBuster, {
  hook: onInsert((el) => {
    if (el.filterLoaded) return;
    text("/setup/filter").then((html) => {
      el.innerHTML = html;
      el.filterLoaded = true;
      initialize(ctrl, el);
    });
  })
});

// ../lobby/src/view/realTime/list.ts
function renderHook2(ctrl, hook) {
  return tr(
    `.hook.${hook.action}`,
    {
      key: hook.id,
      class: { disabled: !!hook.disabled },
      role: "button",
      title: hook.disabled ? "" : hook.action === "join" ? i18n.site.joinTheGame + " | " + perfNames[hook.perf] : i18n.site.cancel,
      "data-id": hook.id
    },
    [
      td(
        ctrl.me ? span(".ulink.ulpt.mobile-powertip", { "data-href": "/@/" + hook.u }, hook.u) : i18n.site.anonymous
      ),
      !ctrl.me ? null : td(!ctrl.opts.showRatings ? "" : [hook.rating + (hook.prov ? "?" : "")]),
      td(hook.clock),
      td(span({ ...dataIcon(perfIcons_default[hook.perf]) }, i18n.site[hook.ra ? "rated" : "casual"]))
    ]
  );
}
var isStandard = (value) => (hook) => hook.variant === "standard" === value;
var isMine = (hook) => hook.action === "cancel";
var isNotMine = (hook) => !isMine(hook);
var toggle4 = (ctrl) => button(".toggle", {
  key: "set-mode-chart",
  title: i18n.site.graph,
  ...dataIcon(licon.LineGraph),
  hook: bind("click", (_) => ctrl.setMode("chart"), ctrl.redraw)
});
var render4 = (ctrl, allHooks) => {
  const mine = allHooks.find(isMine);
  const max = mine ? 13 : 14;
  const hooks2 = allHooks.slice(0, max);
  const render5 = (hook) => renderHook2(ctrl, hook);
  const standards = hooks2.filter(isNotMine).filter(isStandard(true));
  sort(ctrl, standards);
  const variants2 = hooks2.filter(isNotMine).filter(isStandard(false)).slice(0, Math.max(0, max - standards.length - 1));
  sort(ctrl, variants2);
  const renderedHooks = [
    ...standards.map(render5),
    variants2.length ? tr(".variants", { key: "variants" }, td({ attrs: { colspan: 5 } }, "\u2014 " + i18n.site.variant + " \u2014")) : null,
    ...variants2.map(render5)
  ];
  if (mine) renderedHooks.unshift(render5(mine));
  return table(".hooks__list", [
    thead(
      tr([
        th(),
        ctrl.me ? th(
          {
            class: { sortable: true, sort: ctrl.sort === "rating" },
            hook: bind("click", (_) => ctrl.setSort("rating"), ctrl.redraw)
          },
          [icon(licon.DownTriangle)(".is"), i18n.site.rating]
        ) : null,
        th(
          ctrl.me ? {
            key: "time-header-with-rating",
            class: { sortable: true, sort: ctrl.sort === "time" },
            hook: bind("click", (_) => ctrl.setSort("time"), ctrl.redraw)
          } : {
            key: "time-header-without-rating"
          },
          [icon(licon.DownTriangle)(".is"), i18n.site.time]
        ),
        th(i18n.site.mode)
      ])
    ),
    tbody(
      {
        class: { stepping: ctrl.stepping },
        hook: bind(
          "click",
          async (e) => {
            let el = e.target;
            do {
              el = el.parentNode;
              if (el.nodeName === "TR") return ctrl.clickHook(el.dataset["id"]);
            } while (el.nodeName !== "TABLE");
          },
          ctrl.redraw
        )
      },
      renderedHooks
    )
  ]);
};

// ../lobby/src/view/realTime/main.ts
function main_default(ctrl) {
  let filterBody, body, nbFiltered, modeToggle, res;
  if (ctrl.filter.open) filterBody = render3(ctrl);
  switch (ctrl.mode) {
    case "chart":
      res = ctrl.filter.filter(ctrl.data.hooks);
      nbFiltered = res.hidden;
      body = filterBody || render2(ctrl, res.visible);
      modeToggle = ctrl.filter.open ? null : toggle2(ctrl);
      break;
    default:
      res = ctrl.filter.filter(ctrl.stepHooks);
      nbFiltered = res.hidden;
      body = filterBody || render4(ctrl, res.visible);
      modeToggle = ctrl.filter.open ? null : toggle4(ctrl);
  }
  const filterToggle = toggle3(ctrl, nbFiltered);
  return [filterToggle, modeToggle, body];
}

// ../lobby/src/view/tabs.ts
function tab2(ctrl, key, active, content) {
  return h(
    "button",
    {
      attrs: { role: "tab" },
      class: { active: key === active, glowing: key !== active && key === "pools" && !!ctrl.poolMember },
      hook: bind("click", (_) => ctrl.setTab(key))
    },
    content
  );
}
function tabs_default(ctrl) {
  var _a;
  const nbPlaying = ctrl.data.nbNowPlaying, nbMyTurn = ctrl.data.nbMyTurn, active = ctrl.tab, isBot = (_a = ctrl.me) == null ? void 0 : _a.isBot;
  return [
    isBot ? void 0 : tab2(ctrl, "pools", active, [i18n.site.quickPairing]),
    isBot ? void 0 : tab2(ctrl, "real_time", active, [i18n.site.lobby]),
    isBot ? void 0 : tab2(ctrl, "seeks", active, [i18n.site.correspondence]),
    active === "now_playing" || nbPlaying || isBot ? tab2(ctrl, "now_playing", active, [
      ...i18n.site.nbGamesInPlay.asArray(nbPlaying, nbPlaying >= 100 ? "99+" : nbPlaying.toString()),
      nbMyTurn > 0 ? h("icon.unread", nbMyTurn >= 100 ? "99+" : nbMyTurn) : null
    ]) : null
  ];
}

// ../lobby/src/view/main.ts
function main_default2(ctrl) {
  let body;
  let data = {};
  const redirBlock = ctrl.redirecting && ctrl.tab !== "pools";
  if (redirBlock) body = spinnerVdom();
  else
    switch (ctrl.tab) {
      case "pools":
        body = render(ctrl);
        data = { hook: hooks(ctrl) };
        break;
      case "real_time":
        body = main_default(ctrl);
        break;
      case "seeks":
        body = correspondence_default(ctrl);
        break;
      case "now_playing":
        body = playing_default(ctrl);
        break;
    }
  const contentKey = ctrl.tab === "real_time" ? `${ctrl.tab}-${ctrl.mode}` : ctrl.tab;
  return div(`.lobby__app.lobby__app-${ctrl.tab}.lck-${contentKey}`, [
    div(".tabs-horiz", { role: "tablist" }, tabs_default(ctrl)),
    div(`.lobby__app__content.l${redirBlock ? "redir" : ctrl.tab}`, data, body)
  ]);
}

// ../lobby/src/view/setup/components/colorButtons.ts
var colorButtons2 = ({ gameMode, gameType, variant, color }) => {
  const randomColorOnly = gameType === "hook" || gameType !== "ai" && gameMode() === "rated" && variantsWhereWhiteIsBetter.includes(variant());
  return randomColorOnly ? void 0 : site.blindMode ? hl("div", blindModeColorPicker(color)) : colorButtons(color);
};

// ../lobby/src/view/setup/components/fenInput.ts
var fenInput = (ctrl) => {
  if (ctrl.variant() !== "fromPosition") return null;
  const fen = ctrl.fen();
  const pov = ctrl.color() === "black" ? "black" : "white";
  return h("div.config-group", [
    h("div.fen__form", [
      h("input#fen-input", {
        attrs: { placeholder: i18n.site.pasteTheFenStringHere, value: fen },
        on: {
          input: (e) => {
            ctrl.fen(e.target.value.replace(/_/g, " ").trim());
            ctrl.validateFen();
          }
        },
        hook: { insert: ctrl.validateFen },
        class: { failure: ctrl.fenError }
      }),
      h("a.button.button-empty", {
        attrs: {
          "data-icon": licon.Pencil,
          title: i18n.site.boardEditor,
          href: "/editor" + (fen && !ctrl.fenError ? `/${fen.replace(/ /g, "_")}` : "")
        }
      })
    ]),
    h(
      "a.fen__board",
      { attrs: { href: `/editor/${ctrl.lastValidFen.replace(/ /g, "_")}` } },
      !ctrl.lastValidFen || !ctrl.validFen() ? null : h("div.position.mini-board.cg-wrap.is2d", {
        attrs: { "data-state": `${ctrl.lastValidFen},${pov}` },
        hook: {
          insert: (vnode) => initMiniBoard(vnode.elm),
          update: (vnode) => initMiniBoard(vnode.elm)
        }
      })
    )
  ]);
};

// ../lobby/src/view/setup/components/gameModeButtons.ts
var gameModeButtons = ({ setupCtrl, me }) => {
  if (!me) return null;
  return site.blindMode ? h("div", [
    h("label", { attrs: { for: "sf_mode" } }, i18n.site.mode),
    h(
      "select#sf_mode",
      {
        on: {
          change: (e) => setupCtrl.gameMode(e.target.value)
        }
      },
      gameModes.map(({ key, name }) => option({ key, name }, setupCtrl.gameMode()))
    )
  ]) : h("div.config-group", [
    h("div.label", i18n.site.gameMode),
    h(
      "group.radio",
      gameModes.map(({ key, name }) => {
        const disabled = key === "rated" && setupCtrl.ratedModeDisabled();
        return h("div", [
          h(`input#sf_mode_${key}.checked_${key === setupCtrl.gameMode()}`, {
            attrs: {
              name,
              type: "radio",
              value: key,
              checked: key === setupCtrl.gameMode(),
              disabled,
              tabindex: disabled ? -1 : 0
            },
            on: {
              change: (e) => setupCtrl.gameMode(e.target.value)
            }
          }),
          h("label", { class: { disabled }, attrs: { for: `sf_mode_${key}` } }, name)
        ]);
      })
    )
  ]);
};

// ../lobby/src/view/setup/components/levelButtons.ts
var levels = [1, 2, 3, 4, 5, 6, 7, 8];
var levelButtons = ({ aiLevel }) => {
  return site.blindMode ? [
    h("label", { attrs: { for: "sf_level" } }, i18n.site.strength),
    h(
      "select#sf_level",
      {
        on: { change: (e) => aiLevel(parseInt(e.target.value)) }
      },
      levels.map((l) => l.toString()).map((key) => option({ key, name: key }, aiLevel().toString()))
    )
  ] : h("div.config-group", [
    h("div.radio-pane", [
      h("div.label", i18n.site.strength),
      h(
        "group.radio",
        levels.map(
          (level) => h("div", [
            h(`input#sf_level_${level}`, {
              attrs: {
                name: "level",
                type: "radio",
                value: level,
                checked: level === aiLevel()
              },
              on: {
                change: (e) => aiLevel(parseInt(e.target.value))
              }
            }),
            h("label", { attrs: { for: `sf_level_${level}` } }, level)
          ])
        )
      )
    ])
  ]);
};

// ../lobby/src/view/setup/components/ratingDifferenceSliders.ts
var ratingDifferenceSliders = ({ setupCtrl, me, data }) => {
  const myRating = setupCtrl.myRating();
  if (!me || !data.ratingMap || !myRating) return null;
  const isProvisional = setupCtrl.isProvisional();
  const ratingInput = (type) => {
    const isMin = type === "min";
    return hl(`input.range.rating-range__${type}`, {
      attrs: {
        type: "range",
        "aria-label": type === "min" ? i18n.site.minRatingX(myRating + setupCtrl.ratingMin()) : i18n.site.maxRatingX(myRating + setupCtrl.ratingMax()),
        min: isMin ? "-500" : "0",
        max: isMin ? "0" : "500",
        step: "50",
        disabled: isProvisional
      },
      props: {
        value: isMin ? setupCtrl.ratingMin() : setupCtrl.ratingMax()
      },
      on: {
        input: (e) => {
          const newVal = parseInt(e.target.value);
          if (newVal === 0 && (isMin ? setupCtrl.ratingMax() : setupCtrl.ratingMin()) === 0)
            isMin ? setupCtrl.ratingMax(50) : setupCtrl.ratingMin(-50);
          isMin ? setupCtrl.ratingMin(newVal) : setupCtrl.ratingMax(newVal);
        }
      }
    });
  };
  return hl(
    "div",
    {
      class: { disabled: isProvisional }
    },
    isProvisional ? hl("span", i18n.site.ratingRangeIsDisabledBecauseYourRatingIsProvisional) : [
      i18n.site.ratingFilter,
      hl("div.rating-range", [
        ratingInput("min"),
        !site.blindMode && [
          hl("span.rating-min", "-" + Math.abs(setupCtrl.ratingMin())),
          "/",
          hl("span.rating-max", "+" + setupCtrl.ratingMax())
        ],
        ratingInput("max")
      ])
    ]
  );
};

// ../lobby/src/view/setup/components/ratingView.ts
var ratingView = ({ opts, data, setupCtrl }) => {
  if (site.blindMode || !data.ratingMap) return null;
  const selectedPerf = setupCtrl.selectedPerf();
  const perfOrSpeed = variants.find(({ key }) => key === selectedPerf) || speeds.find(({ key }) => key === selectedPerf);
  if (!perfOrSpeed) return void 0;
  return h(
    "div.ratings",
    !opts.showRatings ? [icon(perfOrSpeed.icon)(), perfOrSpeed.name] : [
      ...i18n.site.yourRatingIsX.asArray(
        h(
          "strong",
          { attrs: dataIcon(perfOrSpeed.icon) },
          setupCtrl.myRating() + (setupCtrl.isProvisional() ? "?" : "")
        )
      ),
      perfOrSpeed.name
    ]
  );
};

// ../lobby/src/view/setup/components/variantPicker.ts
var variantPicker = (setupCtrl) => {
  if (site.blindMode) {
    return hl("div.variant.label-select", [
      hl("label", { attrs: { for: "sf_variant" } }, i18n.site.variant),
      hl(
        "select#sf_variant",
        {
          on: {
            change: (e) => setupCtrl.variant(e.target.value)
          }
        },
        variantsForGameType(variants, setupCtrl.gameType).map(
          (variant) => option(variant, setupCtrl.variant())
        )
      )
    ]);
  }
  const currentVariant = variants.find((v) => v.key === setupCtrl.variant()) || variants[0];
  const isOpen = setupCtrl.variantMenuOpen();
  const inputId = "mselect-variant";
  const toggleVariant = () => setupCtrl.toggleVariantMenu();
  const updateCheckboxAndToggle = () => {
    const checkbox = document.querySelector(`#${inputId}`);
    if (checkbox) checkbox.checked = false;
    toggleVariant();
  };
  const children = [
    hl("input.mselect__toggle", {
      attrs: { type: "checkbox", id: inputId },
      on: { change: toggleVariant }
    }),
    hl(
      "label.mselect__label",
      {
        attrs: { for: inputId }
      },
      [
        hl("span.icon", { attrs: dataIcon(currentVariant.icon) }),
        hl("div.text", [hl("span.name", currentVariant.name), hl("span.desc", currentVariant.description)])
      ]
    )
  ];
  if (isOpen) {
    children.push(
      hl("label.fullscreen-mask", { on: { click: updateCheckboxAndToggle } }),
      hl(
        "div.mselect__list",
        hl(
          "table",
          hl(
            "tbody",
            variantsForGameType(variants, setupCtrl.gameType).map(
              (v) => hl(
                "tr.mselect__item",
                {
                  class: { current: v.key === setupCtrl.variant() },
                  attrs: { tabindex: "0" },
                  on: {
                    click: () => {
                      setupCtrl.variant(v.key);
                      updateCheckboxAndToggle();
                    },
                    keydown: enter(() => {
                      setupCtrl.variant(v.key);
                      updateCheckboxAndToggle();
                    })
                  }
                },
                [
                  hl("td.icon", hl("span", { attrs: dataIcon(v.icon) })),
                  hl("td.name", v.name),
                  hl("td.desc", v.description)
                ]
              )
            )
          )
        )
      )
    );
  }
  return hl(
    "div.mselect",
    {
      class: { mselect__active: isOpen }
    },
    children
  );
};

// ../lobby/src/view/setup/modal.ts
function setupModal(ctrl) {
  const { setupCtrl } = ctrl;
  if (!setupCtrl.gameType) return null;
  const buttonText = {
    hook: i18n.site.createLobbyGame,
    friend: setupCtrl.friendUser ? i18n.site.challengeX(setupCtrl.friendUser) : i18n.site.challengeAFriend,
    ai: i18n.site.playAgainstComputer
  }[setupCtrl.gameType];
  const disabled = !setupCtrl.valid() || setupCtrl.loading;
  return [
    snabDialog({
      attrs: { dialog: { "aria-labelledBy": "lobby-setup-modal-title", "aria-modal": "true" } },
      class: "game-setup",
      css: [{ hashed: "lobby.setup" }],
      onClose: () => {
        setupCtrl.closeModal = void 0;
        setupCtrl.gameType = null;
        setupCtrl.root.redraw();
      },
      modal: true,
      easyClose: "clickOutside",
      vnodes: [
        hl("h2#lobby-setup-modal-title", i18n.site.gameSetup),
        hl("div.setup-content", views[setupCtrl.gameType](ctrl)),
        hl("div.footer", [
          hl(
            `button.button.button-metal.lobby__start__button.lobby__start__button--${setupCtrl.friendUser ? "friend-user" : setupCtrl.gameType}`,
            {
              attrs: { disabled },
              class: { disabled },
              on: { click: setupCtrl.submit }
            },
            buttonText
          ),
          setupCtrl.loading && spinnerVdom()
        ])
      ],
      onInsert: (dlg) => {
        setupCtrl.closeModal = dlg.close;
        dlg.show();
      }
    })
  ].filter((v) => v !== null);
}
var views = {
  hook: (ctrl) => [
    variantPicker(ctrl.setupCtrl),
    timePickerAndSliders(ctrl.setupCtrl.timeControl, 0),
    gameModeButtons(ctrl),
    ratingView(ctrl),
    ratingDifferenceSliders(ctrl),
    colorButtons2(ctrl.setupCtrl)
  ],
  friend: (ctrl) => [
    variantPicker(ctrl.setupCtrl),
    fenInput(ctrl.setupCtrl),
    timePickerAndSliders(ctrl.setupCtrl.timeControl, 0),
    gameModeButtons(ctrl),
    colorButtons2(ctrl.setupCtrl)
  ],
  ai: ({ setupCtrl }) => [
    variantPicker(setupCtrl),
    fenInput(setupCtrl),
    timePickerAndSliders(setupCtrl.timeControl, setupCtrl.minimumTimeIfReal()),
    levelButtons(setupCtrl),
    colorButtons2(setupCtrl)
  ]
};

// ../lobby/src/view/table.ts
function table2(ctrl) {
  var _a;
  const { data, opts } = ctrl;
  const hasOngoingRealTimeGame = ctrl.hasOngoingRealTimeGame(true);
  const hookDisabled = opts.playban || opts.hasUnreadLichessMessage || ((_a = ctrl.me) == null ? void 0 : _a.isBot) || hasOngoingRealTimeGame;
  const { members, rounds } = data.counters;
  const lobbyButtons = [
    {
      gameType: "hook",
      label: i18n.site.createLobbyGame,
      disabled: hookDisabled,
      title: "Create a custom game that any online player can join."
    },
    {
      gameType: "friend",
      label: i18n.site.challengeAFriend,
      disabled: hasOngoingRealTimeGame,
      title: `Create a custom game and choose your opponent.

You will receive a challenge link to share via email or text, as well as a QR code that someone nearby can scan.`
    },
    {
      gameType: "ai",
      label: i18n.site.playAgainstComputer,
      disabled: hasOngoingRealTimeGame
    }
  ];
  if (opts.bots)
    lobbyButtons.push({
      gameType: "bots",
      label: "play bot"
    });
  return hl("div.lobby__table", [
    hl("div.lobby__start", [site.blindMode && hl("h2", i18n.site.play), lobbyButtons.map(makeLobbyButton)]),
    setupModal(ctrl),
    site.blindMode ? void 0 : (
      // Use a thunk here so that snabbdom does not rerender; we will do so manually after insert
      thunk(
        "div.lobby__counters",
        () => hl("div.lobby__counters", [
          hl(
            "a",
            { attrs: { href: "/player" } },
            i18n.site.nbPlayers.asArray(
              members,
              hl(
                "strong",
                {
                  attrs: { "data-count": members },
                  hook: onInsert((elm) => {
                    ctrl.spreadPlayersNumber = ctrl.initNumberSpreader(elm, 10, members);
                  })
                },
                numberFormat(members)
              )
            )
          ),
          hl(
            "a",
            { attrs: { href: "/games" } },
            i18n.site.nbGamesInPlay.asArray(
              rounds,
              hl(
                "strong",
                {
                  attrs: { "data-count": rounds },
                  hook: onInsert((elm) => {
                    ctrl.spreadGamesNumber = ctrl.initNumberSpreader(elm, 8, rounds);
                  })
                },
                numberFormat(rounds)
              )
            )
          )
        ]),
        []
      )
    )
  ]);
  function makeLobbyButton({ gameType, label, disabled, title }) {
    return hl(
      `button.button.button-metal.lobby__start__button.lobby__start__button--${gameType}`,
      {
        class: { active: ctrl.setupCtrl.gameType === gameType, disabled: !!disabled },
        attrs: { type: "button", title: title != null ? title : "", "aria-disabled": disabled ? "true" : "false" },
        hook: disabled ? {} : bind(
          "click",
          () => {
            if (gameType === "bots") location.href = "/bots";
            else if (gameType === "dev") location.href = "/bots/dev";
            else ctrl.setupCtrl.openModal(gameType);
          },
          ctrl.redraw
        )
      },
      label
    );
  }
}

// ../lobby/src/main.ts
var patch = init([classModule, attributesModule, propsModule, eventListenersModule]);
function main(opts) {
  const ctrl = new LobbyController(opts, redraw);
  opts.appElement.innerHTML = "";
  let appVNode = patch(opts.appElement, main_default2(ctrl));
  opts.tableElement.innerHTML = "";
  let tableVNode = patch(opts.tableElement, table2(ctrl));
  function redraw() {
    appVNode = patch(appVNode, main_default2(ctrl));
    tableVNode = patch(tableVNode, table2(ctrl));
  }
  makeCarousel({ selector: ".lobby__blog", itemWidth: 192, pauseFor: 10 });
  return ctrl;
}

// ../lobby/src/lobby.ts
function initModule(opts) {
  opts.appElement = document.querySelector(".lobby__app");
  opts.tableElement = document.querySelector(".lobby__table");
  opts.pools = [
    // mirrors modules/pool/src/main/PoolList.scala
    { id: "1+0", lim: 1, inc: 0, perf: i18n.site.bullet },
    { id: "2+1", lim: 2, inc: 1, perf: i18n.site.bullet },
    { id: "3+0", lim: 3, inc: 0, perf: i18n.site.blitz },
    { id: "3+2", lim: 3, inc: 2, perf: i18n.site.blitz },
    { id: "5+0", lim: 5, inc: 0, perf: i18n.site.blitz },
    { id: "5+3", lim: 5, inc: 3, perf: i18n.site.blitz },
    { id: "10+0", lim: 10, inc: 0, perf: i18n.site.rapid },
    { id: "10+5", lim: 10, inc: 5, perf: i18n.site.rapid },
    { id: "15+10", lim: 15, inc: 10, perf: i18n.site.rapid },
    { id: "30+0", lim: 30, inc: 0, perf: i18n.site.classical },
    { id: "30+20", lim: 30, inc: 20, perf: i18n.site.classical }
  ];
  opts.socketSend = wsConnect("/lobby/socket/v5", false, {
    options: { reloadOnResume: true },
    receive: (t, d) => lobbyCtrl.socket.receive(t, d),
    events: {
      n(_, msg) {
        var _a;
        (_a = lobbyCtrl.spreadPlayersNumber) == null ? void 0 : _a.call(lobbyCtrl, msg.d);
        setTimeout(() => {
          var _a2;
          return (_a2 = lobbyCtrl.spreadGamesNumber) == null ? void 0 : _a2.call(lobbyCtrl, msg.r);
        }, wsPingInterval() / 2);
      },
      reload_timeline() {
        text("/timeline").then((html) => {
          $(".timeline").html(html);
          pubsub.emit("content-loaded");
        });
      },
      featured(o) {
        const $tv = $(".lobby__tv"), $game = $tv.find(".mini-game");
        if ($game.length) $game.replaceWith(o.html);
        else $tv.append(o.html);
        pubsub.emit("content-loaded");
      },
      redirect(e) {
        lobbyCtrl.setRedirecting();
        lobbyCtrl.leavePool();
        site.redirect(e, true);
        return true;
      },
      fen(e) {
        lobbyCtrl.gameActivity(e.id);
      }
    }
  }).send;
  pubsub.after("socket.hasConnected").then(() => {
    const gameId = new URLSearchParams(location.search).get("hook_like");
    if (!gameId) return;
    const { ratingMin, ratingMax } = lobbyCtrl.setupCtrl.makeSetupStore("hook")();
    text(
      url(`/setup/hook/${site.sri}/like/${gameId}`, { deltaMin: ratingMin, deltaMax: ratingMax }),
      {
        method: "post"
      }
    );
    lobbyCtrl.setTab("real_time");
    history.replaceState(null, "", "/");
  });
  const lobbyCtrl = main(opts);
}
export {
  initModule
};
//# sourceMappingURL=lobby.6BSMHMFK.js.map

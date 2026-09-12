import {
  Bot,
  BotLoader,
  botAssetUrl,
  makeBookFromPgn,
  makeBookFromPolyglot
} from "./lib.22P5PUXN.js";
import {
  hashBoard
} from "./lib.EX2PZIT5.js";
import {
  clockToSpeed,
  playable,
  status,
  statusOf
} from "./lib.67VUYMDO.js";
import {
  alert,
  domDialog
} from "./lib.MYPIOGN5.js";
import {
  fen960,
  normalMove
} from "./lib.LRP46MC3.js";
import {
  clamp,
  deepFreeze,
  definedMap,
  isEquivalent,
  randomId,
  zip
} from "./lib.HMFK7OOB.js";
import {
  Chess,
  compat_exports,
  fen_exports,
  pgn_exports,
  san_exports
} from "./lib.X7H2PLEK.js";
import {
  COLORS,
  makeUci,
  opposite
} from "./lib.53PYQRAK.js";
import {
  Janitor
} from "./lib.PNHYIP7B.js";
import {
  hasFeature,
  hl
} from "./lib.S3TIZ2HQ.js";
import {
  pubsub
} from "./lib.QPQZCXK2.js";
import {
  licon
} from "./lib.5I4BSVKX.js";
import {
  json
} from "./lib.TT4QSUKQ.js";
import {
  objectStorage,
  range
} from "./lib.NFSQQWN5.js";
import {
  defined,
  escapeHtml,
  frag,
  myUserId,
  myUsername
} from "./lib.GMEH5BEF.js";

// ../botDev/src/devEnv.ts
var env;
function makeEnv(cfg) {
  return new DevEnv(cfg);
}
var DevEnv = class {
  constructor(cfg) {
    this.redraw = () => {
    };
    Object.assign(this, cfg);
    env = this;
    if (this.game) this.game.observer = this.dev;
    this.canPost = Boolean(this.canPost);
  }
};

// ../botDev/src/devAssets.ts
var assetTypes = ["image", "sound", "book", "bookCover", "net"];
var urlTypes = ["image", "sound", "bookCover"];
var DevAssets = class {
  constructor(rlist) {
    this.rlist = rlist;
    this.path = "assets/data/bot";
    this.server = assetTypes.reduce(
      (obj, type) => ({ ...obj, [type]: /* @__PURE__ */ new Map() }),
      {}
    );
    this.idb = assetTypes.reduce(
      (obj, type) => ({ ...obj, [type]: new Store(type) }),
      {}
    );
    this.urls = urlTypes.reduce(
      (obj, type) => ({ ...obj, [type]: /* @__PURE__ */ new Map() }),
      {}
    );
    this.onStorageEvent = async (e) => {
      if (e.key !== "botdev.import.book" || !e.newValue) return;
      await this.init();
      const [key, oldKey] = e.newValue.split(",");
      pubsub.emit("botdev.import.book", key, oldKey);
    };
    this.update(rlist);
    window.addEventListener("storage", this.onStorageEvent);
  }
  async init() {
    localStorage.removeItem("botdev.import.book");
    for (const type of urlTypes) {
      for (const url of this.urls[type].values()) {
        URL.revokeObjectURL(url);
      }
      this.urls[type].clear();
    }
    const [localImages, localSounds, localBookCovers] = await Promise.all(
      [...urlTypes, "book"].map((t) => this.idb[t].init())
    );
    const urlAssets = { image: localImages, sound: localSounds, bookCover: localBookCovers };
    urlTypes.forEach((type) => {
      for (const [key, data] of urlAssets[type]) {
        this.urls[type].set(key, URL.createObjectURL(new Blob([data.blob], { type: mimeOf(key) })));
      }
    });
    return this;
  }
  localKeyNames(type) {
    return this.idb[type].keyNames;
  }
  serverKeyNames(type) {
    return this.server[type];
  }
  allKeyNames(type) {
    const allMap = new Map(this.idb[type].keyNames);
    for (const [k, v] of this.server[type]) {
      if (!v.startsWith(".")) allMap.set(k, v);
    }
    return allMap;
  }
  deletedKeys(type) {
    return [...this.server[type].entries()].filter(([, v]) => v.startsWith(".")).map(([k]) => k);
  }
  isLocalOnly(key) {
    return Boolean(this.findAsset((k) => k === key, "local") && !this.findAsset((k) => k === key, "server"));
  }
  isDeleted(key) {
    var _a;
    for (const map of Object.values(this.server)) {
      if ((_a = map.get(key)) == null ? void 0 : _a.startsWith(".")) return true;
    }
    return false;
  }
  nameOf(key) {
    var _a;
    return (_a = this.findAsset((k) => k === key)) == null ? void 0 : _a[1];
  }
  assetBlob(type, key) {
    var _a, _b;
    if (this.isLocalOnly(key))
      return {
        key,
        type,
        author: (_a = myUserId()) != null ? _a : "anonymous",
        name: (_b = this.idb[type].keyNames.get(key)) != null ? _b : key,
        blob: this.idb[type].get(key).then((data) => data.blob)
      };
    else return void 0;
  }
  async import(type, blobname, blob) {
    var _a;
    if (type === "net" || type === "book") throw new Error("no");
    const extpos = blobname.lastIndexOf(".");
    if (extpos === -1) throw new Error("filename must have extension");
    const [name, ext] = [blobname.slice(0, extpos), blobname.slice(extpos + 1)];
    const key = `${await hashBlob(blob)}.${ext}`;
    await this.idb[type].put(key, { blob, name, user: (_a = myUserId()) != null ? _a : "anonymous" });
    if (!this.urls[type].has(key)) this.urls[type].set(key, URL.createObjectURL(blob));
    return key;
  }
  async clearLocal(type, key) {
    await this.idb[type].rm(key);
    if (type === "image" || type === "sound" || type === "bookCover") {
      const oldUrl = this.urls[type].get(key);
      if (oldUrl) URL.revokeObjectURL(oldUrl);
      this.urls[type].delete(key);
    }
  }
  async delete(type, key) {
    const [assetList] = await Promise.allSettled([
      fetch(`/bots/dev/asset/mv/${key}/.${encodeURIComponent(this.nameOf(key))}`, { method: "post" }),
      this.clearLocal(type, key)
    ]);
    if (type === "book") this.clearLocal("bookCover", key);
    if (assetList.status === "fulfilled") return this.update(await assetList.value.json());
  }
  async rename(type, key, newName) {
    if (this.nameOf(key) === newName) return;
    const [assetList] = await Promise.allSettled([
      fetch(`/bots/dev/asset/mv/${key}/${encodeURIComponent(newName)}`, { method: "post" }),
      this.idb[type].mv(key, newName)
    ]);
    if (assetList.status === "fulfilled") return this.update(await assetList.value.json());
  }
  getBookCoverUrl(key) {
    var _a;
    return (_a = this.urls.bookCover.get(key)) != null ? _a : botAssetUrl("book", `${key}.png`);
  }
  async importPolyglot(blobname, blob) {
    var _a, _b;
    if (blob.type !== "application/octet-stream") throw new Error("no");
    const data = await blobArrayBuffer(blob);
    const book = await makeBookFromPolyglot({ bytes: new DataView(data), cover: true });
    if (!book.cover) throw new Error(`error parsing ${blobname}`);
    const key = await hashBlob(blob);
    const name = blobname.endsWith(".bin") ? blobname.slice(0, -4) : blobname;
    const asset = { blob, name, user: (_a = myUserId()) != null ? _a : "anonymous" };
    const cover = { blob: book.cover, name, user: (_b = myUserId()) != null ? _b : "anonymous" };
    await Promise.all([this.idb.book.put(key, asset), this.idb.bookCover.put(key, cover)]);
    this.urls.bookCover.set(key, URL.createObjectURL(new Blob([book.cover], { type: "image/png" })));
    return key;
  }
  async importPgn(blobname, pgn, ply, fromStudy, progress, filter) {
    var _a, _b, _c, _d;
    const name = blobname.endsWith(".pgn") ? blobname.slice(0, -4) : blobname;
    const result = await makeBookFromPgn({ pgn, ply, cover: true, progress, filter });
    if (!result.positions || !result.polyglot || !result.cover) {
      console.log(result, "cancelled?");
      return void 0;
    }
    const oldKey = (_a = [...this.idb.book.keyNames.entries()].find(([, n]) => n === name)) == null ? void 0 : _a[0];
    const key = await hashBlob(result.polyglot);
    const asset = { blob: result.polyglot, name, user: (_b = myUserId()) != null ? _b : "anonymous" };
    const cover = { blob: result.cover, name, user: (_c = myUserId()) != null ? _c : "anonymous" };
    await Promise.all([this.idb.book.put(key, asset), this.idb.bookCover.put(key, cover)]);
    const promises = [];
    if (oldKey && oldKey !== key) {
      for (const bot of env.bot.all) {
        const existing = (_d = bot.books) == null ? void 0 : _d.find((b) => b.key === oldKey);
        if (existing) {
          existing.key = key;
          promises.push(env.bot.storeBot(bot));
        }
      }
      await Promise.allSettled([...promises, this.idb.book.rm(oldKey), this.idb.bookCover.rm(oldKey)]);
    }
    if (fromStudy) {
      localStorage.setItem("botdev.import.book", `${key}${oldKey ? "," + oldKey : ""}`);
      alert(`${name} exported to bot studio. ${promises.length ? ` ${promises.length} bots updated` : ""}`);
    } else {
      this.urls.bookCover.set(key, URL.createObjectURL(new Blob([cover.blob], { type: "image/png" })));
      pubsub.emit("botdev.import.book", key, oldKey);
      if (promises.length) alert(`updated ${promises.length} bots with new ${name}`);
    }
    return key;
  }
  async update(rlist) {
    if (!rlist) rlist = await fetch("/bots/dev/assets").then((res) => res.json());
    Object.values(this.server).forEach((m) => m.clear());
    this.server.book.set("lichess", "lichess");
    assetTypes.forEach((type) => {
      var _a;
      return (_a = rlist == null ? void 0 : rlist[type]) == null ? void 0 : _a.forEach((a) => this.server[type].set(a.key, a.name));
    });
    const books = Object.entries(this.server.book);
    this.server.bookCover = new Map(books.map(([k, v]) => [`${k}.png`, v]));
    assetTypes.forEach((type) => this.server[type] = valueSorted(this.server[type]));
  }
  findAsset(fn, maps = "both") {
    for (const type of assetTypes) {
      if (maps !== "server")
        for (const [key, name] of this.idb[type].keyNames) {
          if (fn(key, name, type)) return [key, name, type];
        }
      if (maps === "local") continue;
      for (const [key, name] of this.server[type]) {
        if (fn(key, name, type)) return [key, name, type];
      }
    }
    return void 0;
  }
};
var Store = class {
  constructor(type) {
    this.type = type;
    this.keyNames = /* @__PURE__ */ new Map();
  }
  async init() {
    this.keyNames.clear();
    this.store = await objectStorage({ store: `botdev.${this.type}` });
    const [keys, assets] = await Promise.all([this.store.list(), this.store.getMany()]);
    const all = zip(keys, assets);
    all.forEach(([k, a]) => this.keyNames.set(k, a.name));
    this.keyNames = valueSorted(this.keyNames);
    return all;
  }
  async put(key, value) {
    this.keyNames.set(key, value.name);
    return await this.store.put(key, value);
  }
  async rm(key) {
    await this.store.remove(key);
    this.keyNames.delete(key);
  }
  async mv(key, newName) {
    if (this.keyNames.get(key) === newName) return;
    const asset = await this.store.get(key);
    if (!asset) return;
    this.keyNames.set(key, newName);
    await this.store.put(key, { ...asset, name: newName });
  }
  async get(key) {
    var _a;
    return await ((_a = this.store) == null ? void 0 : _a.get(key));
  }
};
function valueSorted(map) {
  return new Map(map ? [...map.entries()].sort((a, b) => a[1].localeCompare(b[1])) : []);
}
async function hashBlob(file) {
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", await blobArrayBuffer(file));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 12);
}
function blobArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
function mimeOf(filename) {
  switch (filename.slice(filename.lastIndexOf(".") + 1).toLowerCase()) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "aac":
      return "audio/aac";
    case "mp3":
      return "audio/mpeg";
    case "pgn":
      return "application/x-chess-pgn";
    case "bin":
      return "application/octet-stream";
  }
  return void 0;
}

// ../botDev/src/devUtil.ts
function removeObjectProperty({ obj, path }, stripEmptyObjects = false) {
  const keys = pathToKeys({ obj, path });
  if (!(obj && keys[0] && obj[keys[0]])) return;
  if (keys.length > 1)
    removeObjectProperty({ obj: obj[keys[0]], path: { keys: keys.slice(1) } }, stripEmptyObjects);
  if (keys.length === 1 || stripEmptyObjects && Object.keys(obj[keys[0]]).length === 0) {
    delete obj[keys[0]];
  }
}
function setObjectProperty({ obj, path, value }) {
  const keys = pathToKeys({ obj, path });
  if (keys.length === 0) return;
  if (keys.length === 1) obj[keys[0]] = value;
  else if (!(keys[0] in obj)) obj[keys[0]] = {};
  setObjectProperty({ obj: obj[keys[0]], path: { keys: keys.slice(1) }, value });
}
function deadStrip(info) {
  if (!("disabled" in info)) return info;
  const temp = structuredClone(info);
  for (const id of info.disabled) {
    removeObjectProperty({ obj: temp, path: { id } }, true);
  }
  return temp;
}
function maxChars(info) {
  const len = Math.max(info.max.toString().length, info.min.toString().length);
  if (!("step" in info)) return len;
  const fractionLen = info.step < 1 ? String(info.step).length - String(info.step).indexOf(".") - 1 : 0;
  return len + fractionLen + 1;
}
function botScore(r, uid) {
  return r.winner === void 0 ? 0.5 : r[r.winner] === uid ? 1 : 0;
}
function resultsObject(results, uid) {
  return results.reduce(
    (a, r) => ({
      w: a.w + (r.winner !== void 0 && r[r.winner] === uid ? 1 : 0),
      d: a.d + (r.winner === void 0 && (r.white === uid || r.black === uid) ? 1 : 0),
      l: a.l + (r.winner !== void 0 && r[opposite(r.winner)] === uid ? 1 : 0)
    }),
    { w: 0, d: 0, l: 0 }
  );
}
function resultsString(results, uid) {
  const { w, d, l } = resultsObject(results, uid);
  return `${w}/${d}/${l}`;
}
function playersWithResults(results) {
  return [...new Set(results.flatMap((r) => {
    var _a, _b;
    return [(_a = r.white) != null ? _a : "", (_b = r.black) != null ? _b : ""].filter(Boolean);
  }))];
}
function renderRemoveButton(cls = "") {
  return frag(
    `<button class="button button-empty button-red icon-btn ${cls}" tabindex="0" data-icon="${licon.Cancel}" data-action="remove">`
  );
}
function pathToKeys({ path, obj }) {
  if ("keys" in path) return path.keys;
  const keys = path.id.split("_");
  return keys[0] in obj ? keys : keys.slice(1);
}
var rangeTicks = {
  initial: [
    [15, "15 seconds"],
    [30, "30 seconds"],
    [45, "45 seconds"],
    [60, "1 minute"],
    [120, "2 minutes"],
    [180, "3 minutes"],
    [300, "5 minutes"],
    [600, "10 minutes"],
    [1800, "30 minutes"],
    [3600, "60 minutes"],
    [5400, "90 minutes"],
    [Infinity, "unlimited"]
  ],
  increment: [
    [0, "none"],
    [1, "1 second"],
    [2, "2 seconds"],
    [3, "3 seconds"],
    [5, "5 seconds"],
    [10, "10 seconds"],
    [30, "30 seconds"]
  ]
};

// ../botDev/src/rateBot.ts
var RateBot = class {
  constructor(level) {
    this.level = level;
    this.image = "3d4c495c229b.webp";
    this.version = 0;
    this.name = "Stockfish";
    this.books = [];
    this.sounds = {};
    this.filters = {};
    const rating = (this.level + 8) * 75;
    this.ratings = {
      ultraBullet: rating,
      bullet: rating,
      blitz: rating,
      rapid: rating,
      classical: rating
    };
    Object.defineProperty(this, "traceMove", { value: "", writable: true });
  }
  get uid() {
    return `#${this.level}`;
  }
  get depth() {
    return clamp(this.level - 9, { min: 1, max: 20 });
  }
  get description() {
    return `Stockfish ${this.ratings.classical} Skill Level ${this.level - 10} Depth ${this.depth}`;
  }
  async move({ chess, ply, pos }) {
    const fen = fen_exports.makeFen(chess.toSetup());
    const uci = (await env.bot.zerofish.goFish(pos, { multipv: 1, level: this.level - 10, by: { depth: this.depth } })).bestmove;
    this.traceMove = `  ${ply}. '${this.name} ${this.ratings.classical}' at '${fen}': '${uci}'`;
    return { uci, movetime: 0.1 };
  }
};
RateBot.MAX_LEVEL = 29;
function rateBotMatchup(uid, { r, rd }, last) {
  if (rd < 60) return [];
  const score = last ? botScore(last, uid) : 0.5;
  const lvl = ratingToRateBotLevel(r + (Math.random() + score - 1) * (rd * 1.5));
  return [Math.random() < 0.5 ? { white: uid, black: `#${lvl}` } : { white: `#${lvl}`, black: uid }];
}
function ratingToRateBotLevel(rating) {
  return clamp(Math.round(rating / 75) - 8, { min: 0, max: RateBot.MAX_LEVEL });
}

// ../botDev/src/devBotCtrl.ts
var currentBotDbVersion = 3;
var DevBotCtrl = class extends BotLoader {
  constructor(zf) {
    super(zf);
    this.rateBots = [];
    this.uids = { white: void 0, black: void 0 };
    this.localBots = {};
    this.serverBots = {};
    this.upgrade = (change, store) => {
      const req = store.openCursor();
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (!cursor) return;
        cursor.update(migrate(change.oldVersion, cursor.value));
        cursor.continue();
      };
    };
    for (let i = 0; i <= RateBot.MAX_LEVEL; i++) {
      this.rateBots.push(new RateBot(i));
    }
  }
  async init(defBots) {
    const [localBots] = await Promise.all([this.storedBots(), super.init(defBots)]);
    this.localBots = Object.fromEntries(localBots.map((b) => [b.uid, deepFreeze(b)]));
    this.serverBots = Object.fromEntries(
      [...this.bots.entries()].map((x) => [x[0], deepFreeze(structuredClone(x[1]))])
    );
    for (const [uid, botInfo] of Object.entries(this.localBots)) this.bots.set(uid, new Bot(botInfo, this));
    await Promise.all(
      [...new Set(Object.values(this.bots).map((b) => botAssetUrl("image", b.image)))].map(
        (url) => new Promise((resolve) => {
          const img = new Image();
          img.src = url;
          img.onload = () => resolve();
          img.onerror = () => resolve();
        })
      )
    );
    if (this.uids.white && !this.bots.has(this.uids.white)) this.uids.white = void 0;
    if (this.uids.black && !this.bots.has(this.uids.black)) this.uids.black = void 0;
    pubsub.complete("botdev.images.ready");
    return this;
  }
  async move(args) {
    const bot = this[args.chess.turn];
    if (!bot) return void 0;
    if (this.busy) return void 0;
    this.busy = true;
    const move = await bot.move(args);
    this.busy = false;
    return (move == null ? void 0 : move.uci) !== "0000" ? move : void 0;
  }
  setUids({ white, black }) {
    this.uids.white = white;
    this.uids.black = black;
    this.reset();
    this.preload([this.uids.white, this.uids.black].filter(defined));
  }
  get white() {
    return this.info(this.uids.white);
  }
  get black() {
    return this.info(this.uids.black);
  }
  get isBusy() {
    return this.busy;
  }
  get all() {
    return [...this.bots.values()];
  }
  get playing() {
    return [this.white, this.black].filter(defined);
  }
  get firstUid() {
    var _a;
    return (_a = this.bots.keys().next()) == null ? void 0 : _a.value;
  }
  storeBot(bot) {
    delete this.localBots[bot.uid];
    this.bots.set(bot.uid, new Bot(bot, this));
    if (botEquals(this.serverBots[bot.uid], bot)) return this.store.remove(bot.uid);
    this.localBots[bot.uid] = deepFreeze(structuredClone(bot));
    return this.store.put(bot.uid, bot);
  }
  async deleteStoredBot(uid) {
    await this.store.remove(uid);
    this.bots.delete(uid);
    await this.init();
  }
  async clearStoredBots(uids) {
    await (uids ? Promise.all(uids.map((uid) => this.store.remove(uid))) : this.store.clear());
    await this.init();
  }
  async setServerBot(bot) {
    this.bots.set(bot.uid, new Bot(bot, this));
    this.serverBots[bot.uid] = deepFreeze(structuredClone(bot));
    delete this.localBots[bot.uid];
    await this.store.remove(bot.uid);
  }
  info(uid) {
    var _a;
    if (uid === void 0) return void 0;
    return (_a = this.bots.get(uid)) != null ? _a : this.rateBots[Number(uid.slice(1))];
  }
  card(bot) {
    var _a;
    return {
      label: `${bot.name}${((_a = bot.ratings) == null ? void 0 : _a.classical) ? " " + bot.ratings.classical : ""}`,
      domId: uidToDomId(bot.uid),
      imageUrl: this.imageUrl(bot),
      classList: []
    };
  }
  groupedCard(bot, isDirty) {
    const cd = this.card(bot);
    const local = this.localBots[bot.uid];
    const server = this.serverBots[bot.uid];
    if (isDirty == null ? void 0 : isDirty(local != null ? local : server)) cd == null ? void 0 : cd.classList.push("dirty");
    if (!server) cd == null ? void 0 : cd.classList.push("local-only");
    else if (server.version > bot.version) cd == null ? void 0 : cd.classList.push("upstream-changes");
    else if (local && !botEquals(local, server)) cd == null ? void 0 : cd.classList.push("local-changes");
    return cd;
  }
  groupedSort(speed = "classical") {
    return (a, b) => {
      for (const c of ["dirty", "local-only", "local-changes", "upstream-changes"]) {
        if (a.classList.includes(c) && !b.classList.includes(c)) return -1;
        if (!a.classList.includes(c) && b.classList.includes(c)) return 1;
      }
      const [ab, bb] = [this.info(domIdToUid(a.domId)), this.info(domIdToUid(b.domId))];
      return Bot.rating(ab, speed) - Bot.rating(bb, speed) || a.label.localeCompare(b.label);
    };
  }
  async getBook(key) {
    if (!key) return void 0;
    if (this.book.has(key)) return this.book.get(key);
    if (!env.assets.idb.book.keyNames.has(key)) return super.getBook(key);
    const bookPromise = env.assets.idb.book.get(key).then((res) => res.blob.arrayBuffer()).then((buf) => makeBookFromPolyglot({ bytes: new DataView(buf) })).then((result) => result.getMoves);
    this.book.set(key, bookPromise);
    return bookPromise;
  }
  getImageUrl(key) {
    var _a;
    return (_a = env.assets.urls.image.get(key)) != null ? _a : super.getImageUrl(key);
  }
  getSoundUrl(key) {
    var _a;
    return (_a = env.assets.urls.sound.get(key)) != null ? _a : super.getSoundUrl(key);
  }
  storedBots() {
    var _a, _b;
    return (_b = (_a = this.store) == null ? void 0 : _a.getMany()) != null ? _b : objectStorage({
      store: "botdev.bots",
      version: currentBotDbVersion,
      upgrade: this.upgrade
    }).then((s) => {
      this.store = s;
      return s.getMany();
    });
  }
};
function uidToDomId(uid) {
  return (uid == null ? void 0 : uid.startsWith("#")) ? `bot-id-${uid.slice(1)}` : void 0;
}
function domIdToUid(domId) {
  return (domId == null ? void 0 : domId.startsWith("bot-id-")) ? `#${domId.slice(7)}` : void 0;
}
function botEquals(a, b) {
  if (!closeEnough(a, b, ["filters", "version"])) return false;
  const [aFilters, bFilters] = [a, b].map(
    (bot) => {
      var _a;
      return Object.entries((_a = bot == null ? void 0 : bot.filters) != null ? _a : {}).filter(([_, v]) => v.move || v.time || v.score);
    }
  );
  return closeEnough(aFilters, bFilters);
}
function closeEnough(a, b, ignore = []) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a)) {
    return Array.isArray(b) && a.length === b.length && a.every((x, i) => closeEnough(x, b[i], ignore));
  }
  if (typeof a !== "object") return false;
  const [aKeys, bKeys] = [filteredKeys(a, ignore), filteredKeys(b, ignore)];
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (!bKeys.includes(key) || !closeEnough(a[key], b[key], ignore)) return false;
  }
  return true;
}
function filteredKeys(obj, ignore = []) {
  if (typeof obj !== "object") return obj;
  return Object.entries(obj).filter(([k, v]) => !ignore.includes(k) && !isEmpty(v)).map(([k]) => k);
}
function isEmpty(prop) {
  return Array.isArray(prop) ? false : typeof prop === "object" ? Object.keys(prop).length === 0 : false;
}
function migrate(oldDbVersion, oldBot) {
  const bot = structuredClone(oldBot);
  if (oldDbVersion < currentBotDbVersion && (bot == null ? void 0 : bot.fish)) {
    bot.fish.depth = "by" in bot.fish && "depth" in bot.fish.by ? bot.fish.by.depth : 10;
  }
  return bot;
}

// ../botDev/src/handOfCards.ts
function handOfCards(opts) {
  return new HandOfCardsImpl(opts);
}
var HandOfCardsImpl = class {
  constructor(opts) {
    this.opts = opts;
    this.cards = [];
    this.killAnimationTimer = 0;
    this.animFrame = 0;
    this.scaleFactor = 1;
    this.events = new Janitor();
    this.layout = () => {
      this.resize();
      this.updateCards();
    };
    this.resize = () => {
      const r = this.view.getBoundingClientRect();
      if (this.deck) this.deckRect = this.deck.getBoundingClientRect();
      if (this.rect && r.width === this.rect.width && r.height === this.rect.height) return;
      this.rect = r;
      this.scaleFactor = 0.6 + 0.5 * clamp((r.width - 360) / 360, { min: 0, max: 1 });
      this.view.style.setProperty("---scale-factor", String(this.scaleFactor));
      const h2 = this.cardSize * this.peek - (1 - Math.sqrt(3 / 4)) * this.fanRadius;
      this.originX = this.isLeft ? -Math.sqrt(3 / 4) * this.fanRadius : r.width * this.center;
      this.originY = this.isLeft ? (r.height - h2) * this.center : r.height + Math.sqrt(3 / 4) * this.fanRadius - h2;
    };
    this.remove = () => {
      if (!this.cards.length) return;
      const cards = this.cards.slice();
      this.cards = [];
      this.events.cleanup();
      cards.forEach((x) => x.style.transform = `translate(${this.originX}px, ${this.originY}px)`);
      setTimeout(() => {
        var _a, _b;
        cards.forEach((x) => x.remove());
        if (this.container) this.container.remove();
        (_b = (_a = this.opts).onRemove) == null ? void 0 : _b.call(_a);
      }, 300);
    };
    this.redraw = () => {
      clearTimeout(this.killAnimationTimer);
      this.killAnimationTimer = setTimeout(() => {
        cancelAnimationFrame(this.animFrame);
        this.animFrame = 0;
      }, 300);
      if (this.animFrame) return;
      const animate = () => {
        this.animFrame = requestAnimationFrame(() => {
          this.placeCards();
          animate();
        });
      };
      animate();
    };
    this.mouseMove = (e) => {
      var _a;
      if (this.drag || !this.rect || !this.deck && !this.opts.transient) return;
      let fanned = this.fanned;
      const fanDepth = this.cardSize * 1.5;
      const r = this.deckRect;
      if (r && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom)
        fanned = true;
      else if (this.isLeft ? e.clientX > this.rect.left + fanDepth : e.clientY < this.rect.bottom - fanDepth)
        fanned = false;
      if (fanned === this.fanned) return;
      if (this.opts.transient && !fanned) this.remove();
      (_a = this.deck) == null ? void 0 : _a.classList.toggle("fanned");
      this.redraw();
    };
    this.mouseEnterCard = (e) => {
      var _a;
      (_a = e.target) == null ? void 0 : _a.classList.add("hovered");
      this.redraw();
    };
    this.mouseLeaveCard = (e) => {
      var _a;
      (_a = e.target) == null ? void 0 : _a.classList.remove("hovered");
      this.redraw();
    };
    this.pointerDownCard = (e) => {
      var _a;
      if (!(e.currentTarget instanceof HTMLElement)) return;
      (_a = this.drag) == null ? void 0 : _a.card.releasePointerCapture(e.pointerId);
      this.drag = { when: performance.now(), card: e.currentTarget };
      this.drag.card.setPointerCapture(e.pointerId);
      if (e.pointerType === "touch") {
        this.drag.shape = new TouchDragShape(e, this.visible, this.drag.card, this.rect, this.drops);
        this.drag.card.classList.add("hovered", "dragging");
        this.touchDragCard(e);
        this.redraw();
      }
      e.preventDefault();
      e.stopPropagation();
    };
    this.pointerMoveCard = (e) => {
      var _a;
      if (!this.drag) return;
      if (e.pointerType === "touch") this.touchDragCard(e);
      else this.mouseDragCard(e);
      this.drops.forEach((drop) => {
        var _a2;
        return (_a2 = drop.el) == null ? void 0 : _a2.classList.remove("drag-over");
      });
      (_a = this.dropTarget(e)) == null ? void 0 : _a.classList.add("drag-over");
      this.redraw();
      e.preventDefault();
    };
    this.touchDragCard = (e) => {
      var _a;
      if (!((_a = this.drag) == null ? void 0 : _a.shape)) return;
      if (this.drag.shape.update(e) && e.clientY > this.rect.bottom - this.cardSize) {
        this.cards.forEach((x) => x.classList.remove("dragging", "hovered"));
        this.drag.card = this.visible[this.drag.shape.index];
        this.drag.card.classList.add("hovered", "dragging");
      }
      const [viewX, viewY] = this.clientToView([e.clientX, e.clientY]);
      this.drag.transform = {
        x: viewX * (1 - this.cardSize / this.rect.width),
        y: viewY - this.cardSize,
        angle: -this.clientToAzimuth([e.clientX, e.clientY]) / 2 - (this.isLeft ? Math.PI / 2 : 0)
      };
    };
    this.mouseDragCard = (e) => {
      var _a;
      if (!((_a = this.drag) == null ? void 0 : _a.card)) return;
      this.drag.card.classList.add("dragging");
      const offsetPt = this.clientToView([e.clientX, e.clientY]);
      const offsetX = offsetPt[0] - this.cardSize / 2;
      const offsetY = offsetPt[1] - this.cardSize / 2;
      const newAngle = this.clientToAzimuth([e.clientX, e.clientY]) - (this.isLeft ? Math.PI / 2 : 0);
      this.drag.transform = { x: offsetX, y: offsetY, angle: newAngle };
    };
    this.pointerUpCard = (e) => {
      this.drops.forEach((drop) => {
        var _a;
        return (_a = drop.el) == null ? void 0 : _a.classList.remove("drag-over");
      });
      this.cards.forEach((x) => x.classList.remove("dragging"));
      if (!this.drag) return;
      this.drag.card.releasePointerCapture(e.pointerId);
      if (e.pointerType === "touch") this.touchUpCard(e);
      else this.mouseUpCard(e);
      this.drag = void 0;
      this.redraw();
    };
    this.mouseUpCard = (e) => {
      if (!this.drag) return;
      const target = this.dropTarget(e);
      if (target || performance.now() - this.drag.when < 300) this.select(target, this.drag.card.id);
    };
    this.touchUpCard = (e) => {
      var _a;
      if (!((_a = this.drag) == null ? void 0 : _a.shape)) return;
      const outcome = this.drag.shape.outcome(e) || this.dropTarget(e);
      if (outcome === "next-group") {
        const groups = [...this.groups];
        const index = groups.indexOf(this.group);
        this.group = groups[(index + 1) % groups.length];
        this.updateCards();
      } else if (outcome) {
        this.select(outcome, this.drag.card.id);
      }
      this.cards.forEach((x) => x.classList.remove("hovered"));
    };
    this.dragStart = (e) => e.preventDefault();
    var _a;
    this.container = frag('<div class="card-container">');
    this.view.append(this.container);
    if (opts.transient) this.events.addListener(window, "pointerdown", this.remove);
    this.events.addListener(window, "resize", () => {
      this.resize();
      this.redraw();
    });
    this.events.addListener(this.view, "mousemove", this.mouseMove);
    this.group = (_a = opts.getGroup) == null ? void 0 : _a.call(opts);
    setTimeout(this.layout);
  }
  updateCards() {
    var _a, _b;
    const data = [...this.opts.getCardData()].reverse();
    if (isEquivalent(data, this.lastCardData)) return;
    const fragment = document.createDocumentFragment();
    const cards = [];
    this.lastCardData = data;
    this.groups = new Set(data.map((cd) => cd.group));
    if (!this.group || !this.groups.has(this.group)) this.group = this.groups.values().next().value;
    for (const cd of data) {
      const card = (_a = this.cards.find((x) => x.id === cd.domId)) != null ? _a : this.createCard(cd);
      const label = card.lastElementChild;
      const img = card.firstElementChild;
      if (cd.group === this.group) fragment.appendChild(card);
      if (cd.imageUrl !== img.src) img.src = (_b = cd.imageUrl) != null ? _b : "";
      if (cd.label !== label.textContent) label.textContent = cd.label;
      card.className = "card";
      cd.group ? card.setAttribute("data-group", cd.group) : card.removeAttribute("data-group");
      cd.classList.forEach((c) => card.classList.add(c));
      cards.push(card);
    }
    for (const removed of this.cards.filter((x) => !cards.includes(x))) removed.remove();
    this.cards = cards;
    if (!this.rect || this.opts.transient)
      this.cards.forEach((x) => x.style.transform = `translate(${this.originX}px, ${this.originY}px)`);
    else this.placeCards();
    this.container.appendChild(fragment);
    this.redraw();
  }
  createCard(c) {
    const card = frag(`<div id="${c.domId}" class="card"><img src="${c.imageUrl}" alt="${c.label}"><label>${c.label}</label></div>`);
    c.classList.forEach((x) => card.classList.add(x));
    this.events.addListener(card, "pointerdown", this.pointerDownCard);
    this.events.addListener(card, "pointermove", this.pointerMoveCard);
    this.events.addListener(card, "pointerup", this.pointerUpCard);
    this.events.addListener(card, "mouseenter", this.mouseEnterCard);
    this.events.addListener(card, "mouseleave", this.mouseLeaveCard);
    this.events.addListener(card, "dragstart", this.dragStart);
    return card;
  }
  placeCards() {
    var _a;
    const hovered = this.cards.find((x) => x.classList.contains("hovered"));
    const hoverIndex = this.visible.findIndex((x) => x === hovered);
    const unplaced = this.visible.filter((x) => !this.selectedTransform(x));
    for (const [i, card] of unplaced.entries()) {
      if (!this.opts.opaqueSelectedBackground) card.style.backgroundColor = "";
      if (card === ((_a = this.drag) == null ? void 0 : _a.card) && this.drag.transform)
        card.style.transform = `translate(${this.drag.transform.x}px, ${this.drag.transform.y}px) rotate(${this.drag.transform.angle}rad)`;
      else if (this.fanned) this.fanTransform(card, hoverIndex);
      else this.deckTransform(card, i);
    }
  }
  deckTransform(card, n) {
    if (this.opts.transient || !this.deck) return false;
    const to = this.deck;
    const toSide = Math.min(to.offsetWidth, to.offsetHeight);
    const scale = 0.8 * toSide / this.cardSize;
    const x = to.offsetLeft - card.offsetLeft + (toSide - this.cardSize) / 2 + n;
    const y = to.offsetTop - card.offsetTop + (toSide - this.cardSize) / 2 - n;
    card.style.transform = `translate(${x}px, ${y}px) rotate(-5deg) scale(${scale})`;
    return true;
  }
  fanTransform(card, hoverIndex) {
    var _a;
    const index = this.visible.indexOf(card);
    const visibleArc = Math.PI / 5;
    const centerOffset = -this.cardSize / 2;
    const visibleCards = this.visible.length;
    const isHovered = hoverIndex === index;
    const isAfterHovered = hoverIndex === -1 || index <= hoverIndex;
    let x, y, cardRotation;
    let angle = visibleArc * (0.46 - index / visibleCards);
    if (this.isLeft) {
      if (!isAfterHovered) angle -= Math.PI / 32;
      cardRotation = angle - (isAfterHovered ? 0 : Math.PI / 16);
      let mag = this.fanRadius;
      if (isAfterHovered) mag += isHovered ? this.cardSize / 4 : this.cardSize / 8;
      x = this.originX + mag * Math.cos(angle);
      y = this.originY + mag * Math.sin(angle);
    } else {
      const direction = hoverIndex === -1 ? 0 : isAfterHovered ? 1 : -1;
      if ((_a = this.drag) == null ? void 0 : _a.shape) {
        angle += direction * Math.PI * Math.abs(index - hoverIndex) / 20;
        cardRotation = angle;
      } else {
        angle += direction * Math.PI / 96;
        cardRotation = angle + (isHovered ? Math.PI / 12 : 0);
      }
      const radiusOffset = centerOffset / (isHovered ? 2 : 1);
      x = this.originX + (this.fanRadius + radiusOffset) * Math.sin(angle);
      y = this.originY - (this.fanRadius + radiusOffset) * Math.cos(angle);
    }
    this.visible[index].style.transform = `translate(${x + centerOffset}px, ${y + centerOffset}px) rotate(${cardRotation}rad)`;
  }
  selectedTransform(card) {
    var _a;
    if (this.opts.transient || card === ((_a = this.drag) == null ? void 0 : _a.card)) return false;
    const dindex = this.drops.findIndex((x2) => x2.selected === card.id);
    card.classList.toggle("selected", dindex !== -1);
    if (dindex === -1) return false;
    const to = this.drops[dindex].el;
    const scale = to.offsetHeight / this.cardSize;
    const x = to.offsetLeft + (to.offsetWidth - this.cardSize) / 2;
    const y = to.offsetTop + (to.offsetHeight - this.cardSize) / 2;
    card.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    if (!this.opts.opaqueSelectedBackground)
      card.style.backgroundColor = window.getComputedStyle(to).backgroundColor;
    return true;
  }
  clientToAzimuth(client) {
    const translated = this.clientToOrigin(client);
    return Math.atan2(translated[0], translated[1]);
  }
  // coords relative to the fan arc's origin
  clientToOrigin(client) {
    const ooX = client[0] - this.rect.left - this.originX;
    const ooY = this.rect.top + this.originY - client[1];
    return [ooX, ooY];
  }
  // coords relative to top left of this.view
  clientToView(client) {
    const elX = client[0] - this.rect.left;
    const elY = client[1] - this.rect.top;
    return [elX, elY];
  }
  dropTarget(e) {
    for (const drop of this.drops) {
      const r = drop.el.getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom)
        return drop.el;
    }
    return void 0;
  }
  select(drop, domId) {
    if (this.opts.transient) this.remove();
    return this.opts.select(drop, domId);
  }
  get cardSize() {
    return this.scaleFactor * 192;
  }
  get peek() {
    var _a;
    return (_a = this.opts.peek) != null ? _a : 1;
  }
  get drops() {
    return this.opts.getDrops();
  }
  get view() {
    return this.opts.viewEl;
  }
  get deck() {
    return this.opts.deckEl;
  }
  get visible() {
    return this.cards.filter((card) => card.dataset.group === this.group);
  }
  get fanned() {
    return this.opts.transient || !this.deck || this.deck.classList.contains("fanned");
  }
  get fanRadius() {
    return this.isBottom ? this.view.offsetWidth : this.view.offsetHeight;
  }
  get isLeft() {
    return this.opts.orientation === "left";
  }
  get isBottom() {
    return !this.isLeft;
  }
  get center() {
    var _a;
    return (_a = this.opts.fanCenterToWidthRatio) != null ? _a : 0.5;
  }
};
var TOUCH_FRAMES = 10;
var TouchDragShape = class {
  constructor(e, cards, startCard, box, drops) {
    this.cards = cards;
    this.startCard = startCard;
    this.box = box;
    this.drops = drops;
    this.start = { when: performance.now(), at: { x: e.clientX, y: e.clientY } };
    this.recent = [this.start, this.start];
    this.index = this.cards.indexOf(startCard);
  }
  get last() {
    return this.recent[this.recent.length - 1];
  }
  update(e) {
    if (performance.now() < this.last.when + 16) return false;
    while (this.recent.length >= TOUCH_FRAMES) this.recent.shift();
    this.recent.push({ when: performance.now(), at: { x: e.clientX, y: e.clientY } });
    const currentIndex = clamp(
      Math.round((this.box.right - this.last.at.x) / (this.box.width / this.cards.length)),
      {
        min: 0,
        max: this.cards.length - 1
      }
    );
    const lastIndex = this.index;
    this.index = currentIndex;
    return this.momentum.dir === "lateral" && lastIndex !== currentIndex && this.drops[0].selected !== this.cards[currentIndex].id;
  }
  get momentum() {
    let towardsDrop = 0, nextGroup = 0, lateral = 0, total = 0;
    const r = this.recent;
    for (let i = 1; i < r.length; i++) {
      const dx = r[i].at.x - r[i - 1].at.x;
      const dy = r[i].at.y - r[i - 1].at.y;
      total++;
      Math.abs(dx) > Math.abs(dy) ? lateral++ : dy < 0 ? towardsDrop++ : nextGroup++;
    }
    const dir = towardsDrop > total / 2 && "towards-drop" || nextGroup > total / 2 && "next-group" || lateral > total / 2 && towardsDrop < 2 && nextGroup < 2 && "lateral" || void 0;
    const speed = r.length > 1 ? Math.hypot(this.last.at.x - r[0].at.x, this.last.at.y - r[0].at.y) / (this.last.when - r[0].when) : 0;
    return { speed, dir };
  }
  outcome(_) {
    const momentum = this.momentum;
    if (momentum.speed < 0.15) return void 0;
    if (momentum.dir === "towards-drop") return this.drops[0].el;
    if (momentum.dir === "next-group" && this.last.at.y > this.start.at.y) return "next-group";
    return void 0;
  }
};

// ../botDev/src/setupDialog.ts
function showSetupDialog(setup = {}) {
  pubsub.after("botdev.images.ready").then(() => new SetupDialog(setup).show());
}
var SetupDialog = class {
  constructor(setup) {
    this.playerColor = "white";
    this.setup = {};
    this.janitor = new Janitor();
    this.dropSelect = (_, domId) => {
      this.select(domIdToUid(domId));
    };
    this.updateClock = () => {
      for (const type of ["initial", "increment"]) {
        const selectEl = this.dialog.view.querySelector(`[data-type="${type}"]`);
        this.setup[type] = Number(selectEl == null ? void 0 : selectEl.value);
      }
    };
    this.fight = (asColor = Math.random() < 0.5 ? "white" : "black") => {
      this.updateClock();
      this.setup.white = this.setup.black = void 0;
      if (asColor === "black") this.setup.white = this.uid;
      else this.setup.black = this.uid;
      if (env.game) {
        env.game.load(this.setup);
        this.dialog.close(this.uid);
        env.redraw();
        return;
      }
      const fragParams = [];
      for (const [key, val] of Object.entries(this.setup)) {
        if (key && val) fragParams.push(`${key}=${encodeURIComponent(val)}`);
      }
      site.redirect(`/bots/dev${fragParams.length ? `#${fragParams.join("&")}` : ""}`);
    };
    this.focusFen = () => {
      this.mainContentEl.scrollLeft = this.mainContentEl.scrollWidth;
    };
    this.inputFen = (e) => {
      if (!(e.target instanceof HTMLInputElement)) return;
      this.editor.setFen(e.target.value);
    };
    this.clickStandard = () => {
      this.editor.setVariant("standard");
      const input = this.dialog.view.querySelector(".fen");
      input.value = "";
      this.editor.setFen(fen_exports.INITIAL_FEN);
    };
    this.clickChess960 = () => {
      this.editor.setVariant("chess960");
      const input = this.dialog.view.querySelector(".fen");
      input.value = fen960();
      this.editor.setFen(input.value);
    };
    this.wheel = (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) e.preventDefault();
      else this.mainContentEl.scrollTop = 0;
    };
    this.goToBoard = () => {
      this.mainContentEl.scrollLeft = this.mainContentEl.scrollWidth;
    };
    this.goToOpponent = () => {
      if (this.mainContentEl.scrollLeft === 0) return;
      this.mainContentEl.scrollLeft = 0;
    };
    this.setup = { ...setup };
  }
  async show() {
    var _a, _b;
    const dlg = await domDialog({
      class: "game-setup base-view setup-view",
      css: [{ hashed: "botDev.setup" }],
      htmlText: `<div class="main-content"><div class="with-cards snap-pane"><div class="vs"><div class="player" data-color="black"><icon class="z-remove" data-icon="${licon.X}"></icon><div class="placard none" data-color="black">Human Player</div></div></div><button class="button button-empty go-to-board" data-icon="${licon.GreaterThan}"></button></div><div class="from-position is2d snap-pane"><div class="editor"></div><div class="resets"><button class="button button-metal standard">Standard</button><button class="button button-metal chess960">Chess960</button></div><button class="button button-empty go-to-opponent" data-icon="${licon.LessThan}"></button></div></div><div class="chin"><div class="params"><input class="fen" type="text" spellcheck="false" placeholder="${fen_exports.INITIAL_FEN}" value="${(_a = this.setup.setupFen) != null ? _a : ""}"><span> Clock: <select data-type="initial">${this.timeOptions("initial")}</select> + <select data-type="increment">${this.timeOptions("increment")}</select></span></div><div class="actions"><button class="button button-empty black"><icon></icon></button><button class="button button-empty random"><icon></icon></button><button class="button button-empty white"><icon></icon></button></div></div>`,
      modal: true,
      focus: ".white",
      actions: [
        { selector: ".fen", event: "focus", listener: this.focusFen },
        { selector: ".fen", event: "input", listener: this.inputFen },
        { selector: ".standard", listener: this.clickStandard },
        { selector: ".chess960", listener: this.clickChess960 },
        { selector: ".main-content", event: "wheel", listener: this.wheel },
        { selector: ".go-to-board", listener: this.goToBoard },
        { selector: ".go-to-opponent", listener: this.goToOpponent },
        { selector: ".white", listener: () => this.fight("white") },
        { selector: ".black", listener: () => this.fight("black") },
        { selector: ".random", listener: () => this.fight() },
        { selector: "[data-type]", event: "input", listener: this.updateClock },
        { selector: "icon.z-remove", listener: () => this.select() }
      ],
      onClose: () => {
        localStorage.setItem("botdev.setup", JSON.stringify(this.setup));
        this.janitor.cleanup();
      },
      noCloseButton: true,
      easyClose: env.game && "clickOutside"
    });
    this.dialog = dlg;
    this.mainContentEl = dlg.view.querySelector(".main-content");
    this.initCards();
    this.initEditor();
    this.goToOpponent();
    dlg.show();
    this.select((_b = this.setup[this.botColor]) != null ? _b : env.bot.firstUid);
    this.hand.resize();
  }
  initCards() {
    this.view = this.dialog.view.querySelector(".with-cards");
    const cardData = definedMap(env.bot.sorted("classical"), (b) => env.bot.card(b));
    this.hand = handOfCards({
      getCardData: () => cardData,
      getDrops: () => [
        { el: this.view.querySelector(".player"), selected: uidToDomId(this.setup[this.botColor]) }
      ],
      viewEl: this.view,
      select: this.dropSelect,
      orientation: "bottom",
      peek: clamp(0.5 + (window.innerHeight - 320) / 960, { min: 0.5, max: 1 })
    });
    this.janitor.addListener(window, "resize", () => {
      this.hand.resize();
      this.snapToPane();
    });
  }
  initEditor() {
    this.editorEl = this.dialog.view.querySelector(".editor");
    json("/editor.json").then(async (data) => {
      var _a;
      data.el = this.editorEl;
      data.fen = (_a = this.setup.setupFen) != null ? _a : fen_exports.INITIAL_FEN;
      data.embed = true;
      data.options = {
        inlineCastling: true,
        orientation: "white",
        onChange: (fen) => {
          this.setup.setupFen = fen;
          this.dialog.view.querySelector(".fen").value = fen;
        },
        coordinates: false,
        bindHotkeys: false
      };
      this.editor = await site.asset.loadEsm("editor", { init: data });
      this.editor.setVariant("chess960");
    });
  }
  timeOptions(type) {
    var _a;
    const defaults = { initial: 300, increment: 0 };
    const val = (_a = this.setup[type]) != null ? _a : defaults[type];
    return rangeTicks[type].map(([secs, label]) => `<option value="${secs}"${secs === val ? " selected" : ""}>${label}</option>`).join("");
  }
  select(selection) {
    var _a, _b;
    const bot = env.bot.info(selection);
    const placard = this.view.querySelector(".placard");
    placard.textContent = (_a = bot == null ? void 0 : bot.description) != null ? _a : "";
    placard.classList.toggle("none", !(bot == null ? void 0 : bot.description));
    (_b = this.dialog.view.querySelector(`icon.z-remove`)) == null ? void 0 : _b.classList.toggle("show", !!bot);
    this.setup[this.botColor] = this.uid = bot == null ? void 0 : bot.uid;
    if (!bot) this.hand.redraw();
  }
  snapToPane() {
    if (this.mainContentEl.scrollLeft > 0) this.mainContentEl.scrollLeft = this.mainContentEl.scrollWidth;
  }
  get botColor() {
    return "black";
  }
};

// ../botDev/src/localGame.ts
var LocalGameData = class {
};
var LocalGame = class _LocalGame extends LocalGameData {
  constructor(data, ply) {
    var _a, _b, _c, _d;
    super();
    Object.assign(this, data);
    const chess = this.setupFen ? Chess.fromSetup(fen_exports.parseFen(this.setupFen).unwrap()).unwrap() : Chess.default();
    Object.defineProperties(this, {
      threefoldHashes: { value: /* @__PURE__ */ new Map() },
      chess: { value: chess },
      initialPly: { value: 2 * (chess.fullmoves - 1) + (chess.turn === "black" ? 1 : 0) }
    });
    (_a = this.id) != null ? _a : this.id = randomId();
    (_b = this.createdAt) != null ? _b : this.createdAt = Date.now();
    (_c = this.initial) != null ? _c : this.initial = Infinity;
    (_d = this.increment) != null ? _d : this.increment = 0;
    this.moves = [];
    this.finished = void 0;
    const initialMoves = data && "moves" in data ? data.moves : [];
    for (const move of initialMoves.slice(0, ply)) {
      this.move(move);
    }
  }
  move(move) {
    var _a, _b;
    const { move: coMove, uci } = (_a = normalMove(this.chess, move.uci)) != null ? _a : {};
    if (!coMove || !uci) {
      return this.moveResult({
        uci: move.uci,
        reason: `${this.turn} made illegal move ${move.uci} at ${this.fen}`,
        status: statusOf("unknownFinish")
      });
    }
    const san = san_exports.makeSanAndPlay(this.chess, coMove);
    const boardHash = hashBoard(this.chess.board);
    const clock = structuredClone(move.clock);
    this.threefoldHashes.set(boardHash, ((_b = this.threefoldHashes.get(boardHash)) != null ? _b : 0) + 1);
    this.moves.push({ uci, clock });
    return this.moveResult({ uci, san, move: coMove, clock });
  }
  finish(finishStatus) {
    if (this.finished) return;
    this.finished = { ...this.status, ...finishStatus };
    deepFreeze(this);
  }
  *observe() {
    const chess = new _LocalGame(this, 0);
    for (const move of this.moves) {
      yield chess.move(move);
    }
  }
  get clock() {
    return this.moves.length ? this.moves[this.moves.length - 1].clock : Number.isFinite(this.initial) ? { white: this.initial, black: this.initial } : void 0;
  }
  get status() {
    var _a, _b;
    return (_b = this.finished) != null ? _b : {
      winner: (_a = this.chess.outcome()) == null ? void 0 : _a.winner,
      ...this.chess.isCheckmate() ? { status: statusOf("mate") } : this.chess.isInsufficientMaterial() ? { reason: "insufficient", status: statusOf("draw") } : this.chess.isStalemate() ? { status: statusOf("stalemate") } : this.chess.halfmoves > 99 ? { reason: "fifty", status: statusOf("draw") } : this.isThreefold ? { reason: "threefold", status: statusOf("draw") } : { status: statusOf(this.ply > 0 ? "started" : "created") }
    };
  }
  get ply() {
    return this.initialPly + this.moves.length;
  }
  get turn() {
    return this.chess.turn;
  }
  get awaiting() {
    return opposite(this.chess.turn);
  }
  get isThreefold() {
    var _a;
    return ((_a = this.threefoldHashes.get(hashBoard(this.chess.board))) != null ? _a : 0) > 2;
  }
  get fen() {
    return fen_exports.makeFen(this.chess.toSetup());
  }
  get initialFen() {
    var _a;
    return (_a = this.setupFen) != null ? _a : fen_exports.INITIAL_FEN;
  }
  get dests() {
    return Object.fromEntries([...this.cgDests].map(([src, dests]) => [src, dests.join("")]));
  }
  get cgDests() {
    return compat_exports.chessgroundDests(this.chess);
  }
  get roundSteps() {
    var _a, _b;
    const chess = this.setupFen ? Chess.fromSetup(fen_exports.parseFen(this.setupFen).unwrap()).unwrap() : Chess.default();
    const steps = [
      {
        fen: (_a = this.setupFen) != null ? _a : fen_exports.INITIAL_FEN,
        ply: this.initialPly,
        uci: "",
        san: "",
        check: chess.isCheck()
      }
    ];
    for (const move of this.moves) {
      const { move: coMove } = (_b = normalMove(chess, move.uci)) != null ? _b : {};
      if (!coMove) break;
      const san = san_exports.makeSanAndPlay(chess, coMove);
      steps.push({
        uci: move.uci,
        san,
        fen: fen_exports.makeFen(chess.toSetup()),
        check: chess.isCheck(),
        ply: steps.length + this.initialPly
      });
    }
    return steps;
  }
  get threefoldMoves() {
    var _a;
    const draws = [];
    const boardHash = hashBoard(this.chess.board);
    for (const [from, dests] of this.chess.allDests()) {
      for (const to of dests) {
        const chess = this.chess.clone();
        chess.play({ from, to });
        const moveHash = hashBoard(chess.board);
        if (moveHash !== boardHash && ((_a = this.threefoldHashes.get(moveHash)) != null ? _a : 0) > 1)
          draws.push(makeUci({ from, to }));
      }
    }
    return draws;
  }
  get setup() {
    return {
      setupFen: this.setupFen,
      initial: this.initial,
      increment: this.increment,
      white: this.white,
      black: this.black
    };
  }
  moveResult(fields) {
    const result = {
      uci: "",
      san: "",
      turn: this.chess.turn,
      fen: this.fen,
      ply: this.ply,
      dests: this.dests,
      threefold: this.isThreefold,
      check: this.chess.isCheck(),
      fiftyMoves: this.chess.halfmoves > 99,
      ...this.status,
      ...fields
    };
    if (!["started", "created"].includes(result.status.name)) this.finish(result);
    return result;
  }
};

// ../botDev/src/analyse.ts
function analyse(gameCtrl) {
  const local = gameCtrl.live;
  const root = new pgn_exports.Node();
  let node = root;
  for (const move of gameCtrl.live.observe()) {
    const comments = move.clock ? [pgn_exports.makeComment({ clock: move.clock[opposite(move.turn)] })] : [];
    const newNode = new pgn_exports.ChildNode({ san: move.san, comments });
    node.children.push(newNode);
    node = newNode;
  }
  const game = {
    headers: /* @__PURE__ */ new Map([
      ["Event", "Local game"],
      ["Site", "lichess.org"],
      ["Date", (/* @__PURE__ */ new Date()).toISOString().split("T")[0]],
      ["Round", "?"],
      ["White", env.bot.nameOf(gameCtrl.white)],
      ["Black", env.bot.nameOf(gameCtrl.black)],
      ["Result", local.status.winner ? local.status.winner === "white" ? "1-0" : "0-1" : "1/2-1/2"],
      ["TimeControl", gameCtrl.clock ? `${gameCtrl.clock.initial}+${gameCtrl.clock.increment}` : "-"]
    ]),
    moves: root
  };
  const pgn = pgn_exports.makePgn(game);
  const formEl = frag(`<form method="post" action="/import">
    <textarea name="pgn">${escapeHtml(pgn)}</textarea></form>`);
  document.body.appendChild(formEl);
  formEl.submit();
}

// ../botDev/src/roundProxy.ts
var RoundProxy = class {
  constructor(prefs) {
    this.handlers = {
      move: (d) => env.game.move(d.u),
      resign: () => env.game.resign(),
      "blindfold-no": () => {
      },
      "blindfold-yes": () => {
      },
      "rematch-yes": () => env.game.load(void 0),
      "draw-yes": () => env.game.draw()
    };
    this.newOpponent = () => showSetupDialog(env.game.live.setup);
    this.analyse = () => analyse(env.game);
    this.moreTime = () => {
    };
    this.outoftime = () => env.game.flag();
    this.berserk = () => {
    };
    this.reload = site.reload;
    this.sendLoading = (typ, data) => this.send(typ, data);
    this.receive = (typ, data) => {
      var _a, _b;
      if (this.handlers[typ]) (_b = (_a = this.handlers)[typ]) == null ? void 0 : _b.call(_a, data);
      else console.log("recv: no handler for", typ, data);
      return true;
    };
    this.data = {
      game: {
        id: "synthetic",
        variant: { key: "standard", name: "Standard", short: "Std" },
        speed: "classical",
        perf: "unlimited",
        fen: fen_exports.INITIAL_FEN,
        turns: 0,
        source: "local",
        status: { id: 20, name: "started" },
        player: "white"
      },
      local: this,
      player: {},
      opponent: {},
      pref: { ...prefs, submitMove: 0 },
      steps: [],
      takebackable: false,
      moretimeable: false
    };
  }
  send(t, d) {
    var _a, _b;
    if (this.handlers[t]) (_b = (_a = this.handlers)[t]) == null ? void 0 : _b.call(_a, d);
    else console.log("send: no handler for", t, d);
  }
  updateBoard(game, opts) {
    var _a;
    const updates = {};
    if (game) {
      updates.fen = game.fen;
      updates.check = game.chess.isCheck();
      updates.turnColor = game.turn;
      if (env.game.rewind || !env.bot[env.game.live.turn])
        updates.movable = {
          color: game.turn,
          dests: game.cgDests
        };
    }
    (_a = env.round.chessground) == null ? void 0 : _a.set({ ...updates, ...opts });
  }
  reset() {
    var _a;
    const bottom = env.game.orientation;
    const top = opposite(bottom);
    this.data.game.fen = env.game.live.initialFen;
    this.data.game.turns = env.game.live.ply;
    this.data.game.status = env.game.live.status.status;
    this.data.game.speed = this.data.game.perf = clockToSpeed(env.game.initial, env.game.increment);
    this.data.game.player = ((_a = env.game.rewind) != null ? _a : env.game.live).turn;
    this.data.steps = env.game.live.roundSteps;
    this.data.possibleMoves = env.game.live.dests;
    this.data.player = player(bottom);
    this.data.opponent = player(top);
    this.data.clock = env.game.clock;
    if (!env.round) return;
    env.round.ply = env.game.live.ply;
    env.round.reload(this.data);
  }
  get roundOpts() {
    return {
      data: this.data,
      userId: myUserId(),
      noab: false,
      onChange: () => {
        if (env.round.ply === 0)
          this.updateBoard(void 0, { lastMove: void 0, orientation: env.game.orientation });
      }
    };
  }
};
function player(color) {
  const bot = env.bot.info(env.game.idOf(color));
  return {
    color,
    user: {
      id: env.game.idOf(color),
      username: env.game.nameOf(color),
      online: true,
      perfs: {}
    },
    id: env.game.idOf(color),
    isGone: false,
    name: env.game.nameOf(color),
    rating: bot == null ? void 0 : bot.ratings[env.game.speed],
    image: bot ? env.bot.imageUrl(bot) : void 0,
    onGame: true,
    version: 0
  };
}

// ../botDev/src/gameCtrl.ts
var GameCtrl = class {
  constructor(opts) {
    this.opts = opts;
    this.orientation = "white";
    this.stopped = true;
    // investigate setting rewind = live to pause
    this.jump = (ply) => {
      this.rewind = ply < this.live.moves.length ? new LocalGame(this.live, ply) : void 0;
      if (this.clock) this.clock.since = this.rewind || ply < 2 ? void 0 : performance.now();
      this.updateTurn();
      setTimeout(env.redraw);
    };
    pubsub.on("ply", this.jump);
    pubsub.on("flip", () => env.redraw());
    this.proxy = new RoundProxy(opts.pref);
  }
  load(game) {
    var _a, _b;
    this.stop();
    this.rewind = void 0;
    this.live = new LocalGame({ ...(_a = this.live) == null ? void 0 : _a.setup, ...game });
    env.bot.setUids(this.live);
    env.bot.reset();
    this.orientation = this.black ? "white" : this.white ? "black" : "white";
    this.resetClock();
    this.proxy.reset();
    this.updateClockUi();
    (_b = env.round) == null ? void 0 : _b.redraw();
    this.triggerStart(this.live.ply > 1 && Number.isFinite(this.initial));
  }
  start() {
    this.stopped = false;
    if (this.rewind) this.live = this.rewind;
    this.rewind = void 0;
    if (!this.live.finished) this.updateTurn();
  }
  stop() {
    var _a;
    if (this.isStopped) return;
    this.stopped = true;
    (_a = this.resolveThink) == null ? void 0 : _a.call(this);
  }
  flag() {
    if (this.clock) this.clock[this.live.turn] = 0;
    this.live.finish({ winner: this.live.awaiting, status: statusOf("outoftime") });
    this.gameOver({ winner: this.live.awaiting, status: statusOf("outoftime") });
    this.updateClockUi();
  }
  resign() {
    this.gameOver({ winner: this.live.awaiting, status: statusOf("resign") });
  }
  draw() {
    this.gameOver({ winner: void 0, status: statusOf("draw") });
  }
  nameOf(color) {
    var _a, _b, _c;
    if (!this[color] && this[opposite(color)]) return (_a = myUsername()) != null ? _a : "Anonymous";
    return this[color] ? (_c = (_b = env.bot.info(this[color])) == null ? void 0 : _b.name) != null ? _c : this[color] : i18n.site[color];
  }
  idOf(color) {
    var _a, _b;
    return (_b = (_a = this[color]) != null ? _a : myUserId()) != null ? _b : "anonymous";
  }
  get isStopped() {
    return this.stopped;
  }
  get isLive() {
    return this.rewind === void 0 && !this.isStopped;
  }
  get screenOrientation() {
    var _a;
    return ((_a = env.round) == null ? void 0 : _a.flip) ? opposite(this.orientation) : this.orientation;
  }
  get speed() {
    return clockToSpeed(this.initial, this.increment);
  }
  get white() {
    var _a;
    return (_a = this.live) == null ? void 0 : _a.white;
  }
  get black() {
    var _a;
    return (_a = this.live) == null ? void 0 : _a.black;
  }
  get initial() {
    var _a, _b;
    return (_b = (_a = this.clock) == null ? void 0 : _a.initial) != null ? _b : Infinity;
  }
  get increment() {
    var _a, _b;
    return (_b = (_a = this.clock) == null ? void 0 : _a.increment) != null ? _b : 0;
  }
  move(uci) {
    var _a, _b, _c, _d, _e, _f, _g;
    if (this.rewind) this.live = this.rewind;
    this.rewind = void 0;
    this.stopped = false;
    (_a = this.observer) == null ? void 0 : _a.beforeMove(uci);
    if ((_b = this.clock) == null ? void 0 : _b.since) this.clock[this.live.turn] -= (performance.now() - this.clock.since) / 1e3;
    const moveCtx = this.live.move({ uci, clock: this.clock });
    this.proxy.data.steps.splice(this.live.moves.length);
    (_d = (_c = this.observer) == null ? void 0 : _c.afterMove) == null ? void 0 : _d.call(_c, moveCtx);
    this.playSounds(moveCtx);
    env.round.apiMove(moveCtx);
    if ((_e = moveCtx.move) == null ? void 0 : _e.promotion)
      (_f = env.round.chessground) == null ? void 0 : _f.setPieces(
        /* @__PURE__ */ new Map([
          [
            uci.slice(2, 4),
            { color: this.live.awaiting, role: moveCtx.move.promotion, promoted: true }
          ]
        ])
      );
    if (this.live.finished) this.gameOver(moveCtx);
    else env.db.put(this.live);
    if ((_g = this.clock) == null ? void 0 : _g.increment) this.clock[this.live.awaiting] += this.clock.increment;
    this.updateClockUi();
    if (!this.observer) window.location.hash = `id=${this.live.id}`;
    env.redraw();
  }
  async maybeBotMove() {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const bot = env.bot[this.live.turn];
    const game = this.live;
    if (!bot || game.finished || this.isStopped || this.resolveThink) return;
    const move = await env.bot.move({
      pos: { fen: game.setupFen, moves: game.moves.map((x) => x.uci) },
      ply: game.ply,
      chess: game.chess,
      avoid: game.threefoldMoves,
      initial: (_b = (_a = this.clock) == null ? void 0 : _a.initial) != null ? _b : Infinity,
      increment: (_d = (_c = this.clock) == null ? void 0 : _c.increment) != null ? _d : 0,
      remaining: (_f = (_e = this.clock) == null ? void 0 : _e[game.turn]) != null ? _f : Infinity,
      opponentRemaining: (_h = (_g = this.clock) == null ? void 0 : _g[game.awaiting]) != null ? _h : Infinity
    });
    if (!move) return;
    await new Promise((resolve) => {
      var _a2;
      if (this.clock) {
        this.clock[game.turn] -= move.movetime;
        this.clock.since = void 0;
      }
      if ((_a2 = this.observer) == null ? void 0 : _a2.hurry) return resolve();
      this.resolveThink = resolve;
      const realWait = Math.min(1 + Math.random(), game.ply > 0 ? move.movetime : 0);
      setTimeout(resolve, realWait * 1e3);
    });
    this.resolveThink = void 0;
    if (!this.isStopped && game === this.live && env.round.ply === game.ply) this.move(move.uci);
    else setTimeout(() => this.updateTurn(), 200);
  }
  updateTurn(game = ((_a) => (_a = this.rewind) != null ? _a : this.live)()) {
    if (this.clock && game !== this.live) this.clock = { ...this.clock, ...game.clock };
    this.proxy.updateBoard(game, game.ply === 0 ? { lastMove: void 0 } : {});
    this.updateClockUi();
    if (this.isLive) this.maybeBotMove();
  }
  updateClockUi() {
    var _a, _b, _c, _d;
    if (!this.clock) return;
    this.clock.running = this.isLive && this.live.ply > 1 && !this.isStopped;
    (_b = (_a = env.round) == null ? void 0 : _a.clock) == null ? void 0 : _b.setClock({
      white: this.clock.white,
      black: this.clock.black,
      ticking: playable(this.proxy.data) && this.proxy.data.clock.running ? this.proxy.data.game.player : void 0
    });
    if (this.isStopped || !this.isLive) (_d = (_c = env.round) == null ? void 0 : _c.clock) == null ? void 0 : _d.stopClock();
  }
  gameOver(final) {
    var _a, _b, _c, _d;
    this.stop();
    if (this.clock) (_a = env.round.clock) == null ? void 0 : _a.stopClock();
    this.live.finish(final);
    env.db.put(this.live);
    (_c = (_b = env.round).endWithData) == null ? void 0 : _c.call(_b, { status: final.status, winner: final.winner, boosted: false });
    (_d = this.observer) == null ? void 0 : _d.onGameOver(final);
  }
  playSounds(moveCtx) {
    var _a;
    if (moveCtx.silent) return;
    const justPlayed = this.live.awaiting;
    const botInfo = (_a = env.bot[justPlayed]) != null ? _a : env.bot[opposite(justPlayed)];
    if (!botInfo || !env.bot.bots.get(botInfo.uid)) return;
    const { san } = moveCtx;
    const sounds = [];
    const prefix = env.bot[justPlayed] ? "bot" : "player";
    if (san.includes("x")) sounds.push(`${prefix}Capture`);
    if (this.live.chess.isCheck()) sounds.push(`${prefix}Check`);
    if (this.live.finished) sounds.push(`${prefix}Win`);
    sounds.push(`${prefix}Move`);
    const bot = env.bot.bots.get(botInfo.uid);
    const boardSoundVolume = sounds.length ? bot.playSound(sounds) : 1;
    if (boardSoundVolume) site.sound.move({ ...moveCtx, volume: boardSoundVolume });
  }
  triggerStart(inProgress = false) {
    var _a;
    for (const c of COLORS) {
      if (!env.bot[c]) continue;
      (_a = env.bot.bots.get(env.bot[c].uid)) == null ? void 0 : _a.playSound(["greeting"]);
    }
    if (!env.bot[this.live.turn] || env.bot[this.live.awaiting]) return;
    if (!inProgress) {
      setTimeout(() => this.start(), 200);
      return;
    }
    const main = document.querySelector("#main-wrap");
    main == null ? void 0 : main.classList.add("paused");
    setTimeout(() => {
      const board = main == null ? void 0 : main.querySelector("cg-container");
      const onclick = () => {
        main == null ? void 0 : main.classList.remove("paused");
        this.start();
        board == null ? void 0 : board.removeEventListener("click", onclick);
      };
      board == null ? void 0 : board.addEventListener("click", onclick);
    }, 200);
  }
  resetClock() {
    var _a, _b, _c, _d, _e;
    const initial = this.live.initial;
    this.clock = Number.isFinite(initial) ? {
      initial,
      increment: (_a = this.live.increment) != null ? _a : 0,
      white: (_c = (_b = this.live.clock) == null ? void 0 : _b.white) != null ? _c : initial,
      black: (_e = (_d = this.live.clock) == null ? void 0 : _d.black) != null ? _e : initial,
      running: false,
      since: void 0,
      moretime: 0
    } : void 0;
  }
};

// ../botDev/src/gameView.ts
function renderGameView(side) {
  return hl("main.round", [
    side ? hl("aside.round__side", side) : void 0,
    hl("div.round__app", [hl("div.round__app__board.main-board"), hl("div.col1-rmoves-preload")]),
    hl("div.round__underboard", [hl("div.round__now-playing")]),
    hl("div.round__underchat")
  ]);
}

// ../botDev/src/localDb.ts
var LocalDb = class {
  async init() {
    if (!hasFeature("structuredClone")) globalThis.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
    [this.store, this.liteStore] = await Promise.all([
      objectStorage({
        store: "botdev.games",
        version: 1
      }),
      objectStorage({
        store: "botdev.games.lite",
        version: 1,
        indices: [
          { name: "createdAt", keyPath: "createdAt" },
          { name: "white", keyPath: "white" },
          { name: "black", keyPath: "black" },
          { name: "speed", keyPath: "speed" },
          { name: "status", keyPath: "status" },
          { name: "winner", keyPath: "winner" }
        ]
      })
    ]).catch(() => []);
    return this;
  }
  get lastId() {
    var _a;
    return localStorage.getItem(`botdev.${(_a = myUserId()) != null ? _a : "anonymous"}.gameId`) || void 0;
  }
  set lastId(id) {
    var _a, _b;
    if (id) localStorage.setItem(`botdev.${(_a = myUserId()) != null ? _a : "anonymous"}.gameId`, id);
    else localStorage.removeItem(`botdev.${(_b = myUserId()) != null ? _b : "anonymous"}.gameId`);
  }
  async get(id = this.lastId) {
    var _a;
    return id ? await ((_a = this.store) == null ? void 0 : _a.get(id)) : Promise.resolve(void 0);
  }
  async byDate(after, until) {
    var _a;
    const games = [];
    await ((_a = this.liteStore) == null ? void 0 : _a.readCursor(
      { index: "createdAt", query: range({ above: after, max: until }) },
      (info) => games.push(info)
    ));
    return games;
  }
  async ongoing() {
    var _a;
    const games = [];
    await ((_a = this.liteStore) == null ? void 0 : _a.readCursor({ index: "status", query: status.started }, (info) => games.push(info)));
    return games;
  }
  async put(game) {
    var _a, _b;
    const lite = makeLite(game);
    const data = structuredClone(game);
    await Promise.all([(_a = this.store) == null ? void 0 : _a.put(data.id, data), (_b = this.liteStore) == null ? void 0 : _b.put(data.id, lite)]);
    this.lastId = lite.status === status["started"] ? data.id : void 0;
  }
  delete(ids) {
    var _a, _b;
    if (!ids) return Promise.all([(_a = this.store) == null ? void 0 : _a.clear(), (_b = this.liteStore) == null ? void 0 : _b.clear()]);
    return Promise.all(
      [ids].flat().flatMap((id) => {
        var _a2, _b2, _c, _d;
        return [
          (_b2 = (_a2 = this.store) == null ? void 0 : _a2.remove(id)) != null ? _b2 : Promise.resolve(),
          (_d = (_c = this.liteStore) == null ? void 0 : _c.remove(id)) != null ? _d : Promise.resolve()
        ];
      })
    );
  }
};
function makeLite(game) {
  var _a, _b, _c, _d;
  return {
    ...game,
    speed: game.initial === Infinity ? "correspondence" : clockToSpeed(game.initial, game.increment),
    fen: game.fen,
    turn: game.turn,
    lastMove: !game.moves.length ? "" : game.moves[game.moves.length - 1].uci,
    status: (_c = (_b = (_a = game.finished) == null ? void 0 : _a.status) == null ? void 0 : _b.id) != null ? _c : status["started"],
    winner: (_d = game.finished) == null ? void 0 : _d.winner
  };
}

export {
  env,
  makeEnv,
  DevAssets,
  removeObjectProperty,
  setObjectProperty,
  deadStrip,
  maxChars,
  resultsString,
  playersWithResults,
  renderRemoveButton,
  rangeTicks,
  RateBot,
  rateBotMatchup,
  DevBotCtrl,
  uidToDomId,
  domIdToUid,
  botEquals,
  handOfCards,
  showSetupDialog,
  GameCtrl,
  renderGameView,
  LocalDb
};
//# sourceMappingURL=lib.FAOLKJV6.js.map

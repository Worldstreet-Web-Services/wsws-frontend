import {
  clockToSpeed
} from "./lib.67VUYMDO.js";
import {
  normalMove
} from "./lib.LRP46MC3.js";
import {
  clamp,
  definedMap,
  quantize,
  zip
} from "./lib.HMFK7OOB.js";
import {
  compat_exports,
  fen_exports,
  san_exports
} from "./lib.X7H2PLEK.js";
import {
  squareFile,
  squareRank
} from "./lib.53PYQRAK.js";
import {
  json
} from "./lib.TT4QSUKQ.js";
import {
  myUserId,
  myUsername
} from "./lib.GMEH5BEF.js";

// ../../../../../node_modules/.pnpm/@lichess-org+zerofish@0.0.40/node_modules/@lichess-org/zerofish/dist/zerofish.js
async function makeZerofish({ locator, nonce, dev }) {
  const jsUrl = locator("zerofishEngine.js");
  const module = await import(jsUrl);
  const enginePromises = Array.from({ length: dev ? 2 : 1 }, () => module.default({
    mainScriptUrlOrBlob: jsUrl,
    onError: (msg) => Promise.reject(new Error(msg)),
    locateFile: locator,
    noInitialRun: true
  }));
  const engines = await Promise.all(enginePromises);
  engines[0].callMain(["4"]);
  if (dev)
    engines[1].callMain(["0"]);
  return new ZerofishImpl(engines);
}
var ZerofishImpl = class {
  constructor(workers) {
    this.workers = workers;
    this.lru = /* @__PURE__ */ new Map();
    this.all("setoption name UCI_Chess960 value true");
    this.newGame();
  }
  get fish() {
    return this.workers[0].fish;
  }
  async goFish(pos, s) {
    return this.go(pos, {
      ...s,
      worker: this.workers[0],
      engine: "fish"
    });
  }
  async goZero(pos, s) {
    var _a, _b;
    const index = (_a = this.lru.get(s.net.key)) != null ? _a : await this.getNet(s.net);
    this.lru.set(s.net.key, index);
    return this.go(pos, {
      multipv: s.multipv,
      by: { nodes: (_b = s.nodes) != null ? _b : 1 },
      worker: this.workers[index],
      engine: "zero"
    });
  }
  quit() {
    this.stop();
    for (const w of this.workers)
      w.quit();
  }
  stop() {
    this.all("stop");
  }
  async reset() {
    this.stop();
    this.newGame();
  }
  newGame() {
    this.all("ucinewgame");
  }
  all(uci) {
    this.fish(uci);
    this.workers.forEach((w) => w.zero(uci));
  }
  async getNet(net) {
    let netIndex;
    if (this.lru.size < this.workers.length) {
      netIndex = this.lru.size;
    } else {
      const [netName, index] = this.lru.entries().next().value;
      this.lru.delete(netName);
      netIndex = index;
    }
    this.workers[netIndex].zero("ucinewgame");
    this.workers[netIndex].setZeroWeights(await net.fetch(net.key));
    return netIndex;
  }
  go(pos, { multipv, by, level, worker, engine }) {
    const listen = engine === "fish" ? "listenFish" : "listenZero";
    const newLine = () => Array.from({ length: multipv }, () => ({ moves: [], score: 0 }));
    const result = [];
    const uciMap = /* @__PURE__ */ new Map();
    const { fen, moves } = pos;
    const uci = worker[engine];
    return new Promise(async (resolve, reject) => {
      const onError = (err) => {
        worker[listen] = void 0;
        reject(err);
      };
      worker[listen] = (line) => {
        var _a, _b;
        const tokens = line.split(" ");
        const numericValueOf = (field) => {
          const index = tokens.indexOf(field, 2);
          return index === -1 ? void 0 : Number(tokens[index + 1]);
        };
        if (tokens[0] === "bestmove") {
          worker[listen] = void 0;
          resolve({ bestmove: tokens[1], lines: result, engine });
        } else if (tokens[0] === "info" && tokens[1] === "depth") {
          while (result.length < Number(tokens[2]))
            result.push(newLine());
          const pvIndex = (_a = numericValueOf("multipv")) != null ? _a : 1;
          const mate = numericValueOf("mate");
          const score2 = (_b = numericValueOf("cp")) != null ? _b : mate !== void 0 ? mate > 0 ? 1e4 : -1e4 : NaN;
          result[result.length - 1][pvIndex - 1] = { score: score2, moves: tokens.slice(tokens.indexOf("pv") + 1) };
        }
      };
      uci("position " + (fen ? `fen ${fen}` : "startpos") + ((moves == null ? void 0 : moves[0]) ? ` moves ${moves.join(" ")}` : ""));
      uci(`setoption name multipv value ${multipv}`);
      if (engine === "fish")
        uci(`setoption name skill level value ${level != null ? level : 30}`);
      if ("movetime" in by)
        uci(`go movetime ${by.movetime}`);
      else if ("nodes" in by)
        uci(`go nodes ${by.nodes}`);
      else if ("depth" in by)
        uci(`go depth ${by.depth}`);
      else
        reject(`invalid search ${JSON.stringify(by)}`);
    });
  }
};

// ../lib/src/bot/filter.ts
var filterFacets = {
  move: { domain: { min: 1, max: 60 }, quantum: 1 },
  score: { domain: { min: 0, max: 1 }, quantum: 0.01 },
  time: { domain: { min: -2, max: 8 }, quantum: 1 }
};
var filterFacetKeys = Object.keys(filterFacets);
var filterBys = ["max", "min", "avg"];
function addPoint(f, facet, add) {
  var _a;
  quantizeFilter(f);
  const qX = quantize(add[0], filterFacets[facet].quantum);
  const data = (_a = f[facet]) != null ? _a : f[facet] = [];
  const i = data.findIndex((p) => p[0] >= qX);
  if (i !== -1) {
    if (data[i][0] === qX) data[i] = [qX, add[1]];
    else data.splice(i, 0, [qX, add[1]]);
  } else data.push([qX, add[1]]);
}
function asData(f, facet) {
  var _a, _b;
  const pts = (_b = (_a = f[facet]) == null ? void 0 : _a.slice()) != null ? _b : [];
  const xs = filterFacets[facet].domain;
  const defaultVal = (f.range.max - f.range.min) / 2;
  if (pts.length === 0)
    return [
      { x: xs.min - 1, y: defaultVal },
      { x: xs.max + 1, y: defaultVal }
    ];
  pts.unshift([xs.min - 1, pts[0][1]]);
  pts.push([xs.max + 1, pts[pts.length - 1][1]]);
  return pts.map((p) => ({ x: p[0], y: p[1] }));
}
function quantizeFilter(f) {
  for (const facet of filterFacetKeys) {
    if (!f[facet]) continue;
    const newData = f[facet].reduce((acc, p) => {
      const x = quantize(p[0], filterFacets[facet].quantum);
      const i = acc.findIndex((q) => q[0] === x);
      if (i !== -1) acc[i] = [x, p[1]];
      else acc.push([x, p[1]]);
      return acc;
    }, []);
    newData.sort((a, b) => a[0] - b[0]);
    f[facet] = newData;
  }
}
function evaluateFilter(f, x) {
  var _a;
  const value = {};
  facetIteration: for (const facet of filterFacetKeys) {
    if (!f[facet] || !x[facet]) continue;
    const to = (_a = f[facet]) != null ? _a : f[facet] = [];
    if (to.length === 0) value[facet] = (f.range.max + f.range.min) / 2;
    else if (to.length === 1 || x[facet] <= to[0][0]) value[facet] = clamp(to[0][1], f.range);
    else {
      for (let i = 0; i < to.length - 1; i++) {
        const p1 = to[i];
        const p2 = to[i + 1];
        if (p1[0] <= x[facet] && x[facet] <= p2[0]) {
          const m = (p2[1] - p1[1]) / (p2[0] - p1[0]);
          value[facet] = clamp(p1[1] + m * (x[facet] - p1[0]), f.range);
          continue facetIteration;
        }
      }
      value[facet] = to[to.length - 1][1];
    }
  }
  return value;
}
function combine(v, by) {
  switch (by) {
    case "max":
      return Math.max(...Object.values(v));
    case "min":
      return Math.min(...Object.values(v));
    case "avg":
      return Object.values(v).reduce((sum, w) => sum + w, 0) / Object.keys(v).length;
    default:
      return 0;
  }
}

// ../lib/src/bot/movetime.ts
function movetime({ initial, increment, remaining, opponentRemaining, ply }, rating) {
  var _a;
  const meanMovetimeAt = (_a = models.get(rating)) != null ? _a : makeMovetimer(initial, increment, rating);
  models.set(rating, meanMovetimeAt);
  if (!Number.isFinite(initial)) return 2;
  if (ply < 2) return 0;
  const target = meanMovetimeAt(ply / 2 - 1);
  const unitDrift = Math.sin(Math.PI * Math.random());
  return Math.random() * (remaining + opponentRemaining) < remaining ? target * (1 + unitDrift) : target - unitDrift * (target - meanMovetimeAt(240));
}
var models = /* @__PURE__ */ new Map();
var keyframes = /* @__PURE__ */ new Map([
  [0, { first: { m: -2e-4, b: 0.6 }, peak: { m: -3e-4, b: 1 }, tail: { m: -16e-5, b: 0.46 } }],
  [15, { first: { m: -27e-5, b: 0.72 }, peak: { m: -31e-5, b: 1.11 }, tail: { m: -15e-5, b: 0.46 } }],
  [30, { first: { m: -42e-5, b: 1.16 }, peak: { m: -32e-5, b: 1.69 }, tail: { m: -13e-5, b: 0.45 } }],
  [60, { first: { m: -38e-5, b: 1.33 }, peak: { m: -6e-4, b: 3.28 }, tail: { m: -7e-5, b: 0.34 } }],
  [180, { first: { m: -5e-4, b: 2.25 }, peak: { m: -3e-4, b: 5.7 }, tail: { m: 0, b: 1 } }],
  [300, { first: { m: -65e-5, b: 3.08 }, peak: { m: -105e-5, b: 8.9 }, tail: { m: 0, b: 1 } }],
  [600, { first: { m: -8e-4, b: 4.56 }, peak: { m: 178e-5, b: 9.5 }, tail: { m: 0, b: 1 } }],
  [3600, { first: { m: -41e-5, b: 9.36 }, peak: { m: 0.03, b: -13.3 }, tail: { m: 0, b: 1 } }]
]);
var keys = [...keyframes.keys()].sort();
function lineMix(from, to, mix) {
  return { m: from.m + (to.m - from.m) * mix, b: from.b + (to.b - from.b) * mix };
}
function makeMovetimer(initial, increment, rating) {
  const cappedInitial = clamp(initial, { min: keys[0], max: keys[keys.length - 1] });
  const index = keys.findIndex((i) => i > cappedInitial);
  const lowerKey = index > 0 ? keys[index - 1] : keys[0];
  const upperKey = index !== -1 ? keys[index] : keys[keys.length - 1];
  const mix = upperKey === lowerKey ? 0 : (initial - lowerKey) / (upperKey - lowerKey);
  const lowerFrame = keyframes.get(lowerKey);
  const upperFrame = keyframes.get(upperKey);
  const firstLine = lineMix(lowerFrame.first, upperFrame.first, mix);
  const tailLine = lineMix(lowerFrame.tail, upperFrame.tail, mix);
  const peakLine = lineMix(lowerFrame.peak, upperFrame.peak, mix);
  if (increment > 0) {
    peakLine.m += (increment - 1.3) * 12e-4;
    peakLine.b -= initial <= 180 ? 0 : increment * 0.25;
  }
  const firstTime = firstLine.m * rating + firstLine.b;
  const tailTime = tailLine.m * rating + tailLine.b;
  const peakTime = Math.max(tailTime, peakLine.m * rating + peakLine.b);
  const peakTurn = increment > 0 ? Math.max(12 + (2 - increment) * (rating - 1e3) / 1300, 7) : initial <= 60 ? Math.min(4 + (initial / 15) ** 1.2 + (15 - (initial / 15) ** 1.2) * (rating - 600) / 1800, 19) : Math.min(12 + (initial - 180) / 60 + (rating - 600) / 138, 19);
  return (turn) => {
    if (turn <= peakTurn)
      return firstTime + (peakTime - firstTime) * Math.sin(Math.PI * turn / peakTurn / 2) ** 2;
    else return tailTime + (peakTime - tailTime) / (1 + ((turn - peakTurn) / 15) ** 2);
  };
}

// ../lib/src/bot/bot.ts
var Bot = class _Bot {
  constructor(info, ctrl) {
    this.version = 0;
    Object.assign(this, structuredClone(info));
    if (this.filters) Object.values(this.filters).forEach(quantizeFilter);
    Object.defineProperties(this, {
      cp: { value: 0, writable: true },
      stats: { value: { cplMoves: 0, cpl: 0 } },
      ctrl: { value: ctrl },
      traces: { value: [], writable: true },
      openings: {
        get: () => {
          var _a, _b;
          return Promise.all((_b = (_a = this.books) == null ? void 0 : _a.flatMap((b) => ctrl.getBook(b.key))) != null ? _b : []);
        }
      }
    });
  }
  static rating(bot, speed) {
    var _a, _b, _c, _d;
    return (_d = (_c = (_a = bot == null ? void 0 : bot.ratings) == null ? void 0 : _a[speed]) != null ? _c : (_b = bot == null ? void 0 : bot.ratings) == null ? void 0 : _b.classical) != null ? _d : 1500;
  }
  static isValid(maybeBot) {
    return Boolean((maybeBot == null ? void 0 : maybeBot.zero) || (maybeBot == null ? void 0 : maybeBot.fish));
  }
  static registerFilter(name, spec) {
    _Bot.filterRegistry.set(name, spec);
  }
  static registeredFilters() {
    return [..._Bot.filterRegistry.entries()];
  }
  static get filterRegistry() {
    var _a;
    (_a = _Bot.filterRegistryMap) != null ? _a : _Bot.filterRegistryMap = /* @__PURE__ */ new Map();
    return _Bot.filterRegistryMap;
  }
  get traceMove() {
    return this.traces.join("\n");
  }
  get statsText() {
    return this.stats.cplMoves ? `acpl ${Math.round(this.stats.cpl / this.stats.cplMoves)}` : "";
  }
  async move(args) {
    var _a, _b, _c, _d;
    const { pos, chess } = args;
    const { fish, zero } = this;
    this.trace([`  ${args.ply}. '${this.name}' at '${fen_exports.makeFen(chess.toSetup())}'`]);
    if ((_a = args.avoid) == null ? void 0 : _a.length) this.trace(`[move] - avoid = [${args.avoid.join(", ")}]`);
    const openingMove = await this.bookMove(args);
    args.movetime = movetime(args, _Bot.rating(this, clockToSpeed(args.initial, args.increment)));
    if (openingMove) return { uci: openingMove, movetime: args.movetime };
    const zeroSearch = zero ? {
      nodes: zero.nodes,
      multipv: Math.max(zero.multipv, args.avoid.length + 1),
      // avoid threefold
      net: { key: this.name + "-" + zero.net, fetch: () => this.ctrl.getNet(zero.net) }
    } : void 0;
    if (zeroSearch) this.trace(`[move] - zero: ${stringify(zeroSearch)}`);
    const fishSearch = { multipv: (_b = fish == null ? void 0 : fish.multipv) != null ? _b : 1, by: { depth: Math.max(10, (_c = fish == null ? void 0 : fish.depth) != null ? _c : 10) } };
    if (fish) this.trace(`[move] - fish: ${stringify(fish)}`);
    const [fishResults, zeroResults] = await Promise.all([
      this.ctrl.zerofish.goFish(pos, fishSearch),
      zeroSearch && this.ctrl.zerofish.goZero(pos, zeroSearch)
    ]);
    this.cp = fishResults.lines[fishResults.lines.length - 1][0].score;
    const { uci, cpl, movetime: movetime2 } = this.chooseMove(fishResults, (_d = fish == null ? void 0 : fish.depth) != null ? _d : 0, zeroResults, args);
    if (cpl !== void 0 && cpl < 1e3) {
      this.stats.cplMoves++;
      this.stats.cpl += cpl;
    }
    this.trace(`[move] - chose ${uci} in ${movetime2.toFixed(1)}s`);
    return { uci, movetime: movetime2 };
  }
  playSound(eventList) {
    const prioritized = soundPriority.filter((e) => eventList.includes(e));
    for (const soundList of prioritized.map((priority) => {
      var _a, _b;
      return (_b = (_a = this.sounds) == null ? void 0 : _a[priority]) != null ? _b : [];
    })) {
      let r = Math.random();
      for (const { key, chance, delay, mix } of soundList) {
        r -= chance / 100;
        if (r > 0) continue;
        site.sound.load(key, this.ctrl.getSoundUrl(key)).then(() => setTimeout(() => site.sound.play(key, Math.min(1, mix * 2)), delay * 1e3));
        return Math.min(1, (1 - mix) * 2);
      }
    }
    return 1;
  }
  hasFilter(op) {
    var _a, _b, _c, _d;
    const f = (_a = this.filters) == null ? void 0 : _a[op];
    return Boolean(f && (((_b = f.move) == null ? void 0 : _b.length) || ((_c = f.score) == null ? void 0 : _c.length) || ((_d = f.time) == null ? void 0 : _d.length)));
  }
  facetWeight(op, { chess, movetime: movetime2 }) {
    if (!this.hasFilter(op)) return void 0;
    const f = this.filters[op];
    const x = Object.fromEntries(
      filterFacetKeys.filter((k) => f[k]).map((k) => {
        if (k === "move") return [k, chess.fullmoves];
        else if (k === "score") return [k, outcomeExpectancy(chess.turn, this.cp)];
        else if (k === "time") return [k, Math.log2(movetime2 != null ? movetime2 : 64)];
        else return [k, void 0];
      })
    );
    const vals = evaluateFilter(f, x);
    const y = combine(vals, f.by);
    this.trace(`[filter] - ${op} ${stringify(x)} -> ${stringify(vals)} by ${f.by} yields ${y.toFixed(2)}`);
    return y;
  }
  async bookMove({ chess, initial, increment }) {
    var _a, _b, _c;
    const speed = clockToSpeed(initial, increment);
    const books = (_a = this.books) == null ? void 0 : _a.filter((b) => !b.color || b.color === chess.turn);
    if (!(books == null ? void 0 : books.length)) return void 0;
    const moveList = [];
    let bookChance = 0;
    for (const [book, opening] of zip(books, await this.openings)) {
      const moves = await opening(chess, (_c = (_b = this.ratings[speed]) != null ? _b : this.ratings.classical) != null ? _c : 1500, speed);
      if (moves.length === 0) continue;
      moveList.push({ moves, book });
      bookChance += book.weight;
    }
    bookChance = Math.random() * bookChance;
    for (const { moves, book } of moveList) {
      bookChance -= book.weight;
      const key = book.key;
      if (bookChance <= 0) {
        let chance = Math.random();
        for (const { uci, weight } of moves) {
          chance -= weight;
          if (chance > 0) continue;
          this.trace(`[bookMove] - chose ${uci} from ${book.color ? book.color + " " : ""}book '${key}'`);
          return uci;
        }
      }
    }
    return void 0;
  }
  chooseMove(fishResults, fishDepth, zeroResults, args) {
    var _a, _b, _c, _d, _e;
    const moves = this.parseMoves(fishResults, fishDepth, zeroResults, args);
    const movetime2 = (_a = args.movetime) != null ? _a : 0;
    this.trace(`[chooseMove] - parsed = ${stringify(moves)}`);
    this.scoreByFilters(moves, args);
    moves.sort(weightSort);
    if ((_b = args.pos.moves) == null ? void 0 : _b.length) {
      const last = args.pos.moves[args.pos.moves.length - 1].slice(2, 4);
      if (moves[0].uci.slice(2, 4) === last) {
        this.trace(`[chooseMove] - short-circuit = ${stringify(moves[0])}`);
        return { ...moves[0], movetime: movetime2 / 2 };
      }
    }
    const filtered = moves.filter((mv) => !args.avoid.includes(mv.uci));
    this.trace(`[chooseMove] - sorted & filtered = ${stringify(filtered)}`);
    const decayed = (_e = (_d = this.scoreByMoveQualityDecay(filtered, (_c = this.facetWeight("moveDecay", args)) != null ? _c : 0)) != null ? _d : filtered[0]) != null ? _e : moves[0];
    return { ...decayed, movetime: movetime2 };
  }
  parseMoves(fish, fishDepth, zero, args) {
    var _a;
    if (fishDepth) this.trace(`[parseMoves] - ${stringify(fish)}`);
    if (zero) this.trace(`[parseMoves] - ${stringify(zero)}`);
    if (fish.bestmove === "0000" && (!zero || zero.bestmove === "0000")) {
      this.trace("    parseMoves: no moves found!");
      this.cp = 0;
      return [{ uci: "0000", weights: {} }];
    }
    const parsed = [];
    const lc0bias = (_a = this.facetWeight("lc0bias", args)) != null ? _a : 0;
    const cp = fishDepth ? fish.lines[fishDepth - 1][0].score : this.cp;
    this.trace(`[parseMoves] - cp = ${cp.toFixed(2)}, lc0bias = ${lc0bias.toFixed(2)}`);
    if (fishDepth)
      fish.lines[fishDepth - 1].filter((line) => line.moves[0]).forEach(
        (line) => parsed.push({
          uci: line.moves[0],
          cpl: Math.abs(cp - line.score),
          weights: { lc0bias: 0 }
        })
      );
    if (zero)
      zero.lines[0].map((v) => v.moves[0]).filter(Boolean).forEach((uci) => {
        const existing = parsed.find((move) => move.uci === uci);
        if (existing) existing.weights.lc0bias = lc0bias;
        else parsed.push({ uci, weights: { lc0bias } });
      });
    return parsed;
  }
  scoreByCpl(sorted, args) {
    var _a, _b, _c;
    if (!((_a = this.filters) == null ? void 0 : _a.cplTarget)) return;
    const mean = this.facetWeight("cplTarget", args);
    const stdev = (_b = this.facetWeight("cplStdev", args)) != null ? _b : 80;
    const cplTarget = Math.abs(mean + stdev * getNormal());
    const gain = 0.06;
    const threshold = 80;
    for (const mv of sorted) {
      if (mv.cpl === void 0) continue;
      const distance = Math.abs(((_c = mv.cpl) != null ? _c : 0) - cplTarget);
      mv.weights.cplBias = distance === 0 ? 1 : 1 / (1 + Math.E ** (gain * (distance - threshold)));
    }
  }
  scoreByFilters(sorted, args) {
    var _a, _b, _c;
    if (this.hasFilter("cplTarget")) {
      this.scoreByCpl(sorted, args);
      this.trace(`[chooseMove] - cpl scored = ${stringify(sorted)}`);
    }
    const customFilterKeys = Object.keys((_a = this.filters) != null ? _a : {}).filter(
      (key) => this.hasFilter(key) && !["cplTarget", "cplStdev", "lc0bias", "moveDecay"].includes(key)
    );
    for (const key of customFilterKeys) {
      const { info, score: score2 } = (_b = _Bot.filterRegistry.get(key)) != null ? _b : {};
      if (!info || !score2) {
        throw new Error(`undefined filter: ${key}, registry: ${stringify(_Bot.filterRegistry)}`);
      }
      const filterResult = score2(sorted, args, this.facetWeight(key, args));
      for (const [uci, result] of Object.entries(filterResult)) {
        sorted.find((mv) => mv.uci === uci).weights[key] = result.weight;
      }
      this.trace(`[scoreByFilters] - ${(_c = info.label) != null ? _c : key} scored = ${stringify(sorted)}`);
    }
  }
  scoreByMoveQualityDecay(sorted, decay) {
    let variate = sorted.reduce((sum, mv, i) => sum += mv.P = decay ** i, 0) * Math.random();
    return sorted.find((mv) => (variate -= mv.P) <= 0);
  }
  trace(msg) {
    if (Array.isArray(msg)) this.traces = msg;
    else this.traces.push("      " + msg);
  }
};
function weightSort(a, b) {
  const wScore = (mv) => Object.values(mv.weights).reduce((acc, w) => acc + (w != null ? w : 0), 0);
  return wScore(b) - wScore(a);
}
function outcomeExpectancy(turn, cp) {
  return 1 / (1 + 10 ** ((turn === "black" ? cp : -cp) / 400));
}
var nextNormal = void 0;
function getNormal() {
  if (nextNormal !== void 0) {
    const normal = nextNormal;
    nextNormal = void 0;
    return normal;
  }
  const r = Math.sqrt(-2 * Math.log(Math.random()));
  const theta = 2 * Math.PI * Math.random();
  nextNormal = r * Math.sin(theta);
  return r * Math.cos(theta);
}
function stringify(obj) {
  if (!obj) return "";
  return JSON.stringify(obj, (_, v) => typeof v === "number" ? v.toFixed(2) : v);
}
var soundPriority = [
  "playerWin",
  "botWin",
  "playerCheck",
  "botCheck",
  "playerCapture",
  "botCapture",
  "playerMove",
  "botMove",
  "greeting"
];

// ../lib/src/bot/filters/aggression.ts
Bot.registerFilter("aggression", {
  info: {
    label: "aggression",
    type: "filter",
    class: ["filter"],
    value: { range: { min: -1, max: 1 }, by: "avg" },
    requires: {
      some: [
        "behavior_fish_multipv > 1",
        "behavior_zero_multipv > 1",
        { every: ["behavior_zero", "behavior_fish"] }
      ]
    },
    title: `aggression assigns weights to moves that remove opponent material from the board.

a value of 1 will increase the likelihood of captures, 0 is neutral, and -1 will avoid captures.

this one should be combined with other filters.`
  },
  score: (moves, args, limiter) => {
    const result = {};
    for (const { uci } of moves) {
      const chess = args.chess.clone();
      const normal = normalMove(chess, uci).move;
      result[uci] = san_exports.makeSan(chess, normal).includes("x") ? limiter : 0;
    }
    return result;
  }
});

// ../lib/src/bot/filters/pawnStructure.ts
Bot.registerFilter("pawnStructure", {
  score,
  info: {
    label: "pawn structure",
    type: "filter",
    class: ["filter"],
    value: { range: { min: 0, max: 1 }, by: "avg" },
    requires: {
      some: [
        "behavior_fish_multipv > 1",
        "behavior_zero_multipv > 1",
        { every: ["behavior_zero", "behavior_fish"] }
      ]
    },
    title: `pawn structure assigns weights up to the graph value for pawns that support each other, control the center, and are not doubled or isolated.

This filter assigns a weight between 0 and 1.`
  }
});
function score(moves, args, limiter) {
  const rawScores = {};
  for (const { uci } of moves) {
    const chess = args.chess.clone();
    chess.play(normalMove(chess, uci).move);
    rawScores[uci] = pawnStructure(chess, args.chess.turn);
  }
  const distinct = Array.from(new Set(Object.values(rawScores))).sort((a, b) => a - b);
  const stepped = new Map(distinct.map((raw, i) => [raw, (i + 1) / distinct.length]));
  const result = {};
  for (const { uci } of moves) {
    result[uci] = { weight: Math.round(stepped.get(rawScores[uci]) * limiter * 100) / 100 };
  }
  return result;
}
function pawnStructure(b, color) {
  const pawnSquares = b.board.pieces(color, "pawn");
  const pawnsOnFile = Array(8).fill(0);
  const pos = [];
  let score2 = 0;
  for (const sq of pawnSquares) {
    const [file, rank] = [squareFile(sq), squareRank(sq)];
    pawnsOnFile[file]++;
    pos.push([file, rank]);
    score2 += (color === "white" ? rank : 7 - rank) / 7;
  }
  for (const pawns of pawnsOnFile) if (pawns > 1) score2 -= 0.75 * (pawns - 1);
  for (let i = 0; i < pos.length; i++) {
    const [iFile, iRank] = pos[i];
    for (let j = i + 1; j < pos.length; j++) {
      const [jFile, jRank] = pos[j];
      if (Math.abs(iFile - jFile) === 1 && Math.abs(iRank - jRank) < 2) {
        score2 += iRank === jRank ? 0.5 : 0.75;
      }
    }
  }
  return clamp((score2 + 2) / 12.5, { min: 0, max: 1 });
}

// ../lib/src/game/polyglot.ts
async function makeBookFromPolyglot(init) {
  return site.asset.loadEsm("bits.polyglot", { init });
}
async function makeBookFromPgn(init) {
  return site.asset.loadEsm("bits.polyglot", { init });
}

// ../lib/src/bot/lichessBook.ts
function makeLichessBook() {
  return async (pos, rating, speed) => {
    const url = new URL("https://explorer.lichess.ovh/lichess");
    url.searchParams.set("variant", compat_exports.lichessVariant(pos.rules));
    url.searchParams.set("fen", fen_exports.makeFen(pos.toSetup()));
    url.searchParams.set("topGames", "0");
    url.searchParams.set("recentGames", "0");
    url.searchParams.set("ratings", String(Math.round(clamp(rating, { min: 400, max: 3e3 }))));
    url.searchParams.set("speeds", speed);
    url.searchParams.set("source", "botPlay");
    try {
      const d = await fetch(url.toString(), { mode: "cors" }).then((res) => res.json());
      const sum = d.moves.reduce((s, m) => s + Number(m[pos.turn]), 0);
      return d.moves.map((m) => ({ uci: m.uci, weight: Number(m[pos.turn]) / sum }));
    } catch (e) {
      return [];
    }
  };
}

// ../lib/src/bot/botLoader.ts
var BotLoader = class {
  constructor(zf) {
    this.net = /* @__PURE__ */ new Map();
    this.book = /* @__PURE__ */ new Map();
    this.bots = /* @__PURE__ */ new Map();
    this.busy = false;
    if (zf) this.zerofish = zf;
    else if (zf === false)
      this.zerofish = {
        goZero: () => Promise.resolve({ lines: [], bestmove: "", engine: "zero" }),
        goFish: () => Promise.resolve({ lines: [], bestmove: "", engine: "fish" }),
        quit: () => {
        },
        stop: () => {
        },
        reset: () => {
        }
      };
  }
  async init(defBots) {
    var _a;
    const [bots] = [
      defBots != null ? defBots : await json("/bots").then((res) => res.bots),
      (_a = this.zerofish) != null ? _a : makeZerofish({
        locator: (file) => site.asset.url(`npm/${file}`, { documentOrigin: file.endsWith("js") })
      }).then((zf) => this.zerofish = zf)
    ];
    for (const b of [...bots].filter(Bot.isValid)) {
      this.bots.set(b.uid, new Bot(b, this));
    }
    this.reset();
    return this;
  }
  sorted(by = "alpha") {
    return [...this.bots.values()].sort((a, b) => {
      return by !== "alpha" && Bot.rating(a, by) - Bot.rating(b, by) || a.name.localeCompare(b.name);
    });
  }
  reset() {
    var _a;
    return (_a = this.zerofish) == null ? void 0 : _a.reset();
  }
  imageUrl(bot) {
    return (bot == null ? void 0 : bot.image) && this.getImageUrl(bot.image);
  }
  preload(uids) {
    if (!Array.isArray(uids)) uids = [uids];
    const bots = definedMap(uids, (uid) => this.bots.get(uid));
    const books = bots.flatMap((bot) => {
      var _a;
      return ((_a = bot.books) != null ? _a : []).map((book) => book.key);
    });
    const nets = bots.flatMap((bot) => {
      var _a;
      return ((_a = bot.zero) == null ? void 0 : _a.net) ? [bot.zero.net] : [];
    });
    const sounds = [
      ...new Set(
        bots.flatMap(
          (bot) => {
            var _a;
            return Object.values((_a = bot.sounds) != null ? _a : {}).flatMap((sounds2) => sounds2.map((sound) => sound.key));
          }
        )
      )
    ];
    [...this.book.keys()].filter((k) => k !== "lichess" && !books.includes(k)).forEach((free) => this.book.delete(free));
    return Promise.all([
      ...nets.map((key) => this.getNet(key)),
      ...books.map((key) => this.getBook(key)),
      ...sounds.map((key) => fetch(botAssetUrl("sound", key)))
    ]);
  }
  getNet(key) {
    if (this.net.has(key)) return this.net.get(key).then((net) => net.data);
    const netPromise = fetch(botAssetUrl("net", key)).then((res) => res.arrayBuffer()).then((buf) => ({ key, data: new Uint8Array(buf) }));
    this.net.set(key, netPromise);
    const [lru] = this.net.keys();
    if (this.net.size > 2) this.net.delete(lru);
    return netPromise.then((net) => net.data);
  }
  getBook(key) {
    if (!key) return Promise.resolve(void 0);
    if (this.book.has(key)) return Promise.resolve(this.book.get(key));
    const bookPromise = key === "lichess" ? Promise.resolve(makeLichessBook()) : fetch(botAssetUrl("book", `${key}.bin`)).then((res) => res.arrayBuffer()).then((buf) => makeBookFromPolyglot({ bytes: new DataView(buf) })).then((result) => result.getMoves);
    this.book.set(key, bookPromise);
    return bookPromise;
  }
  getImageUrl(key) {
    return botAssetUrl("image", key);
  }
  getSoundUrl(key) {
    return botAssetUrl("sound", key);
  }
  nameOf(uid) {
    var _a, _b;
    return !uid || uid === myUserId() ? (_a = myUsername()) != null ? _a : "Anonymous" : uid.startsWith("#") && ((_b = this.bots.get(uid)) == null ? void 0 : _b.name) || uid.charAt(0).toUpperCase() + uid.slice(1);
  }
  storedBots() {
    return Promise.resolve([]);
  }
};
function botAssetUrl(type, path) {
  return path.startsWith("https:") ? path : path.includes("/") ? `${site.asset.baseUrl()}/assets/${path}` : site.asset.url(`data/bot/${type}/${encodeURIComponent(path)}`);
}

export {
  filterFacets,
  filterFacetKeys,
  filterBys,
  addPoint,
  asData,
  Bot,
  makeZerofish,
  makeBookFromPolyglot,
  makeBookFromPgn,
  BotLoader,
  botAssetUrl
};
//# sourceMappingURL=lib.22P5PUXN.js.map

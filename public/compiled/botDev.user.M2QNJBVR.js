import {
  DevAssets,
  DevBotCtrl,
  GameCtrl,
  LocalDb,
  env,
  makeEnv,
  renderGameView,
  showSetupDialog
} from "./lib.FAOLKJV6.js";
import "./lib.22P5PUXN.js";
import "./lib.EX2PZIT5.js";
import "./lib.67VUYMDO.js";
import "./lib.GD6YSPBF.js";
import "./lib.MYPIOGN5.js";
import "./lib.LRP46MC3.js";
import "./lib.HMFK7OOB.js";
import "./lib.AEOHBIQD.js";
import "./lib.RPQH5UYI.js";
import "./lib.XAEDCBGD.js";
import "./lib.X7H2PLEK.js";
import "./lib.53PYQRAK.js";
import "./lib.CAO7TYYH.js";
import "./lib.PNHYIP7B.js";
import "./lib.S3TIZ2HQ.js";
import {
  attributesModule,
  classModule,
  init
} from "./lib.LWF5S4ZV.js";
import "./lib.QPQZCXK2.js";
import "./lib.5I4BSVKX.js";
import "./lib.TT4QSUKQ.js";
import "./lib.NFSQQWN5.js";
import "./lib.GMEH5BEF.js";
import "./lib.KO2KTNGK.js";

// ../botDev/src/botDev.user.ts
var patch = init([classModule, attributesModule]);
async function initModule(opts) {
  var _a, _b, _c;
  makeEnv({
    redraw: () => {
    },
    bot: new DevBotCtrl(),
    db: new LocalDb(),
    game: new GameCtrl(opts),
    assets: new DevAssets(void 0)
  });
  await Promise.all([env.db.init(), env.bot.init()]);
  const setup = hashOpts();
  env.game.load({
    ...JSON.parse((_a = localStorage.getItem("botdev.user")) != null ? _a : "{}"),
    ...setup.id || !Object.keys(setup).length ? await env.db.get(setup.id) : setup
  });
  const el = (_b = document.querySelector("main")) != null ? _b : document.createElement("main");
  (_c = document.getElementById("main-wrap")) == null ? void 0 : _c.appendChild(el);
  let vnode = patch(el, renderGameView());
  env.round = await site.asset.loadEsm("round", { init: env.game.proxy.roundOpts });
  redraw();
  if ("go" in setup || "id" in setup) return;
  showSetupDialog(JSON.parse(localStorage.getItem("botdev.user") || "{}"));
  function redraw() {
    vnode = patch(vnode, renderGameView());
    env.round.redraw();
  }
}
function hashOpts() {
  const params = location.hash.slice(1).split("&").map((p) => decodeURIComponent(p).split("=")).filter((p) => p.length === 2);
  const opts = Object.fromEntries(params);
  if ("initial" in opts) opts.initial = Number(opts.initial);
  if ("increment" in opts) opts.increment = Number(opts.increment);
  return opts;
}
export {
  initModule as default
};
//# sourceMappingURL=botDev.user.M2QNJBVR.js.map

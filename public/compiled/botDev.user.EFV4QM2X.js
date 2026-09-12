import {
  DevAssets,
  DevBotCtrl,
  GameCtrl,
  LocalDb,
  env,
  makeEnv,
  renderGameView,
  showSetupDialog
} from "./lib.RB6TCE43.js";
import "./lib.Q3YC5EXG.js";
import "./lib.MAMCKG3Y.js";
import "./lib.LDYEPMQF.js";
import "./lib.JAWNVB2A.js";
import "./lib.LY6FZSW3.js";
import "./lib.KC3NJ77S.js";
import "./lib.NNS7OYZ5.js";
import "./lib.LYPETE66.js";
import "./lib.ILS4LNPZ.js";
import "./lib.GSUEVEQG.js";
import "./lib.JUCKJNFH.js";
import "./lib.PM233RJM.js";
import "./lib.23HTWUBN.js";
import "./lib.GOC3UD5K.js";
import "./lib.WVJXH4CQ.js";
import {
  attributesModule,
  classModule,
  init
} from "./lib.2L7Z4FRN.js";
import "./lib.YID4KMSR.js";
import "./lib.2DWRH35C.js";
import "./lib.M3IF75DN.js";
import "./lib.AXX3QIAX.js";
import "./lib.GK2I5IFJ.js";
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
//# sourceMappingURL=botDev.user.EFV4QM2X.js.map

import {
  start_default
} from "./lib.VGIUFQV7.js";
import "./lib.3GTTC2HX.js";
import "./lib.ADE2DDSZ.js";
import "./lib.3DBOWVDW.js";
import "./lib.JG4BZMTE.js";
import "./lib.CARBOP2Y.js";
import "./lib.ZWX3OLRL.js";
import "./lib.EWOOJSE7.js";
import "./lib.2PZT4GMW.js";
import "./lib.HBFC27IN.js";
import {
  patch
} from "./lib.H7WGO424.js";
import "./lib.WSONNVTW.js";
import "./lib.MG4T3NDN.js";
import "./lib.XHY2VT27.js";
import "./lib.7EXWA4QO.js";
import "./lib.GQS4X5KB.js";
import "./lib.AMLDW7ZU.js";
import "./lib.MX5OJBS2.js";
import "./lib.MAZAPTWV.js";
import "./lib.3NURFI3P.js";
import "./lib.TSMVECCD.js";
import "./lib.LDYEPMQF.js";
import "./lib.JAWNVB2A.js";
import "./lib.RU54GHQA.js";
import "./lib.SZFEWGED.js";
import "./lib.XDYCHUJV.js";
import "./lib.FNBK74W3.js";
import "./lib.EJQKEWZT.js";
import "./lib.NSCF772L.js";
import "./lib.3VFZRSDR.js";
import "./lib.LY6FZSW3.js";
import "./lib.KC3NJ77S.js";
import "./lib.NNS7OYZ5.js";
import "./lib.LYPETE66.js";
import "./lib.ILS4LNPZ.js";
import "./lib.GSUEVEQG.js";
import "./lib.JUCKJNFH.js";
import "./lib.PM233RJM.js";
import "./lib.23HTWUBN.js";
import {
  wsConnect
} from "./lib.GOC3UD5K.js";
import "./lib.WVJXH4CQ.js";
import "./lib.2L7Z4FRN.js";
import "./lib.YID4KMSR.js";
import "./lib.2DWRH35C.js";
import "./lib.M3IF75DN.js";
import "./lib.AXX3QIAX.js";
import "./lib.GK2I5IFJ.js";
import "./lib.KO2KTNGK.js";

// ../analyse/src/boot.ts
function boot_default(start2) {
  return function(cfg) {
    var _a;
    const socketUrl = `/watch/${cfg.data.game.id}/${cfg.data.player.color}/v6`;
    cfg.$side = $(".analyse__side").clone();
    cfg.$underboard = $(".analyse__underboard").clone();
    cfg.socketSend = wsConnect(socketUrl, cfg.data.player.version, {
      params: {
        userTv: (_a = cfg.data.userTv) == null ? void 0 : _a.id
      },
      receive(t, d) {
        analyse.socketReceive(t, d);
      }
    }).send;
    const analyse = start2(cfg);
  };
}

// ../analyse/src/analyse.user.ts
var start = start_default(patch);
var boot = boot_default(start);
async function initModule({ mode, cfg }) {
  await site.asset.loadPieces;
  if (mode === "replay") boot(cfg);
  else userAnalysis(cfg);
}
function userAnalysis(cfg) {
  cfg.$side = $(".analyse__side").clone();
  cfg.socketSend = wsConnect(cfg.socketUrl || "/analysis/socket/v5", cfg.socketVersion, {
    receive: (t, d) => analyse.socketReceive(t, d)
  }).send;
  const analyse = start(cfg);
}
export {
  initModule,
  patch
};
//# sourceMappingURL=analyse.user.SROX5L55.js.map

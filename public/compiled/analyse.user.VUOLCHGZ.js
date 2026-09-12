import {
  start_default
} from "./lib.MVDLUPAI.js";
import "./lib.GIUNMRJU.js";
import "./lib.LARLSDYI.js";
import "./lib.CJXBWL7W.js";
import "./lib.YN2PHZNI.js";
import "./lib.TRB3Z2N6.js";
import "./lib.2OVDXZTI.js";
import "./lib.QGZVCTIP.js";
import "./lib.EN3TWOBW.js";
import "./lib.PQMRP22H.js";
import {
  patch
} from "./lib.UZWUG6PB.js";
import "./lib.OY6DQ2TE.js";
import "./lib.2NHX5WHM.js";
import "./lib.HSNYRAMB.js";
import "./lib.NPW3BL7S.js";
import "./lib.ZXVUOO3F.js";
import "./lib.FMGDQ222.js";
import "./lib.LG7MGGUH.js";
import "./lib.5Q3MW527.js";
import "./lib.SPSB7AAJ.js";
import "./lib.CHCAIC5O.js";
import "./lib.67VUYMDO.js";
import "./lib.GD6YSPBF.js";
import "./lib.BMKV23O2.js";
import "./lib.6Z4MCRO3.js";
import "./lib.MFOXABY3.js";
import "./lib.D6AFQ4TK.js";
import "./lib.EAANXKAK.js";
import "./lib.REVOPUIJ.js";
import "./lib.BWJ4DVGT.js";
import "./lib.MYPIOGN5.js";
import "./lib.LRP46MC3.js";
import "./lib.HMFK7OOB.js";
import "./lib.AEOHBIQD.js";
import "./lib.RPQH5UYI.js";
import "./lib.XAEDCBGD.js";
import "./lib.X7H2PLEK.js";
import "./lib.53PYQRAK.js";
import "./lib.CAO7TYYH.js";
import {
  wsConnect
} from "./lib.PNHYIP7B.js";
import "./lib.S3TIZ2HQ.js";
import "./lib.LWF5S4ZV.js";
import "./lib.QPQZCXK2.js";
import "./lib.5I4BSVKX.js";
import "./lib.TT4QSUKQ.js";
import "./lib.NFSQQWN5.js";
import "./lib.GMEH5BEF.js";
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
//# sourceMappingURL=analyse.user.VUOLCHGZ.js.map

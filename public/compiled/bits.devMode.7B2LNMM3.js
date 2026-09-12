import {
  initMiniBoard
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
import "./lib.S3TIZ2HQ.js";
import "./lib.LWF5S4ZV.js";
import "./lib.QPQZCXK2.js";
import "./lib.5I4BSVKX.js";
import "./lib.TT4QSUKQ.js";
import "./lib.NFSQQWN5.js";
import {
  frag
} from "./lib.GMEH5BEF.js";
import "./lib.KO2KTNGK.js";

// ../bits/src/bits.devMode.ts
function initModule() {
  var _a;
  if (!document.querySelector("main.lobby") || document.querySelector("#fake-tv, .lobby__tv .mini-game"))
    return;
  const ds = document.body.dataset;
  const tv = frag(`<a href="/tv" class="mini-game mini-game-abcd1234 standard is2d"><span class="mini-game__player"><span class="mini-game__user"><span class="utitle" title="Candidate Master">CM</span> &nbsp;Tester1 <img class="uflair" src="${ds.assetUrl}/assets/______4/flair/img/activity.lichess-horsey.webp"><span class="rating">2649</span></span><span class="mini-game__clock mini-game__clock--black clock--run" data-time="60">0:26</span></span><span id="fake-tv" data-state="3R1r1k/pp4p1/2n1Q1bp/1Bp5/PqN4P/2b2NP1/1P4P1/2K4R,black,d1d8"></span><span class="mini-game__player"><span class="mini-game__user"><span class="utitle" title="FIDE Master">FM</span> &nbsp;tester2 <img class="uflair" src="${ds.assetUrl}/assets/______4/flair/img/activity.lichess-berserk.webp"><span class="rating">2760</span></span><span class="mini-game__clock mini-game__clock--white" data-time="60">0:19</span></span></a>`);
  initMiniBoard(tv.querySelector("#fake-tv"));
  (_a = document.querySelector(".lobby__tv")) == null ? void 0 : _a.append(tv);
}
export {
  initModule
};
//# sourceMappingURL=bits.devMode.7B2LNMM3.js.map

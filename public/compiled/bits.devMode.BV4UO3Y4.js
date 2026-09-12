import {
  initMiniBoard
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
import "./lib.WVJXH4CQ.js";
import "./lib.2L7Z4FRN.js";
import "./lib.YID4KMSR.js";
import "./lib.2DWRH35C.js";
import "./lib.M3IF75DN.js";
import "./lib.AXX3QIAX.js";
import {
  frag
} from "./lib.GK2I5IFJ.js";
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
//# sourceMappingURL=bits.devMode.BV4UO3Y4.js.map

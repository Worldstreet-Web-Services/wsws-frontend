import {
  initMiniBoardWith
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
import "./lib.GK2I5IFJ.js";
import "./lib.KO2KTNGK.js";

// ../puzzle/src/puzzle.opening.ts
site.load.then(() => {
  const rootEl = document.querySelector(".puzzle-openings");
  if (rootEl && !("ontouchstart" in window)) loadBoardTips(rootEl);
});
function loadBoardTips(rootEl) {
  rootEl.addEventListener("mouseover", (e) => {
    var _a;
    const el = e.target;
    if (el.classList.contains("blpt")) makeBoardTip(el, e);
    else {
      const parent = el.parentNode;
      if ((_a = parent == null ? void 0 : parent.classList) == null ? void 0 : _a.contains("blpt")) makeBoardTip(parent, e);
    }
  });
}
var makeBoardTip = (el, e) => {
  $(el).removeClass("blpt").powerTip({
    popupId: "miniBoard",
    preRender(el2) {
      const tipEl = document.getElementById("miniBoard");
      tipEl.innerHTML = `<div class="mini-board mini-board--init cg-wrap standard is2d"/>`;
      initMiniBoardWith(tipEl.querySelector(".cg-wrap"), {
        fen: el2.dataset["fen"],
        orientation: "white"
      });
    }
  });
  $.powerTip.show(el, e);
};
//# sourceMappingURL=puzzle.opening.QDOU36T4.js.map

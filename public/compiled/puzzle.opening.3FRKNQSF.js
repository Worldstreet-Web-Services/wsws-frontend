import {
  initMiniBoardWith
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
import "./lib.GMEH5BEF.js";
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
//# sourceMappingURL=puzzle.opening.3FRKNQSF.js.map

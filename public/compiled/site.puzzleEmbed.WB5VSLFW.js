import {
  embedChessground
} from "./lib.D3WZBGDC.js";
import {
  uciToMove
} from "./lib.ILS4LNPZ.js";
import "./lib.GSUEVEQG.js";
import "./lib.JUCKJNFH.js";
import "./lib.PM233RJM.js";
import "./lib.M3IF75DN.js";
import "./lib.AXX3QIAX.js";
import "./lib.GK2I5IFJ.js";
import "./lib.KO2KTNGK.js";

// ../site/src/site.puzzleEmbed.ts
window.onload = async () => {
  var _a, _b;
  const el = document.querySelector("#daily-puzzle");
  const board = el == null ? void 0 : el.querySelector(".mini-board");
  if (!el || !board) return;
  const [fen, orientation, lm] = (_b = (_a = board.getAttribute("data-state")) == null ? void 0 : _a.split(",")) != null ? _b : [];
  (await embedChessground()).Chessground(board.firstChild, {
    coordinates: false,
    drawable: { enabled: false, visible: false },
    viewOnly: true,
    fen,
    lastMove: uciToMove(lm),
    orientation
  });
  const resize = () => {
    var _a2, _b2;
    const windowHeight = window.innerHeight;
    if (el.offsetHeight > windowHeight) {
      const textHeightOffset = (_b2 = (_a2 = el.querySelector("span.text")) == null ? void 0 : _a2.offsetHeight) != null ? _b2 : 0;
      el.style.maxWidth = windowHeight - textHeightOffset + "px";
    }
  };
  resize();
  window.addEventListener("resize", resize);
};
//# sourceMappingURL=site.puzzleEmbed.WB5VSLFW.js.map

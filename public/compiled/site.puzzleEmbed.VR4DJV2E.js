import {
  embedChessground
} from "./lib.QZVQR427.js";
import {
  uciToMove
} from "./lib.RPQH5UYI.js";
import "./lib.XAEDCBGD.js";
import "./lib.X7H2PLEK.js";
import "./lib.53PYQRAK.js";
import "./lib.TT4QSUKQ.js";
import "./lib.NFSQQWN5.js";
import "./lib.GMEH5BEF.js";
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
//# sourceMappingURL=site.puzzleEmbed.VR4DJV2E.js.map

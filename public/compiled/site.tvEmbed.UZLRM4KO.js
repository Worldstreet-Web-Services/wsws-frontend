import {
  embedChessground
} from "./lib.QZVQR427.js";
import {
  initMiniGame,
  updateMiniGame
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

// ../site/src/site.tvEmbed.ts
function resize() {
  const el = document.querySelector("#featured-game");
  if (el.offsetHeight > window.innerHeight)
    el.style.maxWidth = window.innerHeight - el.querySelector(".mini-game__player").offsetHeight * 2 + "px";
}
window.onload = async () => {
  const makeChessground = (await embedChessground()).Chessground;
  const findGame = () => document.getElementsByClassName("mini-game").item(0);
  const setup = () => initMiniGame(findGame(), makeChessground);
  setup();
  if (window.EventSource)
    new EventSource(document.body.getAttribute("data-stream-url")).addEventListener(
      "message",
      (e) => {
        const msg = JSON.parse(e.data);
        if (msg.t === "featured") {
          document.getElementById("featured-game").innerHTML = msg.d.html;
          setup();
        } else if (msg.t === "fen") {
          updateMiniGame(findGame(), msg.d);
        }
      },
      false
    );
  resize();
  window.addEventListener("resize", resize);
};
//# sourceMappingURL=site.tvEmbed.UZLRM4KO.js.map

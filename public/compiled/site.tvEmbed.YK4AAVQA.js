import {
  embedChessground
} from "./lib.D3WZBGDC.js";
import {
  initMiniGame,
  updateMiniGame
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
//# sourceMappingURL=site.tvEmbed.YK4AAVQA.js.map

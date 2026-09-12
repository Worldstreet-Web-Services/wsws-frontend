import {
  start
} from "./lib.VACVJ5HI.js";
import "./lib.AEOHBIQD.js";
import "./lib.RPQH5UYI.js";
import "./lib.XAEDCBGD.js";
import "./lib.X7H2PLEK.js";
import "./lib.53PYQRAK.js";
import "./lib.LWF5S4ZV.js";
import "./lib.KO2KTNGK.js";

// ../site/src/site.lpvEmbed.ts
function initModule(opts) {
  var _a;
  const elem = document.body.firstChild.firstChild;
  const lpv = start(elem, {
    initialPly: parseInt(location.hash.slice(1)) || void 0,
    ...opts.gamebook ? {
      showPlayers: false,
      showMoves: false,
      showClocks: false,
      showControls: false,
      scrollToMove: false,
      drawArrows: false,
      classes: "lpv--gamebook"
    } : {
      showMoves: "auto"
    },
    ...opts,
    pgn: elem.innerHTML,
    translate: (key) => {
      var _a2;
      return (_a2 = opts.i18n) == null ? void 0 : _a2[key];
    }
  });
  if (opts.gamebook) {
    const text = lpv.game.initial.comments[0] || "Start";
    (_a = lpv.div) == null ? void 0 : _a.insertAdjacentHTML(
      "beforeend",
      `<a href="${opts.gamebook.url}" target="_blank" class="button button-no-upper lpv__gamebook">${text}</a>`
    );
  }
}
export {
  initModule
};
//# sourceMappingURL=site.lpvEmbed.W7XH2543.js.map

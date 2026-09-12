import {
  start
} from "./lib.VACVJ5HI.js";
import "./lib.AEOHBIQD.js";
import "./lib.RPQH5UYI.js";
import "./lib.XAEDCBGD.js";
import "./lib.X7H2PLEK.js";
import "./lib.53PYQRAK.js";
import "./lib.LWF5S4ZV.js";
import {
  text
} from "./lib.TT4QSUKQ.js";
import "./lib.NFSQQWN5.js";
import "./lib.GMEH5BEF.js";
import "./lib.KO2KTNGK.js";

// ../bits/src/bits.lpv.ts
async function bits_lpv_default(opts = { el: document.body }) {
  const { el, url, lpvOpts } = opts;
  await site.asset.loadCssPath("bits.lpv");
  if (!url) return autostart(el);
  const pgn = await text(url, { headers: { Accept: "application/x-chess-pgn" } });
  start(el, { ...lpvOpts, lichess: location.origin, pgn });
}
async function autostart(contextEl = document.body) {
  contextEl.querySelectorAll(".lpv--autostart").forEach((el) => {
    var _a, _b;
    if (!el.dataset.pgn) return;
    const pgn = el.dataset["pgn"].replace(/<br>/g, "\n");
    const gamebook = pgn.includes('[ChapterMode "gamebook"]');
    const rawPly = el.dataset["ply"];
    const initialPly = rawPly === "last" ? "last" : rawPly !== void 0 ? parseInt(rawPly, 10) || 0 : void 0;
    const config = {
      pgn,
      orientation: el.dataset["orientation"],
      lichess: location.origin,
      initialPly: initialPly != null ? initialPly : gamebook ? 0 : "last",
      ...gamebook ? {
        showPlayers: false,
        showClocks: false,
        showMoves: false,
        showControls: false,
        scrollToMove: false
      } : {}
    };
    try {
      const lpv = start(el, config);
      if (typeof initialPly === "number") {
        const rootPly = ((_b = (_a = lpv.game.mainline[0]) == null ? void 0 : _a.ply) != null ? _b : 1) - 1;
        const relativePly = Math.max(0, initialPly - rootPly);
        if (relativePly !== initialPly) lpv.toPath(lpv.game.pathAtMainlinePly(relativePly), false);
      }
      if (gamebook) toGamebook(lpv);
    } catch (e) {
      const url = el.dataset["url"];
      if (url) el.innerHTML = `<a href="${url}">${location.host}${url}</a>`;
      console.warn(`LPV refused to load ${url}: ${e}`);
    }
  });
}
function toGamebook(lpv) {
  const href = lpv.game.metadata.externalLink;
  $(lpv.div).addClass("lpv--gamebook").append($(`<a href="${href}" target="_blank" class="button lpv__gamebook">Start</a>`));
}
export {
  bits_lpv_default as default
};
//# sourceMappingURL=bits.lpv.3C5DS7KB.js.map

import {
  api
} from "./lib.EN3TWOBW.js";
import "./lib.MYPIOGN5.js";
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
import {
  pubsub
} from "./lib.QPQZCXK2.js";
import "./lib.5I4BSVKX.js";
import {
  json
} from "./lib.TT4QSUKQ.js";
import "./lib.NFSQQWN5.js";
import "./lib.GMEH5BEF.js";
import "./lib.KO2KTNGK.js";

// ../bits/src/bits.tvGames.ts
var getId = (el) => {
  var _a;
  return (_a = el.getAttribute("href")) == null ? void 0 : _a.substring(1, 9);
};
var isRequestPending = false;
var finishedIdQueue = [];
var requestReplacementGame = () => {
  if (isRequestPending) return;
  const oldId = finishedIdQueue.shift();
  if (!oldId) return;
  isRequestPending = true;
  requestAnimationFrame(() => {
    const main = $("main.tv-games");
    const url = new URL(main.data("rel").replace("gameId", oldId));
    main.find(".mini-game").each((_i, el) => url.searchParams.append("exclude", getId(el)));
    json(url.toString()).then((data) => {
      main.find(`.mini-game[href^="/${oldId}"]`).replaceWith(data.html);
      if (data.html.includes("mini-game__result")) api.overrides.tvGamesOnFinish(data.id);
      pubsub.emit("content-loaded");
    }).then(retryRequest, retryRequest);
  });
};
var retryRequest = () => {
  isRequestPending = false;
  requestReplacementGame();
};
api.overrides.tvGamesOnFinish = (id) => setTimeout(() => {
  finishedIdQueue.push(id);
  requestReplacementGame();
}, 7e3);
site.load.then(() => {
  pubsub.on("socket.in.finish", ({ id }) => api.overrides.tvGamesOnFinish(id));
  $("main.tv-games").find(".mini-game").each((_i, el) => {
    if ($(el).find(".mini-game__result").length > 0) api.overrides.tvGamesOnFinish(getId(el));
  });
});
//# sourceMappingURL=bits.tvGames.ZV7TVPD6.js.map

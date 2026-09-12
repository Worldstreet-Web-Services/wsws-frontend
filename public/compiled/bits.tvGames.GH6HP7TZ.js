import {
  api
} from "./lib.2PZT4GMW.js";
import "./lib.LY6FZSW3.js";
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
import {
  pubsub
} from "./lib.YID4KMSR.js";
import "./lib.2DWRH35C.js";
import {
  json
} from "./lib.M3IF75DN.js";
import "./lib.AXX3QIAX.js";
import "./lib.GK2I5IFJ.js";
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
//# sourceMappingURL=bits.tvGames.GH6HP7TZ.js.map

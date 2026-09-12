import {
  start
} from "./lib.QPVUN6AP.js";
import "./lib.LYPETE66.js";
import "./lib.ILS4LNPZ.js";
import "./lib.GSUEVEQG.js";
import "./lib.JUCKJNFH.js";
import "./lib.PM233RJM.js";
import "./lib.2L7Z4FRN.js";
import "./lib.KO2KTNGK.js";

// ../tutor/src/tutor.ts
site.load.then(() => {
  $(".tutor-card--link").on("click", function() {
    const href = this.dataset["href"];
    if (href) site.redirect(href);
  });
  $(".tutor__opening .lpv").each(function() {
    start(this, {
      pgn: this.dataset["pgn"],
      orientation: this.dataset["orientation"],
      initialPly: "last",
      showMoves: false,
      showClocks: false,
      showPlayers: false,
      chessground: { coordinates: false },
      menu: {
        getPgn: {
          enabled: true,
          fileName: (this.dataset["title"] || this.dataset["pgn"] || "opening").replace(" ", "_") + ".pgn"
        }
      }
    });
  });
  const tutorUser = $(".tutor__waiting__games").data("tutor-user");
  const waitingGames = Array.from($(".tutor__waiting-game")), nbWaitingGames = waitingGames.length;
  if (tutorUser && nbWaitingGames) {
    setTimeout(() => location.assign(`/tutor/${tutorUser}?waiting=1`), 60 * 1e3);
    waitingGames.forEach((el, index) => {
      const lpv = start(el, {
        pgn: el.dataset["pgn"],
        orientation: el.dataset["pov"],
        showMoves: false,
        showClocks: false,
        showPlayers: true,
        showControls: false,
        chessground: { coordinates: false, animation: { duration: 100 } },
        drawArrows: false
      });
      for (let i = 5 - index; i > 0; i--) lpv.goTo("next", false);
      const nbMoves = Array.from(lpv.game.moves.mainline()).length;
      const delayBeforeStart = index * 1e3 * 68 / nbWaitingGames - 9e3;
      const moveInterval = 270 - nbMoves;
      setTimeout(() => setInterval(() => lpv.goTo("next", false), moveInterval), delayBeforeStart);
    });
  }
});
//# sourceMappingURL=tutor.3ZFLPJRV.js.map

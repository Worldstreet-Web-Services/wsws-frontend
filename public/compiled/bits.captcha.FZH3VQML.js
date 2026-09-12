import {
  get
} from "./lib.23HTWUBN.js";
import {
  text,
  url
} from "./lib.M3IF75DN.js";
import "./lib.AXX3QIAX.js";
import "./lib.GK2I5IFJ.js";
import "./lib.KO2KTNGK.js";

// ../bits/src/bits.captcha.ts
function init() {
  let failed = false;
  $("div.captcha").each(function() {
    if (this.dataset.initialized) return;
    const $captcha = $(this), $board = $captcha.find(".mini-board"), $input = $captcha.find("input").val(""), cg = get($board[0], "chessground");
    if (!cg) {
      failed = true;
      return;
    }
    $board.on("touchstart", () => {
      const el = document.activeElement;
      if (el && "blur" in el) el.blur();
    });
    const fen = cg.getFen(), destsObj = $board.data("moves"), dests = /* @__PURE__ */ new Map();
    for (const k in destsObj) dests.set(k, destsObj[k].match(/.{2}/g));
    cg.set({
      turnColor: cg.state.orientation,
      movable: {
        free: false,
        dests,
        color: cg.state.orientation,
        events: {
          after(orig, dest) {
            const piece = cg.state.pieces.get(dest);
            if ((piece == null ? void 0 : piece.role) === "pawn" && (dest[1] === "8" || dest[1] === "1")) {
              cg.setPieces(
                /* @__PURE__ */ new Map([
                  [
                    dest,
                    {
                      role: "queen",
                      color: piece.color,
                      promoted: true
                    }
                  ]
                ])
              );
            }
            $captcha.removeClass("success failure");
            submit(orig + " " + dest);
          }
        }
      }
    });
    const submit = function(solution) {
      $input.val(solution);
      text(url($captcha.data("check-url"), { solution })).then((data) => {
        $captcha.toggleClass("success", data === "1").toggleClass("failure", data !== "1");
        if (data === "1") get($board[0], "chessground").stop();
        else
          setTimeout(
            () => cg.set({
              fen,
              turnColor: cg.state.orientation,
              movable: { dests }
            }),
            300
          );
      });
    };
    this.dataset.initialized = "1";
  });
  if (failed) setTimeout(init, 1e3);
}
site.load.then(() => setTimeout(init, 1e3));
//# sourceMappingURL=bits.captcha.FZH3VQML.js.map

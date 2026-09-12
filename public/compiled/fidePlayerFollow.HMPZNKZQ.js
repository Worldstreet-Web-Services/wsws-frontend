import {
  pubsub
} from "./lib.QPQZCXK2.js";
import {
  text
} from "./lib.TT4QSUKQ.js";
import {
  debounce
} from "./lib.NFSQQWN5.js";
import "./lib.GMEH5BEF.js";
import "./lib.KO2KTNGK.js";

// ../fide/src/fidePlayerFollow.ts
function initModule() {
  fidePlayerFollow();
  pubsub.on("content-loaded", fidePlayerFollow);
}
function fidePlayerFollow(el) {
  (el || document.body).querySelectorAll(".fide-player__follow input:not(.loaded)").forEach((el2) => {
    el2.addEventListener(
      "change",
      debounce(
        (e) => text(
          $(e.target).data("action").replace(/follow=[^&]+/, `follow=${$(e.target).prop("checked")}`),
          { method: "post" }
        ),
        1e3,
        true
      )
    );
    el2.classList.add("loaded");
  });
}
export {
  initModule
};
//# sourceMappingURL=fidePlayerFollow.HMPZNKZQ.js.map

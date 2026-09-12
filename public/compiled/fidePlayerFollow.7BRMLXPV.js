import {
  pubsub
} from "./lib.YID4KMSR.js";
import {
  text
} from "./lib.M3IF75DN.js";
import {
  debounce
} from "./lib.AXX3QIAX.js";
import "./lib.GK2I5IFJ.js";
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
//# sourceMappingURL=fidePlayerFollow.7BRMLXPV.js.map

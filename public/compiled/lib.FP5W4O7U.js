import {
  form,
  text
} from "./lib.M3IF75DN.js";
import {
  throttlePromiseDelay
} from "./lib.AXX3QIAX.js";

// ../lib/src/view/zen.ts
var setZen = throttlePromiseDelay(
  () => 1e3,
  (zen) => text("/pref/zen", {
    method: "post",
    body: form({ zen: zen ? 1 : 0 })
  })
);
function toggleZenMode({ unconditional } = {}) {
  const $body = $("body");
  const zen = $body.toggleClass("zen").hasClass("zen");
  window.dispatchEvent(new Event("resize"));
  if (unconditional || !$body.hasClass("zen-auto")) {
    setZen(zen);
  }
}

export {
  toggleZenMode
};
//# sourceMappingURL=lib.FP5W4O7U.js.map

import {
  spinnerHtml
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
import {
  pubsub
} from "./lib.YID4KMSR.js";
import "./lib.2DWRH35C.js";
import {
  text
} from "./lib.M3IF75DN.js";
import "./lib.AXX3QIAX.js";
import "./lib.GK2I5IFJ.js";
import "./lib.KO2KTNGK.js";

// ../bits/src/bits.infiniteScroll.ts
function initModule(selector = ".infinite-scroll") {
  $(selector).each(function() {
    register(this, selector);
  });
}
function register(el, selector, backoff = 500) {
  const nav = el.querySelector(".pager");
  const next = nav == null ? void 0 : nav.querySelector("a");
  const nextUrl = next == null ? void 0 : next.href;
  const scrollSelector = el.dataset.scrollSelector;
  const scrollEl = scrollSelector && document.querySelector(scrollSelector) || window;
  if (nav && nextUrl)
    new Promise((res) => {
      if (isVisible(nav)) res();
      else
        scrollEl.addEventListener(
          "scroll",
          function scrollListener() {
            if (isVisible(nav)) {
              scrollEl.removeEventListener("scroll", scrollListener);
              res();
            }
          },
          { passive: true }
        );
    }).then(() => {
      if (nav.tagName !== "TR") nav.innerHTML = spinnerHtml;
      return text(nextUrl);
    }).then(
      (html) => {
        nav.remove();
        $(el).append(($(html).is(selector) ? $(html) : $(html).find(selector)).html());
        dedupEntries(el);
        pubsub.emit("content-loaded", el);
        setTimeout(() => register(el, selector, backoff * 1.05), backoff);
      },
      (e) => {
        console.log(e);
        nav.remove();
      }
    );
}
function isVisible(el) {
  const { top, bottom } = el.getBoundingClientRect();
  return (top > 0 || bottom > 0) && top < window.innerHeight;
}
function dedupEntries(el) {
  const ids = /* @__PURE__ */ new Set();
  $(el).find("[data-dedup]").each(function() {
    const id = this.dataset.dedup;
    if (id) {
      if (ids.has(id)) $(this).remove();
      else ids.add(id);
    }
  });
}
export {
  initModule
};
//# sourceMappingURL=bits.infiniteScroll.Y37T6BZ2.js.map

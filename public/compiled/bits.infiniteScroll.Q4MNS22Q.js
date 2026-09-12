import {
  spinnerHtml
} from "./lib.MYPIOGN5.js";
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
  text
} from "./lib.TT4QSUKQ.js";
import "./lib.NFSQQWN5.js";
import "./lib.GMEH5BEF.js";
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
//# sourceMappingURL=bits.infiniteScroll.Q4MNS22Q.js.map

import {
  userComplete
} from "./lib.FNBK74W3.js";
import "./lib.3VFZRSDR.js";
import {
  wsConnect,
  wsSend
} from "./lib.GOC3UD5K.js";
import {
  isIos,
  isTouchDevice
} from "./lib.WVJXH4CQ.js";
import "./lib.2L7Z4FRN.js";
import {
  pubsub
} from "./lib.YID4KMSR.js";
import "./lib.2DWRH35C.js";
import {
  formToXhr,
  text
} from "./lib.M3IF75DN.js";
import "./lib.AXX3QIAX.js";
import "./lib.GK2I5IFJ.js";
import "./lib.KO2KTNGK.js";

// ../bits/src/bits.challengePage.ts
function initModule(opts) {
  const selector = ".challenge-page";
  let accepting;
  wsConnect(`/challenge/${opts.data.challenge.id}/socket/v5`, opts.data.socketVersion, {
    events: {
      reload() {
        text(opts.xhrUrl).then((html) => {
          $(selector).replaceWith($(html).find(selector));
          init();
          pubsub.emit("content-loaded", $(selector)[0]);
        });
      }
    }
  });
  function init() {
    if (!accepting)
      $("#challenge-redirect").each(function() {
        location.href = this.href;
      });
    $(selector).find("form.accept").on("submit", function() {
      accepting = true;
      $(this).html('<span class="ddloader"></span>');
    });
    $(selector).find("form.xhr").on("submit", function(e) {
      e.preventDefault();
      void formToXhr(this);
      $(this).html('<span class="ddloader"></span>');
    });
    $(selector).find("input.friend-autocomplete").each(function() {
      const input = this;
      userComplete({
        input,
        friend: true,
        tag: "span",
        focus: true,
        onSelect: () => setTimeout(() => input.parentNode.submit(), 100)
      });
    });
    $(selector).find(".invite__user__recent button").on("click", function() {
      $(selector).find("input.friend-autocomplete").val(this.dataset.user).parents("form").each(function() {
        this.submit();
      });
    });
    if (isTouchDevice() && typeof navigator.share === "function") {
      const inviteUrl = document.querySelector(".invite__url");
      if (!inviteUrl) return;
      inviteUrl.classList.add("none");
      const instructions = document.querySelector(`.mobile-instructions`);
      instructions.classList.remove("none");
      if (isIos()) instructions.classList.add("is-ios");
      instructions.role = "button";
      instructions.onclick = () => {
        var _a;
        return navigator.share({
          title: `Fancy a game of chess?`,
          url: (_a = inviteUrl.querySelector("input")) == null ? void 0 : _a.value
        }).catch(() => {
        });
      };
    }
  }
  init();
  function pingNow() {
    if (document.getElementById("ping-challenge")) {
      wsSend("ping");
      setTimeout(pingNow, 9e3);
    }
  }
  pingNow();
}
export {
  initModule
};
//# sourceMappingURL=bits.challengePage.GYGQYERP.js.map

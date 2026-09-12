import {
  domDialog
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
import "./lib.QPQZCXK2.js";
import "./lib.5I4BSVKX.js";
import {
  form,
  text
} from "./lib.TT4QSUKQ.js";
import "./lib.NFSQQWN5.js";
import "./lib.GMEH5BEF.js";
import "./lib.KO2KTNGK.js";

// ../bits/src/bits.publicChats.ts
site.load.then(() => {
  let autoRefreshEnabled = true;
  let autoRefreshOnHold = false;
  const renderButton = () => $(".auto-refresh").toggleClass("active", autoRefreshEnabled).toggleClass("hold", autoRefreshOnHold);
  const reloadNow = () => text("/mod/public-chat").then((html) => {
    $(html).find("#communication").appendTo($("#comm-wrap").empty());
    onPageReload();
  });
  const onPageReload = () => {
    $("#communication").append(
      $('<a class="auto-refresh button">Auto refresh</a>').on("click", () => {
        autoRefreshEnabled = !autoRefreshEnabled;
        renderButton();
      })
    ).on("mouseenter", ".chat", () => {
      autoRefreshOnHold = true;
      $(".auto-refresh").addClass("hold");
    }).on("mouseleave", ".chat", () => {
      autoRefreshOnHold = false;
      $(".auto-refresh").removeClass("hold");
    }).on("click", ".line:not(.lichess)", function() {
      const $l = $(this);
      domDialog({ cash: $(".timeout-modal"), modal: true, easyClose: "clickOutside" }).then((dlg) => {
        $(".username", dlg.view).text($l.find(".user-link").text());
        $(".text", dlg.view).text($l.text().split(" ").slice(1).join(" "));
        $(".button", dlg.view).on("click", function() {
          const roomId = $l.parents(".game").data("room");
          const chan = $l.parents(".game").data("chan");
          text("/mod/public-chat/timeout", {
            method: "post",
            body: form({
              roomId,
              chan,
              userId: $(".username", dlg.view).text().toLowerCase(),
              reason: this.value,
              text: $(".text", dlg.view).text()
            })
          }).then((_) => setTimeout(reloadNow, 1e3));
          dlg.close();
        });
        dlg.show();
      });
    });
    renderButton();
    $("#communication .chat").each(function() {
      this.scrollTop = 99999;
    });
  };
  onPageReload();
  setInterval(function() {
    if (!autoRefreshEnabled || document.hidden || autoRefreshOnHold) return;
    reloadNow();
  }, 5e3);
});
//# sourceMappingURL=bits.publicChats.3S2ZQ623.js.map

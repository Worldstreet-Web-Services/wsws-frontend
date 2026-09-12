import {
  domDialog
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
import "./lib.YID4KMSR.js";
import "./lib.2DWRH35C.js";
import {
  form,
  text
} from "./lib.M3IF75DN.js";
import "./lib.AXX3QIAX.js";
import "./lib.GK2I5IFJ.js";
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
//# sourceMappingURL=bits.publicChats.QQRFTZVJ.js.map

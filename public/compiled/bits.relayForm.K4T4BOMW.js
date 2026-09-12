import {
  createSelectSearch
} from "./lib.RYZELSLW.js";
import {
  wireCropDialog
} from "./lib.HNCR7YVP.js";
import "./lib.LY6FZSW3.js";
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
import "./lib.M3IF75DN.js";
import "./lib.AXX3QIAX.js";
import "./lib.GK2I5IFJ.js";
import "./lib.KO2KTNGK.js";

// ../bits/src/bits.relayForm.ts
site.load.then(() => {
  if ($("#form3-markdown").length) {
    $("#form3-info_timeZone").each(function() {
      const newForm = $('.form3[action="/broadcast/new"]');
      if (newForm.length && !newForm.find(".is-invalid").length)
        this.value = Intl.DateTimeFormat().resolvedOptions().timeZone;
      createSelectSearch(this);
    });
    $('select[id^="form3-tiebreaks_"]').each(function() {
      createSelectSearch(this);
    });
    wireCropDialog({
      aspectRatio: 2 / 1,
      post: { url: $(".relay-image-edit").attr("data-post-url"), field: "image" },
      selectClicks: $(".select-image, .drop-target"),
      selectDrags: $(".drop-target")
    });
  } else {
    const $source = $("#form3-syncSource");
    const showSource = () => $(".relay-form__sync").each(function() {
      this.classList.toggle("none", !this.classList.contains(`relay-form__sync-${$source.val()}`));
    });
    $source.on("change", showSource);
    showSource();
    const $label = $(`label[for="form3-delay"]`);
    const $delay = $("#form3-delay");
    const convertDelay = () => {
      const seconds = parseInt($delay.val(), 10);
      if (isNaN(seconds) || seconds <= 0) {
        $label.find("span").remove();
        return;
      }
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      const delayText = ` (${minutes}m${remainingSeconds}s)`;
      const $span = $label.find("span");
      if ($span.length === 0) {
        $label.append($("<span>").text(delayText));
      } else {
        $span.text(delayText);
      }
    };
    $delay.on("input", convertDelay);
    convertDelay();
  }
});
//# sourceMappingURL=bits.relayForm.K4T4BOMW.js.map

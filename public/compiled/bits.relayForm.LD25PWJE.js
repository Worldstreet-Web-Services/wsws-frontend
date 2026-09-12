import {
  createSelectSearch
} from "./lib.SXNY2TMI.js";
import {
  wireCropDialog
} from "./lib.C76YZW6V.js";
import "./lib.MYPIOGN5.js";
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
import "./lib.TT4QSUKQ.js";
import "./lib.NFSQQWN5.js";
import "./lib.GMEH5BEF.js";
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
//# sourceMappingURL=bits.relayForm.LD25PWJE.js.map

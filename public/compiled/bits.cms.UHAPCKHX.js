import {
  getSanitizedMarkdown,
  makeToastEditor
} from "./lib.OEL7RMSF.js";
import "./lib.43B7AC32.js";
import {
  sortTable
} from "./lib.NSCF772L.js";
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
import {
  throttle
} from "./lib.AXX3QIAX.js";
import "./lib.GK2I5IFJ.js";
import "./lib.KO2KTNGK.js";

// ../bits/src/bits.cms.ts
site.load.then(() => {
  $(".markdown-toastui").each(function() {
    const markdownForm = $("#form3-markdown");
    const editor = makeToastEditor(this, markdownForm.val(), "60vh");
    editor.on(
      "change",
      throttle(500, () => markdownForm.val(getSanitizedMarkdown(editor)))
    );
  });
  $(".flash").addClass("fade");
  $("table.cms__pages").each(function() {
    sortTable(this, { descending: true });
  });
  $(".cms__pages__search").on("input", function() {
    const query = this.value.toLowerCase().trim();
    $(".cms__pages").toggleClass("searching", !!query).find("tbody tr").each(function() {
      const match = $(this).find(".title").text().toLowerCase().includes(query) || $(this).find(".lang").text().toLowerCase() === query;
      this.hidden = !!query && !match;
    });
  });
});
//# sourceMappingURL=bits.cms.UHAPCKHX.js.map

import {
  getSanitizedMarkdown,
  makeToastEditor
} from "./lib.GNQYGEJK.js";
import "./lib.DHTHEIGH.js";
import {
  sortTable
} from "./lib.REVOPUIJ.js";
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
import {
  throttle
} from "./lib.NFSQQWN5.js";
import "./lib.GMEH5BEF.js";
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
//# sourceMappingURL=bits.cms.75EHZVIL.js.map

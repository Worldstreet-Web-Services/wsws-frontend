import {
  getSanitizedMarkdown,
  makeToastEditor
} from "./lib.GNQYGEJK.js";
import "./lib.DHTHEIGH.js";
import {
  wireCropDialog
} from "./lib.C76YZW6V.js";
import {
  require_tagify_min
} from "./lib.433VM4AK.js";
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
import {
  __toESM
} from "./lib.KO2KTNGK.js";

// ../bits/src/bits.ublogForm.ts
var import_tagify = __toESM(require_tagify_min(), 1);
site.load.then(() => {
  $(".markdown-toastui").each(function() {
    const markdownForm = this.querySelector(".markdown-content-textarea");
    const editor = makeToastEditor(this, markdownForm.value);
    editor.on(
      "change",
      throttle(500, () => markdownForm.value = getSanitizedMarkdown(editor))
    );
  });
  $("#form3-topics").each(function() {
    setupTopics(this);
  });
  $(".flash").addClass("fade");
  wireCropDialog({
    aspectRatio: 8 / 5,
    post: { url: $(".ublog-image-edit").attr("data-post-url"), field: "image" },
    max: { pixels: 1600 },
    selectClicks: $(".select-image, .drop-target"),
    selectDrags: $(".drop-target"),
    onCropped: (blob) => {
      if (!blob) return;
      const img = document.querySelector("img.ublog-post-image");
      const url = URL.createObjectURL(blob);
      img.src = url;
      img.onload = img.onerror = () => URL.revokeObjectURL(url);
    }
  });
});
var setupTopics = (el) => {
  var _a;
  return new import_tagify.default(el, {
    whitelist: (_a = el.dataset["rel"]) == null ? void 0 : _a.split(","),
    enforceWhitelist: true,
    // userInput: false,
    maxTags: 5,
    dropdown: { enabled: 0, maxItems: 20, highlightFirst: true, closeOnSelect: false },
    originalInputValueFormat: (tags) => tags.map((t) => t.value).join(",")
  });
};
//# sourceMappingURL=bits.ublogForm.2I55ZS3U.js.map

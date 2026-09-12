import {
  getSanitizedMarkdown,
  makeToastEditor
} from "./lib.XWOJEFYY.js";
import "./lib.43B7AC32.js";
import {
  wireCropDialog
} from "./lib.HNCR7YVP.js";
import {
  require_tagify_min
} from "./lib.CHOKQWUY.js";
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
//# sourceMappingURL=bits.ublogForm.LPYCX3OU.js.map

import {
  sortable_esm_default
} from "./lib.KX7CSXI3.js";
import {
  require_tagify_min
} from "./lib.433VM4AK.js";
import {
  require_dist
} from "./lib.BWJ4DVGT.js";
import {
  json,
  url
} from "./lib.TT4QSUKQ.js";
import "./lib.NFSQQWN5.js";
import "./lib.GMEH5BEF.js";
import {
  __toESM
} from "./lib.KO2KTNGK.js";

// ../analyse/src/study/analyse.study.topic.form.ts
var import_tagify = __toESM(require_tagify_min(), 1);
var import_debounce_promise = __toESM(require_dist(), 1);
site.load.then(() => {
  var _a;
  const input = document.getElementById("form3-topics");
  const tagify = new import_tagify.default(input, {
    pattern: /.{2,}/,
    maxTags: parseInt((_a = input == null ? void 0 : input.dataset["max"]) != null ? _a : "64")
  });
  const doFetch = (0, import_debounce_promise.default)(
    (term) => json(url("/study/topic/autocomplete", { term })),
    300
  );
  let clickDebounce;
  tagify.on("input", (e) => {
    const term = e.detail.value.trim();
    if (term.length < 2) return;
    tagify.settings.whitelist.length = 0;
    tagify.loading(true).dropdown.hide.call(tagify);
    doFetch(term).then((list) => {
      tagify.settings.whitelist.splice(0, list.length, ...list);
      tagify.loading(false).dropdown.show.call(tagify, term);
    });
  }).on("click", (e) => {
    clearTimeout(clickDebounce);
    clickDebounce = setTimeout(() => {
      if (!e.detail.tag.classList.contains("tagify__tag--editable"))
        location.href = `/study/topic/${encodeURIComponent(e.detail.data.value)}/mine`;
    }, 200);
  }).on("dblclick", (_) => clearTimeout(clickDebounce));
  new sortable_esm_default(tagify.DOM.scope, {
    animation: 150,
    draggable: "." + tagify.settings.classNames.tag,
    ghostClass: "sortable-ghost",
    onEnd() {
      tagify.updateValueByDOMTags();
    }
  });
});
//# sourceMappingURL=analyse.study.topic.form.5Z3OTVF3.js.map

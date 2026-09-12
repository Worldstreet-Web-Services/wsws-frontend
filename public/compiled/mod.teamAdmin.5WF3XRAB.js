import {
  require_tagify_min
} from "./lib.433VM4AK.js";
import {
  userComplete
} from "./lib.D6AFQ4TK.js";
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

// ../mod/src/mod.teamAdmin.ts
var import_tagify = __toESM(require_tagify_min(), 1);
var import_debounce_promise = __toESM(require_dist(), 1);
site.load.then(() => {
  $("#form3-leaders").each(function() {
    initTagify(this, 10);
  });
  $("#form3-members").each(function() {
    initTagify(this, 100);
  });
  $('form.team-add-leader input[name="name"]').each(function() {
    userComplete({
      input: this,
      team: this.dataset.teamId,
      tag: "span"
    });
  });
  $("form.team-permissions table").each(function() {
    permissionsTable(this);
  });
  $('form.team-declined-request input[name="search"]').each(function() {
    userComplete({
      input: this,
      tag: "span"
    });
  });
});
function permissionsTable(table) {
  $(table).find("tbody td").on("mouseenter", function() {
    const index = $(this).index() + 1;
    $(table).find(".highlight").removeClass("highlight");
    $(table).find(`tbody td:nth-child(${index}), thead th:nth-child(${index})`).addClass("highlight");
  });
  $(table).on("mouseleave", function() {
    $(table).find(".highlight").removeClass("highlight");
  });
}
function initTagify(input, maxTags) {
  const team = input.dataset.rel;
  const tagify = new import_tagify.default(input, {
    pattern: /.{3,}/,
    maxTags,
    whitelist: [],
    hooks: {
      beforePaste: (_, data) => {
        data.tagify.settings.enforceWhitelist = false;
        return Promise.resolve(void 0);
      }
    }
  });
  const doFetch = (0, import_debounce_promise.default)(
    (term) => json(url("/api/player/autocomplete", { term, names: 1, team })),
    300
  );
  tagify.on("input", (e) => {
    const term = e.detail.value.trim();
    if (term.length < 3) return;
    tagify.whitelist = [];
    tagify.settings.enforceWhitelist = true;
    tagify.loading(true).dropdown.hide.call(tagify);
    doFetch(term).then((list) => {
      tagify.whitelist = list;
      tagify.loading(false).dropdown.show.call(tagify, term);
    });
  });
}
//# sourceMappingURL=mod.teamAdmin.5WF3XRAB.js.map

import {
  require_dist,
  require_dist2
} from "./lib.S6HS7AXR.js";
import {
  extendTablesortNumber,
  sortTable
} from "./lib.REVOPUIJ.js";
import {
  json,
  text,
  url
} from "./lib.TT4QSUKQ.js";
import "./lib.NFSQQWN5.js";
import "./lib.GMEH5BEF.js";
import {
  __toESM
} from "./lib.KO2KTNGK.js";

// ../bits/src/bits.clas.ts
var import_core = __toESM(require_dist(), 1);
var import_textarea = __toESM(require_dist2(), 1);
site.load.then(() => {
  $("table.sortable").each(function() {
    sortTable(this, {
      descending: false
    });
  });
  $(".name-regen").on("click", function() {
    text(this.href).then((name) => $("#form3-create-username").val(name));
    return false;
  });
  $("#form3-teachers").each(function() {
    const textarea = this;
    new import_core.Textcomplete(new import_textarea.TextareaEditor(textarea), [
      {
        id: "teacher",
        match: /(^|\s)(.+)$/,
        index: 2,
        search(term, searchCallback) {
          if (term.length < 3) searchCallback([]);
          else
            json(url("/api/player/autocomplete", { object: 1, teacher: 1, term })).then(
              (res) => {
                const current = currentUserIds(textarea.value);
                searchCallback(res.result.filter((t) => !current.includes(t.id)));
              },
              (_) => searchCallback([])
            );
        },
        template: ({ online, name, patron, title }) => `<span class="ulpt user-link${online ? " online" : ""}" data-href="/@/${name}"><icon class="line${patron ? " patron" : ""}"></icon>${title ? '<span class="utitle">' + title + "</span>&nbsp;" : ""}${name}</span>`,
        replace: ({ name }) => `$1${name}
`
      }
    ]);
  });
  extendTablesortNumber();
});
function currentUserIds(value) {
  return value.split("\n").slice(0, -1);
}
//# sourceMappingURL=bits.clas.AHLMVTM3.js.map

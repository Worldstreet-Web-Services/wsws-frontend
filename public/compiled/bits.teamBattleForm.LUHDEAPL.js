import {
  require_dist,
  require_dist2
} from "./lib.S6HS7AXR.js";
import {
  json,
  url
} from "./lib.TT4QSUKQ.js";
import "./lib.NFSQQWN5.js";
import "./lib.GMEH5BEF.js";
import {
  __toESM
} from "./lib.KO2KTNGK.js";

// ../bits/src/bits.teamBattleForm.ts
var import_core = __toESM(require_dist(), 1);
var import_textarea = __toESM(require_dist2(), 1);
site.load.then(() => {
  $("#form3-teams").each(function() {
    const textarea = this;
    new import_core.Textcomplete(new import_textarea.TextareaEditor(textarea), [
      {
        id: "team",
        match: /(^|\s)(.+)$/,
        index: 2,
        search(term, searchCallback) {
          json(url("/team/autocomplete", { term }), { cache: "default" }).then(
            (res) => {
              const current = new Set(
                textarea.value.split("\n").map((t) => t.split(" ")[0]).slice(0, -1)
              );
              searchCallback(res.filter((t) => !current.has(t.id)));
            },
            (_) => searchCallback([])
          );
        },
        template: (team) => team.name + ", by " + team.owner + ", with " + team.members + " members",
        replace: (team) => "$1" + team.id + ' "' + team.name + '" by ' + team.owner + "\n"
      }
    ]);
  });
});
//# sourceMappingURL=bits.teamBattleForm.LUHDEAPL.js.map

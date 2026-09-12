import {
  standaloneChat
} from "./lib.KOFCUIJ3.js";
import "./lib.LARLSDYI.js";
import {
  flairPickerLoader
} from "./lib.PQMRP22H.js";
import "./lib.OY6DQ2TE.js";
import "./lib.BMKV23O2.js";
import "./lib.EAANXKAK.js";
import {
  prompt
} from "./lib.MYPIOGN5.js";
import "./lib.LRP46MC3.js";
import "./lib.HMFK7OOB.js";
import "./lib.AEOHBIQD.js";
import "./lib.RPQH5UYI.js";
import "./lib.XAEDCBGD.js";
import "./lib.X7H2PLEK.js";
import "./lib.53PYQRAK.js";
import "./lib.CAO7TYYH.js";
import {
  wsConnect
} from "./lib.PNHYIP7B.js";
import "./lib.S3TIZ2HQ.js";
import "./lib.LWF5S4ZV.js";
import "./lib.QPQZCXK2.js";
import "./lib.5I4BSVKX.js";
import "./lib.TT4QSUKQ.js";
import "./lib.NFSQQWN5.js";
import "./lib.GMEH5BEF.js";
import "./lib.KO2KTNGK.js";

// ../team/src/team.ts
function initModule(opts) {
  wsConnect("/team/" + opts.id, opts.socketVersion);
  if (opts.chat) standaloneChat(opts.chat);
}
$("button.explain").on("click", async (e) => {
  var _a;
  if (!e.isTrusted) return;
  e.preventDefault();
  const why = (_a = await prompt("Please explain the reason for this action")) == null ? void 0 : _a.trim();
  if (why && why.length > 3) {
    $(e.target).parents("form").find('input[name="explain"]').val(why);
    e.target.click();
  }
});
$(".emoji-details").each(async function() {
  await flairPickerLoader(this);
});
export {
  initModule
};
//# sourceMappingURL=team.E5FP4625.js.map

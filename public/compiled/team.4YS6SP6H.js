import {
  standaloneChat
} from "./lib.KFU67WIY.js";
import "./lib.ADE2DDSZ.js";
import {
  flairPickerLoader
} from "./lib.HBFC27IN.js";
import "./lib.WSONNVTW.js";
import "./lib.RU54GHQA.js";
import "./lib.EJQKEWZT.js";
import {
  prompt
} from "./lib.LY6FZSW3.js";
import "./lib.KC3NJ77S.js";
import "./lib.NNS7OYZ5.js";
import "./lib.LYPETE66.js";
import "./lib.ILS4LNPZ.js";
import "./lib.GSUEVEQG.js";
import "./lib.JUCKJNFH.js";
import "./lib.PM233RJM.js";
import "./lib.23HTWUBN.js";
import {
  wsConnect
} from "./lib.GOC3UD5K.js";
import "./lib.WVJXH4CQ.js";
import "./lib.2L7Z4FRN.js";
import "./lib.YID4KMSR.js";
import "./lib.2DWRH35C.js";
import "./lib.M3IF75DN.js";
import "./lib.AXX3QIAX.js";
import "./lib.GK2I5IFJ.js";
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
//# sourceMappingURL=team.4YS6SP6H.js.map

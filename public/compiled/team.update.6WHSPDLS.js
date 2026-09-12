import {
  makeLinkPopups
} from "./lib.LY6FZSW3.js";
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
import {
  formToXhr
} from "./lib.M3IF75DN.js";
import "./lib.AXX3QIAX.js";
import "./lib.GK2I5IFJ.js";
import "./lib.KO2KTNGK.js";

// ../team/src/team.update.ts
function initModule() {
  $("#team-subscribe").on("change", function() {
    $(this).parents("form").each(function() {
      void formToXhr(this);
    });
  });
  makeLinkPopups($(".team-update__convo__updates"));
}
export {
  initModule
};
//# sourceMappingURL=team.update.6WHSPDLS.js.map

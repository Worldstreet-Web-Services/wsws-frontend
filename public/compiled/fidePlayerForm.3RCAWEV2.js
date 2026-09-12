import {
  wireCropDialog
} from "./lib.C76YZW6V.js";
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
import "./lib.NFSQQWN5.js";
import "./lib.GMEH5BEF.js";
import "./lib.KO2KTNGK.js";

// ../fide/src/fidePlayerForm.ts
function initModule() {
  $(".fide-player__photo-edit").each(function() {
    const form = this;
    wireCropDialog({
      aspectRatio: 1,
      post: { url: $(form).data("post-url"), field: "photo" },
      selectClicks: $(".select-image")
    });
  });
}
export {
  initModule
};
//# sourceMappingURL=fidePlayerForm.3RCAWEV2.js.map

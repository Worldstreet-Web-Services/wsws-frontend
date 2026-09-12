import {
  alert
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
  log
} from "./lib.PNHYIP7B.js";
import "./lib.S3TIZ2HQ.js";
import "./lib.LWF5S4ZV.js";
import "./lib.QPQZCXK2.js";
import "./lib.5I4BSVKX.js";
import {
  json
} from "./lib.TT4QSUKQ.js";
import "./lib.NFSQQWN5.js";
import "./lib.GMEH5BEF.js";
import "./lib.KO2KTNGK.js";

// ../bits/src/bits.plan.ts
var showError = (error) => alert(error);
function initModule(opts) {
  if (opts == null ? void 0 : opts.stripePublicKey) stripeStart(opts.stripePublicKey);
  else payPalStart();
}
var changeForm = () => {
  const $change = $(".plan table.all .change");
  $change.find("a").on("click", function() {
    const f = this.dataset.form;
    $change.find("form:not(." + f + ")").hide();
    $change.find("form." + f).toggle();
  });
};
function stripeStart(publicKey) {
  $(".update-payment-method").on("click", () => {
    const stripe = window.Stripe(publicKey);
    json("/patron/stripe/update-payment", { method: "post" }).then((data) => {
      var _a;
      if ((_a = data.session) == null ? void 0 : _a.id) {
        stripe.redirectToCheckout({
          sessionId: data.session.id
        }).then((result) => showError(result.error.message)).catch((e) => {
          log("Stripe.redirectToCheckout", e);
          if (e instanceof Error) showError(e.message);
          else if (typeof e === "string") showError(e);
        });
      } else {
        location.assign("/patron");
      }
    }, showError);
  });
  changeForm();
}
function payPalStart() {
  changeForm();
}
export {
  initModule,
  payPalStart,
  stripeStart
};
//# sourceMappingURL=bits.plan.MM64RJYZ.js.map

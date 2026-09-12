import {
  alert
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
  log
} from "./lib.GOC3UD5K.js";
import "./lib.WVJXH4CQ.js";
import "./lib.2L7Z4FRN.js";
import "./lib.YID4KMSR.js";
import "./lib.2DWRH35C.js";
import {
  json
} from "./lib.M3IF75DN.js";
import "./lib.AXX3QIAX.js";
import "./lib.GK2I5IFJ.js";
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
//# sourceMappingURL=bits.plan.5CE52T5W.js.map

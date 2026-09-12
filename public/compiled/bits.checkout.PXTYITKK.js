import {
  contactEmail
} from "./lib.QER55PP6.js";
import "./lib.C76YZW6V.js";
import "./lib.PQMRP22H.js";
import {
  currencyFormat,
  roundToCurrency
} from "./lib.EAANXKAK.js";
import {
  prompt,
  spinnerHtml
} from "./lib.MYPIOGN5.js";
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
import {
  form,
  json,
  jsonAnyResponse
} from "./lib.TT4QSUKQ.js";
import "./lib.NFSQQWN5.js";
import {
  myUserId
} from "./lib.GMEH5BEF.js";
import "./lib.KO2KTNGK.js";

// ../bits/src/bits.checkout.ts
var $checkout = $("div.plan_checkout");
var getVal = (selector) => {
  const values = $checkout.find(selector).val();
  return typeof values === "string" ? values : values[0];
};
var getFreq = () => getVal("group.freq input:checked");
var getDest = () => getVal("group.dest input:checked");
var showErrorThenReload = (error) => {
  alert(error);
  location.assign("/patron");
};
function initModule({
  stripePublicKey,
  pricing
}) {
  var _a;
  contactEmail();
  const hasLifetime = $("#freq_lifetime").prop("disabled");
  const $coverFees = $("#cover-fees");
  const $coverFeesLabel = $('label[for="cover-fees"]');
  const toggleInput = ($input, enable) => $input.prop("disabled", !enable).toggleClass("disabled", !enable);
  if (!$checkout.find(".amount_choice group.amount input:checked").data("amount"))
    $checkout.find("input.default").trigger("click");
  const calculateFee = (amount) => {
    const fee = Math.max(pricing.feeFixed, pricing.feeRate * amount);
    return roundToCurrency(fee, pricing.currency);
  };
  const getBaseAmount = () => {
    const freq = getFreq();
    if (freq === "lifetime") return pricing.lifetime;
    const $input = $checkout.find("group.amount input:checked");
    const val = parseFloat($input.data("amount"));
    return isNaN(val) ? pricing.default : val;
  };
  const updateFeeLabel = () => {
    const amount = getBaseAmount();
    const fee = calculateFee(amount);
    const feeStr = currencyFormat(fee, pricing.currency);
    $coverFeesLabel.text(i18n.patron.coverFees(feeStr));
  };
  const onFreqChange = function() {
    const freq = getFreq();
    $checkout.find(".amount_fixed").toggleClass("none", freq !== "lifetime");
    $checkout.find(".amount_choice").toggleClass("none", freq === "lifetime");
    const sub = freq === "monthly";
    $checkout.find(".paypal--order").toggle(!sub);
    $checkout.find(".paypal--subscription").toggle(sub);
    updateFeeLabel();
  };
  onFreqChange();
  $checkout.find("group.freq input").on("change", onFreqChange);
  $checkout.find("group.amount input").on("change", updateFeeLabel);
  $checkout.find("group.dest input").on("change", () => {
    const isGift = getDest() === "gift";
    const $monthly = $("#freq_monthly");
    toggleInput($monthly, !isGift);
    $checkout.find(".gift").toggleClass("none", !isGift).find("input").val("");
    const $lifetime = $("#freq_lifetime");
    toggleInput($lifetime, isGift || !hasLifetime);
    $lifetime.toggleClass("lifetime-check", !isGift && hasLifetime);
    if (isGift) {
      if ($monthly.is(":checked")) $("#freq_onetime").trigger("click");
      $checkout.find(".gift input").trigger("focus");
    } else if (hasLifetime && $lifetime.is(":checked")) $monthly.trigger("click");
    toggleCheckout();
  });
  $checkout.find("group.amount .other label").on("click", async function() {
    var _a2;
    let amount;
    const raw = (_a2 = await prompt(this.title)) != null ? _a2 : "";
    try {
      amount = parseFloat(raw.replace(",", ".").replace(/[^0-9\.]/gim, ""));
    } catch (_) {
      return false;
    }
    if (!amount) {
      $(this).text($(this).data("trans-other"));
      $checkout.find("input.default").trigger("click");
      updateFeeLabel();
      return false;
    }
    const isGift = !!$checkout.find(".gift input").val();
    const min = isGift ? pricing.giftMin : pricing.min;
    amount = Math.max(min, Math.min(pricing.max, amount));
    amount = roundToCurrency(amount, pricing.currency);
    $(this).text(currencyFormat(amount, pricing.currency));
    $(this).siblings("input").data("amount", amount)[0].checked = true;
    updateFeeLabel();
    return true;
  });
  const $userInput = $checkout.find("input.user-autocomplete");
  const getGiftDest = () => {
    const raw = $userInput.val().trim().toLowerCase();
    return raw !== myUserId() && raw.match(/^[a-z0-9][\w-]{2,29}$/) ? raw : null;
  };
  const toggleCheckout = () => {
    const giftDest = getGiftDest();
    const enabled = getDest() !== "gift" || !!giftDest;
    toggleInput($checkout.find(".service button"), enabled);
    $checkout.find(".service .paypal--disabled").toggleClass("none", enabled);
    $checkout.find(".service .paypal:not(.paypal--disabled)").toggleClass("none", !enabled);
  };
  $userInput.on("change", toggleCheckout).on("input", toggleCheckout);
  const getTotalToCharge = () => {
    const base = getBaseAmount();
    const isGift = !!$checkout.find(".gift input").val();
    const { currency, min, giftMin, max } = pricing;
    const minimumRequired = isGift ? giftMin : min;
    if (base < minimumRequired) {
      const message = isGift ? `Minimum gift amount is ${currencyFormat(minimumRequired, currency)}` : `Minimum amount is ${currencyFormat(minimumRequired, currency)}`;
      alert(message);
      return void 0;
    }
    const total = $coverFees.prop("checked") ? roundToCurrency(base + calculateFee(base), pricing.currency) : base;
    if (total > max) {
      alert(
        `Including fees, the total amount of ${currencyFormat(
          total,
          currency
        )} exceeds the maximum of ${currencyFormat(max, currency)}.`
      );
      return void 0;
    }
    return total;
  };
  const $currencyForm = $("form.currency");
  $(".currency-toggle").one("click", () => $currencyForm.toggleClass("none"));
  $currencyForm.find("select").on("change", function() {
    const params = new URLSearchParams();
    params.set("currency", this.value);
    ["freq", "dest"].forEach((name) => {
      const val = $(`input[name=${name}]:checked`).val();
      if (val) params.set(name, val);
    });
    location.assign(`/patron?${params.toString()}`);
  });
  const queryParams = new URLSearchParams(location.search);
  for (const name of ["dest", "freq"]) {
    if (queryParams.has(name))
      $(`input[name=${name}][value=${(_a = queryParams.get(name)) == null ? void 0 : _a.replace(/[^a-z_-]/gi, "")}]`).trigger("click");
  }
  for (const name of ["giftUsername"]) {
    if (queryParams.has(name))
      $(`input[name=${name}]`).val(queryParams.get(name).replace(/[^a-z0-9_-]/gi, ""));
  }
  updateFeeLabel();
  toggleCheckout();
  payPalOrderStart($checkout, pricing, getTotalToCharge);
  payPalSubscriptionStart($checkout, pricing, getTotalToCharge);
  stripeStart($checkout, stripePublicKey, pricing, getTotalToCharge);
}
var xhrFormData = ($checkout2, amount) => form({
  email: $checkout2.data("email"),
  amount,
  freq: getFreq(),
  gift: $checkout2.find(".gift input").val(),
  coverFees: $checkout2.find("#cover-fees").prop("checked")
});
var payPalStyle = {
  layout: "horizontal",
  color: "blue",
  height: 55
};
function payPalOrderStart($checkout2, pricing, getAmount) {
  if (!window.paypalOrder) return;
  window.paypalOrder.Buttons({
    style: payPalStyle,
    createOrder: (_data, _actions) => {
      const amount = getAmount();
      if (!amount) return void 0;
      return jsonAnyResponse(`/patron/paypal/checkout?currency=${pricing.currency}`, {
        method: "post",
        body: xhrFormData($checkout2, amount)
      }).then((res) => res.json()).then((data) => {
        var _a;
        if (data.error) showErrorThenReload(data.error);
        else if ((_a = data.order) == null ? void 0 : _a.id) return data.order.id;
        else location.assign("/patron");
        return void 0;
      });
    },
    onApprove: (data, _actions) => {
      json("/patron/paypal/capture/" + data.orderID, { method: "POST" }).then(() => location.assign("/patron/thanks"));
    }
  }).render(".paypal--order");
}
function payPalSubscriptionStart($checkout2, pricing, getAmount) {
  if (!window.paypalSubscription) return;
  window.paypalSubscription.Buttons({
    style: payPalStyle,
    createSubscription: (_data, _actions) => {
      const amount = getAmount();
      if (!amount) return void 0;
      return jsonAnyResponse(`/patron/paypal/checkout?currency=${pricing.currency}`, {
        method: "post",
        body: xhrFormData($checkout2, amount)
      }).then((res) => res.json()).then((data) => {
        var _a;
        if (data.error) showErrorThenReload(data.error);
        else if ((_a = data.subscription) == null ? void 0 : _a.id) return data.subscription.id;
        else location.assign("/patron");
        return void 0;
      });
    },
    onApprove: (data, _actions) => {
      json(`/patron/paypal/capture/${data.orderID}?sub=${data.subscriptionID}`, { method: "POST" }).then(() => location.assign("/patron/thanks"));
    }
  }).render(".paypal--subscription");
}
function stripeStart($checkout2, publicKey, pricing, getAmount) {
  const stripe = window.Stripe(publicKey);
  $checkout2.find(".service .stripe").on("click", function() {
    const amount = getAmount();
    if (!amount) return;
    $checkout2.find(".service").html(spinnerHtml);
    jsonAnyResponse(`/patron/stripe/checkout?currency=${pricing.currency}`, {
      method: "post",
      body: xhrFormData($checkout2, amount)
    }).then((res) => res.json()).then((data) => {
      var _a;
      if (data.error) showErrorThenReload(data.error);
      else if ((_a = data.session) == null ? void 0 : _a.id) {
        stripe.redirectToCheckout({
          sessionId: data.session.id
        }).then((result) => showErrorThenReload(result.error.message));
      } else location.assign("/patron");
    });
  });
  $(window).on("popstate", function() {
    window.stripeHandler.close();
  });
}
export {
  initModule
};
//# sourceMappingURL=bits.checkout.PXTYITKK.js.map

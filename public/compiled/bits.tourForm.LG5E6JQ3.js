import {
  esm_default
} from "./lib.TCRGWMNK.js";
import {
  use24h
} from "./lib.EJQKEWZT.js";
import "./lib.KO2KTNGK.js";

// ../bits/src/bits.tourForm.ts
site.load.then(() => {
  const $variant = $("#form3-variant"), showPosition = () => $(".form3 .position").toggleClass("none", !["1", "standard"].includes($variant.val()));
  $variant.on("change", showPosition);
  showPosition();
  $(".flatpickr").each(function() {
    esm_default(this, {
      minDate: "today",
      maxDate: new Date(Date.now() + 1e3 * 3600 * 24 * 31 * 6),
      dateFormat: "Z",
      altInput: true,
      altFormat: "Y-m-d h:i K",
      monthSelectorType: "static",
      disableMobile: true,
      time_24hr: use24h()
    });
  });
});
//# sourceMappingURL=bits.tourForm.LG5E6JQ3.js.map

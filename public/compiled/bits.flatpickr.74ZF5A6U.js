import {
  esm_default
} from "./lib.TCRGWMNK.js";
import {
  use24h
} from "./lib.EJQKEWZT.js";
import "./lib.KO2KTNGK.js";

// ../bits/src/bits.flatpickr.ts
site.load.then(() => {
  $(".flatpickr").each(function() {
    const minDate = this.dataset["minDate"];
    const maxDate = this.dataset["maxDate"];
    const enableTime = !!this.dataset["enableTime"];
    const local = !!this.dataset["local"];
    const config = {
      minDate: minDate === "yesterday" ? new Date(Date.now() - 1e3 * 3600 * 24) : minDate,
      maxDate: maxDate || new Date(Date.now() + 1e3 * 3600 * 24 * 31 * 12),
      monthSelectorType: "static",
      disableMobile: true,
      // https://flatpickr.js.org/mobile-support/ https://github.com/lichess-org/lila/issues/8110
      time_24hr: enableTime && use24h(),
      ...local ? {} : { dateFormat: "Z", altInput: true, altFormat: "Y-m-d h:i K" }
    };
    esm_default(this, config);
  });
});
//# sourceMappingURL=bits.flatpickr.74ZF5A6U.js.map

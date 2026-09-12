import {
  createSelectSearch
} from "./lib.RYZELSLW.js";
import {
  flairPickerLoader
} from "./lib.HBFC27IN.js";
import {
  addPasswordVisibilityToggleListener,
  confirm
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
import {
  licon
} from "./lib.2DWRH35C.js";
import {
  formToXhr,
  text
} from "./lib.M3IF75DN.js";
import {
  storage
} from "./lib.AXX3QIAX.js";
import "./lib.GK2I5IFJ.js";
import "./lib.KO2KTNGK.js";

// ../user/src/user.account.ts
site.load.then(() => {
  $(".emoji-details").each(function() {
    flairPickerLoader(this);
  });
  $("#form3-flag").each(function() {
    createSelectSearch(this);
  });
  addPasswordVisibilityToggleListener();
  const localPrefs = [
    ["clock", "swapClock", "swapClock", false],
    ["behavior", "arrowSnap", "arrow.snap", true],
    ["behavior", "scrollMoves", "scrollMoves", true],
    ["notification", "playBellSound", "playBellSound", true]
  ];
  $(".security table form").on("submit", function() {
    text(this.action, { method: "post", body: new URLSearchParams(new FormData(this)) });
    $(this).parent().parent().remove();
    return false;
  });
  $("form.autosubmit").each(function() {
    const form = this, $form = $(form), showSaved = () => $form.find(".saved").removeClass("none");
    computeBitChoices($form, "behavior.submitMove");
    $form.find("input").on("change", function() {
      computeBitChoices($form, "behavior.submitMove");
      localPrefs.forEach(([categ, name, storeKey]) => {
        if (this.name === `${categ}.${name}`) {
          storage.boolean(storeKey).set(this.value === "1");
          showSaved();
        }
      });
      formToXhr(form).then(() => {
        showSaved();
        storage.fire("reload-round-tabs");
      });
    });
  });
  localPrefs.forEach(
    ([categ, name, storeKey, def]) => $(`#ir${categ}_${name}_${storage.boolean(storeKey).getOrDefault(def) ? 1 : 0}`).prop("checked", true)
  );
  $('form[action="/account/oauth/token/create"]').each(function() {
    const form = $(this), submit = form.find("button.submit");
    let isDanger = false;
    const checkDanger = () => {
      isDanger = !!form.find(".danger input:checked").length;
      submit.toggleClass("button-red", isDanger);
      submit.attr("data-icon", isDanger ? licon.CautionTriangle : licon.Checkmark);
      submit.attr("title", isDanger ? submit.data("danger-title") : "");
    };
    checkDanger();
    form.find("input").on("change", checkDanger);
    submit.on("click", function(e) {
      if (!isDanger) return true;
      e.preventDefault();
      confirm(this.title).then((yes) => {
        if (yes) form[0].submit();
      });
      return false;
    });
  });
  $("form.dirty-alert").each(function() {
    const form = this;
    const serialize = () => {
      const data = new FormData(form);
      return Array.from(data.keys()).map((k) => `${k}=${data.get(k)}`).join("&");
    };
    let clean = serialize();
    $(form).on("submit", () => {
      clean = serialize();
    });
    window.addEventListener("beforeunload", (e) => {
      if (clean !== serialize() && !window.confirm("You have unsaved changes. Are you sure you want to leave?"))
        e.preventDefault();
    });
  });
});
function computeBitChoices($form, name) {
  let sum = 0;
  $form.find(`input[type="checkbox"][data-name="${name}"]:checked`).each(function() {
    sum |= parseInt(this.value);
  });
  $form.find(`input[type="hidden"][name="${name}"]`).val(sum.toString());
}
//# sourceMappingURL=user.account.KFBZ64K4.js.map

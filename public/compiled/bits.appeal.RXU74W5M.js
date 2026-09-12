import {
  formToXhr
} from "./lib.TT4QSUKQ.js";
import "./lib.NFSQQWN5.js";
import "./lib.GMEH5BEF.js";
import "./lib.KO2KTNGK.js";

// ../bits/src/bits.appeal.ts
function initModule() {
  if ($(".nav-tree").length) location.hash = location.hash || "#help-root";
  $(".appeal-presets button").on("click", function(e) {
    $(this).parents("form").find("#form3-text").val(e.target.value);
  });
  $("form.appeal__actions__zulip").on("submit", (e) => {
    const form = e.target;
    formToXhr(form);
    $(form).find("button").text("Sent!").attr("disabled", "true");
    return false;
  });
  $('form select[name="months"]').on("click", function() {
    if (this.value) this.parentElement.submit();
  });
  initInfoStep();
  initAccountsStep();
}
function initInfoStep() {
  document.querySelectorAll(".appeal-info").forEach((root) => {
    const checkbox = root.querySelector('.appeal-info__agree input[type="checkbox"]');
    const continueButton = root.querySelector(".appeal-info__continue");
    if (!checkbox || !continueButton) return;
    const sync = () => continueButton.classList.toggle("disabled", !checkbox.checked);
    checkbox.addEventListener("change", sync);
    continueButton.addEventListener("click", (e) => {
      if (!checkbox.checked) e.preventDefault();
    });
    sync();
  });
}
function initAccountsStep() {
  document.querySelectorAll(".appeal-accounts").forEach((root) => {
    const leafId = root.dataset.leaf;
    const onlyRadio = root.querySelector(".appeal-accounts__only");
    const othersRadio = root.querySelector(".appeal-accounts__others-radio");
    const othersText = root.querySelector("textarea.appeal-accounts__others");
    const forgotten = root.querySelector(
      '.appeal-accounts__forgotten input[type="checkbox"]'
    );
    const household = root.querySelector(".appeal-accounts__household");
    const continueButton = root.querySelector(".appeal-accounts__continue");
    if (!leafId || !onlyRadio || !othersRadio || !othersText || !forgotten || !household || !continueButton)
      return;
    const canContinue = () => onlyRadio.checked || othersRadio.checked && (othersText.value.trim().length > 0 || forgotten.checked);
    const sync = () => {
      const others = othersRadio.checked;
      othersText.disabled = !others;
      forgotten.disabled = !others;
      if (!others) {
        othersText.value = "";
        forgotten.checked = false;
      }
      continueButton.classList.toggle("disabled", !canContinue());
    };
    const copyToAppealForm = () => {
      if (!canContinue()) return false;
      const form = document.querySelector(`#help-${leafId} form`);
      if (!form) return false;
      const set = (name, value) => {
        let input = form.querySelector(`input[name="${name}"]`);
        if (!input) {
          input = document.createElement("input");
          input.type = "hidden";
          input.name = name;
          form.appendChild(input);
        }
        input.value = value;
      };
      set("accounts.otherUsernames", othersRadio.checked ? othersText.value : "");
      set("accounts.moreForgotten", forgotten.checked ? "true" : "false");
      set("accounts.household", household.value);
      return true;
    };
    onlyRadio.addEventListener("change", sync);
    othersRadio.addEventListener("change", sync);
    othersText.addEventListener("input", sync);
    forgotten.addEventListener("change", sync);
    continueButton.addEventListener("click", (e) => {
      if (!copyToAppealForm()) e.preventDefault();
    });
    sync();
  });
}
export {
  initModule
};
//# sourceMappingURL=bits.appeal.RXU74W5M.js.map

// ../mod/src/checkBoxes.ts
var shiftClickCheckboxRange = (table) => {
  let lastChecked;
  const checkIntermediateBoxes = (first, last) => {
    let started = false;
    for (const input of table.querySelectorAll("tbody tr:not(.none) input:not(:disabled)")) {
      if (first === input || last === input) {
        if (started) return;
        started = true;
      } else if (started) input.checked = last.checked;
    }
  };
  return (input, shift) => {
    if (shift && lastChecked && input !== lastChecked) checkIntermediateBoxes(lastChecked, input);
    lastChecked = input;
  };
};
var expandCheckboxZone = (table, tdSelector, onSelect) => $(table).on("click", tdSelector, (e) => {
  if (e.target.tagName === "INPUT") onSelect(e.target, e.shiftKey);
  else {
    const input = e.target.querySelector("input");
    if (input && !input.disabled) {
      input.checked = !input.checked;
      onSelect(input, e.shiftKey);
    }
  }
});
var checkBoxAll = (table) => $(table).find("thead input").on(
  "change",
  (e) => $(table).find("tbody input:not(:disabled)").prop("checked", e.target.checked)
);
var selector = (table, select) => (f) => $(select).on("change", (_) => {
  const action = select.value;
  if (action) {
    select.value = "";
    if (action === "all" || action === "none")
      $(table).find("tbody tr:not(.none) input:not(:disabled)").prop("checked", action === "all");
    else f(action);
  }
  return false;
});

export {
  shiftClickCheckboxRange,
  expandCheckboxZone,
  checkBoxAll,
  selector
};
//# sourceMappingURL=lib.MCGXP35O.js.map

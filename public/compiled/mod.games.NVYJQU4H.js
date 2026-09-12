import {
  checkBoxAll,
  expandCheckboxZone,
  shiftClickCheckboxRange
} from "./lib.A3YBJLO7.js";
import {
  extendTablesortNumber,
  sortTable
} from "./lib.NSCF772L.js";
import {
  confirm,
  enter
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
import {
  debounce
} from "./lib.AXX3QIAX.js";
import "./lib.GK2I5IFJ.js";
import "./lib.KO2KTNGK.js";

// ../mod/src/mod.games.ts
site.load.then(() => {
  setupTable();
  setupFilter();
  setupActionForm();
});
var setupFilter = () => {
  const form = document.querySelector(".mod-games__filter-form");
  $(form).find("select").on("change", () => form.submit());
  $(form).find("input").on(
    "keydown",
    enter(() => form.submit())
  );
};
var setupTable = () => {
  const table = document.querySelector("table.game-list");
  extendTablesortNumber();
  sortTable(table, { descending: true });
  expandCheckboxZone(table, "td:first-child", shiftClickCheckboxRange(table));
  checkBoxAll(table);
};
var setupActionForm = () => {
  const form = document.querySelector(".mod-games__analysis-form");
  const debouncedSubmit = debounce(
    () => formToXhr(form).then(async () => {
      if (await confirm("Analysis completed. Reload the page?")) site.reload();
    }),
    1e3
  );
  $(form).on("click", "button", async (e) => {
    const button = e.target;
    const action = button.getAttribute("value");
    const nbSelected = form.querySelectorAll("input:checked").length;
    if (action !== "analyse") return;
    e.preventDefault();
    if (nbSelected < 1) return;
    if (nbSelected >= 20 && !await confirm(`Analyse ${nbSelected} games?`)) return;
    $(form).find('button[value="analyse"]').text("Sent").prop("disabled", true);
    debouncedSubmit();
  });
};
//# sourceMappingURL=mod.games.NVYJQU4H.js.map

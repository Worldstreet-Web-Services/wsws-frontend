import {
  checkBoxAll,
  expandCheckboxZone,
  shiftClickCheckboxRange
} from "./lib.MCGXP35O.js";
import {
  extendTablesortNumber,
  sortTable
} from "./lib.REVOPUIJ.js";
import {
  confirm,
  enter
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
  formToXhr
} from "./lib.TT4QSUKQ.js";
import {
  debounce
} from "./lib.NFSQQWN5.js";
import "./lib.GMEH5BEF.js";
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
//# sourceMappingURL=mod.games.SW5T2LJB.js.map

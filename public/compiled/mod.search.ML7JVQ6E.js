import {
  checkBoxAll,
  expandCheckboxZone,
  selector,
  shiftClickCheckboxRange
} from "./lib.A3YBJLO7.js";
import {
  extendTablesortNumber,
  sortTable
} from "./lib.NSCF772L.js";
import {
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
import "./lib.2DWRH35C.js";
import {
  text
} from "./lib.M3IF75DN.js";
import "./lib.AXX3QIAX.js";
import "./lib.GK2I5IFJ.js";
import "./lib.KO2KTNGK.js";

// ../mod/src/mod.search.ts
site.load.then(() => {
  $(".slist, slist-pad").find(".mark-alt").on("click", async function() {
    if (await confirm("Close alt account?")) {
      text(this.getAttribute("href"), { method: "post" });
      $(this).remove();
    }
  });
  $(".mod-user-table").each(function() {
    const table = this;
    extendTablesortNumber();
    sortTable(table, { descending: true });
    expandCheckboxZone(table, "td:last-child", shiftClickCheckboxRange(table));
    checkBoxAll(table);
    const select = table.querySelector("thead select");
    if (select)
      selector(
        table,
        select
      )(async (action) => {
        if (action === "alt") {
          const usernames = Array.from(
            $(table).find("td:last-child input:checked").map((_, input) => $(input).parents("tr").find("td:first-child").data("sort"))
          );
          if (usernames.length > 0 && await confirm(`Close ${usernames.length} alt accounts?`)) {
            console.log(usernames);
            await text("/mod/alt-many", { method: "post", body: usernames.join(" ") });
            location.reload();
          }
        }
      });
  });
});
//# sourceMappingURL=mod.search.ML7JVQ6E.js.map

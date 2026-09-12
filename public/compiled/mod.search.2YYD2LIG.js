import {
  checkBoxAll,
  expandCheckboxZone,
  selector,
  shiftClickCheckboxRange
} from "./lib.MCGXP35O.js";
import {
  extendTablesortNumber,
  sortTable
} from "./lib.REVOPUIJ.js";
import {
  confirm
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
  text
} from "./lib.TT4QSUKQ.js";
import "./lib.NFSQQWN5.js";
import "./lib.GMEH5BEF.js";
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
//# sourceMappingURL=mod.search.2YYD2LIG.js.map

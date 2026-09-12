import {
  expandCheckboxZone,
  selector,
  shiftClickCheckboxRange
} from "./lib.A3YBJLO7.js";
import {
  autolinkAtoms
} from "./lib.6DZ4FISB.js";
import {
  commonDateFormat,
  toDate
} from "./lib.EJQKEWZT.js";
import {
  extendTablesortNumber,
  sortTable
} from "./lib.NSCF772L.js";
import {
  confirm,
  spinnerHtml
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
import {
  pubsub
} from "./lib.YID4KMSR.js";
import {
  licon
} from "./lib.2DWRH35C.js";
import {
  formToXhr,
  text
} from "./lib.M3IF75DN.js";
import {
  debounce
} from "./lib.AXX3QIAX.js";
import "./lib.GK2I5IFJ.js";
import "./lib.KO2KTNGK.js";

// ../mod/src/mod.user.ts
site.load.then(() => {
  const $toggle = $(".mod-zone-toggle"), $zone = $(".mod-zone-full");
  let nbOthers = 100;
  function streamLoad() {
    const source = new EventSource($toggle.attr("href") + "?nbOthers=" + nbOthers), streamDebounce = debounce(() => userMod($zone), 300);
    source.addEventListener("message", (e) => {
      if (!e.data) return;
      const html = $("<output>").append($.parseHTML(e.data));
      html.find(".mz-section").each(function() {
        const prev = $zone.find(`.mz-section--${$(this).data("rel")}`);
        if (prev.length) prev.replaceWith($(this));
        else $zone.append($(this).clone());
      });
      streamDebounce();
    });
    source.onerror = () => source.close();
  }
  function updateMainWrap(zoned) {
    $("#main-wrap").toggleClass("has-mod-zone full-screen-force", zoned);
  }
  function loadZone() {
    $zone.html(spinnerHtml).removeClass("none");
    updateMainWrap(true);
    $zone.html("");
    streamLoad();
    window.addEventListener("scroll", onScroll);
    scrollTo(".mod-zone-full");
  }
  function unloadZone() {
    $zone.addClass("none");
    updateMainWrap(false);
    window.removeEventListener("scroll", onScroll);
    scrollTo("#top");
  }
  function reloadZone() {
    streamLoad();
  }
  function scrollTo(selector2) {
    const target = document.querySelector(selector2);
    if (target) {
      const offset = $("#inquiry").length ? -50 : 50;
      window.scrollTo(0, target.offsetTop + offset);
    }
  }
  $toggle.on("click", () => {
    if ($zone.hasClass("none")) loadZone();
    else unloadZone();
    return false;
  });
  const getLocationHash = (a) => a.href.replace(/.+(#\w+)$/, "$1");
  function userMod($inZone) {
    pubsub.emit("content-loaded", $inZone[0]);
    const makeReady = (selector2, f, cls = "ready") => {
      $inZone.find(selector2 + `:not(.${cls})`).each(function(i) {
        f($(this).addClass(cls)[0], i);
      });
    };
    const confirmButton = (el) => $(el).find("input.confirm, button.confirm").on("click", async function(e) {
      var _a;
      e.preventDefault();
      if (await confirm(this.title || "Confirm this action?")) (_a = this.closest("form")) == null ? void 0 : _a.submit();
    });
    $(".mz-section--menu > a:not(.available)").each(function() {
      $(this).toggleClass("available", !!$(getLocationHash(this)).length);
    });
    makeReady(".mz-section--menu", (el) => {
      $(el).find("a").each(function(i) {
        const id = getLocationHash(this);
        const n = String(i + 1);
        $(this).prepend(`<icon>${n}</icon>`);
        site.mousetrap.bind(n, () => scrollTo(id));
      });
    });
    makeReady("form.xhr", (el) => {
      confirmButton(el);
      $(el).on("submit", () => {
        $(el).addClass("ready").find("input").prop("disabled", true);
        formToXhr(el).then((html) => {
          $zone.find(".mz-section--actions").replaceWith(html);
          userMod($inZone);
        });
        return false;
      });
    });
    makeReady("form.gdpr-erasure", confirmButton);
    makeReady(
      "form.fide-title select",
      (el) => $(el).on("change", () => $(el).parent("form")[0].submit())
    );
    makeReady(
      "form.pm-preset select",
      (el) => $(el).on("change", () => {
        const form = $(el).parent("form")[0];
        text(form.getAttribute("action") + encodeURIComponent(el.value), { method: "post" });
        $(form).html("Sent!");
      })
    );
    makeReady(".mz-section--others", (el) => {
      $(el).height($(el).height());
    });
    makeReady(".mz-section--others table", (table) => {
      sortTable(table, { descending: true });
      if (table) {
        expandCheckboxZone(table, "td:last-child", shiftClickCheckboxRange(table));
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
                await text("/mod/alt-many", { method: "post", body: usernames.join(" ") });
                reloadZone();
              }
            }
          });
        if ($("#inquiry .notes").length) {
          $(table).find("td.ips-prints").addClass("add-to-note text").attr("title", "Add to note").attr("data-icon", licon.Clipboard);
        }
      }
    });
    makeReady(".mz-section--identification .spy_filter", (el) => {
      $(el).find(".button").on("click", function() {
        text($(this).attr("href"), { method: "post" });
        $(this).parent().parent().toggleClass("blocked");
        return false;
      });
      let selected;
      const applyFilter = (v) => v ? $inZone.find(".mz-section--others tbody tr").each(function() {
        $(this).toggleClass("none", !(this.dataset.tags || "").includes(v));
      }) : $inZone.find(".mz-section--others tbody tr.none").removeClass("none");
      $(el).find("tr").on("click", function() {
        const v = this.dataset.value;
        selected = selected === v ? void 0 : v;
        applyFilter(selected);
        $(".spy_filter tr.selected").removeClass("selected");
        $(this).toggleClass("selected", !!selected);
      }).on("mouseenter", function() {
        !selected && applyFilter(this.dataset.value);
      });
      $(el).on("mouseleave", () => !selected && applyFilter());
    });
    makeReady(
      ".mz-section--identification .slist--sort",
      (el) => {
        if (el instanceof HTMLTableElement) sortTable(el, { descending: true });
      },
      "ready-sort"
    );
    makeReady(".mz-section--others .more-others", (el) => {
      $(el).addClass("ready").on("click", () => {
        nbOthers = 1e3;
        reloadZone();
      });
    });
    makeReady(
      ".appeal form textarea",
      (el) => {
        const textarea = el;
        const DAY_MS = 24 * 60 * 60 * 1e3;
        const applyDates = () => {
          const start = textarea.selectionStart;
          const val = textarea.value;
          const regex = /in (\d+) (months|years)(?! \(\d{4}-\d{2}-\d{2}\))/gi;
          let diffBeforeCursor = 0;
          const newVal = val.replace(regex, (match, num, unit, offset) => {
            const n = parseInt(num, 10);
            let targetTs = Date.now();
            const u = unit.toLowerCase();
            if (u.startsWith("month")) {
              targetTs += n * 30 * DAY_MS;
            } else if (u.startsWith("year")) {
              targetTs += n * 365 * DAY_MS;
            }
            const d = new Date(targetTs);
            const dateStr = ` (${d.toISOString().slice(0, 10)})`;
            if (offset < start) diffBeforeCursor += dateStr.length;
            return `${match}${dateStr}`;
          });
          if (newVal !== val) {
            const end = textarea.selectionEnd;
            textarea.value = newVal;
            textarea.setSelectionRange(start + diffBeforeCursor, end + diffBeforeCursor);
          }
        };
        $(textarea).on("input", applyDates);
        $(textarea.form).find("select.appeal-presets").on("change", () => setTimeout(applyDates, 50));
      },
      "ready-appeal-dates"
    );
    autolinkAtoms($inZone[0]);
  }
  const onScroll = () => requestAnimationFrame(() => {
    if ($zone.hasClass("none")) return;
    $zone.toggleClass("stick-menu", window.scrollY > 200);
  });
  extendTablesortNumber();
  if (new URL(location.href).searchParams.has("mod")) $toggle.trigger("click");
  site.mousetrap.bind("m", () => $toggle.trigger("click")).bind("i", () => $zone.find("button.inquiry").trigger("click"));
  const $other = $("#communication,main.appeal");
  if ($other.length) userMod($other);
  const timelineFlairDateToLocal = (el) => $(el || document.body).find(".mod-timeline__event__flair img[datetime]").each(function() {
    this.title += " " + commonDateFormat(toDate(this.getAttribute("datetime")));
    this.removeAttribute("datetime");
  });
  timelineFlairDateToLocal();
  pubsub.on("content-loaded", timelineFlairDateToLocal);
});
//# sourceMappingURL=mod.user.MY2VLL3S.js.map

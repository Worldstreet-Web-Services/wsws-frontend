import {
  userComplete
} from "./lib.D6AFQ4TK.js";
import {
  numberFormat
} from "./lib.EAANXKAK.js";
import {
  bind,
  onInsert
} from "./lib.S3TIZ2HQ.js";
import {
  h
} from "./lib.LWF5S4ZV.js";
import {
  licon
} from "./lib.5I4BSVKX.js";
import {
  storage
} from "./lib.NFSQQWN5.js";

// ../lib/src/tournament.ts
var lastRedirect = storage.make("last-redirect");
function redirectFirst(gameId, rightNow) {
  const delay = rightNow || document.hasFocus() ? 10 : 1e3 + Math.random() * 500;
  setTimeout(() => {
    if (lastRedirect.get() !== gameId) {
      lastRedirect.set(gameId);
      site.redirect("/" + gameId, true);
    }
  }, delay);
}

// ../lib/src/view/pagination.ts
var maxPerPage = 10;
function navButton(text, icon, click, enable, redraw) {
  return h("button.fbt.is", {
    attrs: { "data-icon": icon, disabled: !enable, title: text },
    hook: bind("mousedown", click, redraw)
  });
}
function scrollToMeButton(ctrl) {
  return ctrl.data.me && myPage(ctrl) !== ctrl.page ? h("button.fbt", {
    attrs: { "data-icon": licon.Target, title: "Scroll to your player" },
    hook: bind("mousedown", ctrl.toggleFocusOnMe, ctrl.redraw)
  }) : void 0;
}
function renderPager(ctrl, searchButton2, searchInput2) {
  const pag = pagerData(ctrl);
  const enabled = !!pag.currentPageResults;
  return pag.nbPages > -1 ? [
    searchButton2,
    ...ctrl.searching ? [searchInput2] : [
      navButton(
        "First",
        licon.JumpFirst,
        () => ctrl.userSetPage(1),
        enabled && ctrl.page > 1,
        ctrl.redraw
      ),
      navButton("Prev", licon.JumpPrev, ctrl.userPrevPage, enabled && ctrl.page > 1, ctrl.redraw),
      h("span.page", (pag.nbResults ? pag.from + 1 : 0) + "-" + pag.to + " / " + pag.nbResults),
      navButton(
        "Next",
        licon.JumpNext,
        ctrl.userNextPage,
        enabled && ctrl.page < pag.nbPages,
        ctrl.redraw
      ),
      navButton(
        "Last",
        licon.JumpLast,
        ctrl.userLastPage,
        enabled && ctrl.page < pag.nbPages,
        ctrl.redraw
      ),
      scrollToMeButton(ctrl)
    ]
  ] : [];
}
function pagerData(ctrl) {
  const page = ctrl.page, nbResults = ctrl.data.nbPlayers, from = (page - 1) * maxPerPage, to = Math.min(nbResults, page * maxPerPage);
  return {
    from,
    to,
    currentPageResults: ctrl.pages[page],
    nbResults,
    nbPages: Math.ceil(nbResults / maxPerPage)
  };
}
function myPage(ctrl) {
  return ctrl.data.me ? Math.floor((ctrl.data.me.rank - 1) / 10) + 1 : void 0;
}
function searchButton(ctrl) {
  return h("button.fbt", {
    class: { active: ctrl.searching },
    attrs: { "data-icon": ctrl.searching ? licon.X : licon.Search, title: "Search tournament players" },
    hook: bind("click", ctrl.toggleSearch, ctrl.redraw)
  });
}
function searchInput(ctrl, completeOpts) {
  return h(
    "div.search",
    h("input", {
      attrs: { spellcheck: "false" },
      hook: onInsert((el) => {
        userComplete({
          input: el,
          tag: "span",
          focus: true,
          onSelect(v) {
            ctrl.jumpToPageOf(v.id);
            ctrl.redraw();
          },
          ...completeOpts
        });
        $(el).on("keydown", (e) => {
          if (e.code === "Enter") {
            const rank = parseInt(e.target.value.replace("#", "").trim());
            if (rank > 0) ctrl.jumpToRank(rank);
          }
          if (e.code === "Escape") {
            ctrl.toggleSearch();
            ctrl.redraw();
          }
        });
      })
    })
  );
}

// ../lib/src/view/util.ts
var ratio2percent = (r) => Math.round(100 * r) + "%";
function numberRow(name, value, typ) {
  return h("tr", [
    h("th", name),
    h(
      "td",
      {
        attrs: typ === "percent" ? { title: i18n.site.nbGames(value[0]) } : {}
      },
      typ === "raw" ? value : typ === "percent" ? value[1] > 0 ? ratio2percent(value[0] / value[1]) : 0 : numberFormat(value)
    )
  ]);
}

export {
  redirectFirst,
  maxPerPage,
  renderPager,
  pagerData,
  myPage,
  searchButton,
  searchInput,
  numberRow
};
//# sourceMappingURL=lib.MUFAVNSQ.js.map

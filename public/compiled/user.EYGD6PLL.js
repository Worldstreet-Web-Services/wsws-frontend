import {
  alert,
  makeLinkPopups
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
import {
  pubsub
} from "./lib.QPQZCXK2.js";
import {
  licon
} from "./lib.5I4BSVKX.js";
import {
  formToXhr,
  text
} from "./lib.TT4QSUKQ.js";
import "./lib.NFSQQWN5.js";
import {
  myUserId
} from "./lib.GMEH5BEF.js";
import "./lib.KO2KTNGK.js";

// ../user/src/user.ts
var gamesAngle = document.querySelector(".games");
if (gamesAngle) gamesAngle.style.visibility = "hidden";
async function initModule() {
  makeLinkPopups($(".social_links"));
  makeLinkPopups($(".user-infos .bio"));
  tmpRandomTutorLink();
  updatePackedTrophies();
  window.addEventListener("resize", updatePackedTrophies);
  const loadNoteZone = () => {
    var _a;
    const $zone = $(".user-show .note-zone");
    (_a = $zone.find("textarea")[0]) == null ? void 0 : _a.focus();
    if ($zone.hasClass("loaded")) return;
    $zone.addClass("loaded");
    $noteToggle.find("strong").text(String($zone.find(".note").length));
    $zone.find(".note-form button[type=submit]").on("click", function() {
      $(this).parents("form").each(
        (_, form) => formToXhr(form, this).then((html) => $zone.replaceWith(html)).then(() => loadNoteZone()).catch(() => alert("Invalid note, is it too short or too long?"))
      );
      return false;
    });
  };
  const $noteToggle = $(".user-show .note-zone-toggle").on("click", () => {
    $(".user-show .note-zone").toggle();
    loadNoteZone();
  });
  if (location.search.includes("note")) $noteToggle.trigger("click");
  $(".user-show .claim_title_zone").each(function() {
    const $zone = $(this);
    $zone.find(".actions a").on("click", function() {
      text(this.href, { method: "post" });
      $zone.remove();
      return false;
    });
  });
  $(".user-show .angles").each(function() {
    const $angles = $(this), $content = $(".angle-content"), browseTo = (path) => text(path).then((html) => {
      $content.html(html);
      pubsub.emit("content-loaded", $content[0]);
      history.replaceState({}, "", path);
      site.asset.loadEsm("bits.infiniteScroll");
    });
    $angles.on("click", "a", function() {
      if ($("#games .to-search").hasClass("active")) return true;
      $angles.find(".active").removeClass("active");
      $(this).addClass("active");
      browseTo(this.href);
      return false;
    });
    $(".user-show").on("click", "#games a", function() {
      if ($("#games .to-search").hasClass("active") || $(this).hasClass("to-search")) return true;
      $(this).addClass("active");
      browseTo(this.href);
      return false;
    });
  });
  setTimeout(() => {
    if (gamesAngle) gamesAngle.style.visibility = "visible";
  });
}
function tmpRandomTutorLink() {
  const me = myUserId(), userId = $("main.page-menu").data("username").toLowerCase();
  if (!me || !userId || me !== userId) return;
  const getNbGames = (icon) => {
    const text2 = $(`.sub-ratings a[data-icon=${icon}] rating span:last-child`).text();
    return Number.parseInt(text2.replaceAll(/\D/g, ""));
  };
  const enoughGames = [licon.Bullet, licon.FlameBlitz, licon.Rabbit, licon.Turtle].some(
    (icon) => getNbGames(icon) > 100
  );
  if (!enoughGames) return;
  const buttonHtml = `
  <a href="/tutor" class="tutor-link">
    <img src="${site.asset.flairSrc("nature.octopus-howard")}" />
    <span><strong>Try out Tutor</strong><em>Compare to your peers!</em></span>
  </a>`;
  $(buttonHtml).insertBefore(".profile-side .insight");
}
function updatePackedTrophies() {
  const header = document.querySelector(".user-show__header");
  const trophies = header == null ? void 0 : header.querySelector(".trophies");
  const title = header == null ? void 0 : header.querySelector("h1");
  if (!trophies || !title) return;
  trophies.classList.remove("packed");
  if (trophies.getBoundingClientRect().left < title.getBoundingClientRect().right + 8)
    trophies.classList.add("packed");
}
export {
  initModule
};
//# sourceMappingURL=user.EYGD6PLL.js.map

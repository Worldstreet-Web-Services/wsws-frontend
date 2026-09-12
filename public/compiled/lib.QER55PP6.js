import {
  wireCropDialog
} from "./lib.C76YZW6V.js";
import {
  flairPickerLoader
} from "./lib.PQMRP22H.js";
import {
  spinnerHtml
} from "./lib.MYPIOGN5.js";
import {
  text
} from "./lib.TT4QSUKQ.js";

// ../bits/src/bits.ts
function initModule(args) {
  switch (args.fn) {
    case "autoForm":
      return autoForm(args);
    case "colorizeYesNoTable":
      return colorizeYesNoTable();
    case "contact":
      return contact();
    case "dailyFeed":
      return dailyFeed();
    case "embedReasonToggle":
      return embedReasonToggle();
    case "eventCountdown":
      return eventCountdown();
    case "faq":
      return faq();
    case "importer":
      return importer();
    case "pmAll":
      return pmAll();
    case "relayForm":
      return relayForm();
    case "setAssetInfo":
      return setAssetInfo();
    case "streamerSubscribe":
      return streamerSubscribe();
    case "thanksReport":
      return thanksReport();
    case "titleRequest":
      return titleRequest();
    case "validateEmail":
      return validateEmail();
    case "emailErrorCheck":
      return emailErrorCheck();
    case "appealTopicSelect":
      return appealTopicSelect();
    default:
      console.error("Unknown bits function", args.fn);
  }
}
function autoForm({ selector, ops }) {
  const el = document.querySelector(selector);
  const oplist = ops.split(" ");
  if (!el || oplist.length === 0) return;
  if (oplist.includes("focus")) el.focus();
  if (oplist.includes("begin")) el.setSelectionRange(0, 0);
}
function colorizeYesNoTable() {
  document.querySelectorAll(".slist td").forEach((td) => {
    if (td.textContent === "YES") td.style.color = "green";
    else if (td.textContent === "NO") td.style.color = "red";
  });
}
function contact() {
  location.hash || (location.hash = "#help-root");
  contactEmail();
}
function contactEmail() {
  $("a.contact-email-obfuscated").one("click", function() {
    $(this).html("...");
    setTimeout(() => {
      const address = atob(this.dataset.email);
      $(this).html(address).attr("href", `mailto:${address}`);
    }, 300);
    return false;
  });
}
function dailyFeed() {
  $(".emoji-details").each(function() {
    flairPickerLoader(this);
  });
}
function embedReasonToggle() {
  const el = document.getElementById("form3-reason");
  el.addEventListener("change", () => {
    $(".report-reason").addClass("none").filter(".report-reason-" + el.value).removeClass("none");
  });
}
function eventCountdown() {
  $(".event .countdown").each(function() {
    if (!this.dataset.seconds) return;
    const $el = $(this);
    const seconds = parseInt(this.dataset.seconds) - 1;
    const target = Date.now() + seconds * 1e3;
    const second = 1e3, minute = second * 60, hour = minute * 60, day = hour * 24;
    const redraw = function() {
      const distance = target - Date.now();
      if (distance > 0) {
        $el.find(".days").text(Math.floor(distance / day).toString());
        $el.find(".hours").text(Math.floor(distance % day / hour).toString());
        $el.find(".minutes").text(Math.floor(distance % hour / minute).toString());
        $el.find(".seconds").text(
          Math.floor(distance % minute / second).toString().padStart(2, "0")
        );
      } else {
        clearInterval(interval);
        site.reload();
      }
    };
    const interval = setInterval(redraw, second);
    redraw();
  });
}
function faq() {
  if (location.hash) {
    const target = document.querySelector(location.hash);
    const details = target == null ? void 0 : target.closest("details");
    if (details) {
      details.open = true;
    }
  }
  document.querySelectorAll("details > summary").forEach((summary) => {
    summary.addEventListener("click", () => {
      const details = summary.closest("details");
      if (!(details == null ? void 0 : details.id)) return;
      history.replaceState(null, "", `#${details.id}`);
    });
  });
}
function importer() {
  const $form = $("main.importer form");
  $form.on("submit", () => setTimeout(() => $form.html(spinnerHtml), 50));
  $form.find("input[type=file]").on("change", function() {
    var _a;
    const file = (_a = this.files) == null ? void 0 : _a[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      var _a2;
      return $form.find("textarea").val((_a2 = e.target) == null ? void 0 : _a2.result);
    };
    reader.readAsText(file);
  });
}
function pmAll() {
  $(".copy-url-button").on("click", function(e) {
    $("#form3-message").val($("#form3-message").val() + e.target.dataset.copyurl + "\n");
  });
}
function relayForm() {
  wireCropDialog({
    aspectRatio: 2 / 1,
    post: { url: $(".relay-image-edit").attr("data-post-url"), field: "image" },
    selectClicks: $(".select-image, .drop-target"),
    selectDrags: $(".drop-target")
  });
  const $source = $("#form3-syncSource"), showSource = () => $(".relay-form__sync").each(function() {
    this.classList.toggle("none", !this.classList.contains(`relay-form__sync-${$source.val()}`));
  });
  $source.on("change", showSource);
  showSource();
}
function setAssetInfo() {
  $("#asset-version-date").text(site.info.date);
  $("#asset-version-commit").attr("href", "https://github.com/lichess-org/lila/commits/" + site.info.commit).find("pre").text(site.info.commit.slice(0, 7));
  $("#asset-version-upcoming").attr("href", "https://github.com/lichess-org/lila/compare/" + site.info.commit + "...master").find("pre").text("...");
  $("#asset-version-message").text(site.info.message);
}
function streamerSubscribe() {
  $(".streamer-show").on("change", ".streamer-subscribe input", (e) => {
    const target = e.target;
    const action = target.dataset.action;
    if (action) {
      const url = new URL(action, location.href);
      url.searchParams.set("set", String(target.checked));
      text(url.pathname + url.search, { method: "post" });
      url.searchParams.set("set", String(!target.checked));
      target.dataset.action = url.pathname + url.search;
    }
  });
}
function titleRequest() {
  $(".title-image-edit").each(function() {
    wireCropDialog({
      post: { url: $(this).attr("data-post-url"), field: "image" },
      selectClicks: $(this).find(".drop-target"),
      selectDrags: $(this).find(".drop-target")
    });
  });
}
function thanksReport() {
  const $button = $("button.report-block");
  $button.one("click", function() {
    $button.find("span").text("Blocking...");
    fetch($button.data("action"), { method: "post" }).then(
      async (res) => $button.find("span").text(res.ok ? "Blocked!" : "Block error")
    );
  });
}
function validateEmail() {
  const email = document.getElementById("new-email");
  const currentError = "This is already your current email.";
  email.setCustomValidity(currentError);
  email.addEventListener("input", function() {
    email.setCustomValidity(email.validity.patternMismatch ? currentError : "");
  });
}
function emailErrorCheck() {
  const fetchError = async (backoff) => {
    const error = await text("/dev/email-error");
    if (error) {
      $(".email-confirm-banner").addClass("error").html(`<a href="/signup/check-your-email">We sent the email, but it was rejected.</a><code></code>`);
      $(".email-confirm-banner code").text(error);
    } else setTimeout(() => fetchError(backoff * 1.5), backoff);
  };
  fetchError(3e3);
}
function appealTopicSelect() {
  $(".appeal-filters").on("change", function() {
    location.href = `/appeal/queue?topic=${this.value}`;
  });
}

export {
  initModule,
  contactEmail
};
//# sourceMappingURL=lib.QER55PP6.js.map

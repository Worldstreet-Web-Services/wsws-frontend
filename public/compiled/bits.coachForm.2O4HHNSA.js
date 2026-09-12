import {
  wireCropDialog
} from "./lib.C76YZW6V.js";
import {
  require_tagify_min
} from "./lib.433VM4AK.js";
import {
  spinnerHtml
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
import {
  isSafari
} from "./lib.S3TIZ2HQ.js";
import "./lib.LWF5S4ZV.js";
import "./lib.QPQZCXK2.js";
import "./lib.5I4BSVKX.js";
import {
  formToXhr
} from "./lib.TT4QSUKQ.js";
import {
  debounce
} from "./lib.NFSQQWN5.js";
import {
  notNull
} from "./lib.GMEH5BEF.js";
import {
  __toESM
} from "./lib.KO2KTNGK.js";

// ../bits/src/bits.coachForm.ts
var import_tagify = __toESM(require_tagify_min(), 1);
if (isSafari()) wireCropDialog();
site.load.then(() => {
  var _a;
  const $editor = $(".coach-edit");
  const todo = (function() {
    const $overview = $editor.find(".overview");
    const $el = $overview.find(".todo");
    const $listed = $editor.find("#form3-listed");
    const must = [
      {
        html: '<a href="/account/profile">Complete your Lichess profile</a>',
        check() {
          return $el.data("profile");
        }
      },
      {
        html: "Upload a profile picture",
        check() {
          return $editor.find("img.picture").length;
        }
      },
      {
        html: "Fill in basic information",
        check() {
          for (const name of ["profile.headline", "languages"]) {
            if (!$editor.find('[name="' + name + '"]').val()) return false;
          }
          return true;
        }
      },
      {
        html: "Fill at least 3 description texts",
        check() {
          return $editor.find(".panel.texts textarea").filter(function() {
            return !!$(this).val();
          }).length >= 3;
        }
      }
    ];
    return () => {
      const points = must.filter((o) => !o.check()).map((o) => $("<li>").html(o.html));
      const $ul = $el.find("ul").empty();
      points.forEach((p) => $ul.append(p));
      const fail = !!points.length;
      $overview.toggleClass("with-todo", fail);
      if (fail) $listed.prop("checked", false);
      $listed.prop("disabled", fail);
    };
  })();
  const langInput = document.querySelector("#form3-languages");
  const whitelistJson = langInput.getAttribute("data-all");
  const whitelist = whitelistJson ? JSON.parse(whitelistJson) : void 0;
  const tagify = new import_tagify.default(langInput, {
    maxTags: 10,
    whitelist,
    enforceWhitelist: true,
    dropdown: {
      enabled: 1
    }
  });
  tagify.addTags(
    (_a = langInput.getAttribute("data-value")) == null ? void 0 : _a.split(",").map((code) => whitelist == null ? void 0 : whitelist.find((l) => l.code === code)).filter(notNull)
  );
  $editor.find(".tabs > div").on("click", function() {
    $editor.find(".tabs > div").removeClass("active");
    $(this).addClass("active");
    $editor.find(".panel").removeClass("active");
    $editor.find(".panel." + this.dataset.tab).addClass("active");
    $editor.find("div.status").removeClass("saved");
  });
  const submit = debounce(() => {
    const form = document.querySelector("form.async");
    if (!form) return;
    formToXhr(form).then(() => {
      $editor.find("div.status").addClass("saved");
      todo();
    });
  }, 1e3);
  $(".coach_picture form.upload input[type=file]").on("change", function() {
    $(".picture_wrap").html(spinnerHtml);
    $(this).parents("form")[0].submit();
  });
  setTimeout(() => {
    $editor.find("input, textarea, select").on("input paste change keyup", function() {
      $editor.find("div.status").removeClass("saved");
      submit();
    });
    todo();
  }, 1e3);
  wireCropDialog({
    aspectRatio: 1,
    post: { url: "/upload/image/coach", field: "picture" },
    max: { pixels: 1e3 },
    selectClicks: $(".select-image, .drop-target"),
    selectDrags: $(".drop-target")
  });
});
//# sourceMappingURL=bits.coachForm.2O4HHNSA.js.map

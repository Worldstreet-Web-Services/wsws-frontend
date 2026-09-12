import {
  alert,
  domDialog,
  prompt
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
  form,
  text,
  textRaw
} from "./lib.TT4QSUKQ.js";
import {
  throttlePromiseDelay
} from "./lib.NFSQQWN5.js";
import {
  escapeHtml
} from "./lib.GMEH5BEF.js";
import "./lib.KO2KTNGK.js";

// ../bits/src/bits.ublog.ts
site.load.then(() => {
  var _a, _b;
  $(".flash").addClass("fade");
  $(".ublog-post__like").on(
    "click",
    throttlePromiseDelay(
      () => 1e3,
      async function() {
        const button = $(this);
        const likeClass = "ublog-post__like--liked";
        const liked = !button.hasClass(likeClass);
        return await text(`/ublog/${button.data("rel")}/like?v=${liked}`, {
          method: "post"
        }).then((likes) => {
          const label = $(".ublog-post__like .button-label");
          const newText = liked ? i18n.site.liked : i18n.site.like;
          label.text(newText);
          $(".ublog-post__like").toggleClass(likeClass, liked).attr("title", newText);
          $(".ublog-post__like__nb").text(likes);
        });
      }
    )
  );
  $(".ublog-post__follow").on(
    "click",
    throttlePromiseDelay(
      () => 1e3,
      async function() {
        const button = $(this);
        const followClass = "ublog-post__follow__followed";
        const followed = !button.hasClass(followClass);
        return await text(button.data("rel"), {
          method: "post"
        }).then(() => {
          button.toggleClass(followClass);
          const label = button.find(".button-label");
          const username = label.data("username");
          label.text(followed ? i18n.site.unfollowX(username) : i18n.site.followX(username));
        });
      }
    )
  );
  const tierEl = document.querySelector("#form3-tier");
  modBlogOrigTier = (_a = tierEl == null ? void 0 : tierEl.value) != null ? _a : "";
  tierEl == null ? void 0 : tierEl.addEventListener("change", (e) => showModBlogSubmitDlg(e));
  (_b = document.querySelector(".ublog-mod-note-btn")) == null ? void 0 : _b.addEventListener("click", showModBlogSubmitDlg);
  rewireModPost();
});
var modBlogOrigTier;
async function showModBlogSubmitDlg(e) {
  const form2 = document.querySelector(".ublog-mod-blog-form");
  if (!form2) return;
  e.preventDefault();
  const noteField = form2.querySelector('[name="note"]');
  const noteHtml = escapeHtml(noteField.value.trim());
  const res = await domDialog({
    class: "ublog-mod-note-dlg",
    modal: true,
    show: true,
    easyClose: "clickOutside",
    actions: [
      { selector: ".cancel", result: "cancel" },
      {
        selector: ".submit",
        listener: (_, dlg) => {
          const textArea = dlg.view.querySelector(".note");
          noteField.value = textArea.value.trim();
          dlg.close();
          form2.submit();
        }
      }
    ],
    htmlText: `<textarea class="note" rows="5" cols="50" placeholder="Mod notes" maxlength="800">${noteHtml}</textarea><span><button class="button button-empty button-red cancel">cancel</button><button class="button button-metal submit">submit</button></span>`
  });
  if (res.returnValue === "cancel")
    form2.querySelector("#form3-tier").value = modBlogOrigTier;
}
function rewireModPost() {
  var _a, _b, _c;
  const modToolsContainer = document.querySelector("#ublog-mod-tools-container");
  if (!(modToolsContainer == null ? void 0 : modToolsContainer.firstElementChild)) return;
  const modTools = modToolsContainer.firstElementChild;
  const submitBtn = modTools.querySelector(".submit");
  const submit = async (o) => {
    const rsp = await textRaw(modTools.dataset.url, {
      method: "post",
      body: form(o)
    });
    if (rsp.redirected) {
      location.href = rsp.url;
      return;
    }
    if (!rsp.ok) return alert(`Error ${rsp.status}: ${rsp.statusText}`);
    modToolsContainer.innerHTML = await rsp.text();
    rewireModPost();
  };
  $(modTools).find(".quality-btn").on("click", function() {
    submit({ quality: this.value });
  });
  const submitFields = modTools.querySelector(".submit-fields");
  submitFields.querySelectorAll("input").forEach(
    (input) => input.addEventListener("input", () => {
      submitBtn.classList.remove("none");
      submitBtn.disabled = false;
    })
  );
  submitBtn.addEventListener("click", async () => {
    const form2 = {};
    for (const input of submitFields.querySelectorAll("input")) {
      form2[input.id] = input.type === "checkbox" ? input.checked : input.value;
    }
    await submit(form2);
  });
  (_a = modTools.querySelector(".carousel-add-btn")) == null ? void 0 : _a.addEventListener("click", () => submit({ featured: true }));
  (_b = modTools.querySelector(".carousel-remove-btn")) == null ? void 0 : _b.addEventListener("click", () => submit({ featured: false }));
  (_c = modTools.querySelector(".carousel-pin-btn")) == null ? void 0 : _c.addEventListener("click", async () => {
    const days = await prompt("How many days?", "7", (n) => Number(n) > 0 && Number(n) < 31);
    if (days) await submit({ featured: true, featuredUntil: Number(days) });
  });
}
//# sourceMappingURL=bits.ublog.N7XV2OOL.js.map

import {
  markdownPicfitRegex,
  naturalSize,
  wireMarkdownImgResizers
} from "./lib.DHTHEIGH.js";
import {
  alert,
  info,
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
import "./lib.S3TIZ2HQ.js";
import "./lib.LWF5S4ZV.js";
import "./lib.QPQZCXK2.js";
import "./lib.5I4BSVKX.js";
import {
  ValidationError,
  json,
  text
} from "./lib.TT4QSUKQ.js";
import "./lib.NFSQQWN5.js";
import {
  frag
} from "./lib.GMEH5BEF.js";
import "./lib.KO2KTNGK.js";

// ../bits/src/bits.markdownTextarea.ts
site.load.then(() => {
  for (const markdown of document.querySelectorAll(".markdown-textarea")) {
    wireMarkdownTextarea(markdown);
  }
});
function wireMarkdownTextarea(markdown) {
  const textarea = markdown.querySelector("textarea");
  if (!textarea) return;
  const previewTab = markdown.querySelector(".preview-tab");
  const writeTab = markdown.querySelector(".write-tab");
  const uploadBtn = markdown.querySelector(".upload-image");
  const preview = markdown.querySelector(".preview");
  previewTab.addEventListener("click", async () => {
    var _a;
    preview.innerHTML = `<div class="busy">${spinnerHtml}</div>`;
    preview.classList.remove("none");
    uploadBtn == null ? void 0 : uploadBtn.classList.add("none");
    writeTab.classList.remove("active");
    previewTab.classList.add("active");
    const rendered = frag(
      await text(`/markdown/preview/${(_a = markdown.dataset.formatKey) != null ? _a : "forum"}`, {
        method: "POST",
        body: textarea.value
      })
    );
    await Promise.all([
      rendered.querySelector(".lpv--autostart") && site.asset.loadEsm("bits.lpv", { init: { el: rendered } }),
      rendered.querySelector("a") && site.asset.loadEsm("bits.expandText", { init: rendered })
    ]);
    preview.replaceChildren(rendered);
    if (markdownPicfitRegex().test(textarea.value) && !localStorage.getItem("markdown.rtfm")) {
      await info("Drag a side or bottom edge to resize an image.");
      localStorage.setItem("markdown.rtfm", "1");
    }
    await wireMarkdownImgResizers({
      root: preview,
      update: {
        markdown: (text2) => text2 !== void 0 ? textarea.value = text2 : textarea.value
      },
      origin: markdown.dataset.imageDownloadOrigin,
      designWidth: Number(markdown.dataset.imageDesignWidth),
      realm: markdown.dataset.markdownRealm
    });
  });
  writeTab.addEventListener("click", () => {
    previewTab.classList.remove("active");
    writeTab.classList.add("active");
    uploadBtn == null ? void 0 : uploadBtn.classList.remove("none");
    preview.innerHTML = "";
    preview.classList.add("none");
    textarea.focus();
  });
  if (!markdown.dataset.imageUploadUrl) return;
  uploadBtn == null ? void 0 : uploadBtn.addEventListener("click", () => {
    const input = frag('<input type="file" accept="image/*" multiple />');
    input.onchange = () => {
      if (!input.files) return;
      for (const file of input.files) uploadAndInsert(file);
    };
    input.click();
  });
  textarea.addEventListener("paste", (e) => {
    if (!e.clipboardData) return;
    if (handleDataTransferItems(e.clipboardData.items)) e.preventDefault();
  });
  textarea.addEventListener("drop", (e) => {
    if (!e.dataTransfer) return;
    if (handleDataTransferItems(e.dataTransfer.items)) e.preventDefault();
  });
  textarea.addEventListener("dragover", (e) => e.preventDefault());
  const handleDataTransferItems = (items) => {
    const images = [...items].filter((i) => i.kind === "file" && i.type.startsWith("image/"));
    if (images.length === 0) return false;
    for (const image of images) uploadAndInsert(image.getAsFile());
    return true;
  };
  const uploadAndInsert = async (image) => {
    var _a, _b, _c, _d;
    try {
      const count = (_c = (_b = (_a = textarea.value) == null ? void 0 : _a.match(markdownPicfitRegex(markdown.dataset.imageDownloadOrigin))) == null ? void 0 : _b.length) != null ? _c : 0;
      if (count >= Number(markdown.dataset.imageCountMax)) {
        throw `You can only upload ${markdown.dataset.imageCountMax} images here.`;
      }
      preview.innerHTML = `<div class="busy"><span>Uploading image...</span>${spinnerHtml}</div>`;
      preview.classList.remove("none");
      const { width, height } = await naturalSize(image);
      const body = new FormData();
      body.append("context", (_d = markdown.dataset.imageContext) != null ? _d : location.href);
      body.append("dim.width", String(width));
      body.append("dim.height", String(height));
      body.append("image", image);
      const { imageUrl } = await json(markdown.dataset.imageUploadUrl, { method: "POST", body });
      if (!imageUrl) throw "";
      const before = textarea.value.slice(0, textarea.selectionStart);
      const after = textarea.value.slice(textarea.selectionEnd);
      const maybeNewline = /\s$/.test(before) ? "" : "\n";
      textarea.value = `${before}${maybeNewline}![${image.name}](${imageUrl})
${after}`;
      textarea.selectionStart = textarea.selectionEnd = textarea.value.length - after.length;
    } catch (e) {
      alert(e instanceof ValidationError ? e.message : `Image upload failed: ${e}`);
    } finally {
      preview.classList.add("none");
      preview.innerHTML = "";
    }
  };
}
//# sourceMappingURL=bits.markdownTextarea.MGWQTNPK.js.map

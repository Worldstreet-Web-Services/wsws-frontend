import {
  clamp
} from "./lib.NNS7OYZ5.js";
import {
  json
} from "./lib.M3IF75DN.js";
import {
  frag
} from "./lib.GK2I5IFJ.js";

// ../lib/src/view/markdownImgResizer.ts
async function wireMarkdownImgResizers({
  root,
  update,
  designWidth,
  origin,
  realm
}) {
  const globalImageLinkRe = markdownPicfitRegex(origin);
  let matching = 0;
  for (const img of root.querySelectorAll("img")) {
    if (!`![](${img.src})`.match(globalImageLinkRe)) continue;
    const index = matching++;
    if (img.closest(".markdown-img-resizer")) continue;
    try {
      await img.decode();
    } catch (e) {
      continue;
    }
    const pointerdown = async (down) => {
      var _a;
      const handle = down.currentTarget;
      const rootStyle = window.getComputedStyle(root);
      const rootPadding = parseInt(rootStyle.paddingLeft) + parseInt(rootStyle.paddingRight);
      const rootWidth = root.clientWidth - (isFinite(rootPadding) ? rootPadding : 0);
      const aspectRatio = img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1;
      const imgClientRect = img.getBoundingClientRect();
      const isBottomDrag = handle.className.includes("bottom");
      const isCornerDrag = !isBottomDrag && imgClientRect.bottom - down.clientY < 18;
      const dir = handle.className.includes("left") ? -1 : 1;
      if (isCornerDrag) handle.style.cursor = dir === 1 ? "nwse-resize" : "nesw-resize";
      (_a = handle.setPointerCapture) == null ? void 0 : _a.call(handle, down.pointerId);
      img.style.willChange = "width,height";
      img.style.width = `${imgClientRect.width}px`;
      img.closest(".markdown-img-resizer").style.width = "";
      const pointermove = (move) => {
        const deltaX = isCornerDrag ? dir * (move.clientX - down.clientX) + aspectRatio * (move.clientY - down.clientY) / 2 : isBottomDrag ? (move.clientY - down.clientY) * aspectRatio : dir * 2 * (move.clientX - down.clientX);
        const viewportImgWidth = Math.round(
          clamp(imgClientRect.width + deltaX, { min: 128, max: rootWidth })
        );
        img.style.width = `${viewportImgWidth}px`;
        img.dataset.resizeWidth = String(
          designWidth ? Math.round(viewportImgWidth * designWidth / rootWidth) : viewportImgWidth
        );
        img.dataset.widthRatio = String(viewportImgWidth / rootWidth);
      };
      const pointerup = async () => {
        handle.removeEventListener("pointermove", pointermove);
        handle.removeEventListener("pointerup", pointerup);
        handle.removeEventListener("pointercancel", pointerup);
        if (handle.hasPointerCapture(down.pointerId)) handle.releasePointerCapture(down.pointerId);
        img.style.willChange = "";
        handle.style.cursor = "";
        if ("url" in update) return urlUpdate(img, realm, update);
        const markdown = update.markdown();
        const link = [...markdown.matchAll(globalImageLinkRe)][index];
        if (!(link == null ? void 0 : link[1]) || !img.dataset.widthRatio) return;
        const { imageUrl } = await json(`/image-url/${realm}/${link[3]}?width=${img.dataset.resizeWidth}`);
        const before = markdown.slice(0, link.index);
        const after = markdown.slice(link.index + link[0].length);
        const newMarkdown = before + `![${link[1]}](${imageUrl})` + after;
        update.markdown(newMarkdown);
      };
      handle.addEventListener("pointermove", pointermove, { passive: true });
      handle.addEventListener("pointerup", pointerup, { passive: true });
      handle.addEventListener("pointercancel", pointerup, { passive: true });
      down.preventDefault();
    };
    for (const h of dragHandles(img)) {
      h.addEventListener("pointerdown", pointerdown, { passive: false });
    }
  }
}
function wrapImg(arg) {
  var _a;
  const span = frag(`<span class="markdown-img-container"><span><i class="resize-handle right"></i><i class="resize-handle bottom"></i><i class="resize-handle left"></i></span></span>`);
  const img = "img" in arg ? arg.img : frag(`<img src="${arg.src}" alt="${arg.alt}">`);
  if ("img" in arg) img.replaceWith(span);
  (_a = span.querySelector("span")) == null ? void 0 : _a.prepend(img);
  return span;
}
async function naturalSize(image) {
  if (image.type === "image/svg+xml") throw "SVG images are not supported.";
  if ("createImageBitmap" in window) return window.createImageBitmap(image);
  const objectUrl = URL.createObjectURL(image);
  const img = new Image();
  try {
    img.src = objectUrl;
    await img.decode();
    return { width: img.naturalWidth, height: img.naturalHeight };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
function markdownPicfitRegex(origin = "") {
  return new RegExp(
    String.raw`!\[([^\n\]]*)\]\((${regexQuote(
      origin
    )}[^)\s]+[?&]path=((?:[a-z]\w+:)?[-_a-z0-9]{12}\.\w{3,4})[^)]*)\)`,
    "gi"
  );
}
var imageIdRe = /&path=((?:[a-z]\w+:)?[-_a-z0-9]{12}\.\w{3,4})&/i;
async function urlUpdate(img, realm, update) {
  var _a;
  const imageId = (_a = img.src.match(imageIdRe)) == null ? void 0 : _a[1];
  const { imageUrl } = await json(`/image-url/${realm}/${imageId}?width=${img.dataset.resizeWidth}`);
  const preloadImg = new Image();
  preloadImg.src = imageUrl;
  await preloadImg.decode();
  update.url(img, imageUrl, Number(img.dataset.widthRatio));
}
function dragHandles(img) {
  var _a;
  const span = (_a = img.closest(".markdown-img-container")) != null ? _a : wrapImg({ img });
  span.firstElementChild.classList.add("markdown-img-resizer");
  return [...span.querySelectorAll(".resize-handle")];
}
function regexQuote(origin) {
  return origin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export {
  wireMarkdownImgResizers,
  wrapImg,
  naturalSize,
  markdownPicfitRegex
};
//# sourceMappingURL=lib.43B7AC32.js.map

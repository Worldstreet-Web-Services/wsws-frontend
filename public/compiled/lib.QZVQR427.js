import {
  COLORS
} from "./lib.53PYQRAK.js";
import {
  script
} from "./lib.TT4QSUKQ.js";
import {
  memoize
} from "./lib.GMEH5BEF.js";
import {
  __export
} from "./lib.KO2KTNGK.js";

// ../site/src/asset.ts
var asset_exports = {};
__export(asset_exports, {
  baseUrl: () => baseUrl,
  embedChessground: () => embedChessground,
  fideFedSrc: () => fideFedSrc,
  flairSrc: () => flairSrc,
  jsModule: () => jsModule,
  loadCss: () => loadCss,
  loadCssPath: () => loadCssPath,
  loadEsm: () => loadEsm,
  loadEsmPage: () => loadEsmPage,
  loadI18n: () => loadI18n,
  loadIife: () => loadIife,
  loadPieces: () => loadPieces,
  removeCss: () => removeCss,
  removeCssPath: () => removeCssPath,
  url: () => url
});
var baseUrl = memoize(() => document.body.getAttribute("data-asset-url") || "");
var assetVersion = memoize(() => document.body.getAttribute("data-asset-version"));
var url = (path, opts = {}) => {
  const base = opts.documentOrigin ? window.location.origin : opts.pathOnly ? "" : baseUrl();
  const pathVersion = !opts.pathVersion ? "" : opts.pathVersion === true ? `_${assetVersion()}/` : `_${opts.pathVersion}/`;
  const hash = !pathVersion && site.manifest.hashed[path];
  return `${base}/assets/${hash ? asHashed(path, hash) : `${pathVersion}${path}`}`;
};
function asHashed(path, hash) {
  const name = path.slice(path.lastIndexOf("/") + 1);
  const extPos = name.lastIndexOf(".");
  return `hashed/${extPos === -1 ? `${name}.${hash}` : `${name.slice(0, extPos)}.${hash}${name.slice(extPos)}`}`;
}
var flairSrc = (flair) => url(`flair/img/${flair}.webp`, { pathVersion: "_____4" });
var fideFedSrc = (fideFed) => url(`fide/fed-webp/${fideFed}.webp`, { pathVersion: "_____2" });
var loadCss = (href, key) => {
  return new Promise((resolve) => {
    href = href.startsWith("https:") ? href : url(href);
    if (document.head.querySelector(`link[href="${href}"]`)) return resolve();
    const el = document.createElement("link");
    if (key) el.setAttribute("data-css-key", key);
    el.rel = "stylesheet";
    el.href = href;
    el.onload = () => resolve();
    document.head.append(el);
  });
};
var loadCssPath = async (key) => {
  const hash = site.manifest.css[key];
  await loadCss(`css/${key}${hash ? `.${hash}` : ""}.css`, key);
};
var removeCss = (href) => $(`head > link[href="${href}"]`).remove();
var removeCssPath = (key) => $(`head > link[data-css-key="${key}"]`).remove();
var jsModule = (name, prefix = "compiled/") => {
  if (name.endsWith(".js")) name = name.slice(0, -3);
  const hash = site.manifest.js[name];
  return `${prefix}${name}${hash ? `.${hash}` : ""}.js`;
};
var loadIife = (u, opts = {}) => {
  return script(url(u, opts));
};
async function loadEsm(name, opts = {}) {
  var _a;
  const module = await import(url(opts.npm ? jsModule(name, "npm/") : jsModule(name), opts));
  const initializer = (_a = module.initModule) != null ? _a : module.default;
  return opts.npm && !opts.init ? initializer : initializer(opts.init);
}
var loadEsmPage = async (name) => {
  const modulePromise = import(url(jsModule(name)));
  const dataScript = document.getElementById("page-init-data");
  const opts = dataScript && JSON.parse(dataScript.innerHTML);
  dataScript == null ? void 0 : dataScript.remove();
  const module = await modulePromise;
  module.initModule ? module.initModule(opts) : module.default(opts);
};
var loadI18n = async (catalog) => {
  await import(document.body.dataset.i18nCatalog);
  await import(url(`compiled/i18n/${catalog}.${window.site.manifest.i18n[catalog]}.js`));
};
function embedChessground() {
  return import(url("npm/chessground.min.js"));
}
var loadPieces = new Promise((resolve, reject) => {
  var _a;
  if ((_a = document.getElementById("main-wrap")) == null ? void 0 : _a.classList.contains("is3d")) return resolve();
  const style = window.getComputedStyle(document.body);
  const urls = COLORS.flatMap(
    (c) => ["pawn", "knight", "bishop", "rook", "queen", "king"].map((r) => `---${c}-${r}`)
  ).map(
    (u) => style.getPropertyValue(u).slice(4, -1).replace(/\\([:/.])/g, "$1")
    // webkit escapes
  ).filter(Boolean);
  let assetsToDecode = urls.length;
  if (assetsToDecode === 0) return resolve();
  urls.forEach((url2) => {
    const img = new Image();
    img.src = url2;
    img.decode().then(() => {
      if (--assetsToDecode === 0) resolve();
    }).catch(reject);
  });
});

export {
  url,
  loadCssPath,
  jsModule,
  loadEsm,
  embedChessground,
  asset_exports
};
//# sourceMappingURL=lib.QZVQR427.js.map

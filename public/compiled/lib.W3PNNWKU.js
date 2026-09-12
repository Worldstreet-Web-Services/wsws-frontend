import {
  expandMentions
} from "./lib.GMEH5BEF.js";

// ../mod/src/mod.autolink.ts
function initModule() {
  autolinkAtoms();
}
function autolinkAtoms(el = document.body) {
  if (!el || el === once) return;
  once = el;
  for (const atom of el.querySelectorAll(".atom p, .mod-timeline__text")) {
    atom.innerHTML = autolink(atom.innerHTML);
  }
}
var autolink = (text) => expandMentions(text.replace(pathMatchRe, `<a href="$1">${location.hostname}$1</a>`));
var greedyAutoLinks = [
  "inbox",
  "forum",
  "study",
  "broadcast",
  "team",
  "tournament",
  "@",
  "insights",
  "(?:[A-Za-z0-9]{8})(?:[a-zA-Z0-9]{4})?"
  // game ids
];
var pathMatchRe = new RegExp(
  `(?:^|(?<![/="'\\w-@>])|(?<=[,;(]))(?:https://)?(?:${location.hostname.replace(".", "\\.")})?(/(?:${greedyAutoLinks.join("|")})(?:/|\\?|#|\\b|$)(?:[^\\s,."';)]+)?)`,
  "gi"
);
var once;

export {
  initModule,
  autolinkAtoms,
  autolink
};
//# sourceMappingURL=lib.W3PNNWKU.js.map

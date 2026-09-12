import {
  bind,
  dataIcon,
  hl
} from "./lib.WVJXH4CQ.js";
import {
  licon
} from "./lib.2DWRH35C.js";

// ../lib/src/view/blindfold.ts
function renderBlindfoldToggle(toggle) {
  return toggle() ? hl("div#blindfoldzone", [
    hl(
      "a#blindfoldtog.text",
      {
        attrs: dataIcon(licon.CautionCircle),
        hook: bind("click", () => toggle(false))
      },
      i18n.preferences.blindfold
    )
  ]) : void 0;
}

export {
  renderBlindfoldToggle
};
//# sourceMappingURL=lib.CZSHUNBU.js.map

import "./lib.67VUYMDO.js";
import {
  sanToUci,
  sanWriter
} from "./lib.GD6YSPBF.js";
import {
  destsToUcis
} from "./lib.LRP46MC3.js";
import "./lib.HMFK7OOB.js";
import {
  files
} from "./lib.XAEDCBGD.js";
import "./lib.X7H2PLEK.js";
import "./lib.53PYQRAK.js";
import "./lib.NFSQQWN5.js";
import {
  blurIfEscape
} from "./lib.GMEH5BEF.js";
import "./lib.KO2KTNGK.js";

// ../keyboardMove/src/keyboardSubmit.ts
var keyRegex = /^[a-h][1-8]$/;
var fileRegex = /^[a-h]$/;
var crazyhouseRegex = /^\w?@([a-h]|[a-h][1-8])?$/;
var ambiguousPromotionRegex = /^[a-h][27][a-h][18]$/;
var ambiguousPromotionCaptureRegex = /^([a-h][27]?x?)?[a-h](1|8)=?$/;
var promotionRegex = /^([a-h]x?)?[a-h](1|8)=?[nbrqkNBRQK]$/;
var iccfRegex = /^[1-8][1-8]?[1-5]?$/;
var isKey = (v) => !!v.match(keyRegex);
function makeSubmit(opts, clear) {
  return (v, submitOpts) => {
    var _a, _b, _c, _d, _e, _f, _g;
    if (!submitOpts.isTrusted) return;
    v = v.replace(/0/g, "O");
    if (v.match(iccfRegex)) {
      v = iccfToUci(v);
    }
    const { legalSans } = opts.ctrl;
    const foundUci = v.length >= 2 && legalSans && sanToUci(v, legalSans);
    const selectedKey = opts.ctrl.hasSelected() || "";
    if (v.length > 0 && "resign".startsWith(v.toLowerCase())) {
      if (v.toLowerCase() === "resign") {
        opts.ctrl.resign(true, true);
        clear();
      }
    } else if (legalSans && foundUci) {
      if (v.toLowerCase() === "o-o" && legalSans["O-O-O"] && !submitOpts.force) return;
      if (isKey(v) && (selectedKey + v).match(ambiguousPromotionRegex) && !submitOpts.force) return;
      if (isKey(v) && selectedKey) opts.ctrl.select(v);
      if (v.match(ambiguousPromotionCaptureRegex) && legalSans[v] && !submitOpts.force) return;
      else opts.ctrl.san(foundUci.slice(0, 2), foundUci.slice(2));
      clear();
    } else if (legalSans && selectedKey && (selectedKey + v).match(ambiguousPromotionCaptureRegex) && legalSans[selectedKey.slice(0, 1) + v.slice(0, 2)] && !submitOpts.force) {
    } else if (legalSans && isKey(v)) {
      opts.ctrl.select(v);
      clear();
    } else if (legalSans && v.match(fileRegex)) {
    } else if (legalSans && (selectedKey.slice(0, 1) + v).match(promotionRegex)) {
      const promotionSan = selectedKey && selectedKey.slice(0, 1) !== v.slice(0, 1) ? selectedKey.slice(0, 1) + v : v;
      const foundUci2 = sanToUci(promotionSan.replace("=", "").slice(0, -1), legalSans);
      if (!foundUci2) return;
      opts.ctrl.promote(foundUci2.slice(0, 2), foundUci2.slice(2), v.slice(-1).toUpperCase());
      clear();
    } else if (v.match(crazyhouseRegex)) {
      if (v.length > 3 || v.length > 2 && v.startsWith("@")) {
        if (v.length === 3) v = "P" + v;
        opts.ctrl.drop(v.slice(2), v[0].toUpperCase());
        clear();
      }
    } else if (v.length > 0 && "clock".startsWith(v.toLowerCase()) && opts.ctrl.speakClock) {
      if ("clock" === v.toLowerCase()) {
        opts.ctrl.speakClock();
        clear();
      }
    } else if (v.length > 0 && "zerk".startsWith(v.toLowerCase()) && opts.ctrl.goBerserk) {
      if ("zerk" === v.toLowerCase()) {
        opts.ctrl.goBerserk();
        clear();
      }
    } else if (v.length > 0 && "who".startsWith(v.toLowerCase())) {
      if ("who" === v.toLowerCase()) {
        if (opts.ctrl.opponent) site.sound.say(opts.ctrl.opponent, false, true);
        clear();
      }
    } else if (v.length > 0 && "draw".startsWith(v.toLowerCase())) {
      if ("draw" === v.toLowerCase()) {
        opts.ctrl.draw();
        clear();
      }
    } else if (v.length > 0 && "next".startsWith(v.toLowerCase())) {
      if ("next" === v.toLowerCase()) {
        (_b = (_a = opts.ctrl).next) == null ? void 0 : _b.call(_a);
        clear();
      }
    } else if (v.length > 0 && "upv".startsWith(v.toLowerCase())) {
      if ("upv" === v.toLowerCase()) {
        (_d = (_c = opts.ctrl).vote) == null ? void 0 : _d.call(_c, true);
        clear();
      }
    } else if (v.length > 0 && "downv".startsWith(v.toLowerCase())) {
      if ("downv" === v.toLowerCase()) {
        (_f = (_e = opts.ctrl).vote) == null ? void 0 : _f.call(_e, false);
        clear();
      }
    } else if (v.length > 0 && ("help".startsWith(v.toLowerCase()) || v === "?")) {
      if (["help", "?"].includes(v.toLowerCase())) {
        opts.ctrl.helpModalOpen(true);
        clear();
      }
    } else if (submitOpts.yourMove && v.length > 0 && legalSans && !sanCandidates(v, legalSans).length) {
      setTimeout(() => site.sound.play("error"), 500);
      opts.input.value = "";
      (_g = opts.ctrl.checker) == null ? void 0 : _g.clear();
    } else {
      const wrong = v.length && legalSans && !sanCandidates(v, legalSans).length;
      if (wrong && !opts.input.classList.contains("wrong")) site.sound.play("error");
      opts.input.classList.toggle("wrong", !!wrong);
    }
  };
}
function iccfToUci(v) {
  const chars = v.split("");
  if (chars[0]) chars[0] = files[parseInt(chars[0]) - 1];
  if (chars[2]) chars[2] = "kqrbn"[parseInt(chars[2])];
  return chars.join("");
}
function sanCandidates(san, legalSans) {
  const lowered = san.replace("=", "").toLowerCase();
  return Object.keys(legalSans).filter(function(s) {
    return s.toLowerCase().startsWith(lowered);
  });
}

// ../keyboardMove/src/keyboardMove.ts
function initModule(opts) {
  if (opts.input.classList.contains("ready")) return void 0;
  opts.input.classList.add("ready");
  const clear = makeClear(opts);
  const submit = makeSubmit(opts, clear);
  makeBindings(opts, submit, clear);
  return (fen, dests, yourMove) => {
    opts.ctrl.legalSans = dests && dests.size > 0 ? sanWriter(fen, destsToUcis(dests)) : null;
    setTimeout(() => {
      submit(opts.input.value, {
        isTrusted: true,
        yourMove
      });
    }, 1);
  };
}
function makeClear(opts) {
  return () => {
    var _a;
    opts.input.value = "";
    opts.input.classList.remove("wrong");
    (_a = opts.ctrl.checker) == null ? void 0 : _a.clear();
  };
}
function makeBindings(opts, submit, clear) {
  const arrowKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
  const isArrowKey = (v) => arrowKeys.includes(v);
  site.mousetrap.bind("m", () => opts.input.focus());
  opts.input.addEventListener("keyup", (e) => {
    var _a;
    if (!e.isTrusted) return;
    const v = e.target.value;
    if (v.includes("/")) {
      focusChat();
      clear();
    } else if (v === "" && e.key === "Enter") opts.ctrl.confirmMove();
    else {
      (_a = opts.ctrl.checker) == null ? void 0 : _a.press(e);
      submit(v, {
        force: e.key === "Enter",
        isTrusted: true
      });
    }
  });
  opts.input.addEventListener("keypress", (e) => {
    const v = e.target.value;
    if (e.isTrusted && v.length === 2 && /^\w$/.test(e.key) && !opts.ctrl.hasSelected())
      submit(v, { isTrusted: true });
  });
  opts.input.addEventListener("keydown", (e) => {
    if (isArrowKey(e.key)) {
      opts.ctrl.arrowNavigate(e.key);
      e.preventDefault();
    } else blurIfEscape(e);
  });
  opts.input.addEventListener("focus", () => opts.ctrl.isFocused(true));
  opts.input.addEventListener("blur", () => opts.ctrl.isFocused(false));
}
function focusChat() {
  const chatInput = document.querySelector(".mchat .mchat__say");
  if (chatInput) chatInput.focus();
}
export {
  initModule
};
//# sourceMappingURL=keyboardMove.74W7NYX6.js.map

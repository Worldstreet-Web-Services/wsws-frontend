import {
  domDialog
} from "./lib.LY6FZSW3.js";
import "./lib.KC3NJ77S.js";
import "./lib.NNS7OYZ5.js";
import "./lib.LYPETE66.js";
import "./lib.ILS4LNPZ.js";
import "./lib.GSUEVEQG.js";
import "./lib.JUCKJNFH.js";
import "./lib.PM233RJM.js";
import "./lib.23HTWUBN.js";
import {
  log
} from "./lib.GOC3UD5K.js";
import {
  isTouchDevice
} from "./lib.WVJXH4CQ.js";
import "./lib.2L7Z4FRN.js";
import "./lib.YID4KMSR.js";
import {
  licon
} from "./lib.2DWRH35C.js";
import "./lib.M3IF75DN.js";
import {
  storage
} from "./lib.AXX3QIAX.js";
import {
  escapeHtml,
  myUserId,
  myUsername
} from "./lib.GK2I5IFJ.js";
import "./lib.KO2KTNGK.js";

// ../bits/src/bits.diagnosticDialog.ts
async function initModule(opts) {
  var _a, _b, _c, _d, _e, _f, _g;
  const ops2 = opts ? 0 : processQueryParams();
  const logs = !opts && await log.get();
  const text = (_d = opts == null ? void 0 : opts.text) != null ? _d : `Browser: ${navigator.userAgent}
User: ${(_a = myUsername()) != null ? _a : "(anon)"}, HTTP: ${(_c = (_b = performance.getEntriesByType("navigation")[0]) == null ? void 0 : _b.nextHopProtocol) != null ? _c : "unknown"}
` + ("userAgentData" in navigator ? (
    // @ts-ignore userAgentData not documented in TypeScript https://developer.mozilla.org/en-US/docs/Web/API/Navigator/userAgentData
    `Brand: "${navigator.userAgentData.brands.map((b) => `${b.brand} ${b.version}`).join("; ")}", `
  ) : "") + `Cores: ${navigator.hardwareConcurrency}, Touch: ${isTouchDevice()} ${navigator.maxTouchPoints}, Screen: ${window.screen.width}x${window.screen.height}, ` + ("lichessTools" in window ? "Extension: Lichess Tools, " : "") + `Page lang: ${site.displayLocale}, Browser lang: ${navigator.language}, Engine: ${storage.get("ceval.engine")}, Threads: ${storage.get("ceval.threads")}, Blindfold: ${storage.boolean("blindfold." + (myUserId() || "anon")).get()}, Pieces: ${document.body.dataset.pieceSet}` + (logs ? `

${logs}` : "");
  const escaped = escapeHtml(text);
  const flash = ops2 > 0 ? `<p class="good">Changes applied</p>` : "";
  const submit = myUserId() ? `<form method="post" action="/diagnostic"><input type="hidden" name="text" value="${escaped}"/><input type="hidden" name="plaintext" value="${(_e = opts == null ? void 0 : opts.plaintext) != null ? _e : false}"/><button type="submit" class="button">${(_f = opts == null ? void 0 : opts.submit) != null ? _f : "send to lichess"}</button></form>` : "";
  const clear = logs ? `<button class="button button-empty button-red clear">clear logs</button>` : "";
  const copy = `<button class="button copy" data-icon="${licon.Clipboard}"> copy</button>`;
  const dlg = await domDialog({
    class: "diagnostic",
    css: [{ hashed: "bits.diagnosticDialog" }],
    modal: true,
    focus: ".copy",
    htmlText: `<h2>${(_g = opts == null ? void 0 : opts.header) != null ? _g : "Diagnostics"}</h2>${flash} <pre tabindex="0" class="err">${escaped}</pre><span class="actions"> ${clear} <div class="spacer"></div> ${copy} ${submit} </span>`
  });
  const select = () => setTimeout(() => {
    var _a2, _b2;
    const range = document.createRange();
    range.selectNodeContents(dlg.view.querySelector(".err"));
    (_a2 = window.getSelection()) == null ? void 0 : _a2.removeAllRanges();
    (_b2 = window.getSelection()) == null ? void 0 : _b2.addRange(range);
  }, 0);
  $(".err", dlg.view).on("focus", select);
  $(".clear", dlg.view).on("click", () => log.clear().then(() => dlg.close()));
  $(".copy", dlg.view).on(
    "click",
    () => navigator.clipboard.writeText(text).then(() => {
      const copied = $(`<div data-icon="${licon.Checkmark}" class="good"> COPIED</div>`);
      $(".copy", dlg.view).before(copied);
      setTimeout(() => copied.remove(), 2e3);
    })
  );
  await dlg.show();
}
var storageProxy = {
  wsPing: {
    storageKey: "socket.ping.interval",
    validate: (val) => parseInt(val != null ? val : "") > 249
  },
  wsHost: {
    storageKey: "socket.host",
    validate: (val) => {
      var _a;
      return (_a = val == null ? void 0 : val.endsWith(".lichess.org")) != null ? _a : false;
    }
  },
  logWindow: {
    storageKey: "log.window",
    validate: (val) => parseInt(val != null ? val : "") >= 0
  }
};
var ops = {
  set: (data) => {
    try {
      const kv = atob(data).split("=");
      const proxy = storageProxy[kv[0]];
      if (proxy == null ? void 0 : proxy.validate(kv[1])) {
        log(`storage set ${kv[0]}=${kv[1]}`);
        storage.set(proxy.storageKey, kv[1]);
        return true;
      }
    } catch (_) {
      console.warn("Invalid base64", data);
    }
    return false;
  },
  unset: (val) => {
    log(`storage unset ${val ? val : "all"}`);
    if (!val) for (const key in storageProxy) storage.remove(storageProxy[key].storageKey);
    else if (val in storageProxy) storage.remove(storageProxy[val].storageKey);
    else return false;
    return true;
  }
};
function processQueryParams() {
  var _a, _b;
  let changed = 0;
  for (const p of (_b = (_a = location.hash.split("?")[1]) == null ? void 0 : _a.split("&")) != null ? _b : []) {
    const op = p.includes("=") ? p.slice(0, p.indexOf("=")) : p;
    if (op in ops) changed += ops[op](p.slice(op.length + 1)) ? 1 : 0;
    else console.warn("Invalid query op", op);
  }
  return changed;
}
export {
  initModule
};
//# sourceMappingURL=bits.diagnosticDialog.2KUTRIKP.js.map

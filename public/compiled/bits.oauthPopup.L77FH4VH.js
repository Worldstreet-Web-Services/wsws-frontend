import "./lib.KO2KTNGK.js";

// ../bits/src/bits.oauthPopup.ts
function initModule(args) {
  if (window.opener && !window.opener.closed) {
    window.opener.postMessage({ ...args, ok: true }, window.location.origin);
    window.close();
  } else {
    window.location.href = args.href;
  }
}
export {
  initModule
};
//# sourceMappingURL=bits.oauthPopup.L77FH4VH.js.map

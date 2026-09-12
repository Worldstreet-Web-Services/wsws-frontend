import {
  ChatCtrl
} from "./lib.ADE2DDSZ.js";
import {
  renderChat
} from "./lib.WSONNVTW.js";
import {
  attributesModule,
  classModule,
  init
} from "./lib.2L7Z4FRN.js";

// ../lib/src/chat/standalone.ts
function standaloneChat(data) {
  const opts = { el: document.querySelector(".mchat"), ...data };
  const patch = init([classModule, attributesModule]);
  const ctrl = new ChatCtrl(opts, redraw);
  const blueprint = renderChat(ctrl);
  opts.el.innerHTML = "";
  let vnode = patch(opts.el, blueprint);
  function redraw() {
    vnode = patch(vnode, renderChat(ctrl));
  }
  return ctrl;
}

export {
  standaloneChat
};
//# sourceMappingURL=lib.KFU67WIY.js.map

import {
  wsConnect
} from "./lib.GOC3UD5K.js";
import {
  pubsub
} from "./lib.YID4KMSR.js";
import "./lib.M3IF75DN.js";
import "./lib.AXX3QIAX.js";
import "./lib.GK2I5IFJ.js";
import "./lib.KO2KTNGK.js";

// ../simul/src/simul.home.ts
site.load.then(() => {
  wsConnect(`/socket/v5`, false, { params: { flag: "simul" } });
  pubsub.on("socket.in.reload", async () => {
    const rsp = await fetch("/simul/reload");
    const html = await rsp.text();
    $(".simul-list__content").html(html);
    pubsub.emit("content-loaded");
  });
});
//# sourceMappingURL=simul.home.DDMBQML3.js.map

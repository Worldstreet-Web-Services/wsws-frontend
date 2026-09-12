import {
  wsConnect
} from "./lib.PNHYIP7B.js";
import {
  pubsub
} from "./lib.QPQZCXK2.js";
import "./lib.TT4QSUKQ.js";
import "./lib.NFSQQWN5.js";
import "./lib.GMEH5BEF.js";
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
//# sourceMappingURL=simul.home.TY2MJBAP.js.map

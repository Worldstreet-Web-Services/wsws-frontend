import {
  load
} from "./lib.U5LVQ35C.js";
import "./lib.BMKV23O2.js";
import {
  checkDebouncedResultAgainstTerm,
  complete,
  fetchUsers,
  renderUserEntry
} from "./lib.D6AFQ4TK.js";
import {
  require_dist
} from "./lib.BWJ4DVGT.js";
import {
  alert,
  domDialog,
  enter
} from "./lib.MYPIOGN5.js";
import "./lib.LRP46MC3.js";
import "./lib.HMFK7OOB.js";
import "./lib.AEOHBIQD.js";
import "./lib.RPQH5UYI.js";
import "./lib.XAEDCBGD.js";
import "./lib.X7H2PLEK.js";
import "./lib.53PYQRAK.js";
import "./lib.CAO7TYYH.js";
import "./lib.PNHYIP7B.js";
import "./lib.S3TIZ2HQ.js";
import "./lib.LWF5S4ZV.js";
import "./lib.QPQZCXK2.js";
import "./lib.5I4BSVKX.js";
import "./lib.TT4QSUKQ.js";
import "./lib.NFSQQWN5.js";
import {
  defined,
  escapeHtml
} from "./lib.GMEH5BEF.js";
import {
  __toESM
} from "./lib.KO2KTNGK.js";

// ../cli/src/cli.ts
var import_debounce_promise = __toESM(require_dist(), 1);
function initModule({ input }) {
  const menuLinks = Array.from(document.querySelectorAll("#topnav a")).filter(
    (a) => a.href !== "/"
  );
  const fetchLinks = (term) => {
    const all = menuLinks.filter((a) => {
      var _a;
      return (_a = a.textContent) == null ? void 0 : _a.toLowerCase().includes(term.toLowerCase());
    }).map((a) => a.cloneNode(true)).map((a) => {
      a.classList.add("complete-result", "complete-result--menu");
      if (a.querySelector(".home")) a.innerHTML = i18n.site.play;
      return a;
    });
    const seen = /* @__PURE__ */ new Set();
    for (let i = all.length - 1; i >= 0; i--) {
      if (seen.has(all[i].href)) all.splice(i, 1);
      else seen.add(all[i].href);
    }
    return all;
  };
  const debouncedXhr = (0, import_debounce_promise.default)((t) => fetchUsers(t, { friend: true }), 150);
  const completeOpts = {
    input,
    fetch: async (t) => {
      const users = await debouncedXhr(t).then(checkDebouncedResultAgainstTerm(t));
      return [...fetchLinks(t), ...users];
    },
    render: (o) => isLink(o) ? o : renderUserEntry(o),
    populate: (r) => r.name,
    onSelect: (r) => execute(r),
    regex: /^[a-z][\w-]{2,29}$/i
  };
  complete(completeOpts);
  setTimeout(() => input.focus());
  $(input).on(
    "keydown",
    enter(() => {
      execute(input.value);
      input.blur();
    })
  );
}
function execute(e) {
  if (!e) return;
  if (typeof e !== "string" && isLink(e)) location.href = e.href;
  else if (isUser(e)) location.href = "/@/" + e.name;
  else if (e.startsWith("/")) command(e.replace(/\//g, ""));
  else if (e.match(/^([1-8pnbrqk]+\/){7}.*/i)) location.href = "/analysis/standard/" + e.replace(/ /g, "_");
  else if (e.match(/^[a-zA-Z0-9_-]{2,30}$/)) location.href = "/@/" + e;
  else location.href = "/player/search/" + e;
}
function isLink(e) {
  return e instanceof HTMLAnchorElement;
}
function isUser(e) {
  return defined(e.name);
}
function command(q) {
  const parts = q.split(" "), exec = parts[0];
  const is = function(commands) {
    return commands.split(" ").includes(exec);
  };
  if (is("tv follow") && parts[1]) location.href = "/@/" + parts[1] + "/tv";
  else if (is("tv")) location.href = "/tv";
  else if (is("play challenge match") && parts[1]) location.href = "/?user=" + parts[1] + "#friend";
  else if (is("light dark transp system")) load().then((m) => m.theme.set(exec));
  else if (is("stream") && parts[1]) location.href = "/streamer/" + parts[1];
  else if (is("help")) help();
  else alert(`Unknown command: "${q}". Type /help for the list of commands`);
}
function commandHelp(aliases, args, desc) {
  return '<div class="command"><div>' + aliases.split(" ").map((a) => `<p>${a} ${escapeHtml(args)}</p>`).join("") + `</div> <span>${desc}<span></div>`;
}
function help() {
  domDialog({
    css: [{ hashed: "cli.help" }],
    class: "clinput-help",
    modal: true,
    easyClose: "clickOutside",
    show: true,
    htmlText: "<div><h3>Commands</h3>" + commandHelp("/tv /follow", " <user>", "Watch someone play") + commandHelp("/play /challenge /match", " <user>", "Challenge someone to play") + commandHelp("/light /dark /transp /system", "", "Change the background theme") + commandHelp("/stream", "<user>", "Watch someone stream") + "<h3>Global hotkeys</h3>" + commandHelp("s", "", "Search for a user") + commandHelp("/", "", "Type a command") + commandHelp("c", "", "Focus the chat input") + commandHelp("esc", "", "Close modals like this one") + "</div>"
  });
}
export {
  initModule
};
//# sourceMappingURL=cli.6FMKWGWV.js.map

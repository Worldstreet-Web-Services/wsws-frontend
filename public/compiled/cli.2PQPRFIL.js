import {
  load
} from "./lib.TCM7D4VP.js";
import "./lib.RU54GHQA.js";
import {
  checkDebouncedResultAgainstTerm,
  complete,
  fetchUsers,
  renderUserEntry
} from "./lib.FNBK74W3.js";
import {
  require_dist
} from "./lib.3VFZRSDR.js";
import {
  alert,
  domDialog,
  enter
} from "./lib.LY6FZSW3.js";
import "./lib.KC3NJ77S.js";
import "./lib.NNS7OYZ5.js";
import "./lib.LYPETE66.js";
import "./lib.ILS4LNPZ.js";
import "./lib.GSUEVEQG.js";
import "./lib.JUCKJNFH.js";
import "./lib.PM233RJM.js";
import "./lib.23HTWUBN.js";
import "./lib.GOC3UD5K.js";
import "./lib.WVJXH4CQ.js";
import "./lib.2L7Z4FRN.js";
import "./lib.YID4KMSR.js";
import "./lib.2DWRH35C.js";
import "./lib.M3IF75DN.js";
import "./lib.AXX3QIAX.js";
import {
  defined,
  escapeHtml
} from "./lib.GK2I5IFJ.js";
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
//# sourceMappingURL=cli.2PQPRFIL.js.map

import {
  require_dist,
  require_dist2
} from "./lib.GIK6QQR5.js";
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
import "./lib.GOC3UD5K.js";
import "./lib.WVJXH4CQ.js";
import "./lib.2L7Z4FRN.js";
import "./lib.YID4KMSR.js";
import "./lib.2DWRH35C.js";
import {
  formToXhr,
  json,
  text,
  url
} from "./lib.M3IF75DN.js";
import {
  debounce,
  tempStorage
} from "./lib.AXX3QIAX.js";
import "./lib.GK2I5IFJ.js";
import {
  __toESM
} from "./lib.KO2KTNGK.js";

// ../bits/src/bits.forum.ts
var import_core = __toESM(require_dist(), 1);
var import_textarea = __toESM(require_dist2(), 1);

// ../bits/src/markdownTextarea.ts
function setMode(textarea, mode = "write") {
  var _a, _b;
  const wrapper = textarea.closest(".markdown-textarea");
  if (mode === "write") (_a = wrapper == null ? void 0 : wrapper.querySelector(".write-tab")) == null ? void 0 : _a.click();
  else (_b = wrapper == null ? void 0 : wrapper.querySelector(".preview-tab")) == null ? void 0 : _b.click();
}

// ../bits/src/bits.forum.ts
site.load.then(() => {
  $(".forum").on("click", "a.delete", function() {
    const link = this;
    domDialog({
      cash: $(".forum-delete-modal"),
      attrs: { view: { action: link.href } },
      easyClose: "clickOutside",
      modal: true
    }).then((dlg) => {
      $(dlg.view).find("form").attr("action", link.href).on("submit", function(e) {
        e.preventDefault();
        void formToXhr(this);
        $(link).closest(".forum-post").hide();
        dlg.close();
      });
      $(dlg.view).find("form button.cancel").on("click", dlg.close);
      dlg.show();
    });
    return false;
  }).on("click", "a.mod-relocate", function() {
    const link = this;
    domDialog({
      cash: $(".forum-relocate-modal"),
      attrs: { view: { action: link.href } },
      easyClose: "clickOutside",
      modal: true
    }).then((dlg) => {
      $(dlg.view).find("form").attr("action", link.href);
      $(dlg.view).find("form button.cancel").on("click", dlg.close);
      dlg.show();
    });
    return false;
  }).on("click", "form.unsub button", function() {
    const form = $(this).parent().toggleClass("on off")[0];
    void text(`${form.action}?unsub=${this.dataset.unsub}`, { method: "post" });
    return false;
  }).on("click", ".reactions-auth button", (e) => {
    const href = e.target.getAttribute("data-href");
    if (href) {
      const $rels = $(e.target).parent();
      if ($rels.hasClass("loading")) return;
      $rels.addClass("loading");
      void text(href, { method: "post" }).then(
        (html) => {
          $rels.replaceWith(html);
          $rels.removeClass("loading");
        },
        (_) => {
          site.announce({ msg: "Failed to send forum post reaction" });
        }
      );
    }
  });
  $(".forum-post__blocked button").on("click", (e) => {
    const el = e.target.parentElement;
    $(el).replaceWith($(".forum-post__message", el));
  });
  $(".forum-post__message").each(function() {
    if (this.innerHTML.match(/(^|<br>)&gt;/)) {
      const hiddenQuotes = "<span class=hidden-quotes>&gt;</span>";
      let result = "";
      let quote = [];
      for (const line of this.innerHTML.split("<br>")) {
        if (line.startsWith("&gt;")) quote.push(hiddenQuotes + line.substring(4).trim());
        else {
          if (quote.length > 0) {
            result += `<blockquote>${quote.join("<br>")}</blockquote>`;
            quote = [];
          }
          result += line + "<br>";
        }
      }
      if (quote.length > 0) result += `<blockquote>${quote.join("<br>")}</blockquote>`;
      this.innerHTML = result;
    }
  });
  $(".edit.button").add(".edit-post-cancel").on("click", function(e) {
    e.preventDefault();
    const post = this.closest(".forum-post");
    const form = post.querySelector("form.edit-post-form");
    if (!form.classList.contains("none")) {
      form.classList.add("none");
      form.reset();
      return;
    }
    const textarea = post.querySelector("textarea.edit-post-box");
    textarea.value = post.querySelector(".forum-post__message-source").textContent;
    form.classList.remove("none");
    setMode(textarea, "write");
  });
  $(".quote.button").on(
    "click",
    debounce(function() {
      var _a;
      const post = this.closest(".forum-post"), authorUsername = (_a = $(post).find(".author").attr("href")) == null ? void 0 : _a.substring(3), author = authorUsername ? "@" + authorUsername : $(post).find(".author").text(), reply = document.querySelector(".reply .post-text-area");
      const lines = quotedMarkdown(this.closest("article")).replace(/!\[([^\]]*)]\(([^)]+)\)/g, "$1 ($2)").split("\n");
      if (lines[0].match(/^(?:> )*@.+ said (?:in #\d+:$|\[\^\]\()/)) lines.shift();
      if (lines.length === 0) return;
      const quote = `${author} said [^](/forum/redirect/post/${post.dataset.postId})
` + lines.map((line) => `> ${line}
`).join("").trim() + "\n\n";
      setMode(reply, "write");
      reply.value = reply.value.slice(0, reply.selectionStart) + quote + reply.value.slice(reply.selectionEnd);
      const caretOffset = reply.selectionStart + quote.length;
      reply.setSelectionRange(caretOffset, caretOffset);
    }, 100)
  );
  $(".post-text-area").one("focus", function() {
    const textarea = this, topicId = $(this).attr("data-topic");
    if (!topicId) return;
    const searchCandidates = function(term, candidateUsers) {
      return candidateUsers.filter((user) => user.toLowerCase().startsWith(term.toLowerCase()));
    };
    const threadParticipants = json("/forum/participants/" + topicId);
    new import_core.Textcomplete(new import_textarea.TextareaEditor(textarea), [
      {
        index: 2,
        match: /(^|\s)@([a-zA-Z_-][\w-]{0,19})$/,
        search(term, searchCallback) {
          threadParticipants.then(function(participants) {
            const forumParticipantCandidates = searchCandidates(term, participants);
            if (forumParticipantCandidates.length !== 0) {
              searchCallback(forumParticipantCandidates);
            } else if (term.length >= 3) {
              json(url("/api/player/autocomplete", { term }), { cache: "default" }).then((candidateUsers) => searchCallback(searchCandidates(term, candidateUsers))).catch((error) => {
                console.error("Autocomplete request failed:", error);
                searchCallback([]);
              });
            } else {
              searchCallback([]);
            }
          });
        },
        replace: (mention) => "$1@" + mention + " "
      }
    ]);
  });
  const replyStorage = tempStorage.make("forum.reply" + location.pathname);
  const replyEl = $(".reply .post-text-area")[0];
  let submittingReply = false;
  window.addEventListener("pageshow", () => {
    const storedReply = replyStorage.get();
    if (replyEl && storedReply) replyEl.value = storedReply;
  });
  window.addEventListener("pagehide", () => {
    if (!submittingReply) {
      if (replyEl == null ? void 0 : replyEl.value) replyStorage.set(replyEl.value);
      else replyStorage.remove();
    }
  });
  $("form.reply").on("submit", () => {
    if (submittingReply) return;
    replyStorage.remove();
    submittingReply = true;
  });
  if (replyEl == null ? void 0 : replyEl.value) replyEl.scrollIntoView();
});
function quotedMarkdown(postEl) {
  var _a, _b, _c;
  const source = (_a = postEl == null ? void 0 : postEl.querySelector(".forum-post__message-source")) == null ? void 0 : _a.textContent;
  if (!source) return "";
  const trimmed = source.slice(0, 400) + (source.length > 400 ? "..." : "");
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return trimmed;
  const r = selection.getRangeAt(0);
  if (!(postEl == null ? void 0 : postEl.contains(r.startContainer)) || !postEl.contains(r.endContainer)) return trimmed;
  const startEl = r.startContainer.nodeType === 3 ? r.startContainer.parentElement : r.startContainer;
  const endEl = r.endContainer.nodeType === 3 ? r.endContainer.parentElement : r.endContainer;
  const startCap = Number((_b = startEl == null ? void 0 : startEl.closest("[data-ms]")) == null ? void 0 : _b.dataset.ms);
  const endCap = Number((_c = endEl == null ? void 0 : endEl.closest("[data-me]")) == null ? void 0 : _c.dataset.me);
  if (isNaN(startCap) || isNaN(endCap) || !source) return trimmed;
  const sourceLines = selection.toString().trim().split("\n");
  const lastLine = sourceLines[sourceLines.length - 1].trim();
  const startSource = source.indexOf(sourceLines[0].trim(), startCap);
  const endSource = source.lastIndexOf(lastLine, endCap) + lastLine.length;
  return prefixQuote(source, startCap) + source.slice(startSource, endSource);
}
function prefixQuote(text2, offset) {
  let prefix = "";
  while (offset-- > 1) {
    const char = text2.slice(offset, offset + 1);
    if (char === "\n") break;
    else if (char === ">") prefix += "> ";
    else if (char.trim().length) return "";
  }
  return prefix;
}
//# sourceMappingURL=bits.forum.DQCPSBWS.js.map

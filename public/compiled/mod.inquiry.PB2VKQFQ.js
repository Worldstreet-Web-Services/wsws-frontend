import {
  autolinkAtoms
} from "./lib.W3PNNWKU.js";
import {
  alert
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
import {
  pubsub
} from "./lib.QPQZCXK2.js";
import "./lib.5I4BSVKX.js";
import {
  formToXhr
} from "./lib.TT4QSUKQ.js";
import {
  storage
} from "./lib.NFSQQWN5.js";
import "./lib.GMEH5BEF.js";
import "./lib.KO2KTNGK.js";

// ../lib/src/highlight.ts
var highlightSearchTerm = (search, selector) => {
  const highlightName = "lichess-highlight";
  if (!CSS.highlights) return;
  CSS.highlights.delete(highlightName);
  if (!search) return;
  const ranges = [];
  try {
    const elements = document.querySelectorAll(selector);
    Array.from(elements).map((element) => {
      getTextNodesInElementContainingText(element, search).forEach((node) => {
        node.parentElement && ranges.push(...getRangesForSearchTermInElement(node.parentElement, search));
      });
    });
  } catch (error) {
    console.error(error);
  }
  if (ranges.length === 0) return;
  if (typeof Highlight !== "function") throw "no Highlight support";
  const highlight = new Highlight(...ranges);
  CSS.highlights.set(highlightName, highlight);
};
var getTextNodesInElementContainingText = (element, text) => {
  var _a;
  const lowerCaseText = text.toLowerCase();
  const nodes = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let node;
  while (node = walker.nextNode()) {
    if ((_a = node.textContent) == null ? void 0 : _a.toLowerCase().includes(lowerCaseText)) nodes.push(node);
  }
  return nodes;
};
var getRangesForSearchTermInElement = (element, search) => {
  var _a;
  const ranges = [];
  const lowerCaseSearch = search.toLowerCase();
  if (element.childNodes.length === 0) return ranges;
  const childWithSearchTerm = Array.from(element.childNodes).find(
    (node) => {
      var _a2;
      return (_a2 = node.textContent) == null ? void 0 : _a2.toLowerCase().includes(lowerCaseSearch);
    }
  );
  if (!childWithSearchTerm) return ranges;
  const text = ((_a = childWithSearchTerm.textContent) == null ? void 0 : _a.toLowerCase()) || "";
  let start = 0;
  let index;
  while ((index = text.indexOf(lowerCaseSearch, start)) >= 0) {
    const range = new Range();
    range.setStart(childWithSearchTerm, index);
    range.setEnd(childWithSearchTerm, index + search.length);
    ranges.push(range);
    start = index + search.length;
  }
  return ranges;
};

// ../mod/src/mod.inquiry.ts
site.load.then(() => {
  const noteStore = storage.make("inquiry-note");
  const usernameNoteStore = storage.make("inquiry-note-user");
  const username = $("#inquiry").data("username");
  if (username !== usernameNoteStore.get()) noteStore.remove();
  usernameNoteStore.set(username);
  const noteTextArea = $("#inquiry .notes").find("textarea")[0];
  const syncNoteValue = () => noteTextArea.value = noteStore.get() || "";
  let hasSeenNonEmptyNoteWarning = false;
  $("#inquiry .notes").on("mouseenter", () => {
    syncNoteValue();
    noteTextArea.focus();
  });
  function addToNote(str) {
    const storedNote = noteStore.get();
    noteStore.set((storedNote ? storedNote + "\n" : "") + str);
    flashNotes();
  }
  const loadNotes = () => {
    const $notes = $("#inquiry .notes");
    $notes.on("input", () => setTimeout(() => noteStore.set(noteTextArea.value), 50));
    $notes.find("form button[value=copy-url]").on("click", (event2) => {
      event2.preventDefault();
      addToNote(location.href);
      syncNoteValue();
    });
    $notes.find("form button[type=submit]").on("click", function() {
      $(this).parents("form").each(
        (_, form) => formToXhr(form, this).then((html) => $notes.replaceWith(html)).then(noteStore.remove).then(() => loadNotes()).catch(() => alert("Invalid note, is it too short or too long?"))
      );
      return false;
    });
  };
  loadNotes();
  const flashNotes = (warning = false) => {
    const flashClass = warning ? "note-flash warning" : "note-flash";
    const notes = $("#inquiry .notes > span").addClass(flashClass);
    setTimeout(() => notes.removeClass(flashClass), 100);
  };
  $("#inquiry .costello").on("click", () => {
    $("#inquiry").toggleClass("hidden");
    $("body").toggleClass("no-inquiry");
  });
  const nextStore = storage.boolean("inquiry-auto-next");
  if (!nextStore.get()) {
    $("#inquiry #auto-next").prop("checked", false);
    $("#inquiry input.auto-next").val("0");
  }
  $("#inquiry #auto-next").on("change", function() {
    nextStore.set(this.checked);
    $("#inquiry input.auto-next").val(this.checked ? "1" : "0");
  });
  $("#inquiry .actions.close").on("click", function() {
    if (noteStore.get() && !hasSeenNonEmptyNoteWarning) {
      event.preventDefault();
      const readTime = 1e3;
      setTimeout(() => hasSeenNonEmptyNoteWarning = true, readTime);
      flashNotes(true);
      syncNoteValue();
      const $noteDiv = $($("#inquiry .notes").find("div")[0]);
      $noteDiv.css("display", "block");
      setTimeout(() => $noteDiv.css("display", ""), readTime);
    }
  });
  site.mousetrap.bind(
    "d",
    () => $('#inquiry .actions.close form.process button[type="submit"]').trigger("click")
  );
  autolinkAtoms();
  $("#communication").on("click", ".line.author, .post.author", function() {
    const username2 = $("#communication").find(".title").text().split(" ")[0];
    const message = $(this).find(".message").text();
    addToNote(`${username2}: "${message}"`);
  }).on("click", ".mod-timeline__event .message", function() {
    addToNote(`${username}: "${$(this).text()}"`);
  });
  $(".user-show, .appeal").on("click", ".mz-section--others .add-to-note", function() {
    const userRow = $(this).parents("tr");
    addToNote(`Alt: ${[userRow.data("title") || "", `@${userRow.data("username")}`].join(" ").trim()}`);
  });
  const highlightUsername = () => highlightSearchTerm(username, "#main-wrap .user-link");
  setTimeout(highlightUsername, 300);
  pubsub.on("content-loaded", highlightUsername);
});
//# sourceMappingURL=mod.inquiry.PB2VKQFQ.js.map

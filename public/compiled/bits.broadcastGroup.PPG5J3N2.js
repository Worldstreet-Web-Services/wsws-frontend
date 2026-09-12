import {
  sortable_esm_default
} from "./lib.KX7CSXI3.js";
import {
  require_tagify_min
} from "./lib.433VM4AK.js";
import {
  json
} from "./lib.TT4QSUKQ.js";
import {
  throttle
} from "./lib.NFSQQWN5.js";
import {
  myUserId
} from "./lib.GMEH5BEF.js";
import {
  __toESM
} from "./lib.KO2KTNGK.js";

// ../bits/src/bits.broadcastGroup.ts
var import_tagify = __toESM(require_tagify_min(), 1);
function initModule(opts) {
  var _a;
  const textArea = document.querySelector("#form3-grouping_info_tours");
  if (!textArea) return;
  let myBroadcasts = null;
  const fromServer = textArea.value.trim().split(/\n/).map((t) => t.trim()).filter((t) => t.length > 0);
  const makeTourTagify = (el) => new import_tagify.default(el, {
    enforceWhitelist: true,
    keepInvalidTags: true,
    // Persist bad tags so that users can hover and see the reason why it was rejected
    duplicates: false,
    dropdown: {
      enabled: 0,
      mapValueTo: "name",
      searchKeys: ["name"]
    },
    tagTextProp: "name",
    maxTags: 50,
    originalInputValueFormat: (tags) => tags.map((t) => t.value).join("\n"),
    readonly: textArea.disabled
  });
  const group = makeTourTagify(textArea);
  group.removeAllTags();
  const preExisting = fromServer.map((t) => ({ value: t.slice(-8), name: t.slice(0, -9) }));
  group.whitelist = preExisting;
  group.addTags(preExisting);
  sortable_esm_default.create(group.DOM.scope, {
    filter: ".tagify__input",
    onEnd: () => {
      group.updateValueByDOMTags();
    }
  });
  const fetchMyBroadcasts = async () => {
    if (myBroadcasts === null) {
      group.loading(true);
      const resp = await json(`/api/broadcast/by/${myUserId()}`);
      const results = resp["currentPageResults"];
      myBroadcasts = results.map((t) => t.tour).filter((t) => opts.broadcaster || !t.tier);
      group.whitelist = group.whitelist.map((t) => typeof t === "string" ? { value: t, name: t } : t);
      group.whitelist = group.whitelist.concat(
        myBroadcasts.map((b) => ({ value: b.id, name: b.name })).filter(
          (fetched) => !group.whitelist.some(
            (existing) => typeof existing !== "string" && existing.value === fetched.value
          )
        )
      );
      group.loading(false);
      group.dropdown.show();
    }
  };
  const doFetchBroadcast = async (id) => {
    var _a2;
    return (_a2 = await json(`/api/broadcast/${id}`)) == null ? void 0 : _a2.tour;
  };
  const fetchBroadcastAndVerify = throttle(
    3e3,
    async (invalidData, broadcastId) => {
      group.loading(true);
      const replaceErrTag = (msg) => group.replaceTag(invalidData.tag, {
        ...invalidData.data,
        // @ts-ignore
        __isValid: msg
      });
      doFetchBroadcast(broadcastId).then(
        (tour) => {
          var _a2;
          if (!opts.studyAdmin || !opts.broadcaster && !tour.tier && ((_a2 = tour.communityOwner) == null ? void 0 : _a2.id) !== myUserId())
            replaceErrTag("Insufficient permissions to group this broadcast");
          else {
            const newTag = { value: tour.id, name: tour.name };
            group.whitelist = [
              ...group.whitelist.filter((t) => t.value !== tour.id),
              newTag
            ];
            group.replaceTag(invalidData.tag, newTag);
          }
        },
        () => {
          replaceErrTag("Failed to fetch broadcast details.");
        }
      ).finally(() => {
        group.loading(false);
      });
    }
  );
  group.on("focus", fetchMyBroadcasts);
  group.on("invalid", (e) => {
    const data = e.detail.data;
    const validIDRegex = /(?:^|(?:broadcast(?:\/.*)?\/))(\w{8})(?:\/edit)?$/;
    const match = data == null ? void 0 : data.name.match(validIDRegex);
    if ((data == null ? void 0 : data.name) && match) fetchBroadcastAndVerify(e.detail, match[1]);
  });
  const plusButton = document.createElement("button");
  plusButton.type = "button";
  plusButton.className = "button button-thin";
  plusButton.textContent = "Add another score group";
  const plusWrap = document.createElement("div");
  plusWrap.className = "relay-score-group-plus";
  plusWrap.appendChild(plusButton);
  const inputWithoutTagify = $('[id*="_scoreGroups_"]').last().parent().clone();
  plusButton.addEventListener("mousedown", () => {
    const lastEl = $('[id*="_scoreGroups_"]').last().parent();
    const newLast = inputWithoutTagify.clone();
    const textArea2 = newLast.find("textarea");
    const newIndex = $('[id*="_scoreGroups_"]').length;
    if (newIndex >= 10) return;
    textArea2.attr("id", `form3-grouping_scoreGroups_${newIndex}`);
    textArea2.attr("name", `grouping.scoreGroups[${newIndex}]`);
    textArea2.val("");
    const label = newLast.find("label");
    label.attr("for", `form3-grouping_scoreGroups_${newIndex}`);
    label.text(`Score Group ${newIndex + 1}`);
    makeSgTagify(textArea2[0]);
    newLast.insertAfter(lastEl);
  });
  (_a = $('[id*="_scoreGroups_"]').last().parent()[0]) == null ? void 0 : _a.insertAdjacentElement("afterend", plusWrap);
  const makeSgTagify = (el) => {
    const sgTagify = makeTourTagify(el);
    sgTagify.settings = {
      ...sgTagify.settings,
      enforceWhitelist: true,
      keepInvalidTags: false,
      whitelist: group.value,
      originalInputValueFormat: (tags) => tags.map((t) => t.value).join(",")
    };
    const preExisting2 = el.value.split(",").map((id) => group.whitelist.find((t) => typeof t !== "string" && t.value === id)).filter((t) => typeof t === "object");
    sgTagify.removeAllTags();
    sgTagify.addTags(preExisting2);
    group.on("add", () => {
      sgTagify.whitelist = group.value;
    });
    group.on("remove", (tag) => {
      var _a2;
      if ((_a2 = tag.detail.data) == null ? void 0 : _a2.value) sgTagify.removeTags(tag.detail.data.value);
    });
  };
  $('[id*="_scoreGroups_"]').each((_, el) => makeSgTagify(el));
}
export {
  initModule as default
};
//# sourceMappingURL=bits.broadcastGroup.PPG5J3N2.js.map

import {
  wireCropDialog
} from "./lib.HNCR7YVP.js";
import {
  alert,
  choose,
  prompt
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
  frag,
  scopedQuery
} from "./lib.GK2I5IFJ.js";
import "./lib.KO2KTNGK.js";

// ../bits/src/bits.streamerEdit.ts
function initModule() {
  var _a, _b;
  const el = scopedQuery(document.querySelector(".streamer-edit"));
  const platforms = ["twitch", "youtube"];
  const oauths = platforms.reduce((acc, platform) => {
    const div = el(`.${platform}-link-box`);
    const query = scopedQuery(div);
    acc[platform] = { div, linkBtn: query(".link"), unlinkBtn: query(".unlink"), url: query("a") };
    return acc;
  }, {});
  const userSubmitBtn = el(".approval-request-submit");
  const nameInput = el("#form3-name");
  const requestedToggleInput = el("#form3-approval_requested");
  const grantedToggleInput = el("#form3-approval_granted");
  const ignoredToggleInput = el("#form3-approval_ignored");
  const wasSubmitEnabled = setSubmitEnabled();
  if (requestedToggleInput && grantedToggleInput && ignoredToggleInput) {
    userSubmitBtn.classList.add("none");
    ignoredToggleInput.addEventListener("change", () => {
      if (ignoredToggleInput.checked) requestedToggleInput.checked = false;
    });
    grantedToggleInput.addEventListener("change", () => {
      requestedToggleInput.checked = false;
      if (grantedToggleInput.checked) ignoredToggleInput.checked = false;
    });
    (_b = (_a = el("div.mod")) == null ? void 0 : _a.querySelectorAll('button[type="submit"]')) == null ? void 0 : _b.forEach((modAction) => {
      if (modAction.value === "approve") return;
      modAction.addEventListener("click", async (e) => {
        if (!e.isTrusted || !(e.target instanceof HTMLButtonElement)) return;
        e.preventDefault();
        if (((requestedToggleInput == null ? void 0 : requestedToggleInput.checked) || (grantedToggleInput == null ? void 0 : grantedToggleInput.checked)) && (modAction.value === "decline" || !((requestedToggleInput == null ? void 0 : requestedToggleInput.checked) || (grantedToggleInput == null ? void 0 : grantedToggleInput.checked)))) {
          const reason = await prompt("Reason (optional):");
          if (reason === null) return;
          el('input[name="approval.reason"]').value = reason;
        }
        e.target.click();
      });
    });
  } else {
    document.querySelectorAll(".streamer-edit input").forEach((i) => i.addEventListener("input", setSubmitEnabled));
  }
  Object.entries(oauths).forEach(([platform, els]) => {
    if (els.linkBtn) els.linkBtn.onclick = () => clickLink(platform);
    if (els.unlinkBtn) els.unlinkBtn.onclick = () => clickUnlink(platform);
  });
  wireCropDialog({
    aspectRatio: 1,
    post: { url: "/upload/image/streamer", field: "picture" },
    max: { pixels: 1e3 },
    selectClicks: $(".select-image, .drop-target"),
    selectDrags: $(".drop-target"),
    onCropped: (blob) => {
      if (!blob) return;
      const img = el("img.picture");
      img.src = URL.createObjectURL(blob);
      img.onload = () => {
        if (wasSubmitEnabled) return userSubmitBtn.click();
        URL.revokeObjectURL(img.src);
        setSubmitEnabled();
      };
    }
  });
  $(".youtube-link-box button").prop("disabled", true).addClass("disabled").attr("title", "Not yet available, please try again soon!");
  window.addEventListener("message", async (ev) => {
    var _a2, _b2;
    if (ev.origin !== location.origin || !((_a2 = ev.data) == null ? void 0 : _a2.ok)) return;
    try {
      const box = oauths[ev.data.platform];
      const href = typeof ev.data.result === "string" ? ev.data.result : await chooseYoutubeChannel(ev.data.result);
      box.url = frag('<a target="_blank" rel="noopener">');
      box.div.append(box.url);
      box.url.href = href;
      box.url.textContent = ev.data.result.replace(/^https?:\/\//, "");
      box.div.classList.add("linked");
    } catch (e) {
      if (e instanceof Error) {
        await alert((_b2 = e.message) != null ? _b2 : JSON.stringify(e));
      } else if (typeof e === "string") {
        await alert(e);
      }
    }
    setSubmitEnabled();
  });
  function clickLink(platform) {
    const [width, height] = platform === "twitch" ? [520, 496] : [832, 720];
    window.open(
      oauths[platform].linkBtn.dataset.href + (site.debug ? "?force_verify=true" : ""),
      platform,
      `popup,width=${Math.min(window.innerWidth, width)},height=${Math.min(window.innerHeight, height)}`
    );
  }
  async function clickUnlink(platform) {
    var _a2;
    const box = oauths[platform];
    const rsp = await fetch(box.unlinkBtn.dataset.href, { method: "POST" });
    if (!rsp.ok) alert("Failed to unlink. Try reloading the page.");
    (_a2 = box.url) == null ? void 0 : _a2.remove();
    box.div.classList.remove("linked");
    box.url = null;
    setSubmitEnabled();
  }
  async function chooseYoutubeChannel(channels) {
    if (Object.values(channels).length === 0) {
      throw `Could not find a channel. Did you pick your YouTube brand account on the "Sign in with Google" screen?`;
    }
    const ch = await choose(i18n.streamer.chooseYoutubeChannel, Object.values(channels), void 0, true);
    const chid = Object.entries(channels).find(([, name]) => name === ch)[0];
    const rsp = await fetch(`/streamer/oauth/youtube/choose/${chid}`, { method: "POST" });
    if (!rsp.ok) throw new Error(`Server error: ${rsp.statusText}`);
    return await rsp.text();
  }
  function setSubmitEnabled() {
    const enabled = Object.values(oauths).some((box) => box.url) && nameInput.value && nameInput.value.length >= 3 && !el('img[src$="images/placeholder.png"]');
    userSubmitBtn.disabled = !enabled;
    userSubmitBtn.classList.toggle("disabled", !enabled);
    if (enabled) userSubmitBtn.title = "";
    return Boolean(enabled);
  }
}
export {
  initModule
};
//# sourceMappingURL=bits.streamerEdit.4GIXDE2I.js.map

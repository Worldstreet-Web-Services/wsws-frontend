import "./lib.KO2KTNGK.js";

// ../bits/src/youtubeLinkProcessor.ts
var supportedVideoTypes = ["watch", "embed", "shorts", "live", "playlist"];
var videoIdValidLength = 11;
var videoIdRegex = /^[a-zA-Z0-9_-]{11}$/;
function parseYoutubeUrl(url) {
  const youtubeUrl = toURL(url);
  if (!youtubeUrl) {
    return void 0;
  }
  switch (getDomainType(youtubeUrl.hostname)) {
    case "youtu.be":
      return handleYoutuBe(youtubeUrl);
    case "youtube.com":
      return handleYoutubeCom(youtubeUrl);
    default:
      return void 0;
  }
}
function embedYoutubeUrl(match) {
  const params = new URLSearchParams({
    modestbranding: "1",
    rel: "0",
    controls: "2",
    iv_load_policy: "3"
  });
  if (match.videoType === "playlist") {
    params.append("list", match.videoId);
    return `https://www.youtube-nocookie.com/embed/videoseries?${params.toString()}`;
  }
  if (match.startTime > 0) {
    params.append("start", match.startTime.toString());
  }
  return `https://www.youtube-nocookie.com/embed/${match.videoId}?${params.toString()}`;
}
function getDomainType(hostname) {
  if (["www.youtube.com", "m.youtube.com", "youtube.com"].includes(hostname)) {
    return "youtube.com";
  }
  if ("youtu.be" === hostname) {
    return "youtu.be";
  }
  return void 0;
}
function handleYoutubeCom(url) {
  var _a;
  const { pathname, searchParams } = url;
  const parsedResult = parseVideoPath(pathname);
  const { videoType } = parsedResult;
  let { videoId } = parsedResult;
  if (!videoType) {
    return void 0;
  }
  let startTimeParamName = "t";
  switch (videoType) {
    case "watch":
      videoId = searchParams.get("v");
      break;
    case "shorts":
    case "live":
      break;
    case "embed":
      startTimeParamName = "start";
      break;
    case "playlist":
      const playlistId = searchParams.get("list");
      if (!playlistId || !isPlaylistIdValid(playlistId)) {
        return void 0;
      }
      return {
        videoType,
        videoId: playlistId,
        startTime: 0
      };
  }
  if (!isVideoIdValid(videoId) || !videoId) {
    return void 0;
  }
  const startTime = extractStartTime((_a = searchParams.get(startTimeParamName)) != null ? _a : "");
  return {
    videoType,
    videoId,
    startTime
  };
}
function handleYoutuBe(url) {
  var _a;
  const { pathname, searchParams } = url;
  const [videoId] = getPathSegments(pathname);
  if (!isVideoIdValid(videoId) || !videoId) {
    return void 0;
  }
  const startTimeParamName = "t";
  const startTime = extractStartTime((_a = searchParams.get(startTimeParamName)) != null ? _a : "");
  return {
    videoType: "watch",
    // youtube fall-backs to 'watch' even for live youtu.be
    videoId,
    startTime
  };
}
function getPathSegments(path) {
  return path.replace(/\/+$/, "").split("/").filter(Boolean);
}
function parseVideoPath(path) {
  const [type, id] = getPathSegments(path);
  return {
    videoType: supportedVideoTypes.includes(type) ? type : void 0,
    videoId: isVideoIdValid(id) ? id : void 0
  };
}
var isVideoIdValid = (id) => !!id && id.length === videoIdValidLength && videoIdRegex.test(id);
var isPlaylistIdValid = (id) => !!id && id.length >= 18 && id.length <= 34;
function extractStartTime(value) {
  let start = 0;
  if (!value) {
    return 0;
  }
  if (/^\d+$/.test(value)) {
    start = parseInt(value, 10);
  } else {
    const timeMatch = value.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1] || "0", 10);
      const minutes = parseInt(timeMatch[2] || "0", 10);
      const seconds = parseInt(timeMatch[3] || "0", 10);
      start = hours * 3600 + minutes * 60 + seconds;
    }
  }
  return start;
}
function toURL(url) {
  try {
    return new URL(url);
  } catch (e) {
    return void 0;
  }
}

// ../bits/src/bits.expandText.ts
function toYoutubeEmbedUrl(url) {
  const result = parseYoutubeUrl(url);
  if (!result) return void 0;
  return embedYoutubeUrl(result);
}
async function initModule(el) {
  function parseLink(a) {
    var _a;
    if (a.href.replace(/^https?:\/\//, "") !== ((_a = a.textContent) == null ? void 0 : _a.replace(/^https?:\/\//, ""))) return void 0;
    const yt = toYoutubeEmbedUrl(a.href);
    if (!yt) return void 0;
    return {
      type: "youtube",
      src: yt
    };
  }
  function expandYoutube(a) {
    const $iframe = $('<div class="embed"><iframe src="' + a.src + '" credentialless></iframe></div>');
    $(a.element).replaceWith($iframe);
    return $iframe;
  }
  function expandYoutubes(as2, wait = 100) {
    wait = Math.min(1500, wait);
    const a = as2.shift();
    if (a)
      expandYoutube(a).find("iframe").on("load", () => setTimeout(() => expandYoutubes(as2, wait + 200), wait));
  }
  const [scope, selector] = [el != null ? el : document, el ? "a" : ".expand-text a"];
  const as = Array.from(scope.querySelectorAll(selector)).map((el2) => {
    const parsed = parseLink(el2);
    if (!parsed) return false;
    return {
      element: el2,
      parent: el2.parentNode,
      type: parsed.type,
      src: parsed.src
    };
  }).filter(Boolean);
  expandYoutubes(as.filter((a) => a.type === "youtube"));
  if (!el && $(".lpv--autostart").length) await site.asset.loadEsm("bits.lpv");
}
site.load.then(() => initModule());
export {
  initModule
};
//# sourceMappingURL=bits.expandText.HRJQDDOU.js.map

import {
  userLine
} from "./lib.BMKV23O2.js";
import {
  button,
  div,
  label,
  snabDialog,
  span,
  spinnerHtml,
  spinnerVdom
} from "./lib.MYPIOGN5.js";
import {
  bind,
  dataIcon,
  hl,
  isSafari,
  onInsert,
  prefersLightThemeQuery
} from "./lib.S3TIZ2HQ.js";
import {
  attributesModule,
  classModule,
  h,
  init
} from "./lib.LWF5S4ZV.js";
import {
  pubsub
} from "./lib.QPQZCXK2.js";
import {
  licon
} from "./lib.5I4BSVKX.js";
import {
  form,
  json,
  text,
  textRaw
} from "./lib.TT4QSUKQ.js";
import {
  debounce,
  throttle,
  throttlePromiseDelay
} from "./lib.NFSQQWN5.js";
import {
  defined,
  hyphenToCamel,
  memoize,
  prop,
  toggle
} from "./lib.GMEH5BEF.js";

// ../dasher/src/interfaces.ts
var PaneCtrl = class {
  constructor(root) {
    this.root = root;
    this.getVar = (prop2) => parseInt(window.getComputedStyle(document.body).getPropertyValue(`---${prop2}`));
    this.postPref = debounce((prop2) => {
      const failed = () => site.announce({ msg: `Failed to save ${prop2}` });
      if (prop2 === "zoom")
        return text(`/pref/zoom?v=${this.getVar("zoom")}`, { method: "post" }).catch(failed);
      const body = new FormData();
      body.set(hyphenToCamel(prop2), this.getVar(prop2).toString());
      const path = `/pref/${hyphenToCamel(prop2)}`;
      return text(path, { body, method: "post" }).catch(failed);
    }, 1e3);
  }
  get redraw() {
    return this.root.redraw;
  }
  get close() {
    return this.root.close;
  }
  get dimension() {
    return this.root.data.board.is3d ? "d3" : "d2";
  }
  get is3d() {
    return this.root.data.board.is3d;
  }
};

// ../dasher/src/util.ts
var header = (name, close) => hl(
  "button.head.text",
  { attrs: { "data-icon": licon.LessThan, type: "button" }, hook: bind("click", close) },
  name
);
var moreButton = (toggle2) => hl(
  "button.button.more",
  {
    attrs: { title: toggle2() ? i18n.site.less : i18n.site.more },
    hook: bind("click", toggle2.toggle)
  },
  toggle2() ? "-" : "+"
);
var elementScrollBarWidthSlowGuess = memoize(() => {
  const ruler = document.createElement("div");
  ruler.style.position = "absolute";
  ruler.style.overflow = "scroll";
  ruler.style.visibility = "hidden";
  document.body.appendChild(ruler);
  const barWidth = ruler.offsetWidth - ruler.clientWidth;
  document.body.removeChild(ruler);
  return barWidth;
});

// ../dasher/src/board.ts
var BoardCtrl = class extends PaneCtrl {
  constructor(root) {
    super(root);
    this.sliderKey = Date.now();
    // changing the value attribute doesn't always flush to DOM.
    this.featured = { d2: [], d3: [] };
    this.render = () => hl(`div.sub.board.${this.dimension}`, [
      header(i18n.site.board, this.close),
      hl("div.selector.large", [
        hl(
          "button.text",
          {
            class: { active: !this.is3d },
            attrs: { "data-icon": licon.Checkmark, type: "button" },
            hook: bind("click", () => this.set3d(false))
          },
          "2D"
        ),
        hl(
          "button.text",
          {
            class: { active: this.is3d },
            attrs: { "data-icon": licon.Checkmark, type: "button" },
            hook: bind("click", () => this.set3d(true))
          },
          "3D"
        )
      ]),
      this.propSliders(),
      this.showReset() && hl(
        "button.text.reset",
        {
          attrs: { "data-icon": licon.Back, type: "button" },
          hook: bind("click", this.reset)
        },
        i18n.site.boardReset
      ),
      hl(
        "div.list",
        this.boardList.map(
          (t) => hl(
            "button",
            {
              key: t,
              hook: bind("click", () => this.setBoard(t)),
              attrs: { title: t, type: "button" },
              class: { active: this.current === t }
            },
            hl("span." + t)
          )
        )
      ),
      moreButton(this.more)
    ]);
    this.setBoard = (t) => {
      this.apply(t);
      const field = `theme${this.is3d ? "3d" : ""}`;
      text(`/pref/${field}`, { body: form({ [field]: t }), method: "post" }).catch(
        () => site.announce({ msg: "Failed to save theme preference" })
      );
      this.redraw();
    };
    this.reset = () => {
      this.defaults.filter(([prop2, v]) => this.getVar(prop2) !== v).forEach(([prop2, v], i) => {
        this.setVar(prop2, v);
        setTimeout(() => this.postPref(prop2), i * 1100);
      });
      this.showReset(false);
      this.sliderKey = Date.now();
      document.body.classList.add("simple-board");
      this.redraw();
    };
    this.setVar = (prop2, v) => {
      this.showReset(this.showReset() || !this.isDefault());
      document.body.style.setProperty(`---${prop2}`, v.toString());
      document.body.classList.toggle("simple-board", this.isDefault());
      if (prop2 === "zoom") window.dispatchEvent(new Event("resize"));
    };
    this.set3d = async (v) => {
      if (this.is3d === v) return;
      this.data.is3d = v;
      text("/pref/is3d", { body: form({ is3d: v }), method: "post" }).catch(
        () => site.announce({ msg: "Failed to save preference" })
      );
      if (v) await site.asset.loadCssPath("lib.board-3d");
      else site.asset.removeCssPath("lib.board-3d");
      $("#main-wrap").removeClass(v ? "is2d" : "is3d").addClass(v ? "is3d" : "is2d");
      this.apply();
      this.redraw();
    };
    this.apply = (t = this.current) => {
      var _a;
      this.current = t;
      document.body.dataset[this.is3d ? "board3d" : "board"] = t;
      pubsub.emit("board.change", this.is3d);
      (_a = this.root) == null ? void 0 : _a.piece.apply();
    };
    this.defaults = [
      ["board-opacity", 100],
      ["board-brightness", 100],
      ["board-contrast", 100],
      ["board-hue", 0]
    ];
    this.isDefault = () => this.defaults.every(([prop2, v]) => this.getVar(prop2) === v);
    this.showReset = toggle(!this.isDefault());
    this.propSliders = () => {
      const sliders = [];
      if (!Number.isNaN(this.getVar("zoom")))
        sliders.push(this.propSlider("zoom", i18n.site.size, { min: 0, max: 100, step: 1 }));
      if (document.body.dataset.theme === "transp")
        sliders.push(this.propSlider("board-opacity", i18n.site.opacity, { min: 0, max: 100, step: 1 }));
      sliders.push(
        this.propSlider("board-brightness", i18n.site.brightness, { min: 20, max: 140, step: 1 }),
        this.propSlider("board-contrast", i18n.site.contrast, { min: 40, max: 200, step: 2 }),
        this.propSlider(
          "board-hue",
          i18n.site.hue,
          { min: 0, max: 100, step: 1 },
          (v) => `+ ${Math.round(v * 3.6)}\xB0`
        )
      );
      return sliders;
    };
    this.propSlider = (prop2, label2, range, title) => hl(
      `div.${prop2}`,
      { attrs: { title: title ? title(this.getVar(prop2)) : `${Math.round(this.getVar(prop2))}%` } },
      [
        hl("label", label2),
        hl("input.range", {
          key: this.sliderKey + prop2,
          attrs: { ...range, type: "range", value: this.getVar(prop2) },
          hook: onInsert((input) => {
            const setAndSave = (v) => {
              if (v < range.min || v > range.max) return;
              this.setVar(prop2, v);
              this.redraw();
              this.postPref(prop2);
            };
            $(input).on("input", () => setAndSave(parseInt(input.value))).on("wheel", (e) => {
              e.preventDefault();
              setAndSave(this.getVar(prop2) + (e.deltaY > 0 ? -range.step : range.step));
            });
          })
        })
      ]
    );
    this.more = toggle(false, root.redraw);
    for (const dim of ["d2", "d3"]) {
      this.featured[dim] = this.data[dim].list.filter((t) => t.featured).map((t) => t.name);
    }
  }
  get boardList() {
    const all = this.data[this.dimension].list.map((t) => t.name);
    const visible = this.featured[this.dimension].slice();
    if (!visible.includes(this.current)) visible.push(this.current);
    return this.more() ? all : visible;
  }
  get data() {
    return this.root.data.board;
  }
  get current() {
    return this.data[this.dimension].current;
  }
  set current(t) {
    this.data[this.dimension].current = t;
  }
};

// ../dasher/src/langs.ts
var LangsCtrl = class extends PaneCtrl {
  constructor() {
    super(...arguments);
    this.render = () => h("div.sub.langs", [
      header(i18n.site.language, this.close),
      h(
        "form",
        { attrs: { method: "post", action: "/translation/select" } },
        this.list().map(
          ([code, name]) => h(
            "button" + (this.data.current === code ? ".current" : "") + (this.data.accepted.includes(code) ? ".accepted" : ""),
            {
              attrs: { type: "submit", name: "lang", value: code, title: code },
              hook: this.data.current === code ? onInsert((el) => el.scrollIntoView({ block: "center" })) : {}
            },
            name
          )
        )
      ),
      h(
        "a.help.text",
        { attrs: { href: "https://crowdin.com/project/lichess", "data-icon": licon.Heart } },
        "Help translate Lichess"
      )
    ]);
    this.list = () => [
      ...this.data.list.filter((lang) => this.data.accepted.includes(lang[0])),
      ...this.data.list
    ];
  }
  get data() {
    return this.root.data.lang;
  }
};

// ../dasher/src/links.ts
var LinksCtrl = class extends PaneCtrl {
  constructor() {
    super(...arguments);
    this.render = () => {
      const modeCfg = this.modeCfg;
      return hl("div", [
        this.userLinks(),
        hl("div.subs", [
          hl("button.sub", modeCfg("langs"), i18n.site.language),
          hl("button.sub", modeCfg("sound"), i18n.site.sound),
          hl("button.sub", modeCfg("theme"), i18n.site.theme),
          hl("button.sub", modeCfg("board"), i18n.site.board),
          hl("button.sub", modeCfg("piece"), i18n.site.pieceSet),
          this.root.opts.zenable && hl("div.zen.selector", [
            hl(
              "button.text",
              {
                attrs: { "data-icon": licon.DiscBigOutline, title: "Keyboard: z", type: "button" },
                hook: bind("click", () => pubsub.emit("zen"))
              },
              i18n.preferences.zenMode
            )
          ])
        ]),
        this.root.ping.render()
      ]);
    };
    this.modeCfg = (m) => ({
      hook: bind("click", () => this.root.setMode(m)),
      attrs: { "data-icon": licon.GreaterThan, type: "button" }
    });
    this.linkCfg = (href, icon, more) => ({
      attrs: { href, "data-icon": icon, ...more }
    });
  }
  get data() {
    return this.root.data;
  }
  userLinks() {
    const d = this.data, linkCfg = this.linkCfg;
    return d.user ? hl("div.links", [
      hl("a.user-link.online", { attrs: { href: `/@/${d.user.name}` } }, [
        userLine(d.user),
        i18n.site.profile
      ]),
      hl("a.text", linkCfg("/inbox", licon.Envelope), i18n.site.inbox),
      hl(
        "a.text",
        linkCfg(
          "/account/profile",
          licon.Gear,
          this.root.opts.playing ? { target: "_blank" } : void 0
        ),
        i18n.preferences.preferences
      ),
      d.coach && hl("a.text", linkCfg("/coach/edit", licon.GraduateCap), i18n.site.coachManager),
      d.streamer && hl("a.text", linkCfg("/streamer/edit", licon.Mic), i18n.site.streamerManager),
      hl("form.logout", { attrs: { method: "post", action: "/logout" } }, [
        hl("button.text", { attrs: { type: "submit", "data-icon": licon.Power } }, i18n.site.logOut)
      ])
    ]) : null;
  }
};

// ../dasher/src/piece.ts
var PieceCtrl = class extends PaneCtrl {
  constructor(root) {
    super(root);
    this.featured = { d2: [], d3: [] };
    this.apply = (t = this.dimData.current) => {
      this.dimData.current = t;
      document.body.dataset[this.is3d ? "pieceSet3d" : "pieceSet"] = t;
      if (!this.is3d) {
        pieceVarRules(t);
      }
    };
    this.set = (t) => {
      this.apply(t);
      const field = `pieceSet${this.is3d ? "3d" : ""}`;
      text(`/pref/${field}`, { body: form({ [field]: t }), method: "post" }).catch(
        () => site.announce({ msg: "Failed to save piece set  preference" })
      );
      this.redraw();
    };
    this.more = toggle(false, root.redraw);
    for (const dim of ["d2", "d3"]) {
      this.featured[dim] = this.root.data.piece[dim].list.filter((t) => t.featured).map((t) => t.name);
    }
  }
  get pieceList() {
    const all = this.dimData.list.map((t) => t.name);
    const visible = this.featured[this.dimension].slice();
    if (!visible.includes(this.dimData.current)) visible.push(this.dimData.current);
    return this.more() ? all : visible;
  }
  render() {
    const maxHeight = window.innerHeight - 150;
    const pieceSize = (222 - elementScrollBarWidthSlowGuess()) / (this.more() ? 4 : 3);
    const pieceImage = (t) => this.is3d ? `images/staunton/piece/${t}/White-Knight${t === "Staunton" ? "-Preview" : ""}.webp` : site.manifest.hashed[`piece/${t}/wN.webp`] ? `piece/${t}/wN.webp` : `piece/${t}/wN.svg`;
    return h("div.sub.piece." + this.dimension, [
      header(i18n.site.pieceSet, () => this.close()),
      h(
        "div.list",
        { attrs: { style: `max-height:${maxHeight}px;` } },
        this.pieceList.map(
          (t) => h(
            "button.no-square",
            {
              key: t,
              attrs: { title: t, type: "button", style: `width: ${pieceSize}px; height: ${pieceSize}px` },
              hook: bind("click", () => this.set(t)),
              class: { active: this.dimData.current === t }
            },
            [h("piece", { attrs: { style: `background-image:url(${site.asset.url(pieceImage(t))})` } })]
          )
        )
      ),
      moreButton(this.more)
    ]);
  }
  get dimData() {
    return this.root.data.piece[this.dimension];
  }
};
var pieceVars = [
  ["---white-pawn", "wP"],
  ["---black-pawn", "bP"],
  ["---white-knight", "wN"],
  ["---black-knight", "bN"],
  ["---white-bishop", "wB"],
  ["---black-bishop", "bB"],
  ["---white-rook", "wR"],
  ["---black-rook", "bR"],
  ["---white-queen", "wQ"],
  ["---black-queen", "bQ"],
  ["---white-king", "wK"],
  ["---black-king", "bK"]
];
function pieceVarRules(theme) {
  const ext = site.manifest.hashed[`piece/${theme}/wP.webp`] ? "webp" : "svg";
  for (const [varName, fileName] of pieceVars) {
    const url = site.asset.url(`piece/${theme}/${fileName}.${ext}`, { pathOnly: true });
    document.body.style.setProperty(varName, `url(${url})`);
  }
}

// ../dasher/src/ping.ts
var PingCtrl = class {
  constructor(root) {
    this.root = root;
    this.onLag = (lag) => {
      this.ping = Math.round(lag);
      this.root.redraw();
    };
    this.onMlat = (lat) => {
      this.server = lat;
      this.root.redraw();
    };
    this.connect = () => {
      pubsub.emit("socket.send", "moveLat", true);
      pubsub.on("socket.lag", this.onLag);
      pubsub.on("socket.in.mlat", this.onMlat);
    };
    this.disconnect = () => {
      pubsub.off("socket.lag", this.onLag);
      pubsub.off("socket.in.mlat", this.onMlat);
    };
    this.render = () => h("a.status", { attrs: { href: "/lag" }, hook: { insert: this.connect, destroy: this.disconnect } }, [
      this.signalBars(),
      h(
        "span.ping",
        { attrs: { title: "PING: " + i18n.site.networkLagBetweenYouAndLichess } },
        this.showMillis("PING", this.ping)
      ),
      h(
        "span.server",
        { attrs: { title: "SERVER: " + i18n.site.timeToProcessAMoveOnLichessServer } },
        this.showMillis("SERVER", this.server)
      )
    ]);
    this.showMillis = (name, m) => [
      h("em", name),
      h("strong", defined(m) ? m : "?"),
      h("em", "ms")
    ];
  }
  signalBars() {
    const lagRating = !this.ping ? 0 : this.ping < 150 ? 4 : this.ping < 300 ? 3 : this.ping < 500 ? 2 : 1;
    const bars = [];
    for (let i = 1; i <= 4; i++) bars.push(h(i <= lagRating ? "i" : "i.off"));
    return h("signal.q" + lagRating, bars);
  }
};

// ../dasher/src/sound.ts
var SoundCtrl = class extends PaneCtrl {
  constructor(root) {
    super(root);
    this.showVoiceSelection = false;
    this.render = () => {
      return h(
        "div.sub.sound." + this.getCurrent(),
        {
          hook: {
            insert: () => {
              if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = this.redraw;
            }
          }
        },
        [
          header(i18n.site.sound, this.close),
          h("div.content.force-ltr", [
            h("input", {
              attrs: {
                type: "range",
                min: 0,
                max: 1,
                step: 0.01,
                value: site.sound.getVolume(),
                orient: "vertical",
                style: isSafari({ below: "18" }) ? "appearance: slider-vertical" : ""
              },
              hook: onInsert((input) => {
                const setVolume = throttle(150, this.volume);
                $(input).on("input", () => setVolume(parseFloat(input.value)));
              })
            }),
            h(
              "div.selector",
              this.makeList().map(
                (s) => h(
                  "button.text",
                  {
                    hook: bind("click", () => this.set(s[0])),
                    class: { active: this.getCurrent() === s[0] },
                    attrs: { ...dataIcon(licon.Checkmark), type: "button" }
                  },
                  [s[1], s[0] === "speech" ? "..." : ""]
                )
              )
            )
          ]),
          this.voiceSelectionDialog()
        ]
      );
    };
    this.voiceSelectionDialog = () => {
      if (!this.showVoiceSelection) return void 0;
      const content = this.renderVoiceSelection();
      if (!content) return void 0;
      return snabDialog({
        onClose: () => {
          if (!i18n.nvui) return site.reload();
          this.showVoiceSelection = false;
          this.redraw();
        },
        modal: true,
        easyClose: "clickOutside",
        vnodes: [content],
        onInsert: (dlg) => {
          var _a;
          dlg.show();
          (_a = dlg.view.querySelector(".active")) == null ? void 0 : _a.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
    };
    this.getCurrent = () => site.sound.speech() ? "speech" : site.sound.theme;
    this.postSet = throttlePromiseDelay(
      () => 1e3,
      (soundSet) => text("/pref/soundSet", { body: form({ soundSet }), method: "post" }).catch(
        () => site.announce({ msg: "Failed to save sound preference" })
      )
    );
    this.makeList = () => {
      var _a;
      const canSpeech = (_a = window.speechSynthesis) == null ? void 0 : _a.getVoices().length;
      return this.list.filter((s) => s[0] !== "speech" || canSpeech);
    };
    this.set = (k) => {
      site.sound.speech(k === "speech");
      if (site.sound.speech()) {
        this.showVoiceSelection = true;
        site.sound.say("Speech synthesis ready");
        site.sound.changeSet("speech");
        this.postSet("speech");
      } else {
        site.sound.changeSet(k);
        site.sound.play("genericNotify");
        this.postSet(k);
      }
      this.redraw();
    };
    this.volume = (v) => {
      site.sound.setVolume(v);
      site.sound.sayOrPlay("move", "knight F 7", true);
    };
    this.list = this.root.data.sound.list.map((s) => s.split(" "));
  }
  renderVoiceSelection() {
    const selectedVoice = site.sound.getVoice();
    const voiceMap = site.sound.getVoiceMap();
    return voiceMap.size < 2 ? false : h(
      "div.selector",
      [...voiceMap.keys()].sort((a, b) => a.localeCompare(b)).map(
        (name) => h(
          "button.text",
          {
            hook: bind("click", (event) => {
              const target = event.target;
              site.sound.setVoice(voiceMap.get(target.textContent));
              site.sound.say("Speech synthesis ready");
              this.redraw();
            }),
            class: { active: name === (selectedVoice == null ? void 0 : selectedVoice.name) },
            attrs: {
              ...name === (selectedVoice == null ? void 0 : selectedVoice.name) ? dataIcon(licon.Checkmark) : {},
              type: "button"
            }
          },
          name
        )
      )
    );
  }
};

// ../dasher/src/theme.ts
var ThemeCtrl = class extends PaneCtrl {
  constructor(root) {
    super(root);
    this.sliderKey = Date.now();
    this.set = throttlePromiseDelay(
      () => 700,
      (c) => {
        this.backgroundData.current = c;
        this.apply();
        this.redraw();
        return text("/pref/bg", { body: form({ bg: c }), method: "post" }).then(
          this.reloadAllTheThings,
          this.announceFail
        );
      }
    );
    this.announceFail = (err) => site.announce({ msg: `Failed to save background preference: ${err}` });
    this.reloadAllTheThings = () => {
      if ($("canvas").length) site.reload();
    };
    this.get = () => this.backgroundData.current;
    this.getImage = () => this.backgroundData.image;
    this.setImage = (i) => {
      this.backgroundData.image = i.startsWith("/assets/") ? i.slice(8) : i;
      textRaw("/pref/bgImg", { body: form({ bgImg: i }), method: "post" }).then((res) => res.ok ? res.text() : Promise.reject(res.text())).then(this.reloadAllTheThings, (err) => err.then(this.announceFail));
      this.apply();
      this.redraw();
    };
    this.apply = () => {
      const key = this.backgroundData.current;
      document.body.dataset.theme = key === "darkBoard" ? "dark" : key;
      document.documentElement.className = key === "system" ? prefersLightThemeQuery().matches ? "light" : "dark" : key;
      if (key === "transp") {
        const bgData = document.getElementById("bg-data");
        const styleValue = `html.transp::before{background-image:url(${this.backgroundData.image});opacity:calc(var(---bg-opacity)/100);}`;
        if (bgData) {
          bgData.innerHTML = styleValue;
        } else {
          $("head").append(`<style id="bg-data">${styleValue}</style>`);
        }
      }
      pubsub.emit("theme", key);
    };
    this.imageInput = () => h("div.image", [
      h("label", { attrs: { for: "dasher-theme-backgroundUrl" } }, i18n.site.backgroundImageUrl),
      h("input#dasher-theme-backgroundUrl", {
        attrs: { type: "text", placeholder: "https://", value: this.getImage() },
        hook: onInsert((el) => {
          $(el).on(
            "change keyup paste",
            debounce((_) => {
              const url = el.value.trim();
              if ((url.startsWith("https://") || url.startsWith("//")) && url.length >= 10 && url.length <= 400)
                this.setImage(url);
            }, 300)
          );
        })
      })
    ]);
    this.galleryInput = () => {
      const urlId = (url) => url.replace(/[^\w]/g, "_");
      const setImg = (url) => {
        $("#dasher-theme-images-grid .selected").removeClass("selected");
        $(`#${urlId(url)}`).addClass("selected");
        this.setImage(url);
      };
      const gallery = this.backgroundData.gallery;
      const cols = window.matchMedia("(min-width: 650px)").matches ? 4 : 2;
      const montageUrl = site.asset.url(gallery[`montage${cols}`]);
      const width = cols * (160 + 2) + (gallery.images.length > cols * 4 ? elementScrollBarWidthSlowGuess() : 0);
      return h("div#dasher-theme-gallery", { attrs: { style: `width: ${width}px` } }, [
        h("div#dasher-theme-images-viewport", [
          h(
            "div#dasher-theme-images-grid",
            { attrs: { style: `background-image: url(${montageUrl});` } },
            gallery.images.map((img) => {
              const assetUrl = site.asset.url(img);
              const divClass = this.backgroundData.image.endsWith(assetUrl) ? ".selected" : "";
              return h(`div#${urlId(assetUrl)}${divClass}`, { hook: bind("click", () => setImg(assetUrl)) });
            })
          )
        ]),
        this.imageInput()
      ]);
    };
    this.setVar = (prop2, v, unit = "px") => {
      document.documentElement.style.setProperty(`---${prop2}`, `${v.toString()}${unit}`);
    };
    this.propSlider = (prop2, inputLabel, range, formatter, unit = "px") => {
      const value = this.getVar(prop2);
      const printValue = formatter ? formatter(value) : `${value}${unit}`;
      return div(`.${prop2}`, { title: printValue }, [
        div(".slider-label", [label(inputLabel), span(printValue)]),
        h("input.range", {
          key: this.sliderKey + prop2,
          attrs: { ...range, type: "range", value },
          hook: onInsert((input) => {
            const setAndSave = (v) => {
              if (v < range.min || v > range.max) return;
              this.setVar(prop2, v, unit);
              this.redraw();
              this.postPref(prop2);
            };
            $(input).on("input", () => setAndSave(parseInt(input.value))).on("wheel", (e) => {
              e.preventDefault();
              setAndSave(this.getVar(prop2) + (e.deltaY > 0 ? -range.step : range.step));
            });
          })
        })
      ]);
    };
    this.list = [
      { key: "system", name: i18n.site.deviceTheme },
      { key: "light", name: i18n.site.light },
      { key: "dark", name: i18n.site.dark },
      { key: "transp", name: i18n.site.picture }
    ];
  }
  render() {
    const cur = this.get();
    return div(".sub.theme", [
      header(i18n.site.theme, this.close),
      div(".selector.large", [
        this.list.map((bg) => {
          return button(
            ".text",
            {
              class: { active: cur === bg.key },
              ...dataIcon(licon.Checkmark),
              title: bg.title || "",
              type: "button",
              hook: bind("click", () => this.set(bg.key))
            },
            bg.name
          );
        }),
        this.propSlider("ui-roundness", i18n.site.roundness, { min: 0, max: 15, step: 1 }),
        cur === "transp" ? this.propSlider(
          "bg-opacity",
          i18n.site.imageOpacity,
          { min: 5, max: 100, step: 1 },
          (val) => `${val}%`,
          ""
        ) : null
      ]),
      cur === "transp" ? this.backgroundData.gallery ? this.galleryInput() : this.imageInput() : null
    ]);
  }
  get backgroundData() {
    return this.root.data.background;
  }
};

// ../dasher/src/ctrl.ts
var defaultMode = "links";
var DasherCtrl = class {
  constructor(data, redraw) {
    this.data = data;
    this.redraw = redraw;
    this.opts = {
      playing: $("body").hasClass("playing"),
      zenable: $("body").hasClass("zenable")
    };
    this.mode = prop(defaultMode);
    this.render = () => {
      var _a;
      return ((_a = this[this.mode()]) == null ? void 0 : _a.render()) || null;
    };
    this.setMode = (m) => {
      this.mode(m);
      this.redraw();
    };
    this.close = () => this.setMode(defaultMode);
    this.ping = new PingCtrl(this);
    this.langs = new LangsCtrl(this);
    this.sound = new SoundCtrl(this);
    this.theme = new ThemeCtrl(this);
    this.board = new BoardCtrl(this);
    this.piece = new PieceCtrl(this);
    this.links = new LinksCtrl(this);
  }
};

// ../dasher/src/dasher.ts
var patch = init([classModule, attributesModule]);
function load() {
  return site.asset.loadEsm("dasher");
}
async function initModule() {
  let vnode, ctrl = void 0;
  const $el = $("#dasher_app").html(`<div class="initiating">${spinnerHtml}</div>`);
  const element = $el.empty()[0];
  const redraw = () => {
    var _a;
    vnode = patch(
      vnode || element,
      h("div#dasher_app.dropdown", (_a = ctrl == null ? void 0 : ctrl.render()) != null ? _a : h("div.initiating", spinnerVdom()))
    );
  };
  redraw();
  const data = await json("/dasher");
  ctrl = new DasherCtrl(data, redraw);
  redraw();
  return ctrl;
}

export {
  load,
  initModule
};
//# sourceMappingURL=lib.U5LVQ35C.js.map

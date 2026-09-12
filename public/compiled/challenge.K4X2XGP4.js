import {
  userLink
} from "./lib.BMKV23O2.js";
import {
  icon,
  initMiniBoard,
  spinnerVdom
} from "./lib.MYPIOGN5.js";
import "./lib.LRP46MC3.js";
import "./lib.HMFK7OOB.js";
import "./lib.AEOHBIQD.js";
import {
  opposite
} from "./lib.RPQH5UYI.js";
import "./lib.XAEDCBGD.js";
import "./lib.X7H2PLEK.js";
import "./lib.53PYQRAK.js";
import "./lib.CAO7TYYH.js";
import "./lib.PNHYIP7B.js";
import {
  dataIcon,
  onInsert
} from "./lib.S3TIZ2HQ.js";
import {
  attributesModule,
  classModule,
  h,
  init
} from "./lib.LWF5S4ZV.js";
import "./lib.QPQZCXK2.js";
import {
  licon
} from "./lib.5I4BSVKX.js";
import {
  form,
  json,
  text
} from "./lib.TT4QSUKQ.js";
import {
  once
} from "./lib.NFSQQWN5.js";
import "./lib.GMEH5BEF.js";
import "./lib.KO2KTNGK.js";

// ../challenge/src/ctrl.ts
var ChallengeCtrl = class {
  constructor(opts, data, redraw) {
    this.opts = opts;
    this.redraw = redraw;
    this.redirecting = false;
    this.reasons = {};
    this.showRatings = !document.body.classList.contains("no-rating");
    this.update = (d) => {
      this.data = d;
      if (d.reasons) this.reasons = d.reasons;
      this.opts.setCount(this.countActiveIn());
      this.notifyNew();
    };
    this.countActiveIn = () => this.data.in.filter((c) => !c.declined).length;
    this.notifyNew = () => this.data.in.forEach((c) => {
      if (once("c-" + c.id)) {
        if (!site.quietMode && this.data.in.length <= 3) {
          this.opts.show();
          site.sound.playOnce("newChallenge");
        }
        this.opts.pulse();
      }
    });
    this.decline = (id, reason) => this.data.in.forEach((c) => {
      if (c.id === id) {
        c.declined = true;
        text(`/challenge/${id}/decline`, { method: "post", body: form({ reason }) }).catch(
          () => site.announce({ msg: "Failed to send challenge decline" })
        );
      }
    });
    this.cancel = (id) => this.data.out.forEach((c) => {
      if (c.id === id) {
        c.declined = true;
        text(`/challenge/${id}/cancel`, { method: "post" }).catch(
          () => site.announce({ msg: "Failed to send challenge cancellation" })
        );
      }
    });
    this.onRedirect = () => {
      this.redirecting = true;
      requestAnimationFrame(this.redraw);
    };
    this.update(data);
  }
};

// ../challenge/src/view.ts
var loaded = (ctrl) => ctrl.redirecting ? h("div#challenge-app.dropdown", h("div.initiating", spinnerVdom())) : h("div#challenge-app.links.dropdown.rendered", renderContent(ctrl));
var loading = () => h("div#challenge-app.links.dropdown.rendered", h("div.empty.loading", "-"));
function renderContent(ctrl) {
  const d = ctrl.data;
  const nb = d.in.length + d.out.length;
  return nb ? [allChallenges(ctrl, d, nb)] : [empty()];
}
var userPowertips = (vnode) => site.powertip.manualUserIn(vnode.elm);
var allChallenges = (ctrl, d, nb) => h(
  "div.challenges",
  {
    class: { many: nb > 3 },
    hook: { insert: userPowertips, postpatch: userPowertips }
  },
  d.in.map(challenge(ctrl, "in")).concat(d.out.map(challenge(ctrl, "out")))
);
function challenge(ctrl, dir) {
  return (c) => {
    const fromPosition = c.variant.key === "fromPosition";
    const origColor = c.color === "random" ? fromPosition ? c.finalColor : "random" : c.finalColor;
    const myColor = dir === "out" ? origColor : origColor === "random" ? "random" : opposite(origColor);
    const opponent = dir === "in" ? c.challenger : c.destUser;
    return h(
      `div.challenge.${dir}.c-${c.id}`,
      {
        class: { declined: !!c.declined }
      },
      [
        h("div.content", [
          h("div.content__text", { attrs: { id: `challenge-text-${c.id}` } }, [
            h("span.head", [renderUser(opponent, ctrl.showRatings), renderLag(opponent)]),
            h("span.desc", [
              h("span.is.color-icon." + myColor),
              " \u2022 ",
              [i18n.site[c.rated ? "rated" : "casual"], timeControl(c.timeControl), c.variant.name].join(
                " \u2022 "
              )
            ])
          ]),
          icon(c.perf.icon)(".perf")
        ]),
        fromPosition ? h("div.position.mini-board.cg-wrap.is2d", {
          attrs: { "data-state": `${c.initialFen},${myColor}` },
          hook: onInsert(initMiniBoard)
        }) : null,
        h("div.buttons", (dir === "in" ? inButtons : outButtons)(ctrl, c))
      ]
    );
  };
}
function inButtons(ctrl, c) {
  var _a, _b;
  const viewInsteadOfAccept = ((_b = (_a = c.rules) == null ? void 0 : _a.length) != null ? _b : 0) > 0;
  const acceptElement = () => h("form", { attrs: { method: "post", action: `/challenge/${c.id}/accept` } }, [
    h("button.button.accept", {
      attrs: {
        type: "submit",
        "aria-describedby": `challenge-text-${c.id}`,
        "data-icon": licon.Checkmark,
        title: i18n.site.accept
      },
      hook: onClick(ctrl.onRedirect)
    })
  ]);
  const viewElement = () => h("a.view", {
    attrs: { "data-icon": licon.Eye, href: "/" + c.id, title: i18n.site.viewInFullSize }
  });
  return [
    viewInsteadOfAccept ? viewElement() : acceptElement(),
    h("button.button.decline", {
      attrs: { type: "submit", "data-icon": licon.X, title: i18n.site.decline },
      hook: onClick(() => ctrl.decline(c.id, "generic"))
    }),
    h(
      "select.decline-reason",
      {
        hook: onInsert((select) => {
          select.addEventListener("change", () => ctrl.decline(c.id, select.value));
        })
      },
      Object.entries(ctrl.reasons).map(
        ([key, name]) => h("option", { attrs: { value: key } }, key === "generic" ? "" : name)
      )
    )
  ];
}
var outButtons = (ctrl, c) => [
  h("div.owner", [
    h("span.waiting", i18n.site.waiting),
    h("a.view", {
      attrs: { "data-icon": licon.Eye, href: "/" + c.id, title: i18n.site.viewInFullSize }
    })
  ]),
  h("button.button.decline", {
    attrs: { "data-icon": licon.X, title: i18n.site.cancel },
    hook: onClick(() => ctrl.cancel(c.id))
  })
];
function timeControl(c) {
  switch (c.type) {
    case "unlimited":
      return "Unlimited";
    case "correspondence":
      return c.daysPerTurn + " days";
    case "clock":
      return c.show || "-";
    default:
      return "-";
  }
}
var renderUser = (u, showRating) => u ? userLink({ ...u, line: true, rating: showRating ? u.rating : void 0, attrs: { "data-pt-pos": "w" } }) : h("span", "Open challenge");
var renderLag = (u) => u && h("signal", u.lag === void 0 ? [] : [1, 2, 3, 4].map((i) => h("icon", { class: { off: u.lag < i } })));
var empty = () => h("div.empty.text", { attrs: dataIcon(licon.InfoCircle) }, i18n.site.noChallenges);
var onClick = (f) => onInsert((elem) => {
  elem.addEventListener("click", f);
});

// ../challenge/src/challenge.ts
var patch = init([classModule, attributesModule]);
function initModule(opts) {
  let vnode, ctrl;
  function redraw() {
    vnode = patch(vnode || opts.el, ctrl ? loaded(ctrl) : loading());
  }
  function update(d) {
    if (ctrl) ctrl.update(d);
    else {
      ctrl = new ChallengeCtrl(opts, d, redraw);
      opts.el.innerHTML = "";
    }
    redraw();
  }
  if (opts.data) update(opts.data);
  else json("/challenge").then(update, (_) => site.announce({ msg: "Failed to load challenges" }));
  return {
    update
  };
}
export {
  initModule
};
//# sourceMappingURL=challenge.K4X2XGP4.js.map

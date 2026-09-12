import {
  standaloneChat
} from "./lib.KOFCUIJ3.js";
import "./lib.LARLSDYI.js";
import "./lib.OY6DQ2TE.js";
import {
  watchers
} from "./lib.2NHX5WHM.js";
import {
  status
} from "./lib.67VUYMDO.js";
import "./lib.GD6YSPBF.js";
import {
  fullName,
  userFlair,
  userLine,
  userRating
} from "./lib.BMKV23O2.js";
import "./lib.EAANXKAK.js";
import {
  confirm,
  domDialog,
  initMiniGames,
  renderClock
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
import {
  idleTimer,
  wsConnect
} from "./lib.PNHYIP7B.js";
import {
  bind,
  dataIcon,
  hl,
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
  json
} from "./lib.TT4QSUKQ.js";
import {
  throttlePromiseDelay
} from "./lib.NFSQQWN5.js";
import {
  richHTML
} from "./lib.GMEH5BEF.js";
import "./lib.KO2KTNGK.js";

// ../simul/src/socket.ts
function makeSocket(send, ctrl) {
  return {
    send,
    receive(message) {
      switch (message.tpe) {
        case "reload":
          ctrl.reload(message.data);
          ctrl.redraw();
          return;
        case "aborted":
          site.reload();
          return;
        case "hostGame":
          ctrl.data.host.gameId = message.data;
          ctrl.redraw();
      }
    }
  };
}

// ../simul/src/xhr.ts
var onFail = () => site.reload();
var post = (action) => (id) => json(`/simul/${id}/${action}`, { method: "post" }).catch(onFail);
var xhr_default = {
  ping: post("host-ping"),
  start: post("start"),
  abort: post("abort"),
  join: throttlePromiseDelay(
    () => 4e3,
    (id, variant) => post(`join/${variant}`)(id)
  ),
  withdraw: post("withdraw"),
  accept: (user) => post(`accept/${user}`),
  reject: (user) => post(`reject/${user}`)
};

// ../simul/src/ctrl.ts
var SimulCtrl = class {
  constructor(opts, redraw) {
    this.opts = opts;
    this.redraw = redraw;
    this.setupCreatedHost = () => {
      let hostIsAround = true;
      idleTimer(
        15 * 60 * 1e3,
        () => {
          hostIsAround = false;
        },
        () => {
          hostIsAround = true;
        }
      );
      setInterval(() => {
        if (this.data.isCreated && hostIsAround) xhr_default.ping(this.data.id);
      }, 10 * 1e3);
    };
    this.reload = (data) => {
      this.data = data;
    };
    this.createdByMe = () => this.opts.userId === this.data.host.id;
    this.candidates = () => this.data.applicants.filter((a) => !a.accepted);
    this.accepted = () => this.data.applicants.filter((a) => a.accepted);
    this.acceptedContainsMe = () => this.accepted().some((a) => a.player.id === this.opts.userId);
    this.applicantsContainsMe = () => this.candidates().some((a) => a.player.id === this.opts.userId);
    this.containsMe = () => this.opts.userId && (this.applicantsContainsMe() || this.acceptedContainsMe() || this.pairingsContainMe());
    this.pairingsContainMe = () => this.data.pairings.some((a) => a.player.id === this.opts.userId);
    this.data = opts.data;
    this.socket = makeSocket(opts.socketSend, this);
    if (this.createdByMe() && this.data.isCreated) this.setupCreatedHost();
  }
};

// ../simul/src/view/util.ts
function player(p, ctrl) {
  return h(
    "a.ulpt.user-link." + (p.online || ctrl.data.host.id !== p.id ? "online" : "offline"),
    {
      attrs: { href: "/@/" + p.name },
      hook: { destroy: (vnode) => $.powerTip.destroy(vnode.elm) }
    },
    [
      userLine({ line: true, ...p }),
      h("span.name", fullName(p)),
      ctrl.opts.showRatings ? h("em", userRating(p)) : null
    ]
  );
}
var title = ({ data }) => h("h1", data.fullName);

// ../simul/src/view/created.ts
function created_default(showText2) {
  return (ctrl) => {
    const candidates = ctrl.candidates().sort(byName);
    const accepted = ctrl.accepted().sort(byName);
    const isHost = ctrl.createdByMe();
    const canJoin = ctrl.data.canJoin;
    return [
      hl("div.box__top", [
        title(ctrl),
        hl(
          "div.box__top__actions",
          ctrl.opts.userId ? isHost ? [startOrCancel(ctrl, accepted), randomButton(ctrl)] : ctrl.containsMe() ? hl(
            "a.button",
            { hook: bind("click", () => xhr_default.withdraw(ctrl.data.id)) },
            i18n.site.withdraw
          ) : hl(
            "a.button.text" + (canJoin ? "" : ".disabled"),
            {
              attrs: { disabled: !canJoin, ...dataIcon(licon.PlayTriangle) },
              hook: canJoin ? bind("click", () => {
                if (ctrl.data.variants.length === 1)
                  xhr_default.join(ctrl.data.id, ctrl.data.variants[0].key);
                else
                  domDialog({
                    cash: $(".simul .continue-with"),
                    modal: true,
                    easyClose: "clickOutside"
                  }).then((dlg) => {
                    $("button.button", dlg.view).on("click", function() {
                      xhr_default.join(ctrl.data.id, this.dataset.variant);
                      dlg.close();
                    });
                    dlg.show();
                  });
              }) : {}
            },
            i18n.site.join
          ) : hl(
            "a.button.text",
            {
              attrs: {
                ...dataIcon(licon.PlayTriangle),
                href: "/login?referrer=" + window.location.pathname
              }
            },
            i18n.site.signIn
          )
        )
      ]),
      showText2(ctrl),
      ctrl.acceptedContainsMe() ? hl("p.instructions", "You have been selected! Hold still, the simul is about to begin.") : isHost && ctrl.data.applicants.length < 6 && hl("p.instructions", "Share this page URL to let people enter the simul!"),
      hl(
        "div.halves",
        { hook: { postpatch: (_old, vnode) => site.powertip.manualUserIn(vnode.elm) } },
        [
          hl(
            "div.half.candidates",
            hl(
              "table.slist.slist-pad",
              hl(
                "thead",
                hl(
                  "tr",
                  hl("th", { attrs: { colspan: 3 } }, [
                    hl("strong", candidates.length),
                    " candidate players"
                  ])
                )
              ),
              hl(
                "tbody",
                candidates.map((applicant) => {
                  return hl(
                    "tr",
                    { key: applicant.player.id, class: { me: ctrl.opts.userId === applicant.player.id } },
                    [
                      hl("td", player(applicant.player, ctrl)),
                      variantIconFor(ctrl, applicant),
                      hl(
                        "td.action",
                        isHost && hl("a.button", {
                          attrs: { ...dataIcon(licon.Checkmark), title: "Accept" },
                          hook: bind("click", () => xhr_default.accept(applicant.player.id)(ctrl.data.id))
                        })
                      )
                    ]
                  );
                })
              )
            )
          ),
          hl("div.half.accepted", [
            hl(
              "table.slist.user_list",
              hl("thead", [
                hl(
                  "tr",
                  hl("th", { attrs: { colspan: 3 } }, [hl("strong", accepted.length), " accepted players"])
                ),
                isHost && candidates.length > 0 && !accepted.length && hl("tr.help", hl("th", "Now you get to accept some players, then start the simul"))
              ]),
              hl(
                "tbody",
                accepted.map((applicant) => {
                  return hl(
                    "tr",
                    { key: applicant.player.id, class: { me: ctrl.opts.userId === applicant.player.id } },
                    [
                      hl("td", player(applicant.player, ctrl)),
                      variantIconFor(ctrl, applicant),
                      hl(
                        "td.action",
                        isHost && hl("a.button.button-red", {
                          attrs: dataIcon(licon.X),
                          hook: bind("click", () => xhr_default.reject(applicant.player.id)(ctrl.data.id))
                        })
                      )
                    ]
                  );
                })
              )
            )
          ])
        ]
      ),
      ctrl.data.quote && hl("blockquote.pull-quote", [hl("p", ctrl.data.quote.text), hl("footer", ctrl.data.quote.author)]),
      hl(
        "div.continue-with.none",
        ctrl.data.variants.map(
          (variant) => hl("button.button", { attrs: { "data-variant": variant.key } }, variant.name)
        )
      )
    ];
  };
}
var byName = (a, b) => a.player.name > b.player.name ? 1 : -1;
var randomButton = (ctrl) => ctrl.candidates().length > 0 && hl(
  "a.button.text",
  {
    attrs: dataIcon(licon.Checkmark),
    hook: bind("click", () => {
      const candidates = ctrl.candidates();
      const randomCandidate = candidates[Math.floor(Math.random() * candidates.length)];
      xhr_default.accept(randomCandidate.player.id)(ctrl.data.id);
    })
  },
  "Accept random candidate"
);
var startOrCancel = (ctrl, accepted) => accepted.length > 1 ? hl(
  "a.button.button-green.text",
  { attrs: dataIcon(licon.PlayTriangle), hook: bind("click", () => xhr_default.start(ctrl.data.id)) },
  `Start (${accepted.length})`
) : hl(
  "a.button.button-red.text",
  {
    attrs: dataIcon(licon.X),
    hook: bind("click", async () => {
      if (await confirm("Delete this simul?")) xhr_default.abort(ctrl.data.id);
    })
  },
  i18n.site.cancel
);
var variantIconFor = (ctrl, a) => {
  const variant = ctrl.data.variants.find((v) => a.variant === v.key);
  return variant && hl("td.variant", { attrs: dataIcon(variant.icon) });
};

// ../simul/src/view/pairings.ts
function pairings_default(ctrl) {
  return h("div.game-list.now-playing.box__pad", ctrl.data.pairings.map(miniPairing(ctrl)));
}
var miniPairing = (ctrl) => (pairing) => {
  const game = pairing.game;
  const player2 = pairing.player;
  const flair = userFlair(player2);
  return h(
    `span.mini-game.mini-game-${game.id}.mini-game--init.is2d`,
    {
      class: { host: ctrl.data.host.gameId === game.id },
      attrs: {
        "data-state": `${game.fen},${game.orient},${game.lastMove}`,
        "data-live": game.clock ? game.id : ""
      },
      hook: onInsert(site.powertip.manualUserIn)
    },
    [
      h("span.mini-game__player", [
        h("a.mini-game__user.ulpt", { attrs: { href: `/@/${player2.name}` } }, [
          h(
            "span.name",
            player2.title ? [h("span.utitle", player2.title), " ", player2.name, flair] : [player2.name, flair]
          ),
          ...ctrl.opts.showRatings ? [" ", h("span.rating", player2.rating)] : []
        ]),
        game.clock ? renderClock(opposite(game.orient), game.clock[opposite(game.orient)]) : h("span.mini-game__result", game.winner ? game.winner === game.orient ? 0 : 1 : "\xBD")
      ]),
      h("a.cg-wrap", { attrs: { href: `/${game.id}/${game.orient}` } }),
      h("span.mini-game__player", [
        h("span"),
        game.clock ? renderClock(game.orient, game.clock[game.orient]) : h("span.mini-game__result", game.winner ? game.winner === game.orient ? 1 : 0 : "\xBD")
      ])
    ]
  );
};

// ../simul/src/view/results.ts
function results_default(ctrl) {
  return h("div.results", [
    h(
      "div",
      trans(ctrl, i18n.site.nbPlaying, (p) => p.game.status < status.aborted)
    ),
    h(
      "div",
      trans(ctrl, i18n.site.nbWins, (p) => p.game.winner === p.hostColor)
    ),
    h(
      "div",
      trans(ctrl, i18n.site.nbDraws, (p) => p.game.status >= status.mate && !p.game.winner)
    ),
    h(
      "div",
      trans(ctrl, i18n.site.nbLosses, (p) => p.game.winner === opposite(p.hostColor))
    )
  ]);
}
var NumberFirstRegex = /^(\d+)\s(.+)$/;
var NumberLastRegex = /^(.+)\s(\d+)$/;
var splitNumber = (s) => {
  let found;
  if (found = s.match(NumberFirstRegex)) return [h("div.number", found[1]), h("div.text", found[2])];
  if (found = s.match(NumberLastRegex)) return [h("div.number", found[2]), h("div.text", found[1])];
  return h("div.text", s);
};
var trans = (ctrl, plural, cond) => splitNumber(plural(ctrl.data.pairings.filter(cond).length));

// ../simul/src/view/main.ts
function main_default(ctrl) {
  const handler = ctrl.data.isRunning ? started : ctrl.data.isFinished ? finished : created_default(showText);
  return hl("main.simul", { class: { "simul-created": ctrl.data.isCreated } }, [
    hl("aside.simul__side", {
      hook: onInsert((el) => {
        $(el).replaceWith(ctrl.opts.$side);
        if (ctrl.opts.chat) {
          ctrl.opts.chat.data.hostIds = [ctrl.data.host.id];
          standaloneChat(ctrl.opts.chat);
        }
      })
    }),
    hl("div.simul__main.box", { hook: { postpatch: () => initMiniGames() } }, handler(ctrl)),
    hl("div.chat__members.none", { hook: onInsert(watchers) })
  ]);
}
var showText = (ctrl) => ctrl.data.text.length > 0 && hl("div.simul-text", [hl("p", { hook: richHTML(ctrl.data.text) })]);
var started = (ctrl) => [
  hl("div.box__top", title(ctrl)),
  showText(ctrl),
  results_default(ctrl),
  pairings_default(ctrl)
];
var finished = (ctrl) => [
  hl("div.box__top", [title(ctrl), hl("div.box__top__actions", hl("div.finished", i18n.site.finished))]),
  showText(ctrl),
  results_default(ctrl),
  pairings_default(ctrl)
];

// ../simul/src/simul.ts
var patch = init([classModule, attributesModule]);
function initModule(opts) {
  const element = document.querySelector("main.simul");
  opts.socketSend = wsConnect(`/simul/${opts.data.id}/socket/v4`, opts.socketVersion, {
    receive: (tpe, data) => ctrl.socket.receive({ tpe, data })
  }).send;
  opts.element = element;
  opts.$side = $(".simul__side").clone();
  let vnode;
  function redraw() {
    vnode = patch(vnode, main_default(ctrl));
  }
  const ctrl = new SimulCtrl(opts, redraw);
  const blueprint = main_default(ctrl);
  element.innerHTML = "";
  vnode = patch(element, blueprint);
  redraw();
}
export {
  initModule
};
//# sourceMappingURL=simul.3VFATIJD.js.map

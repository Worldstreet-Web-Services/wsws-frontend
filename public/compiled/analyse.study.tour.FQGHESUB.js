import {
  Shepherd
} from "./lib.E4P6PIKZ.js";
import {
  pubsub
} from "./lib.QPQZCXK2.js";
import {
  licon
} from "./lib.5I4BSVKX.js";
import "./lib.KO2KTNGK.js";

// ../analyse/src/study/analyse.study.tour.ts
function initModule() {
  return {
    study,
    chapter
  };
  function iconI18nTag(i) {
    return `<icon data-icon='${i}'></icon>`;
  }
  function study(ctrl) {
    var _a, _b, _c;
    if ((_a = ctrl.study) == null ? void 0 : _a.data.chapter.gamebook) return;
    const helpButtonSelector = "main.analyse .study__buttons .help";
    if (!$(helpButtonSelector).length) return;
    const onTab = (tab) => ({
      "before-show": () => {
        var _a2;
        return (_a2 = ctrl.study) == null ? void 0 : _a2.setTab(tab);
      }
    });
    const closeActionMenu = {
      "before-show": () => {
        ctrl.actionMenu(false);
        ctrl.redraw();
      }
    };
    const tourCtrl = new TourCtrl();
    const steps = [
      {
        title: i18n.study.welcomeToLichessStudyTitle,
        text: i18n.study.welcomeToLichessStudyText,
        attachTo: { element: helpButtonSelector, on: "top" }
      },
      {
        title: i18n.study.sharedAndSaveTitle,
        text: i18n.study.sharedAndSavedText,
        attachTo: { element: "main.analyse .areplay", on: "left" },
        when: closeActionMenu
      },
      {
        title: i18n.study.studyMembersTitle,
        text: i18n.study.studyMembersText(iconI18nTag(licon.Eye), iconI18nTag(licon.User)),
        attachTo: { element: ".study__members", on: "right" },
        when: onTab("members")
      }
    ];
    if ((_b = ctrl.study) == null ? void 0 : _b.members.isOwner()) {
      steps.push({
        title: i18n.study.addMembers,
        text: i18n.study.addMembersText(iconI18nTag(licon.PlusButton)),
        attachTo: { element: ".study__members .add", on: "right" },
        when: onTab("members")
      });
    }
    steps.push({
      title: i18n.study.studyChaptersTitle,
      text: i18n.study.studyChaptersText,
      attachTo: { element: ".study__chapters", on: "right" },
      when: onTab("chapters")
    });
    if ((_c = ctrl.study) == null ? void 0 : _c.members.canContribute()) {
      steps.push(
        {
          title: i18n.study.commentPositionTitle,
          text: i18n.study.commentPositionText(iconI18nTag(licon.BubbleSpeech)),
          attachTo: { element: ".study__buttons .left-buttons .comments", on: "top" }
        },
        {
          title: i18n.study.annotatePositionTitle,
          text: i18n.study.annotatePositionText,
          attachTo: { element: ".study__buttons .left-buttons .glyphs", on: "top" }
        }
      );
    }
    steps.push({
      title: i18n.study.conclusionTitle,
      text: i18n.study.conclusionText,
      attachTo: { element: helpButtonSelector, on: "top" },
      buttons: [
        {
          text: iconI18nTag(licon.Checkmark),
          action: tourCtrl.tour.next
        }
      ]
    });
    tourCtrl.toggleTour(steps);
  }
  function chapter(setTab) {
    const viewSel = "dialog div.dialog-content";
    const tourCtrl = new TourCtrl();
    const onTab = (tab) => ({
      "before-show": () => setTab(tab)
    });
    const steps = [
      {
        title: i18n.study.createChapterTitle,
        text: i18n.study.createChapterText,
        attachTo: { element: `${viewSel} label[for=chapter-name]`, on: "left" }
      },
      {
        title: i18n.study.fromInitialPositionTitle,
        text: i18n.study.fromInitialPositionText,
        attachTo: { element: `${viewSel} .tabs-horiz .init`, on: "top" },
        when: onTab("init")
      },
      {
        title: i18n.study.customPositionTitle,
        text: i18n.study.customPositionText,
        attachTo: { element: `${viewSel} .tabs-horiz .edit`, on: "bottom" },
        when: onTab("edit")
      },
      {
        title: i18n.study.loadExistingLichessGameTitle,
        text: i18n.study.loadExistingLichessGameText,
        attachTo: { element: `${viewSel} .tabs-horiz .game`, on: "top" },
        when: onTab("game")
      },
      {
        title: i18n.study.fromFenStringTitle,
        text: i18n.study.fromFenStringText,
        attachTo: { element: `${viewSel} .tabs-horiz .fen`, on: "top" },
        when: onTab("fen")
      },
      {
        title: i18n.study.fromPgnGameTitle,
        text: i18n.study.fromPgnGameText,
        attachTo: { element: `${viewSel} .tabs-horiz .pgn`, on: "top" },
        when: onTab("pgn")
      },
      {
        title: i18n.study.variantsAreSupportedTitle,
        text: i18n.study.variantsAreSupportedText,
        attachTo: { element: `${viewSel} label[for=chapter-variant]`, on: "left" },
        when: onTab("init")
      },
      {
        title: i18n.study.conclusionTitle,
        text: i18n.study.chapterConclusionText,
        buttons: [
          {
            text: iconI18nTag(licon.Checkmark),
            action: tourCtrl.tour.next
          }
        ],
        attachTo: { element: `${viewSel} .help`, on: "bottom" }
      }
    ];
    tourCtrl.toggleTour(steps);
  }
}
var TourCtrl = class {
  constructor() {
    this.tour = new Shepherd.Tour({
      defaultStepOptions: {
        scrollTo: false,
        classes: "force-ltr",
        cancelIcon: {
          enabled: true
        }
      },
      exitOnEsc: true
    });
    pubsub.on("analysis.closeAll", this.tour.cancel);
  }
  buildTour(steps) {
    const buttons = [
      {
        text: i18n.study.next,
        action: this.tour.next
      }
    ];
    steps.forEach(
      (s) => {
        var _a;
        return this.tour.addStep({
          ...s,
          buttons: (_a = s.buttons) != null ? _a : buttons
        });
      }
    );
  }
  toggleTour(steps) {
    if (Shepherd.activeTour) Shepherd.activeTour.cancel();
    else {
      this.buildTour(steps);
      this.tour.start();
    }
  }
};
export {
  initModule
};
//# sourceMappingURL=analyse.study.tour.FQGHESUB.js.map

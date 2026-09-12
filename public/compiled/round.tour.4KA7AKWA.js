import {
  Shepherd
} from "./lib.E4P6PIKZ.js";
import "./lib.KO2KTNGK.js";

// ../round/src/plugins/round.tour.ts
function initModule() {
  return {
    corresRematchOffline
  };
  function corresRematchOffline() {
    const tour = new Shepherd.Tour();
    tour.addStep({
      title: "Challenged to a rematch",
      text: "Your opponent is offline, but they can accept this challenge later!",
      attachTo: {
        element: "button.rematch",
        on: "bottom"
      },
      buttons: [
        {
          action() {
            return this.next();
          },
          text: "Ok, got it"
        }
      ]
    });
    tour.start();
  }
}
export {
  initModule
};
//# sourceMappingURL=round.tour.4KA7AKWA.js.map

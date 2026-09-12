import "./lib.KO2KTNGK.js";

// ../round/src/plugins/round.yeet.ts
async function initModule() {
  window.scrollTo(0, 0);
  await site.sound.load("yeet", site.asset.url("sound/other/yeet.mp3"));
  site.sound.play("yeet");
  setTimeout(yeet, 150);
}
function yeet() {
  var _a;
  const gravity = 1.5;
  const frictionMultiplier = 0.97;
  const minAngle = -0.436;
  const maxAngle = 3.576;
  const minMagnitude = 250;
  const maxMagnitude = 500;
  document.head.insertAdjacentHTML(
    "beforeend",
    `<style>
    .main-board cg-board { box-shadow: none !important; }
    .main-board cg-board:not(.clone)::before {background-image: none !important}
    .main-board square { display: none; }
    .board-yeet-rotate {
      animation: yeet-rotate 1s ease forwards;
    }
    .board-yeet-bounce {
      animation: yeet-bounce 2s ease forwards;
    }
    @keyframes yeet-bounce {
        0% { transform:translateY(0%); }
        10% { transform:translateY(-30%); }
        20% { transform:translateY(0%); }
        25% { transform:translateY(-14%); }
        27% { transform:translateY(0%); }
        29% { transform:translateY(-6%); }
        30% { transform:translateY(0); }
    }
    @keyframes yeet-rotate {
      0% { transform: rotateX(0) rotateZ(0); }
      100% { transform: rotateX(445deg) rotateZ(15deg); }
    }
    button.yeet-reload {
      position: fixed;
      top: 70%;
      left: 50%;
      transform: translate(-50%, -50%);
      zIndex: 100000;
    }
</style>`
  );
  $(".main-board .cg-shapes").remove();
  $(".main-board coords").remove();
  const clone = document.createElement("cg-board");
  clone.className = "clone";
  document.getElementsByTagName("cg-container")[0].appendChild(clone);
  const pieces = document.querySelectorAll("piece:not(.ghost)");
  clone.classList.add("board-yeet-rotate");
  (_a = clone.parentElement) == null ? void 0 : _a.classList.add("board-yeet-bounce");
  function movePieces() {
    let keepGoing = false;
    pieces.forEach((p) => {
      const d = p.dataset;
      const xTranslate = parseFloat(d.xTranslate);
      const yTranslate = parseFloat(d.yTranslate);
      let rot = parseFloat(d.rot);
      let xSpeed = parseFloat(d.xSpeed);
      let ySpeed = parseFloat(d.ySpeed);
      let rotSpeed = parseFloat(d.rotSpeed);
      const newXTr = xTranslate + xSpeed;
      const newYTr = yTranslate + ySpeed;
      d.xTranslate = newXTr;
      d.yTranslate = newYTr;
      p.style.translate = newXTr + "px " + newYTr + "px";
      const bounds = p.getBoundingClientRect();
      const leftBounce = bounds.x <= 0;
      const topBounce = bounds.y <= 0;
      const rightBounce = bounds.right >= window.innerWidth;
      const bottomBounce = bounds.bottom >= window.innerHeight;
      if (leftBounce || topBounce || rightBounce || bottomBounce) {
        d.xTranslate = xTranslate;
        d.yTranslate = yTranslate;
        p.style.translate = xTranslate + "px " + yTranslate + "px";
      }
      if (leftBounce || rightBounce) {
        xSpeed *= -1;
      } else if (topBounce || bottomBounce) {
        ySpeed *= -1;
      }
      ySpeed += gravity;
      xSpeed *= frictionMultiplier;
      ySpeed *= frictionMultiplier;
      rot += rotSpeed;
      rotSpeed *= frictionMultiplier;
      d.rot = rot;
      d.rotSpeed = rotSpeed;
      p.style.transform = p.dataset.origTransform + " rotate(" + rot + "rad)";
      d.xSpeed = xSpeed;
      d.ySpeed = ySpeed;
      if (Math.abs(xSpeed) > 0.5 && Math.abs(ySpeed) > 0.5 || window.innerHeight - p.getBoundingClientRect().bottom > 12) {
        keepGoing = true;
      }
    });
    if (keepGoing) {
      requestAnimationFrame(movePieces);
    } else {
      setTimeout(whenAllIsDone, 500);
    }
  }
  pieces.forEach((p) => {
    const d = p.dataset;
    d.xTranslate = 0;
    d.yTranslate = 0;
    d.rot = 0;
    const angle = Math.random() * (maxAngle - minAngle) + minAngle;
    const magnitude = Math.random() * (maxMagnitude - minMagnitude) + minMagnitude;
    d.xSpeed = Math.cos(angle) * magnitude;
    d.ySpeed = Math.sin(angle) * magnitude;
    d.rotSpeed = (Math.random() - 0.5) * 1.5;
    d.origTransform = p.style.transform;
  });
  requestAnimationFrame(movePieces);
}
function whenAllIsDone() {
  const button = document.createElement("button");
  button.classList.add("yeet-reload", "button", "button-red");
  button.textContent = "Yeet! Reload the page";
  button.addEventListener("click", () => location.reload());
  document.body.appendChild(button);
}
export {
  initModule
};
//# sourceMappingURL=round.yeet.7FIBQCJN.js.map

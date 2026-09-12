import "./lib.KO2KTNGK.js";

// ../bits/src/bits.soundMove.ts
async function initModule() {
  let currentNotes = 0;
  const volumes = {
    celesta: 0.3,
    clav: 0.2,
    swells: 0.8
  }, noteOverlap = 15, noteTimeout = 300, maxPitch = 23, uciBase = 64;
  const play = (instrument, pitch, volume) => {
    pitch = Math.round(Math.max(0, Math.min(maxPitch, pitch)));
    if (instrument === "swells") pitch = Math.floor(pitch / 8);
    if (currentNotes < noteOverlap) {
      currentNotes++;
      site.sound.play(`orchestra.${instrument}.${pitch}`, volume * volumes[instrument]);
      setTimeout(() => {
        currentNotes--;
      }, noteTimeout);
    }
  };
  const load = async (instrument, index, filename) => site.sound.load(
    `orchestra.${instrument}.${index}`,
    site.sound.url(`instrument/${instrument}/${filename}`)
  );
  const isPawn = (san) => san.startsWith(san[0].toLowerCase());
  const isKing = (san) => san.startsWith("K");
  const hasCastle = (san) => san.startsWith("O-O");
  const hasCheck = (san) => san.includes("+");
  const hasMate = (san) => san.includes("#");
  const hasCapture = (san) => san.includes("x");
  const fileToInt = (file) => "abcdefgh".indexOf(file);
  const keyToInt = (key) => fileToInt(key[0]) * 8 + parseInt(key[1]) - 1;
  const keyToPitch = (key) => keyToInt(key) / (uciBase / 23);
  const promises = [];
  for (const inst of ["celesta", "clav"]) {
    for (let i = 1; i <= 24; i++) {
      promises.push(load(inst, i - 1, "c" + `${i}.mp3`.padStart(7, "0")));
    }
  }
  for (let i = 1; i <= 3; i++) promises.push(load("swells", i - 1, `swell${i}.mp3`));
  await Promise.all(promises);
  return (o) => {
    var _a;
    if ((o == null ? void 0 : o.filter) === "game") return;
    const volume = (_a = o == null ? void 0 : o.volume) != null ? _a : 1;
    if ((o == null ? void 0 : o.san) && o.uci) {
      const pitch = keyToPitch(o.uci.slice(2));
      const instrument = isPawn(o.san) || isKing(o.san) ? "clav" : "celesta";
      play(instrument, pitch, volume);
      if (hasCastle(o.san) || hasCheck(o.san) || hasCapture(o.san) || hasMate(o.san))
        play("swells", pitch, volume);
    } else play("swells", Math.random() * 24, volume);
  };
}
export {
  initModule
};
//# sourceMappingURL=bits.soundMove.NJ5GGGSO.js.map

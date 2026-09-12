import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";

const requiredAssets = [
  "public/compiled/round.DDOZHOU5.js",
  "public/compiled/voice.move.FKEXI2WL.js",
  "public/compiled/voice.vosk.NRDKBVQB.js",
  "public/css/voice.21b8d714.css",
  "public/css/voice.move.help.621e5f43.css",
  "public/npm/vosk/vosk.worker.js",
  "public/npm/vosk/vosk.wasm",
  "public/chess/lichess/sound/standard/Move.mp3",
  "public/chess/lichess/sound/standard/Capture.mp3",
];

const voiceModel = "public/chess/lichess/lifat/vosk/model-en-us-0.15.tar.gz";
const expectedModel = {
  bytes: 41_184_862,
  sha256: "f0b24bb92a48ca575b6a96500d6b543f0f079c573dfe85bbe16001fc0404e1d8",
};

for (const path of requiredAssets) {
  const size = statSync(path).size;
  if (size === 0) throw new Error(`Required chess asset is empty: ${path}`);
}

const model = readFileSync(voiceModel);
if (model.byteLength !== expectedModel.bytes) {
  throw new Error(
    `Invalid Lichess voice model size at ${voiceModel}: expected ${expectedModel.bytes}, received ${model.byteLength}. Fetch the Git LFS object before building.`
  );
}

const modelHash = createHash("sha256").update(model).digest("hex");
if (modelHash !== expectedModel.sha256) {
  throw new Error(
    `Invalid Lichess voice model checksum at ${voiceModel}: expected ${expectedModel.sha256}, received ${modelHash}.`
  );
}

console.log(`Verified ${requiredAssets.length + 1} required chess assets.`);

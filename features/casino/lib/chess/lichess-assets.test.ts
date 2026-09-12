import { describe, expect, it } from "vitest";
import {
  lichessCssPath,
  lichessEsmPath,
  lichessPublicAssetPath,
  lichessRoundStyles,
} from "./lichess-assets";

describe("Lichess round assets", () => {
  it("maps the copied voice modules to their hashed build output", () => {
    expect(lichessEsmPath("voice.move")).toBe("/compiled/voice.move.FKEXI2WL.js");
    expect(lichessEsmPath("voice.vosk")).toBe("/compiled/voice.vosk.NRDKBVQB.js");
  });

  it("maps dynamically loaded voice help CSS to its hashed file", () => {
    expect(lichessCssPath("voice.move.help")).toBe("/css/voice.move.help.621e5f43.css");
    expect(lichessCssPath("unknown.module")).toBe("/css/unknown.module.css");
  });

  it("loads the base voice controls with the round", () => {
    expect(lichessRoundStyles).toContain("/css/voice.21b8d714.css");
  });

  it("serves the LFS voice model from the copied Lichess asset tree", () => {
    expect(lichessPublicAssetPath("lifat/vosk/model-en-us-0.15.tar.gz")).toBe(
      "/chess/lichess/lifat/vosk/model-en-us-0.15.tar.gz"
    );
    expect(lichessPublicAssetPath("npm/vosk/vosk.worker.js")).toBe("/npm/vosk/vosk.worker.js");
  });
});

// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { RecoveryShareFile } from "decane-connect-kit";
import {
  collectRotatedRecoveryPassword,
  completeRecoveryRequest,
  deliverRecoveryFile,
  offerRecoveryShare,
  useRecoveryRequest,
} from "@/lib/decane-recovery";

const ADDRESSES = { evmAddress: "0xE", solanaAddress: "So1" };

describe("recovery bridge", () => {
  it("hands the rotation prompt to the host and resolves with its answer", async () => {
    const { result } = renderHook(() => useRecoveryRequest());

    let promise!: Promise<{ password: string; passwordHint?: string }>;
    act(() => {
      promise = collectRotatedRecoveryPassword(ADDRESSES);
    });

    const request = result.current;
    if (request?.kind !== "rotated") throw new Error("expected a rotation request");
    expect(request.addresses).toEqual(ADDRESSES);

    act(() => {
      request.resolve({ password: "correct horse", passwordHint: "xkcd" });
      completeRecoveryRequest(request);
    });

    await expect(promise).resolves.toEqual({ password: "correct horse", passwordHint: "xkcd" });
    expect(result.current).toBeNull();
  });

  it("blocks file delivery until the host confirms the save", async () => {
    const { result } = renderHook(() => useRecoveryRequest());
    const file = { type: "decane-recovery-share" } as unknown as RecoveryShareFile;

    let done = false;
    act(() => {
      void deliverRecoveryFile(file, "recovery.json").then(() => {
        done = true;
      });
    });
    expect(done).toBe(false);

    const request = result.current;
    if (request?.kind !== "file") throw new Error("expected a file request");
    expect(request.filename).toBe("recovery.json");

    await act(async () => {
      request.resolve();
      completeRecoveryRequest(request);
    });
    expect(done).toBe(true);
    expect(result.current).toBeNull();
  });

  it("lets the signup offer be declined", async () => {
    const { result } = renderHook(() => useRecoveryRequest());

    let promise!: Promise<{ wants: boolean }>;
    act(() => {
      promise = offerRecoveryShare(ADDRESSES);
    });

    const request = result.current;
    if (request?.kind !== "offer") throw new Error("expected an offer request");

    act(() => {
      request.resolve({ wants: false, password: "" });
      completeRecoveryRequest(request);
    });

    await expect(promise).resolves.toMatchObject({ wants: false });
    expect(result.current).toBeNull();
  });

  it("serves queued requests one at a time, in order", () => {
    const { result } = renderHook(() => useRecoveryRequest());

    act(() => {
      void collectRotatedRecoveryPassword(ADDRESSES);
      void deliverRecoveryFile({} as RecoveryShareFile, "second.json");
    });

    expect(result.current?.kind).toBe("rotated");
    const first = result.current;
    act(() => {
      if (first?.kind === "rotated") first.resolve({ password: "12345678" });
      if (first) completeRecoveryRequest(first);
    });
    expect(result.current?.kind).toBe("file");
    const second = result.current;
    act(() => {
      if (second?.kind === "file") second.resolve();
      if (second) completeRecoveryRequest(second);
    });
    expect(result.current).toBeNull();
  });
});

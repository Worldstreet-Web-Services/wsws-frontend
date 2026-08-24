"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  completeRecoveryRequest,
  useRecoveryRequest,
  type RecoveryRequest,
} from "@/lib/decane-recovery";

// Renders the wallet-recovery dialogs Decane's callbacks wait on: the
// signup-time offer of a recovery file, the new-password prompt after a
// rotation, and the save-your-file step. Mounted once inside DecaneKit.
// Deliberately not dismissible: each dialog resolves a promise the SDK is
// blocked on, and walking away from a rotation would strand the user with a
// dead recovery file.

const MIN_PASSWORD_LENGTH = 8;

const INPUT =
  "h-12 w-full rounded-[14px] border border-white/14 bg-white/5 px-4 text-[15px] text-white outline-none focus:border-white/30";
const PRIMARY =
  "h-12 w-full cursor-pointer rounded-[14px] bg-white text-[14.5px] font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50";
const SECONDARY =
  "h-12 w-full cursor-pointer rounded-[14px] border border-white/14 bg-white/8 text-[14.5px] font-medium text-white transition-colors hover:border-white/30";

function PasswordDialog({
  request,
}: {
  request: Extract<RecoveryRequest, { kind: "offer" | "rotated" }>;
}) {
  const t = useTranslations("recovery");
  const [password, setPassword] = useState("");
  const [hint, setHint] = useState("");
  const tooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;

  const submit = () => {
    if (password.length < MIN_PASSWORD_LENGTH) return;
    const choice = { password, passwordHint: hint.trim() || undefined };
    if (request.kind === "offer") request.resolve({ wants: true, ...choice });
    else request.resolve(choice);
    completeRecoveryRequest(request);
  };

  const decline = () => {
    if (request.kind !== "offer") return;
    request.resolve({ wants: false, password: "" });
    completeRecoveryRequest(request);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="ws-display text-[20px]">
          {request.kind === "offer" ? t("offerTitle") : t("rotatedTitle")}
        </div>
        <p className="mt-1.5 text-[13.5px] leading-[1.55] text-white/55">
          {request.kind === "offer" ? t("offerBody") : t("rotatedBody")}
        </p>
      </div>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={t("passwordPlaceholder")}
        autoComplete="new-password"
        className={INPUT}
      />
      <input
        value={hint}
        onChange={(e) => setHint(e.target.value)}
        placeholder={t("hintPlaceholder")}
        className={INPUT}
      />
      {tooShort ? <p className="text-[13px] text-red-400">{t("passwordTooShort")}</p> : null}
      <button onClick={submit} disabled={password.length < MIN_PASSWORD_LENGTH} className={PRIMARY}>
        {t("createFile")}
      </button>
      {request.kind === "offer" ? (
        <button onClick={decline} className={SECONDARY}>
          {t("skipForNow")}
        </button>
      ) : null}
    </div>
  );
}

function FileDialog({ request }: { request: Extract<RecoveryRequest, { kind: "file" }> }) {
  const t = useTranslations("recovery");
  const [downloaded, setDownloaded] = useState(false);

  const download = () => {
    const blob = new Blob([JSON.stringify(request.file, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = request.filename;
    anchor.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
  };

  const done = () => {
    request.resolve();
    completeRecoveryRequest(request);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="ws-display text-[20px]">{t("fileTitle")}</div>
        <p className="mt-1.5 text-[13.5px] leading-[1.55] text-white/55">{t("fileBody")}</p>
      </div>
      <button onClick={download} className={PRIMARY}>
        {t("downloadFile")}
      </button>
      <button onClick={done} disabled={!downloaded} className={SECONDARY}>
        {t("savedIt")}
      </button>
    </div>
  );
}

export function DecaneRecoveryHost() {
  const request = useRecoveryRequest();
  if (!request) return null;
  return (
    <div className="fixed inset-0 z-[200] grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="ws-card w-full max-w-[420px] px-6 py-6">
        {request.kind === "file" ? (
          <FileDialog request={request} />
        ) : (
          <PasswordDialog request={request} />
        )}
      </div>
    </div>
  );
}

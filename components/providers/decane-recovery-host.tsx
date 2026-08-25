"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  completeRecoveryRequest,
  useRecoveryRequest,
  type RecoveryRequest,
} from "@/lib/decane-recovery";

// Renders the wallet-recovery dialogs Decane's callbacks wait on: the
// new-password prompt after a rotation, the save-your-file step, and the
// restore-from-file prompt for a device with no share. Mounted once inside
// DecaneKit. The rotation dialogs are deliberately not dismissible: each
// resolves a promise the SDK is blocked on, and walking away from a rotation
// would strand the user with a dead recovery file.

const MIN_PASSWORD_LENGTH = 8;

const INPUT =
  "h-12 w-full rounded-[14px] border border-white/14 bg-white/5 px-4 text-[15px] text-white outline-none focus:border-white/30";
const PRIMARY =
  "h-12 w-full cursor-pointer rounded-[14px] bg-white text-[14.5px] font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50";
const SECONDARY =
  "h-12 w-full cursor-pointer rounded-[14px] border border-white/14 bg-white/8 text-[14.5px] font-medium text-white transition-colors hover:border-white/30";

function PasswordDialog({ request }: { request: Extract<RecoveryRequest, { kind: "rotated" }> }) {
  const t = useTranslations("recovery");
  const [password, setPassword] = useState("");
  const [hint, setHint] = useState("");
  const tooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;

  const submit = () => {
    if (password.length < MIN_PASSWORD_LENGTH) return;
    request.resolve({ password, passwordHint: hint.trim() || undefined });
    completeRecoveryRequest(request);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="ws-display text-[20px]">{t("rotatedTitle")}</div>
        <p className="mt-1.5 text-[13.5px] leading-[1.55] text-white/55">{t("rotatedBody")}</p>
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

// A new device with no passkey: the only way in is the recovery file the user
// saved. Cancelling is allowed here (unlike the rotation dialogs) and resolves
// null, which the kit surfaces as NewDeviceError on the sign-in screen.
function RestoreDialog({ request }: { request: Extract<RecoveryRequest, { kind: "restore" }> }) {
  const t = useTranslations("recovery");
  const [file, setFile] = useState<{ name: string; value: unknown } | null>(null);
  const [password, setPassword] = useState("");
  const [unreadable, setUnreadable] = useState(false);

  const pick = async (picked: File | undefined) => {
    setUnreadable(false);
    if (!picked) return;
    try {
      setFile({ name: picked.name, value: JSON.parse(await picked.text()) });
    } catch {
      setFile(null);
      setUnreadable(true);
    }
  };

  const restore = () => {
    if (!file || !password) return;
    request.resolve({ value: file.value, getPassword: async () => password });
    completeRecoveryRequest(request);
  };

  const cancel = () => {
    request.resolve(null);
    completeRecoveryRequest(request);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="ws-display text-[20px]">{t("restoreTitle")}</div>
        <p className="mt-1.5 text-[13.5px] leading-[1.55] text-white/55">{t("restoreBody")}</p>
      </div>
      <label className={`${SECONDARY} grid cursor-pointer place-items-center truncate px-4`}>
        {file ? file.name : t("chooseFile")}
        <input
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => void pick(e.target.files?.[0])}
        />
      </label>
      {unreadable ? <p className="text-[13px] text-red-400">{t("fileUnreadable")}</p> : null}
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={t("restorePasswordPlaceholder")}
        autoComplete="current-password"
        className={INPUT}
      />
      <button onClick={restore} disabled={!file || !password} className={PRIMARY}>
        {t("restore")}
      </button>
      <button onClick={cancel} className={SECONDARY}>
        {t("cancelRestore")}
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
        ) : request.kind === "restore" ? (
          <RestoreDialog request={request} />
        ) : (
          <PasswordDialog request={request} />
        )}
      </div>
    </div>
  );
}

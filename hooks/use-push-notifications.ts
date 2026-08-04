"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

// Browser notifications for earn announcements.
//
// Push is strictly additive: every notification is also a row the app reads, so
// a browser that refuses permission, or does not support push at all, loses
// nothing but immediacy. Nothing here is required for the feature to work.

const SW_PATH = "/sw.js";

// A VAPID key travels as base64url and the subscription API wants bytes.
// Returns an ArrayBuffer rather than a view: TypeScript's BufferSource does not
// accept a Uint8Array over a generic ArrayBufferLike.
function urlBase64ToBytes(base64: string): ArrayBuffer {
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const raw = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes.buffer;
}

function supported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    "unsupported"
  );
  const [isEnabling, setEnabling] = useState(false);

  useEffect(() => {
    if (!supported()) return;
    setPermission(Notification.permission);
  }, []);

  const enable = useCallback(async () => {
    if (!supported()) return;
    setEnabling(true);
    try {
      // Asked only on a click, never on load: an unprompted permission dialog
      // is the one people dismiss forever.
      const granted = await Notification.requestPermission();
      setPermission(granted);
      if (granted !== "granted") return;

      const keyResponse = await apiFetch("/api/earn/notifications/vapid-key");
      const key = (await keyResponse.json())?.data?.publicKey;
      // No key configured means push is not set up on the server. Permission
      // is still granted, so this simply does nothing further.
      if (!key) return;

      const registration = await navigator.serviceWorker.register(SW_PATH);
      await navigator.serviceWorker.ready;

      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          // Required by every browser that implements push: a subscription
          // that cannot show a notification is not allowed.
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToBytes(key),
        }));

      await apiFetch(
        "/api/earn/notifications/subscribe",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription.toJSON()),
        },
        { requireAuth: true }
      );
    } catch {
      // Permission dialogs, service-worker registration and the push service
      // all fail in ways the reader cannot act on. The in-app list is
      // unaffected, so this stays quiet rather than raising a toast.
    } finally {
      setEnabling(false);
    }
  }, []);

  return {
    // Only worth offering while the answer is still open. Once granted or
    // denied there is nothing useful to ask.
    canAsk: permission === "default",
    isEnabled: permission === "granted",
    isEnabling,
    enable,
  };
}

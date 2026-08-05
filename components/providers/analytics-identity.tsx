"use client";

import { useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { identifyUser, resetAnalytics } from "@/lib/analytics/mixpanel";
import { deriveProfile } from "@/lib/user";

// Keeps Mixpanel's identity in step with Privy auth: identifies on login,
// resets on logout (mirroring how deriveProfile already reads the same
// user). Renders nothing; mounted once so no screen has to wire this itself.
export function AnalyticsIdentity(): null {
  const { ready, authenticated, user } = usePrivy();

  useEffect(() => {
    if (!ready) return;
    if (authenticated && user) {
      const profile = deriveProfile(user);
      identifyUser(user.id, {
        $email: profile.email || undefined,
        $name: profile.name,
      });
    } else {
      resetAnalytics();
    }
  }, [ready, authenticated, user]);

  return null;
}

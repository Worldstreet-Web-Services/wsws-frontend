"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { scrollToSection } from "@/lib/scroll";
import { isNavTarget } from "@/lib/voice/intent";

// The one place that knows how to move between app sections: "vault" is a real
// route, so it always navigates there; every other section is a scroll-spy
// anchor that only exists on /dashboard, so it scrolls in-page when already
// there and otherwise navigates to /dashboard#id first.
//
// Extracted from DashboardShell so the shell's chrome and the voice command
// dispatcher share a single implementation instead of drifting apart. The id is
// typed string (the shell's nav callbacks pass a plain string) and validated
// here, so an unrecognized id is a safe no-op rather than a bad route push.
export function useAppNavigate(): (id: string) => void {
  const router = useRouter();
  const pathname = usePathname();

  return useCallback(
    (id: string) => {
      if (!isNavTarget(id)) return;
      if (id === "vault") {
        router.push("/vault");
        return;
      }
      if (pathname === "/dashboard") {
        scrollToSection(id);
      } else {
        router.push(`/dashboard#${id}`);
      }
    },
    [router, pathname]
  );
}

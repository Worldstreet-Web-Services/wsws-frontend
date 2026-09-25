"use client";

// The Go Live control, in the two places the spec puts it.
//
// Mobile: the centre node of the existing tab bar, a ringed circle breaking
// the bar's top edge. It reads as floating without floating: Material 3 is
// explicit that a FAB must not obstruct the navigation bar, and a genuinely
// free-floating button permanently covers content underneath it. This gets the
// affordance with none of the occlusion, and lands in the thumb zone by
// construction.
//
// Desktop: pinned at the top of the rail above a divider, never an overlay.
//
// Always icon AND label. A bare icon here would be mystery meat, and this
// button starts a public broadcast of somebody's trading screen.

import { useState } from "react";
import { usePathname } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { deriveProfile } from "@/lib/user";
import { arkBroadcastTarget } from "@/components/broadcast/ark-target";
import { useBroadcastSession } from "@/components/broadcast/broadcast-session";
import { ShareFlow } from "@/components/broadcast/share-flow";
import { ArkLiveIcon as LiveIcon, ArkRailAction } from "@ark/chrome";

// Two to six items, laid out as a menu rather than a speed dial: mini-FAB
// stacks are unlabelled by nature and the spec rules them out.
/**
 * `tile` is the square's entry sheet: a square button in a three-up grid
 * beside Post and Media. It exists so that sheet reuses the REAL control —
 * session state, the broadcast target derived from the route, the whole menu —
 * rather than a lookalike button wired to a callback that has to be threaded
 * down and, as shipped, never was.
 */
export function GoLiveControl({ variant }: { variant: "tab" | "rail" | "tile" }) {
  const session = useBroadcastSession();
  const pathname = usePathname() ?? "/";
  const { user } = usePrivy();
  const [sharing, setSharing] = useState(false);

  const target = arkBroadcastTarget(pathname, deriveProfile(user).name);
  const live = session.live;

  /**
   * One press, straight into the broadcast picker.
   *
   * There used to be a menu here, and it was a tap that bought nothing: "Go
   * Live" and "Share screen" invoked the SAME handler, and the picker it opens
   * asks camera-or-screen as its first question anyway. So the menu made
   * people choose, then asked them to choose again.
   *
   * "Invite viewers" is gone with it. It copied the CURRENT PAGE URL to the
   * clipboard, which is not a link to the stream — and it silently claimed
   * success whether or not the clipboard was available.
   */
  const onPress = () => {
    if (live) {
      // While live the control stops offering to start a second broadcast and
      // becomes the way back into the console.
      setSharing(false);
      return;
    }
    setSharing(true);
  };

  const label = live ? "Live" : "Go Live";

  // The rail's look belongs to @ark/chrome, so the Go Live row matches the
  // rail it sits in on every app that renders it. The press and the flow it
  // opens stay here, with the broadcast session.
  if (variant === "rail") {
    return (
      <div className="relative w-full">
        <ArkRailAction
          label={label}
          live={live}
          onPress={onPress}
          dataAttributes={{ "data-tour": "go-live" }}
        />
        {sharing ? <ShareFlow target={target} onClose={() => setSharing(false)} /> : null}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onPress}
        data-tour="go-live"
        aria-label={label}
        title={label}
        className={
          variant === "tile"
            ? // The square's entry sheet: a square button matching Post and
              // Media beside it, so the three read as one row of choices.
              `ws-inset flex w-full cursor-pointer flex-col items-center gap-2 px-2 py-4 transition-colors hover:bg-white/5 ${
                live ? "ring-1 ring-violet-400/50" : ""
              }`
            : // Sits IN the bar at the same 44px height as every other tab.
              // It was a raised 52px node breaking the pill's top edge, which
              // overflowed the bar on a phone — the reason a raised node works
              // elsewhere is a full-width bar with room above it, and this is a
              // floating pill with neither. Distinction comes from the violet
              // ring and fill rather than from size or elevation, so it reads
              // as the one different thing in the row without leaving it.
              `pointer-events-auto grid size-11 shrink-0 cursor-pointer place-items-center rounded-full text-white ring-1 transition-colors ${
                live
                  ? "bg-violet-500 ring-violet-300/70"
                  : "bg-violet-500/22 ring-violet-400/55 hover:bg-violet-500/32"
              }`
        }
      >
        {variant === "tile" ? (
          <>
            <span className="text-accent grid size-6 place-items-center">
              <LiveIcon size={24} />
            </span>
            <span className="text-[12.5px] font-semibold text-white">{label}</span>
          </>
        ) : (
          <span className="grid size-5 place-items-center">
            <LiveIcon size={22} />
          </span>
        )}
      </button>

      {sharing ? <ShareFlow target={target} onClose={() => setSharing(false)} /> : null}
    </div>
  );
}

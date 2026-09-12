"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation } from "@tanstack/react-query";
import { setFollow, type SuggestedProfile } from "@/lib/api/market-square";
import { squareLinks } from "@/lib/square/links";
import { SquareAvatar } from "@/features/square/components/square-avatar";
import {
  IconDeckAdd,
  IconDeckPass,
  IconDeckWink,
} from "@/features/square/components/square-deck-icons";

// The Square's rail card for a person, at its own numbers
// (market-square-frontend/components/layout/pal-card.tsx, RAIL_CARD).
const CARD = { width: 170.41, height: 231.92, radius: 24 };
const PHOTO = { width: 148.17, height: 155.64, left: 11.07, top: 14.77, radius: 24.64 };
const SCRIM = {
  height: 67.67,
  name: 10.95,
  nameLeading: 18.77,
  handle: 7.71,
  handleLeading: 11.57,
};
const BADGE = { size: 36.3, inset: 6.77 };
const CONTROL = { box: 52.6, bottom: 4.46 };

/**
 * A person from "Make some friends", the Square's own pal card carried over:
 * the white-to-lavender ground, the photo with the name and handle on a
 * scrim at its foot, the follow badge on the photo's corner, and the pass
 * and wink discs under it, abutting, the wink lifted 3px as the file has it.
 *
 * What each control does, split the way the ADR splits them: following is
 * backed by this app's relay, so the badge is a real button; pass takes the
 * card off this rail, as it takes it off the Square's deck; a wink is the
 * Square's, so it opens the person's profile there. The photo is the same
 * link, because a face on a people card is expected to lead to the person.
 */
export function SquarePersonCard({
  person,
  onPass,
}: {
  person: SuggestedProfile;
  onPass: () => void;
}) {
  const t = useTranslations("square");
  const name = person.displayName || person.username;
  const href = squareLinks.profile(person.username);

  // Seeded from the directory's viewer state, owned locally afterwards so the
  // badge answers at once; put back on failure rather than left lying.
  const [following, setFollowing] = useState(person.isFollowing ?? false);
  const follow = useMutation({
    mutationFn: (next: boolean) => setFollow(person.id, next),
    onMutate: (next) => {
      const previous = following;
      setFollowing(next);
      return { previous };
    },
    onError: (_error, _next, context) => setFollowing(context?.previous ?? false),
  });

  const photo = (
    <>
      <SquareAvatar
        src={person.avatarUrl}
        seed={person.id}
        name={person.displayName}
        size={Math.round(PHOTO.height)}
      />
      <span
        className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end bg-[linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,1)_100%)] px-2 pb-2 font-[family-name:var(--font-roboto)]"
        style={{ height: SCRIM.height }}
      >
        <span
          className="w-full truncate text-center font-semibold text-white"
          style={{ fontSize: SCRIM.name, lineHeight: `${SCRIM.nameLeading}px` }}
        >
          {name}
        </span>
        <span
          className="w-full truncate text-center text-white/50"
          style={{ fontSize: SCRIM.handle, lineHeight: `${SCRIM.handleLeading}px` }}
        >
          @{person.username}
        </span>
      </span>
    </>
  );

  const photoStyle = {
    left: PHOTO.left,
    top: PHOTO.top,
    width: PHOTO.width,
    height: PHOTO.height,
    borderRadius: PHOTO.radius,
  };

  return (
    <article
      aria-label={name}
      className="relative shrink-0 snap-start"
      style={{ width: CARD.width, height: CARD.height }}
    >
      <span
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(180deg,#FFFFFF_0%,#D0B3FF_100%)]"
        style={{ borderRadius: CARD.radius }}
      />

      {/* Painted before the photo, so z-10 is what keeps it on top of it. */}
      <button
        type="button"
        disabled={follow.isPending}
        aria-pressed={following}
        aria-label={following ? t("unfollowName", { name }) : t("followName", { name })}
        onClick={() => follow.mutate(!following)}
        className="ws-pressable absolute z-10 transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{ width: BADGE.size, height: BADGE.size, right: BADGE.inset, top: BADGE.inset }}
      >
        <IconDeckAdd className={`h-full w-full ${following ? "opacity-50" : ""}`} />
      </button>

      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={name}
          className="absolute block overflow-hidden"
          style={photoStyle}
        >
          {photo}
        </a>
      ) : (
        <span className="absolute block overflow-hidden" style={photoStyle}>
          {photo}
        </span>
      )}

      {/* The two discs abut: each export carries its own padding, and that
          padding is the gap. */}
      <div
        className="absolute inset-x-0 flex items-center justify-center"
        style={{ bottom: CONTROL.bottom, gap: 0 }}
      >
        <button
          type="button"
          onClick={onPass}
          aria-label={t("skipName", { name })}
          className="ws-pressable shrink-0 transition-opacity hover:opacity-90"
          style={{ width: CONTROL.box, height: CONTROL.box }}
        >
          <IconDeckPass className="h-full w-full" />
        </button>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("winkAt", { name })}
            className="ws-pressable block shrink-0 -translate-y-[3px] transition-opacity hover:opacity-90"
            style={{ width: CONTROL.box, height: CONTROL.box }}
          >
            <IconDeckWink className="h-full w-full" />
          </a>
        ) : null}
      </div>
    </article>
  );
}

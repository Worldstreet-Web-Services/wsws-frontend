"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { squareLinks } from "@/lib/square/links";
import { useSquarePeople } from "@/features/square/hooks/use-square-home";
import {
  SquareHomeRail,
  SquareHomeSection,
} from "@/features/square/components/square-home-section";
import { SquarePersonCard } from "@/features/square/components/square-person-card";

/**
 * "Make some friends": Home's deck of people, busiest first, on the
 * Square's own card, with the reader left out of it. The reader is not
 * someone to meet, and offering them their own follow badge is the one
 * thing the card must never do.
 *
 * Passing takes a card off the rail for this visit, as it takes it off the
 * Square's deck; the Square's swipe gesture and its verdict stamps are its
 * own and are not here. Views more at the Square's pals page, as Home does.
 */
export function SquareHomePeople({ meId }: { meId?: string }) {
  const t = useTranslations("square");
  const people = useSquarePeople();
  const [passed, setPassed] = useState<ReadonlySet<string>>(() => new Set());
  const items = useMemo(
    () =>
      (people.data ?? []).filter(
        (person) => (meId === undefined || person.id !== meId) && !passed.has(person.id)
      ),
    [people.data, meId, passed]
  );

  return (
    <SquareHomeSection
      id="square-make-some-friends"
      lead={t("homeFriendsLead")}
      accent={t("homeFriendsAccent")}
      subtitle={t("homeFriendsBlurb")}
      viewMore={{ label: t("viewMore"), href: squareLinks.pals() }}
      loading={people.isPending}
      loadingLabel={t("loading")}
      error={people.error}
      errorSubject={t("peopleSubject")}
      unconfiguredDetail={t("unconfigured")}
      onRetry={() => void people.refetch()}
      empty={items.length === 0}
    >
      <SquareHomeRail gap={16}>
        {items.map((person) => (
          <SquarePersonCard
            key={person.id}
            person={person}
            onPass={() => setPassed((prev) => new Set(prev).add(person.id))}
          />
        ))}
      </SquareHomeRail>
    </SquareHomeSection>
  );
}

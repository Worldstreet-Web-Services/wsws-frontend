import { notFound } from "next/navigation";
import {
  DiscoveryEventDetail,
  MarketsHeader,
  resolveMarketNavigation,
  SportsEventDetail,
} from "@/features/prediction/markets";
import { isNormalSportCategory } from "@/features/prediction/markets/types";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function PredictionMarketEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: SearchParams;
}) {
  const { eventId } = await params;
  if (!/^\d+$/.test(eventId)) notFound();
  const { activeCategory, activeLeague } = resolveMarketNavigation(await searchParams);

  return (
    <main className="min-h-screen bg-black">
      <MarketsHeader activeCategory={activeCategory} activeLeague={activeLeague} />
      <div className="mx-auto w-full max-w-[1000px] px-4 py-5 sm:px-5 lg:px-0">
        {isNormalSportCategory(activeCategory) ? (
          <SportsEventDetail eventId={eventId} sport={activeCategory} activeLeague={activeLeague} />
        ) : (
          <DiscoveryEventDetail category={activeCategory} eventId={eventId} />
        )}
      </div>
    </main>
  );
}

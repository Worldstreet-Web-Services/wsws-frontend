import { notFound } from "next/navigation";
import {
  DiscoveryEventDetail,
  MarketsHeader,
  resolveMarketNavigation,
  SportsEventDetail,
} from "@/features/prediction/markets";

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
  const { activeCategory, activeSportsNav } = resolveMarketNavigation(await searchParams);

  return (
    <main className="min-h-screen bg-black">
      <MarketsHeader activeCategory={activeCategory} activeSportsNav={activeSportsNav} />
      <div className="mx-auto w-full max-w-[1000px] px-4 py-5 sm:px-5 lg:px-0">
        {activeCategory === "sports" ? (
          <SportsEventDetail eventId={eventId} activeSportsNav={activeSportsNav} />
        ) : (
          <DiscoveryEventDetail category={activeCategory} eventId={eventId} />
        )}
      </div>
    </main>
  );
}

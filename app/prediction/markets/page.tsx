import {
  MarketsHeader,
  MarketsWorkspace,
  resolveMarketNavigation,
} from "@/features/prediction/markets";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function PredictionMarketsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { activeCategory, activeLeague } = resolveMarketNavigation(await searchParams);

  return (
    <main className="min-h-screen bg-black">
      <MarketsHeader activeCategory={activeCategory} activeLeague={activeLeague} />
      <MarketsWorkspace activeCategory={activeCategory} activeLeague={activeLeague} />
    </main>
  );
}

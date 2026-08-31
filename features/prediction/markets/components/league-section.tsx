import type { BoardSelection, LeagueBoardGroup } from "../presenter";
import type { SportsNavKey } from "../types";
import { FixtureRow } from "./fixture-row";
import { ProviderArtwork } from "./provider-artwork";

interface LeagueSectionProps {
  group: LeagueBoardGroup;
  selectedIds: ReadonlySet<string>;
  onSelect: (selection: BoardSelection) => void;
  onRemoveSelection: (selectionId: string) => void;
  activeSportsNav: SportsNavKey;
}

function fixtureDate(startTime: string | null): string {
  if (!startTime) return "Date to be confirmed";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(new Date(startTime));
}

export function LeagueSection({
  group,
  selectedIds,
  onSelect,
  onRemoveSelection,
  activeSportsNav,
}: LeagueSectionProps) {
  const byDate = new Map<string, typeof group.fixtures>();
  for (const fixture of group.fixtures) {
    const label = fixtureDate(fixture.startTime);
    const existing = byDate.get(label);
    if (existing) existing.push(fixture);
    else byDate.set(label, [fixture]);
  }

  return (
    <section className="overflow-hidden rounded-[10px] border border-white/9 bg-[#111114] shadow-[0_18px_50px_rgba(0,0,0,0.25)]">
      <header className="flex min-h-14 items-center gap-3 border-b border-white/8 bg-[linear-gradient(180deg,#1c1c20_0%,#151518_100%)] px-4">
        <ProviderArtwork
          src={group.imageUrl}
          alt={`${group.name} logo`}
          initials={group.name}
          size="league"
        />
        <div className="min-w-0">
          <h2 className="truncate text-[14px] font-extrabold text-white">{group.name}</h2>
          <p className="mt-0.5 text-[10px] font-semibold tracking-[0.08em] text-white/35 uppercase">
            Matches
          </p>
        </div>
      </header>

      <div className="[scrollbar-width:thin] overflow-x-auto">
        <div className="min-w-[850px]">
          <div className="grid grid-cols-[minmax(260px,1fr)_repeat(3,82px)_58px_repeat(2,82px)_52px] gap-1.5 bg-black/25 px-3 py-2 text-center text-[9px] font-bold tracking-[0.09em] text-white/35 uppercase">
            <span className="text-left">Fixture</span>
            <span>1</span>
            <span>X</span>
            <span>2</span>
            <span>Goals</span>
            <span>Over</span>
            <span>Under</span>
            <span>More</span>
          </div>

          {[...byDate.entries()].map(([date, fixtures]) => (
            <div key={date}>
              <div className="border-t border-white/[0.065] bg-white/[0.025] px-3 py-1.5 text-[10px] font-bold tracking-[0.08em] text-white/42 uppercase">
                {date}
              </div>
              {fixtures.map((fixture) => (
                <FixtureRow
                  key={fixture.id}
                  fixture={fixture}
                  selectedIds={selectedIds}
                  onSelect={onSelect}
                  onRemoveSelection={onRemoveSelection}
                  detailHref={`/prediction/markets/${fixture.id}?sport=${activeSportsNav}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

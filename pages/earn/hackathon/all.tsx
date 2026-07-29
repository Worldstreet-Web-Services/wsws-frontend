import { Home } from '@earn/layouts/Home';

import { HackathonSection } from '@earn/features/hackathon/components/HackathonSection';

export default function AllListingsPage() {
  return (
    <Home type="listing">
      <div className="w-full">
        <HackathonSection type="all" />
      </div>
    </Home>
  );
}

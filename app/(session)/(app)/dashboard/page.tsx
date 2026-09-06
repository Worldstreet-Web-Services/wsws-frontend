import { Suspense } from "react";
import { QueryHydration } from "@/components/providers/query-hydration";
import { dehydratedPortfolio } from "@/lib/server/portfolio-snapshot";
import { DashboardPage } from "./dashboard-page";

// The server half of the dashboard. It starts the balance prefetch for the
// session in the cookie and hands the promise down without awaiting it, so
// the page streams at once and the balance lands in the query cache as soon
// as Alchemy answers: usually before the browser has finished starting Privy,
// which is what the balance used to wait on. See lib/server/portfolio-snapshot.
//
// The Suspense boundary is around the hydration alone. Awaiting the snapshot
// here would block the whole page on it, which is the one thing this must not
// do; wrapped this way the fallback is nothing and the rest renders freely.
export default function Page() {
  const snapshot = dehydratedPortfolio();
  return (
    <>
      <Suspense fallback={null}>
        <QueryHydration snapshot={snapshot} />
      </Suspense>
      <DashboardPage />
    </>
  );
}

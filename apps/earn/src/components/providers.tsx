import { PrivyProvider, usePrivy } from '@privy-io/react-auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { ExternalLinkDialogProvider } from '@earn/components/shared/ExternalLinkDialogProvider';

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <PrivyProvider
      config={{
        loginMethods: ['email', 'google', 'twitter'],
      }}
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
    >
      <QueryClientProvider client={queryClient}>
        <ExternalLinkDialogProvider>
          <PrivyInitFlagBridge />
          {children}
        </ExternalLinkDialogProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}

function PrivyInitFlagBridge(): null {
  const { ready } = usePrivy();
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__privyInitializing = !ready;
    }
  }, [ready]);
  return null;
}

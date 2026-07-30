import { type ReactNode } from 'react';

import { Meta } from '@earn/layouts/Meta';
import { cn } from '@earn/utils/cn';

import { Header } from './Header';

interface LayoutProps {
  children: ReactNode;
  className?: string;
}

export function ListingBuilderFormLayout({
  className,
  children,
  ...props
}: LayoutProps) {
  return (
    <div
      className={cn(
        'bg-background flex min-h-screen flex-col justify-between',
        className,
      )}
      {...props}
    >
      <Meta
        title="Create a Listing | TSION Earn"
        description="Create a listing on TSION Earn and gain access to thousands of high quality talent"
      />
      <Header />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}

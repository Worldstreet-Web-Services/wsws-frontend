import { Wallet } from 'lucide-react';

import { cn } from '@earn/utils/cn';

interface WalletConnectionBadgeProps {
  className?: string;
}

export function WalletConnectionBadge({
  className,
}: WalletConnectionBadgeProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2',
        className,
      )}
    >
      <Wallet className="h-4 w-4 text-slate-600" />
      <span className="text-sm font-medium text-slate-900">
        Manual payments
      </span>
    </div>
  );
}

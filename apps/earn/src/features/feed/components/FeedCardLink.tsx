import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { type ReactNode } from 'react';

import { useExternalLinkDialog } from '@earn/components/shared/ExternalLinkDialogProvider';
import { cn } from '@earn/utils/cn';
import { getURLSanitized } from '@earn/utils/getURLSanitized';

export const FeedCardLink = ({
  href,
  style,
  children,
}: {
  href: string | undefined;
  style?: React.HTMLAttributes<HTMLDivElement>['className'];
  children: ReactNode;
}) => {
  const { handleExternalLinkClick } = useExternalLinkDialog();
  const sanitizedHref = getURLSanitized(href ?? '#');

  return (
    <div
      className={cn(
        'group-hover:underline-none flex items-center gap-2 whitespace-nowrap',
        style,
      )}
    >
      <Link
        href={sanitizedHref}
        rel="noopener noreferrer"
        target="_blank"
        className="hover:decoration-brand-grey flex items-center gap-3 hover:underline hover:underline-offset-2"
        onClick={(event) => handleExternalLinkClick(event, sanitizedHref)}
      >
        <span className="text-brand-grey text-xs font-medium md:text-base">
          {children}
        </span>
        <ArrowRight className="text-brand-grey hidden h-4 w-4 sm:block" />
      </Link>
    </div>
  );
};

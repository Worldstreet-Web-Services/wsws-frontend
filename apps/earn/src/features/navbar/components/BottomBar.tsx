import Link from 'next/link';
import { useRouter } from 'next/router';

import GoHome from '@earn/components/icons/GoHome';
import IoNewspaperOutline from '@earn/components/icons/IoNewspaperOutline';
import IoSearchOutline from '@earn/components/icons/IoSearchOutline';
import { Button } from '@earn/components/ui/button';
import { useUser } from '@earn/store/user';
import { cn } from '@earn/utils/cn';

import { AuthWrapper } from '@earn/features/auth/components/AuthWrapper';
import { EarnAvatar } from '@earn/features/talent/components/EarnAvatar';

interface Props {
  onSearchOpen: () => void;
}

export function BottomBar({ onSearchOpen }: Props) {
  const { user } = useUser();
  const router = useRouter();

  function setColor(href: string, routerPath: string) {
    return routerPath === href || routerPath === `/earn${href}`
      ? user?.isPro
        ? 'text-zinc-800'
        : 'text-brand-grey'
      : 'text-slate-500';
  }

  const linkStyle = {
    WebkitTapHighlightColor: 'transparent',
  } as React.CSSProperties;

  if (router.asPath.startsWith('/earn/new/')) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex w-full justify-between border-t border-slate-200 bg-white px-4 py-2',
        'lg:hidden',
      )}
    >
      <Button
        variant="ghost"
        className={cn(
          setColor('/earn', router.asPath),
          'w-12 hover:bg-transparent active:bg-transparent',
        )}
        asChild
      >
        <Link href="/earn" style={linkStyle}>
          <GoHome
            style={{
              width: '1.7rem',
              height: '1.7rem',
              strokeWidth: 0.2,
            }}
          />
        </Link>
      </Button>

      <Button
        variant="ghost"
        onClick={onSearchOpen}
        style={linkStyle}
        className={cn(
          setColor('/earn/search', router.pathname),
          'w-12 hover:bg-transparent active:bg-transparent',
        )}
      >
        <IoSearchOutline
          style={{
            width: '1.6rem',
            height: '1.6rem',
            strokeWidth: 1.5,
          }}
        />
      </Button>

      <Button
        variant="ghost"
        className={cn(
          setColor('/earn/feed/', router.asPath),
          'relative w-12 hover:bg-transparent active:bg-transparent',
        )}
        asChild
      >
        <Link href="/earn/feed/" style={linkStyle}>
          <IoNewspaperOutline
            style={{
              width: '1.55rem',
              height: '1.55rem',
            }}
          />
          <div className="absolute top-1 right-3 h-2.5 w-2.5 rounded-full bg-red-500" />
        </Link>
      </Button>

      <AuthWrapper>
        <Button
          variant="ghost"
          className={cn(
            setColor(`/earn/t/${user?.username}/`, router.asPath),
            'w-12 hover:bg-transparent active:bg-transparent',
          )}
          asChild
        >
          <Link
            href={`/earn/t/${user?.username}`}
            style={{
              ...linkStyle,
              pointerEvents: user ? 'auto' : 'none',
            }}
          >
            <EarnAvatar className="size-7" id={user?.id} avatar={user?.photo} />
          </Link>
        </Button>
      </AuthWrapper>
    </div>
  );
}

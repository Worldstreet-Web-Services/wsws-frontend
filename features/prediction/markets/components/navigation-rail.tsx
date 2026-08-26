import Link from "next/link";
import type { MarketNavItem } from "../types";

interface NavigationRailProps<Key extends string> {
  activeKey: Key;
  ariaLabel: string;
  items: Array<MarketNavItem<Key>>;
  variant: "primary" | "secondary";
}

export function NavigationRail<Key extends string>({
  activeKey,
  ariaLabel,
  items,
  variant,
}: NavigationRailProps<Key>) {
  const primary = variant === "primary";

  return (
    <div
      aria-label={ariaLabel}
      className={`flex [scrollbar-width:none] items-stretch overflow-x-auto [&::-webkit-scrollbar]:hidden ${
        primary ? "min-h-[50px]" : "min-h-[41px]"
      }`}
    >
      {items.map((item) => {
        const active = item.key === activeKey;

        if (primary) {
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`group flex min-h-[50px] min-w-[82px] shrink-0 items-center justify-center px-3 text-center text-[13px] leading-[1.05] font-semibold whitespace-nowrap transition-[background,color,transform] lg:min-w-0 lg:flex-1 ${
                active
                  ? "bg-[linear-gradient(180deg,#dedee2_0%,#bdbdc3_100%)] text-[#0a0a0b] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] lg:[transform:skewX(-6deg)]"
                  : "text-white/52 hover:bg-white/[0.055] hover:text-white/85"
              }`}
            >
              <span className={active ? "lg:[transform:skewX(6deg)]" : undefined}>
                {item.label}
              </span>
            </Link>
          );
        }

        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`relative inline-flex min-h-[41px] shrink-0 items-center justify-center px-[13px] pt-[11px] pb-[7px] text-[13px] leading-[19px] whitespace-nowrap transition-colors after:absolute after:right-[13px] after:bottom-0 after:left-[13px] after:h-[3px] ${
              active
                ? "font-bold text-white after:bg-[#d4d4d8]"
                : "font-semibold text-white/48 after:bg-transparent hover:text-white/80 hover:after:bg-white/25"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

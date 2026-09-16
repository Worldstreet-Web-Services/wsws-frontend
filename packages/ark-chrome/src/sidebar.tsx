"use client";

import { useEffect, useRef, useState } from "react";
import { usePendingCrossing } from "./crossing";
import { ArkLogo } from "./logo";
import { ArkRailAction } from "./rail-action";
import { TargetElement } from "./target";
import type { ArkSidebarClassName, ArkSidebarProps, ChromeNavItem, ChromePerson } from "./types";

function cx(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/**
 * Ark's left rail. From 768px up it is fixed and always visible. Below that it
 * is a drawer: off-canvas until the host opens it, then it slides in over a
 * dimmed page and closes on a choice, on the backdrop, on Escape, or on its own
 * close button. One component for both, so the nav can never differ between
 * the two, or between the apps that render it.
 *
 * Everything it shows comes from props: the rows, which one is lit, the
 * person, the strings. It reads no router, no session and no catalogue.
 */
export function ArkSidebar({
  items,
  activeId,
  onSelect,
  Link,
  DocumentLink,
  brand,
  goLive,
  primaryAction,
  person,
  AccountMenu,
  onProfilePress,
  drawer,
  layout = "responsive",
  labels,
  id = "ark-chrome-sidebar",
  profileDataAttributes,
  classNames = {},
}: ArkSidebarProps) {
  const { open, onClose } = drawer;
  const crossing = usePendingCrossing(activeId);
  const lit = crossing.pendingId ?? activeId;
  const alwaysDrawer = layout === "drawer";
  const marker = (name: ArkSidebarClassName) => classNames[name];

  const asideRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  // What had focus when the drawer opened, to hand focus back on close.
  const openerRef = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);

  // An opening drawer takes focus, so a keyboard reader is not left on a
  // control behind the backdrop; a closing one gives it back, since the
  // element that had it is being hidden. Focus is only returned when it is
  // still in the drawer (or nowhere): a host that moved it on purpose keeps
  // that. A host with its own focus management runs its effect after this one
  // and wins.
  useEffect(() => {
    const aside = asideRef.current;
    if (open) {
      wasOpen.current = true;
      const active = document.activeElement;
      if (active instanceof HTMLElement && aside?.contains(active)) return;
      openerRef.current = active instanceof HTMLElement && active !== document.body ? active : null;
      closeRef.current?.focus();
      return;
    }
    if (!wasOpen.current) return;
    wasOpen.current = false;
    const opener = openerRef.current;
    openerRef.current = null;
    const active = document.activeElement;
    const focusInDrawer = active === null || active === document.body || aside?.contains(active);
    if (opener?.isConnected && focusInDrawer) opener.focus();
  }, [open]);

  // While the drawer is open the page behind it does not scroll, and Escape
  // closes it. Both undone on close and on unmount.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const renderRow = (item: ChromeNavItem) => {
    const on = lit === item.id;
    const pending = crossing.pendingId === item.id;
    return (
      <TargetElement
        key={item.id}
        target={item.target}
        Link={Link}
        DocumentLink={DocumentLink}
        current={activeId === item.id}
        pending={pending}
        busy={pending && crossing.busy}
        dataAttributes={{ "data-ark-nav": item.id, ...item.dataAttributes }}
        className={cx(
          "ark-chrome-row",
          on && "ark-chrome-row--active",
          marker("row"),
          on ? marker("rowActive") : marker("rowIdle")
        )}
        onActivate={() => {
          if (item.target.kind === "action") onSelect?.(item);
          onClose();
        }}
        onCrossing={() => {
          if (item.id !== activeId) crossing.start(item.id);
        }}
      >
        <span className="ark-chrome-icon-slot">
          <item.icon size={20} />
        </span>
        <span className="ark-chrome-grow">{item.label}</span>
      </TargetElement>
    );
  };

  return (
    <>
      {/* The dimmed page behind the drawer. */}
      <div
        aria-hidden
        onClick={onClose}
        data-open={open ? "" : undefined}
        className={cx(
          "ark-chrome-root ark-chrome-backdrop",
          alwaysDrawer && "ark-chrome-backdrop--drawer",
          marker("backdrop")
        )}
      />
      <aside
        ref={asideRef}
        id={id}
        aria-label={labels.menu}
        data-open={open ? "" : undefined}
        className={cx(
          "ark-chrome-root ark-chrome-aside",
          alwaysDrawer && "ark-chrome-aside--drawer",
          marker("aside")
        )}
      >
        <div className="ark-chrome-header">
          <TargetElement
            target={brand.target}
            Link={Link}
            DocumentLink={DocumentLink}
            current={false}
            ariaLabel={brand.label}
            className="ark-chrome-brand"
            onActivate={onClose}
          >
            <ArkLogo className="ark-chrome-brand-logo" />
          </TargetElement>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={labels.closeMenu}
            className="ark-chrome-close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* The rail's primary action sits at the top, above a divider, never
            as a floating overlay. */}
        <div className="ark-chrome-action-slot">
          {primaryAction ?? (goLive ? <ArkRailAction {...goLive} /> : null)}
        </div>
        <div className="ark-chrome-divider" />

        {/* On a short viewport the nav list is the part that scrolls, so the
            logo above and the account footer below stay reachable. */}
        <nav className={cx("ark-chrome-nav", marker("nav"))}>{items.map(renderRow)}</nav>

        <Footer
          person={person}
          AccountMenu={AccountMenu}
          onProfilePress={onProfilePress}
          profileDataAttributes={profileDataAttributes}
          className={cx("ark-chrome-footer", marker("footer"))}
        />
      </aside>
    </>
  );
}

function Footer({
  person,
  AccountMenu,
  onProfilePress,
  profileDataAttributes,
  className,
}: Pick<ArkSidebarProps, "AccountMenu" | "onProfilePress" | "profileDataAttributes"> & {
  person: ChromePerson;
  className: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  if (person.status === "loading") {
    return (
      <div className={className} aria-busy="true">
        <div className="ark-chrome-profile ark-chrome-profile--loading">
          <span className="ark-chrome-skeleton ark-chrome-skeleton--avatar" />
          <span className="ark-chrome-skeleton ark-chrome-skeleton--name" />
        </div>
      </div>
    );
  }

  if (person.status === "signed-out") {
    return (
      <div className={className}>
        <button
          type="button"
          onClick={person.onSignIn}
          className="ark-chrome-profile ark-chrome-profile--sign-in"
          {...profileDataAttributes}
        >
          <span className="ark-chrome-sign-in-mark" aria-hidden>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M10 17l5-5-5-5M15 12H3M14 4h4a2 2 0 012 2v12a2 2 0 01-2 2h-4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="ark-chrome-grow ark-chrome-min-w-0">
            <span className="ark-chrome-name">{person.signInLabel}</span>
          </span>
        </button>
      </div>
    );
  }

  const hasMenu = AccountMenu !== undefined;
  return (
    <div className={className}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup={hasMenu ? "menu" : undefined}
        aria-expanded={hasMenu ? menuOpen : undefined}
        onClick={() => (hasMenu ? setMenuOpen((v) => !v) : onProfilePress?.())}
        className="ark-chrome-profile"
        {...profileDataAttributes}
      >
        {person.avatar}
        <span className="ark-chrome-grow ark-chrome-min-w-0">
          <span className="ark-chrome-name">{person.name}</span>
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M8 9l4-4 4 4M8 15l4 4 4-4"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Always mounted while signed in: a host menu plays its own exit
          animation off `open`, and unmounting it here would skip that frame. */}
      {AccountMenu ? (
        <AccountMenu open={menuOpen} onClose={() => setMenuOpen(false)} triggerRef={triggerRef} />
      ) : null}
    </div>
  );
}

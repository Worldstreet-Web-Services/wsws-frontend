import type { ComponentType, MouseEvent, ReactNode, RefObject } from "react";

/**
 * How an item is reached from the page that renders the chrome.
 *
 * - `document`: a page of another app on the same domain. Always a full
 *   document navigation, rendered as a plain `<a>`, or through `DocumentLink`
 *   when `prefetch` is true and the host passed one.
 * - `link`: a route of the host app, rendered through the host's `Link`.
 * - `action`: handled by the host (scroll-spy, a router push, a sheet),
 *   rendered as `<button type="button">` and reported through `onSelect`.
 *   `href` is informational only.
 */
export type ChromeTarget =
  | { kind: "document"; href: string; prefetch?: boolean }
  | { kind: "link"; href: string }
  | { kind: "action"; href?: string };

/** A target that is a real address: the brand lockup is never an action. */
export type ChromeHrefTarget = Extract<ChromeTarget, { kind: "document" | "link" }>;

export interface ChromeIconProps {
  size?: number;
  className?: string;
}

export type ChromeIcon = ComponentType<ChromeIconProps>;

/** Extra `data-*` attributes passed through to the rendered element. */
export type ChromeDataAttributes = Record<`data-${string}`, string>;

export interface ChromeNavItem {
  /** Stable key. Also rendered as `data-ark-nav`. */
  id: string;
  /** The rail shows it as text; the tab bar uses it as the accessible name. */
  label: string;
  icon: ChromeIcon;
  target: ChromeTarget;
  dataAttributes?: ChromeDataAttributes;
  /**
   * A count drawn on the item, such as unread messages. `null` or absent (the
   * host does not know) and `0` draw nothing; above 99 it reads "99+". The
   * count is added to the item's accessible name: "Chat, 3".
   */
  badge?: number | null;
}

/** The props the chrome passes to an injected link component. */
export interface ChromeLinkProps {
  href: string;
  className?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  "aria-current"?: "page";
  "aria-busy"?: boolean;
  "aria-label"?: string;
  // Required, so a link component that insists on children (the
  // microfrontends Link does) is accepted as well as next/link.
  children: ReactNode;
  [dataAttribute: `data-${string}`]: string | undefined;
}

export type ChromeLinkComponent = ComponentType<ChromeLinkProps>;

/** The person in the rail's footer. */
export type ChromePerson =
  /** The host does not know yet. A placeholder of the same size, so nothing shifts. */
  | { status: "loading" }
  | { status: "signed-out"; signInLabel: string; onSignIn: () => void }
  /** `avatar` is drawn by the host at 32px. */
  | { status: "signed-in"; name: string; avatar: ReactNode };

export interface AccountMenuProps {
  open: boolean;
  onClose: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
}

export interface ArkRailActionProps {
  label: string;
  onPress: () => void;
  /** Draws the pressed, on-air look. */
  live?: boolean;
  /** Defaults to the broadcast glyph. */
  icon?: ChromeIcon;
  dataAttributes?: ChromeDataAttributes;
}

/**
 * Where a host's marker class names go. The state-dependent ones (`asideOpen`,
 * `asideClosed`, `rowActive`, `rowIdle`) are applied by the package from the
 * same state it draws with, so a marker never claims a state the chrome is not
 * showing.
 */
export type ArkSidebarClassName =
  | "backdrop"
  | "aside"
  | "asideOpen"
  | "asideClosed"
  | "nav"
  | "row"
  | "rowActive"
  | "rowIdle"
  | "footer";

export interface ArkSidebarProps {
  /** Rows in their final order. */
  items: readonly ChromeNavItem[];
  /** The lit row. `null` lights none. */
  activeId: string | null;
  /** Called for `action` items. The drawer is closed after it. */
  onSelect?: (item: ChromeNavItem) => void;
  /** Renders `link` items. */
  Link: ChromeLinkComponent;
  /** Renders `document` items that ask for `prefetch`. Plain `<a>` otherwise. */
  DocumentLink?: ChromeLinkComponent;
  /** The mARKet lockup at the top of the rail. `label` names the link when given. */
  brand: { target: ChromeHrefTarget; label?: string };
  /** A Go Live button drawn by the package, reporting presses to the host. */
  goLive?: ArkRailActionProps;
  /** A host-owned control in the same slot, for a host whose control keeps its own state. Wins over `goLive`. */
  primaryAction?: ReactNode;
  person: ChromePerson;
  /** The signed-in footer's menu. Always mounted while signed in, so it can animate out on `open`. */
  AccountMenu?: ComponentType<AccountMenuProps>;
  /** Called when the signed-in footer is pressed and there is no `AccountMenu`. */
  onProfilePress?: () => void;
  /** Phone drawer state. Ignored from 768px up unless `layout` is `drawer`. */
  drawer: { open: boolean; onClose: () => void };
  /** `responsive` (default): a fixed rail from 768px up, a drawer below. `drawer`: a drawer at every width. */
  layout?: "responsive" | "drawer";
  labels: { menu: string; closeMenu: string };
  /** The aside's id. */
  id?: string;
  profileDataAttributes?: ChromeDataAttributes;
  /** Extra class names for host tests and tooling. They do not restyle the chrome. */
  classNames?: Partial<Record<ArkSidebarClassName, string>>;
}

export interface ArkTab extends ChromeNavItem {
  /** Draws its own fills, so it never takes the dimmed colour. */
  ownColour?: boolean;
}

export interface ArkTabBarProps {
  /** Exactly five, in their resting left-to-right order. */
  tabs: readonly [ArkTab, ArkTab, ArkTab, ArkTab, ArkTab];
  /** The tab that rides to the centre seat. `null` keeps the resting order. */
  activeId: string | null;
  /** The name under the dome for the active tab. Falls back to the tab's label. */
  activeLabel?: string | null;
  /** Called for `action` tabs. */
  onSelect?: (tab: ArkTab) => void;
  Link: ChromeLinkComponent;
  DocumentLink?: ChromeLinkComponent;
  /** The nav landmark's name. */
  navLabel: string;
  /** Hides the bar, for a host screen that needs the bottom edge (an open composer). */
  hidden?: boolean;
}

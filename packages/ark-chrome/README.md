# @ark/chrome

Ark's desktop sidebar (the rail) and phone tab bar (the dome), as React
components driven entirely by props. WSWS (`www.tsionark.com`) renders its own
chrome through this package, and the Market Square installs it, so a page of
either app shows the same chrome from the same source.

Decision record: `docs/adr/ADR-2026-09-16-square-microfrontend.md`, section 6.

## What the package does not do

It imports React, React DOM and `motion` only. There is no router, no
`next/link`, no `next-intl`, no Privy, no TanStack Query and nothing from WSWS.
The host passes:

- the items, their labels and where each one goes,
- which item is active,
- the signed-in person, or a sign-in callback,
- a link component for its own routes,
- callbacks for everything that needs the host: selecting a host action, Go
  Live, sign-in, the account menu, closing the drawer.

`packages/ark-chrome/src/isolation.test.ts` and the ESLint rules in the WSWS
repository fail on any other import.

## Install

The package is not published to a registry. Install it from the WSWS
repository at a tag:

```sh
pnpm add "github:Worldstreet-Web-Services/wsws-frontend#ark-chrome-v1.0.0&path:/packages/ark-chrome"
```

A chrome change ships as a new `ark-chrome-v<version>` tag, and the host bumps
the tag in its `package.json`.

The package ships TypeScript source, not a build. pnpm does not run build
scripts for git dependencies, so a host compiles it:

```ts
// next.config.ts
const nextConfig: NextConfig = {
  transpilePackages: ["@ark/chrome"],
};
```

Import the stylesheet once, in the root layout:

```tsx
// app/layout.tsx
import "@ark/chrome/styles.css";
// Only if the host does not already load Mona Sans (see Fonts):
import "@ark/chrome/fonts.css";
```

Peer dependencies: `react` and `react-dom` 19.2 or later, `motion` 12.42 or
later. Requirements: a bundler that resolves `package.json` `exports`, compiles
TypeScript and JSX from `node_modules` and resolves `url()` in imported CSS.
Next.js with `transpilePackages` does all four.

## Exports

| Import                        | What it is                                                                                                                                                                                                                                |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@ark/chrome`                 | `ArkSidebar`, `ArkTabBar`, `ArkDrawerTrigger`, `ArkRailAction`, `ArkLogo`, `ArkNavIcons`, `ArkTabIcons`, `ArkLiveIcon`, the layout constants (`ARK_TABBAR_Z_INDEX`, `arkTabBarInset()`, `ARK_CHROME_BREAKPOINT_PX`), and every type below |
| `@ark/chrome/icons`           | The icons alone. Not a client module, so a server component can render them                                                                                                                                                               |
| `@ark/chrome/logo`            | `ArkLogo`, the animated mARKet lockup                                                                                                                                                                                                     |
| `@ark/chrome/styles.css`      | Required. Plain, unlayered CSS; every selector is an `.ark-chrome-*` class                                                                                                                                                                |
| `@ark/chrome/fonts.css`       | Optional. `@font-face` for Mona Sans as "Ark Chrome Display"                                                                                                                                                                              |
| `@ark/chrome/transitions.css` | Optional. Keeps the chrome still across a navigation between apps with cross-document view transitions. Works only if every app imports it                                                                                                |

## Props contract

### Items and targets

```ts
type ChromeTarget =
  | { kind: "document"; href: string; prefetch?: boolean } // another app: <a>, full page load
  | { kind: "link"; href: string } // a route of this app: the host's Link
  | { kind: "action"; href?: string }; // handled by the host: <button>, reported to onSelect

interface ChromeNavItem {
  id: string; // stable key, also rendered as data-ark-nav
  label: string; // rail text; tab bar accessible name
  icon: ComponentType<{ size?: number; className?: string }>;
  target: ChromeTarget;
  dataAttributes?: Record<`data-${string}`, string>;
  badge?: number | null; // a count: unread chats, notifications
  children?: readonly ChromeNavItem[]; // the item's own pages, listed in the rail while it is active
}
```

How each kind renders:

- `document` renders a plain `<a href>`. When `prefetch` is `true` and the host
  passed `DocumentLink`, it renders `DocumentLink` instead. It never renders the
  host's `Link`: a client-side router cannot find another app's routes.
- `link` renders the host's `Link` (`next/link` in both apps).
- `action` renders `<button type="button">` and calls `onSelect(item)`.

#### Badges

`badge` is a count the host knows. It is drawn on rail rows (after the label)
and on dome seats (over the icon's top-right corner, out of flow, so no seat
moves):

- `null` or absent draws nothing. `null` means the host does not know the
  count yet; the package never draws a 0 it was not given.
- `0` draws nothing.
- 1 to 99 draw as they are; anything above 99 reads `99+`.
- The count joins the item's accessible name, `"Chat, 3"`, and the drawn digits
  are hidden from assistive technology so they are not read twice. An item with
  no badge keeps its plain name.

#### Children

`children` are an item's own pages, such as the Square's Home, Explore, Pals,
Chat and Notifications. While the item or one of its children is active (or
has a crossing pending, see below), the rail and the drawer list them in an
indented list under the item's row, labelled with the item's label:

- Each child is an ordinary item: it renders through its own `target` (the
  host's `Link` for a same-app page, a plain `<a>` for another app, a button
  for an action reported to `onSelect`), and draws its own `badge`.
- `activeId` may name a child. That child carries `aria-current="page"` and
  the parent row stays lit without `aria-current`, so the page has exactly one
  current item. With `activeId` on the parent, the list is open and no child is
  current.
- Children are real links and buttons in document order, so Tab moves from the
  parent row through its children to the next row.
- One level deep: a child's own `children` are not drawn. The tab bar ignores
  `children`.

The link components receive `ChromeLinkProps`: `href`, `className`, `onClick`,
`aria-current`, `aria-busy`, `aria-label`, `children` and `data-*` attributes.
`next/link` accepts these as they are.

### `ArkSidebar`

| Prop                    | Type                                                                                | Notes                                                                                                                                                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `items`                 | `readonly ChromeNavItem[]`                                                          | Rows, in their final order                                                                                                                                                                                        |
| `activeId`              | `string \| null`                                                                    | The lit row, marked `aria-current="page"`. `null` lights none                                                                                                                                                     |
| `onSelect`              | `(item) => void`                                                                    | Called for `action` items                                                                                                                                                                                         |
| `Link`                  | `ComponentType<ChromeLinkProps>`                                                    | Renders `link` items and a `link` brand                                                                                                                                                                           |
| `DocumentLink`          | `ComponentType<ChromeLinkProps>`, optional                                          | Renders `document` items with `prefetch: true`                                                                                                                                                                    |
| `brand`                 | `{ target: link or document target; label? }`                                       | The mARKet lockup at the top. `label` becomes the link's `aria-label`; without it the name is "Market"                                                                                                            |
| `goLive`                | `{ label; onPress; live?; icon?; dataAttributes? }`                                 | Draws the Go Live row and calls `onPress`                                                                                                                                                                         |
| `primaryAction`         | `ReactNode`, optional                                                               | A host-owned control in the same slot. Wins over `goLive`. WSWS uses it for its broadcast control, which keeps its own state                                                                                      |
| `person`                | `ChromePerson`                                                                      | See below                                                                                                                                                                                                         |
| `AccountMenu`           | `ComponentType<{ open; onClose; triggerRef }>`                                      | The signed-in footer's menu. Always mounted while signed in, so it can animate out                                                                                                                                |
| `onProfilePress`        | `() => void`, optional                                                              | Called when the signed-in footer is pressed and there is no `AccountMenu`                                                                                                                                         |
| `drawer`                | `{ open: boolean; onClose: () => void }`, optional                                  | The drawer's state. Required for the `responsive` and `drawer` layouts, not taken by `rail`. `onClose` also runs after any row, the brand, the backdrop, the close button and Escape                              |
| `layout`                | `"responsive"` (default), `"drawer"` or `"rail"`                                    | See Layouts below                                                                                                                                                                                                 |
| `labels`                | `{ menu: string; closeMenu: string }`                                               | The rail's `aria-label` and the close button's                                                                                                                                                                    |
| `id`                    | `string`, optional                                                                  | The `<aside>` id. Default `ark-chrome-sidebar`                                                                                                                                                                    |
| `profileDataAttributes` | `data-*` record, optional                                                           | Put on the footer button                                                                                                                                                                                          |
| `classNames`            | `{ backdrop, aside, asideOpen, asideClosed, nav, row, rowActive, rowIdle, footer }` | Extra class names for host tests and tooling. The package CSS is unlayered, so they do not restyle anything. The package applies `asideOpen`/`asideClosed` and `rowActive`/`rowIdle` from the state it draws with |

```ts
type ChromePerson =
  | { status: "loading" } // a placeholder of the same size, marked aria-busy
  | { status: "signed-out"; signInLabel: string; onSignIn: () => void }
  | { status: "signed-in"; name: string; avatar: ReactNode }; // avatar drawn by the host at 32px
```

While the drawer is open the package locks page scroll and closes on Escape.

#### Layouts

| `layout`               | From 768px up | Below 768px                  | Opened by                              |
| ---------------------- | ------------- | ---------------------------- | -------------------------------------- |
| `responsive` (default) | Fixed rail    | Drawer                       | An `ArkDrawerTrigger` the host renders |
| `drawer`               | Drawer        | Drawer                       | An `ArkDrawerTrigger` the host renders |
| `rail`                 | Fixed rail    | Nothing: no aside, no drawer | Nothing to open                        |

`rail` is for a shell whose phones navigate by the tab bar and have no control
that opens a drawer. Below 768px it renders nothing at all, so there is no
unreachable drawer in the document, and it draws no backdrop and no close
button at any width. The server cannot see the viewport, so it renders the rail
and `styles.css` keeps it off a phone's screen (`display: none` below 768px)
until hydration removes it; a desktop page shows the rail without waiting for
hydration.

Who uses which:

- WSWS's dashboard shell uses `rail`. Its phones have the tab bar, and its top
  bar's avatar opens the account sheet, not a menu.
- WSWS's perps screen uses `drawer`, with `ArkDrawerTrigger` in its header.
- The Market Square uses `responsive`, with `ArkDrawerTrigger` in its phone top
  section bar.

### `ArkDrawerTrigger`

The tab bar has five fixed seats and no menu seat, so a drawer is opened by
this button, which the host renders wherever its drawer opens from.

**Every host that renders `ArkSidebar` with the `responsive` or `drawer` layout
MUST render an `ArkDrawerTrigger` for it.** Without one, nothing on a phone can
open the drawer. A page with no phone drawer uses `layout="rail"` instead.

| Prop        | Type                     | Notes                                                                                             |
| ----------- | ------------------------ | ------------------------------------------------------------------------------------------------- |
| `open`      | `boolean`                | The drawer's state, drawn as `aria-expanded`                                                      |
| `onPress`   | `() => void`             | Called on every press. The host toggles its drawer state                                          |
| `label`     | `string`                 | The accessible name, such as "Menu"                                                               |
| `controls`  | `string`, optional       | The sidebar's `id`, drawn as `aria-controls`. Default `ark-chrome-sidebar`, the sidebar's default |
| `className` | `string`, optional       | The host's placement classes. The package sets no margin on it                                    |
| `ref`       | `Ref<HTMLButtonElement>` | For a host that returns focus to the button                                                       |

```tsx
function Chrome(sidebar: Omit<ArkSidebarProps, "id" | "layout" | "drawer">) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  return (
    <>
      <header className="phone-top-bar">
        <ArkDrawerTrigger
          open={drawerOpen}
          onPress={() => setDrawerOpen((open) => !open)}
          label="Menu"
          controls="square-sidebar"
        />
      </header>
      <ArkSidebar
        {...sidebar}
        id="square-sidebar"
        layout="responsive"
        drawer={{ open: drawerOpen, onClose: () => setDrawerOpen(false) }}
      />
    </>
  );
}
```

The complete host, with the tab bar, is the example further down.

It is drawn as WSWS's perps menu button: a 36px circle with a hairline ring
(white at 10%) and a three-line glyph (white at 60%), both turning brighter on
hover (ring at 25%, glyph white). Focus uses the browser's own ring, as that
button always has.

In development the sidebar checks the rule. It reports with `console.error`,
naming the rule, only when all of these hold: the sidebar is in the
`responsive` or `drawer` layout, the viewport is below 768px, no mounted
`ArkDrawerTrigger` has `controls` equal to the sidebar's `id`, and the tab bar
is not `hidden` (a hidden tab bar is the host taking the bottom edge on purpose,
such as an open chat thread, a live room or the composer, where its top bar and
trigger are gone too). It checks 2 seconds after the sidebar mounts and again
2 seconds after any change (a trigger or tab bar mounting, unmounting or
hiding, the viewport crossing 768px), so a top bar that mounts a beat later is
not reported, and it reports once until the page is fixed and broken again. A
`responsive` or `drawer` sidebar given no `drawer` prop is reported at once.
The trigger and the tab bar tell the sidebar about themselves through state
shared inside the package, so no prop is needed. Every check sits behind
`process.env.NODE_ENV !== "production"`, which a production build folds away.

### `ArkTabBar`

| Prop           | Type                             | Notes                                                                                                   |
| -------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `tabs`         | exactly five `ArkTab`            | Resting left-to-right order. `ArkTab` is a `ChromeNavItem` plus `ownColour?` for art with its own fills |
| `activeId`     | `string \| null`                 | The tab that rides to the centre seat. `null` keeps the resting order and shows no name                 |
| `activeLabel`  | `string \| null`, optional       | The name under the dome. Defaults to the active tab's `label`                                           |
| `onSelect`     | `(tab) => void`                  | Called for `action` tabs                                                                                |
| `Link`         | `ComponentType<ChromeLinkProps>` | Renders `link` tabs                                                                                     |
| `DocumentLink` | optional                         | As for the sidebar                                                                                      |
| `navLabel`     | `string`                         | The `<nav>` landmark's name                                                                             |
| `hidden`       | `boolean`, optional              | Hides the bar, for a screen that needs the bottom edge (an open composer, a live room bar)              |

Each `ArkTab` may carry a `badge`, drawn over the seat's icon (see Badges).

The bar is hidden from 768px up. A host reserves `calc(100vw * 90 / 402)`
(`arkTabBarInset()`) at the bottom of the page below 768px (WSWS pads 92px).

### Stable layout contract

Hosts build their pages around these values, so they are part of the 1.x
contract: changing any of them is a major version of `@ark/chrome`.

| Value                                         | Export                     | Use                                                                       |
| --------------------------------------------- | -------------------------- | ------------------------------------------------------------------------- |
| Tab bar z-index `90`                          | `ARK_TABBAR_Z_INDEX`       | The default of `--ark-chrome-z-tabbar`. Stack a host sheet above or below |
| Phone tab bar height `calc(100vw * 90 / 402)` | `arkTabBarInset()`         | Reserve it at the bottom of a page below the breakpoint                   |
| Breakpoint `768px`                            | `ARK_CHROME_BREAKPOINT_PX` | Where the rail is fixed and the tab bar is hidden                         |

`src/layout-contract.test.ts` pins each value against the constants and
`styles.css`.

### `ArkRailAction`

`{ label, onPress, live?, icon?, dataAttributes? }`. The Go Live row on its own,
for a host that builds its own control around it. `icon` defaults to
`ArkLiveIcon`.

## Crossing to another app

A `document` item is a full page load. When the reader plain-left-clicks one
(no modifier key, not a middle click, not already handled), the package lights
it straight away: the rail row takes the active look and the tab bar moves the
tab into the centre seat and shows its name, while the old page waits for the
new one. `aria-current` stays on the real active item, since the page has not
changed yet. After 300ms the item is marked `aria-busy` and pulses (not under
reduced motion). The pending state clears when `activeId` changes, when the
page is restored from the back-forward cache, and after 8 seconds with neither:
a navigation the reader stopped, a "Stay" on a leave prompt or a download
leaves the old page in place with no event to say so, and the real active item
is lit again.

Prefetch is opt-in per item. Pass `prefetch: true` and a `DocumentLink` only for
the doors people actually use. The microfrontends `Link` from
`@vercel/microfrontends/next/client` fetches every visible cross-zone link
immediately, so marking every item would prerender every page of the other app.

## Which items are cross-app

On WSWS pages every Ark section is a route of WSWS. The rail's sections and all
five tab bar seats are `action` (WSWS scroll-spies some and routes others), the
brand is `link` to `/portfolio`, and the Square row is `link` to `/square` until
`/square` moves to the Square app, when it becomes `document`.

On Square pages everything that is not the Square is another app:

| Item                                                | Target                                                       |
| --------------------------------------------------- | ------------------------------------------------------------ |
| Portfolio, Spot, Perpetuals, Memecoins, Real assets | `document`: `/portfolio`, `/spot`, `/perps`, `/meme`, `/rwa` |
| Prediction, Arkade, Arkivity                        | `document`: `/prediction`, `/casino`, `/activity`            |
| Tab bar Home, Market, Arkade, Activity              | `document`: `/portfolio`, `/market`, `/casino`, `/activity`  |
| Brand                                               | `document`: `/portfolio`                                     |
| Square row and Square seat                          | `link`: `/square`, active on `/square` and `/square/*`       |

On `square.tsionark.com` a relative `/portfolio` stays on that host, which does
not serve Ark. There, build Ark hrefs as `https://www.tsionark.com/...`. Decide
this from the request host on the server and pass it down, so the server and
the browser render the same `href`.

## Example: a host with no i18n

A Market Square host, in English: a Square row whose pages are listed under it
with unread counts, every other Ark item crossing to Ark, and the drawer
opened from a top bar shown on phones. `useSquareSession` stands in for the
host's own session hook.

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArkDrawerTrigger,
  ArkNavIcons,
  ArkSidebar,
  ArkTabBar,
  ArkTabIcons,
  type ArkTab,
  type ChromeHrefTarget,
  type ChromeIcon,
  type ChromeNavItem,
  type ChromePerson,
} from "@ark/chrome";
import { useSquareSession } from "@/lib/session"; // the host's own

// Stand-ins for the Square's own glyphs: an icon is any component that takes
// { size, className }.
function glyph(path: string): ChromeIcon {
  return function Glyph({ size = 20, className }) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        aria-hidden
      >
        <path d={path} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  };
}

const SQUARE_PAGES = [
  { id: "square-home", label: "Home", path: "/square", icon: glyph("M4 11l8-7 8 7v9H4z") },
  {
    id: "square-explore",
    label: "Explore",
    path: "/square/explore",
    icon: glyph("M12 3a9 9 0 100 18 9 9 0 000-18z"),
  },
  {
    id: "square-pals",
    label: "Pals",
    path: "/square/pals",
    icon: glyph("M8 11a3 3 0 100-6 3 3 0 000 6zM3 20a5 5 0 0110 0"),
  },
  { id: "square-chat", label: "Chat", path: "/square/chat", icon: glyph("M4 5h16v11H9l-5 4z") },
  {
    id: "square-notifications",
    label: "Notifications",
    path: "/square/notifications",
    icon: glyph("M6 16V11a6 6 0 0112 0v5l2 2H4z"),
  },
] as const;

interface SquareChromeProps {
  // "" on www.tsionark.com, "https://www.tsionark.com" on square.tsionark.com.
  // Worked out from the request host in a server component and passed in.
  arkOrigin: string;
  // Unread counts, null until the host has loaded them.
  unreadChats: number | null;
  unreadNotifications: number | null;
}

export function SquareChrome({ arkOrigin, unreadChats, unreadNotifications }: SquareChromeProps) {
  const pathname = usePathname() ?? "/square";
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { ready, signedIn, displayName, avatar, login, openGoLive } = useSquareSession();

  const ark = (path: string): ChromeHrefTarget => ({
    kind: "document",
    href: `${arkOrigin}${path}`,
  });
  const onSquare = pathname === "/square" || pathname.startsWith("/square/");
  // An open chat thread takes the whole phone screen: no top bar, no tab bar.
  const inThread = pathname.startsWith("/square/chat/");

  const badges: Record<string, number | null> = {
    "square-chat": unreadChats,
    "square-notifications": unreadNotifications,
  };
  const squarePages: ChromeNavItem[] = SQUARE_PAGES.map((page) => ({
    id: page.id,
    label: page.label,
    icon: page.icon,
    target: { kind: "link", href: page.path },
    badge: badges[page.id] ?? null,
  }));
  const currentPage = SQUARE_PAGES.find((page) =>
    page.path === "/square"
      ? pathname === "/square"
      : pathname === page.path || pathname.startsWith(`${page.path}/`)
  );

  const items: ChromeNavItem[] = [
    { id: "portfolio", label: "Portfolio", icon: ArkNavIcons.portfolio, target: ark("/portfolio") },
    { id: "spot", label: "Spot", icon: ArkNavIcons.spot, target: ark("/spot") },
    { id: "perps", label: "Perpetuals", icon: ArkNavIcons.perps, target: ark("/perps") },
    { id: "meme", label: "Memecoins", icon: ArkNavIcons.meme, target: ark("/meme") },
    { id: "rwa", label: "Real assets", icon: ArkNavIcons.rwa, target: ark("/rwa") },
    {
      id: "prediction",
      label: "Prediction",
      icon: ArkNavIcons.prediction,
      target: ark("/prediction"),
    },
    {
      id: "square",
      label: "Square",
      icon: ArkNavIcons.square,
      target: { kind: "link", href: "/square" },
      children: squarePages,
    },
    { id: "casino", label: "Arkade", icon: ArkNavIcons.casino, target: ark("/casino") },
    { id: "activity", label: "Arkivity", icon: ArkNavIcons.activity, target: ark("/activity") },
  ];

  const tabs: [ArkTab, ArkTab, ArkTab, ArkTab, ArkTab] = [
    { id: "portfolio", label: "Home", icon: ArkTabIcons.home, target: ark("/portfolio") },
    { id: "market", label: "Market", icon: ArkTabIcons.market, target: ark("/market") },
    {
      id: "square",
      label: "Square",
      icon: ArkTabIcons.square,
      target: { kind: "link", href: "/square" },
      ownColour: true,
      badge: unreadChats,
    },
    { id: "casino", label: "Arkade", icon: ArkTabIcons.arkade, target: ark("/casino") },
    { id: "activity", label: "Activity", icon: ArkTabIcons.activity, target: ark("/activity") },
  ];

  const person: ChromePerson = !ready
    ? { status: "loading" }
    : !signedIn
      ? { status: "signed-out", signInLabel: "Sign in", onSignIn: login }
      : { status: "signed-in", name: displayName, avatar };

  return (
    <>
      {/* The phone top section bar; the host hides it from 768px up. */}
      {inThread ? null : (
        <header className="square-phone-top-bar">
          <ArkDrawerTrigger
            open={drawerOpen}
            onPress={() => setDrawerOpen((open) => !open)}
            label="Menu"
            controls="square-sidebar"
          />
        </header>
      )}
      <ArkSidebar
        id="square-sidebar"
        layout="responsive"
        items={items}
        activeId={currentPage?.id ?? (onSquare ? "square" : null)}
        Link={Link}
        brand={{ target: ark("/portfolio"), label: "Ark home" }}
        goLive={{ label: "Go Live", onPress: openGoLive }}
        person={person}
        onProfilePress={() => {
          /* open the Square's account sheet */
        }}
        drawer={{ open: drawerOpen, onClose: () => setDrawerOpen(false) }}
        labels={{ menu: "Menu", closeMenu: "Close menu" }}
      />
      <ArkTabBar
        tabs={tabs}
        activeId={onSquare ? "square" : null}
        activeLabel={onSquare ? "Square" : null}
        Link={Link}
        navLabel="Primary"
        hidden={inThread}
      />
    </>
  );
}
```

To prefetch the doors a signed-in reader uses most, give those items
`prefetch: true` and pass the microfrontends link:

```tsx
import { Link as ZoneLink } from "@vercel/microfrontends/next/client";
// ...
<ArkSidebar DocumentLink={ZoneLink} /* ...the props above */ />;
```

## Styling

`styles.css` is plain CSS with no cascade layer. Tailwind v4 puts its reset and
utilities in layers, and an unlayered rule outranks a layered one whatever order
the stylesheets load in, so no host utility restyles the chrome by accident.
Every selector is an `.ark-chrome-*` class; colours are written into the file,
not read from a host theme, because the two apps use the same token names for
different values.

Optional custom properties a host can set, for example on `:root`:

| Property                    | Default                            | WSWS sets it to                   |
| --------------------------- | ---------------------------------- | --------------------------------- |
| `--ark-chrome-font-body`    | `system-ui, sans-serif`            | `var(--font-body)` (Geist)        |
| `--ark-chrome-font-display` | `"Ark Chrome Display", sans-serif` | `var(--font-display)` (Mona Sans) |
| `--ark-chrome-frame-inset`  | `0px`                              | `var(--ws-frame-inset)`           |
| `--ark-chrome-z-rail`       | `100`                              |                                   |
| `--ark-chrome-z-backdrop`   | `105`                              |                                   |
| `--ark-chrome-z-drawer`     | `110`                              |                                   |
| `--ark-chrome-z-tabbar`     | `90`                               |                                   |

The breakpoint is fixed at 768px. The tab bar's default z-index and height are
part of the stable layout contract above.

## Assets

Everything the chrome draws ships inside the package, so no host serves an
image path for it and the chrome works on any host name:

- The line icons, the dome's glyphs and the mARKet lockup are React SVG
  components. The dome's Square card takes its gradient id from `useId`, so the
  rail and the dome can share a page.
- `assets/dome-bg.svg` (the dome's surface), `assets/glow.svg` (the arc under
  the centre seat) and `assets/market-square.svg` (the Square's mark in the
  rail) are referenced from `styles.css` with `url()`. The bundler emits them
  as hashed files, so they are covered by the host's asset prefix, and the
  26 kB dome is fetched only where the tab bar is shown.
- `assets/mona-sans-latin.woff2` is used only by `fonts.css`. Mona Sans is
  licensed under the SIL Open Font License; the licence is
  `assets/mona-sans-ofl.txt`.

## Fonts

The tab bar's name under the dome is set in Mona Sans. WSWS already loads it
with `next/font` and points `--ark-chrome-font-display` at it. A host that does
not load it imports `@ark/chrome/fonts.css`. The rows use the host's body font
through `--ark-chrome-font-body`.

## Accessibility

- The rail is an `<aside>` named by `labels.menu`, holding a `<nav>` landmark.
  The tab bar is a `<nav>` named by `navLabel`.
- The active item carries `aria-current="page"`.
- Every item is a real `<a>` or `<button>`, so it is in the tab order while the
  chrome is on screen. Focus is drawn with a 2px white outline inside the item.
- A closed drawer (below 768px with `layout="responsive"`, or at every width
  with `layout="drawer"`) is
  `visibility: hidden` once its slide out has played, so its items are neither
  Tab stops nor in the accessibility tree. The fixed rail from 768px up is
  always visible.
- When the drawer opens, focus moves to its close button; when it closes, focus
  returns to the element that had it before, if focus is still inside the
  drawer. The package does not trap Tab inside an open drawer: a host that
  needs a modal trap wraps the rail in one, as the WSWS perps screen does.
- The footer button carries `aria-haspopup="menu"` and `aria-expanded` when the
  host passes an `AccountMenu`.
- `ArkDrawerTrigger` is a `<button>` named by `label`, with `aria-expanded`
  from `open` and `aria-controls` naming the sidebar.
- An item's children are a `<ul>` named by the item's label, directly after
  its row, so they follow it in the Tab order; the current child carries
  `aria-current="page"`.
- A badge's count is part of the item's accessible name ("Chat, 3"); the drawn
  digits are `aria-hidden`.
- `layout="rail"` renders nothing below 768px, so a phone has no hidden rail
  in its accessibility tree at all.

## Developing

The package lives in the WSWS repository as a pnpm workspace member, and WSWS
depends on it as `@ark/chrome: workspace:*`. Its tests run with the WSWS test
suite (`pnpm test`); `pnpm exec tsc -p packages/ark-chrome` type-checks it on
its own settings, without the WSWS path aliases.

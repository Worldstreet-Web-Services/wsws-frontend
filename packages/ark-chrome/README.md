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

| Import                        | What it is                                                                                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `@ark/chrome`                 | `ArkSidebar`, `ArkTabBar`, `ArkRailAction`, `ArkLogo`, `ArkNavIcons`, `ArkTabIcons`, `ArkLiveIcon`, and every type below                   |
| `@ark/chrome/icons`           | The icons alone. Not a client module, so a server component can render them                                                                |
| `@ark/chrome/logo`            | `ArkLogo`, the animated mARKet lockup                                                                                                      |
| `@ark/chrome/styles.css`      | Required. Plain, unlayered CSS; every selector is an `.ark-chrome-*` class                                                                 |
| `@ark/chrome/fonts.css`       | Optional. `@font-face` for Mona Sans as "Ark Chrome Display"                                                                               |
| `@ark/chrome/transitions.css` | Optional. Keeps the chrome still across a navigation between apps with cross-document view transitions. Works only if every app imports it |

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
}
```

How each kind renders:

- `document` renders a plain `<a href>`. When `prefetch` is `true` and the host
  passed `DocumentLink`, it renders `DocumentLink` instead. It never renders the
  host's `Link`: a client-side router cannot find another app's routes.
- `link` renders the host's `Link` (`next/link` in both apps).
- `action` renders `<button type="button">` and calls `onSelect(item)`.

The link components receive `ChromeLinkProps`: `href`, `className`, `onClick`,
`aria-current`, `aria-busy`, `aria-label`, `children` and `data-*` attributes.
`next/link` accepts these as they are.

### `ArkSidebar`

| Prop                    | Type                                                        | Notes                                                                                                                        |
| ----------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `items`                 | `readonly ChromeNavItem[]`                                  | Rows, in their final order                                                                                                   |
| `activeId`              | `string \| null`                                            | The lit row, marked `aria-current="page"`. `null` lights none                                                                |
| `onSelect`              | `(item) => void`                                            | Called for `action` items                                                                                                    |
| `Link`                  | `ComponentType<ChromeLinkProps>`                            | Renders `link` items and a `link` brand                                                                                      |
| `DocumentLink`          | `ComponentType<ChromeLinkProps>`, optional                  | Renders `document` items with `prefetch: true`                                                                               |
| `brand`                 | `{ target: link or document target; label? }`               | The mARKet lockup at the top. `label` becomes the link's `aria-label`; without it the name is "Market"                       |
| `goLive`                | `{ label; onPress; live?; icon?; dataAttributes? }`         | Draws the Go Live row and calls `onPress`                                                                                    |
| `primaryAction`         | `ReactNode`, optional                                       | A host-owned control in the same slot. Wins over `goLive`. WSWS uses it for its broadcast control, which keeps its own state |
| `person`                | `ChromePerson`                                              | See below                                                                                                                    |
| `AccountMenu`           | `ComponentType<{ open; onClose; triggerRef }>`              | The signed-in footer's menu. Always mounted while signed in, so it can animate out                                           |
| `onProfilePress`        | `() => void`, optional                                      | Called when the signed-in footer is pressed and there is no `AccountMenu`                                                    |
| `drawer`                | `{ open: boolean; onClose: () => void }`                    | The phone drawer. `onClose` also runs after any row, the brand, the backdrop, the close button and Escape                    |
| `layout`                | `"responsive"` (default) or `"drawer"`                      | `responsive`: a fixed rail from 768px up, a drawer below. `drawer`: a drawer at every width                                  |
| `labels`                | `{ menu: string; closeMenu: string }`                       | The rail's `aria-label` and the close button's                                                                               |
| `id`                    | `string`, optional                                          | The `<aside>` id. Default `ark-chrome-sidebar`                                                                               |
| `profileDataAttributes` | `data-*` record, optional                                   | Put on the footer button                                                                                                     |
| `classNames`            | `{ backdrop, aside, nav, row, rowActive, rowIdle, footer }` | Extra class names for host tests and tooling. The package CSS is unlayered, so they do not restyle anything                  |

```ts
type ChromePerson =
  | { status: "loading" } // a placeholder of the same size, marked aria-busy
  | { status: "signed-out"; signInLabel: string; onSignIn: () => void }
  | { status: "signed-in"; name: string; avatar: ReactNode }; // avatar drawn by the host at 32px
```

While the drawer is open the package locks page scroll and closes on Escape.

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

The bar is hidden from 768px up. A host reserves `calc(100vw * 90 / 402)` at
the bottom of the page below 768px (WSWS pads 92px).

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
reduced motion). The pending state clears when `activeId` changes and when the
page is restored from the back-forward cache.

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

A complete sidebar and tab bar for the Square, in English. `useSquareSession`
stands in for the host's own session hook.

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArkNavIcons,
  ArkSidebar,
  ArkTabBar,
  ArkTabIcons,
  type ArkTab,
  type ChromeNavItem,
  type ChromePerson,
  type ChromeTarget,
} from "@ark/chrome";
import { useSquareSession } from "@/lib/session"; // the host's own

// "" on www.tsionark.com, "https://www.tsionark.com" on square.tsionark.com.
// Worked out from the request host in a server component and passed in.
export function SquareChrome({ arkOrigin }: { arkOrigin: string }) {
  const pathname = usePathname() ?? "/square";
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { ready, signedIn, displayName, avatar, login, openGoLive } = useSquareSession();

  const ark = (path: string): ChromeTarget => ({ kind: "document", href: `${arkOrigin}${path}` });
  const square: ChromeTarget = { kind: "link", href: "/square" };
  const onSquare = pathname === "/square" || pathname.startsWith("/square/");

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
    { id: "square", label: "Square", icon: ArkNavIcons.square, target: square },
    { id: "casino", label: "Arkade", icon: ArkNavIcons.casino, target: ark("/casino") },
    { id: "activity", label: "Arkivity", icon: ArkNavIcons.activity, target: ark("/activity") },
  ];

  const tabs: [ArkTab, ArkTab, ArkTab, ArkTab, ArkTab] = [
    { id: "portfolio", label: "Home", icon: ArkTabIcons.home, target: ark("/portfolio") },
    { id: "market", label: "Market", icon: ArkTabIcons.market, target: ark("/market") },
    { id: "square", label: "Square", icon: ArkTabIcons.square, target: square, ownColour: true },
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
      <ArkSidebar
        items={items}
        activeId={onSquare ? "square" : null}
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

The breakpoint is fixed at 768px.

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
- Every item is a real `<a>` or `<button>`, so it is in the tab order. Focus is
  drawn with a 2px white outline inside the item.
- The footer button carries `aria-haspopup="menu"` and `aria-expanded` when the
  host passes an `AccountMenu`.

## Developing

The package lives in the WSWS repository as a pnpm workspace member, and WSWS
depends on it as `@ark/chrome: workspace:*`. Its tests run with the WSWS test
suite (`pnpm test`); `pnpm exec tsc -p packages/ark-chrome` type-checks it on
its own settings, without the WSWS path aliases.

---
date: 2026-09-16
feature: Ark's rail and phone tab bar move into the @ark/chrome package
scope: layout
scenario-impact: none
---

# Ark's rail and phone tab bar move into `@ark/chrome`

The desktop sidebar and the phone tab bar are now drawn by
`packages/ark-chrome`, a workspace package this app depends on as
`@ark/chrome`. The Market Square will install the same package from a git tag,
so Square pages show Ark's chrome from the same source
(`ADR-2026-09-16-square-microfrontend`, section 6; PR 3b in the plan).

## What a reader sees

Nothing changes. The rail at 1440x900 and the tab bar at 390x844 were captured
in headless Chrome before and after the move, in ten states (three rail
highlights, six dome positions, the open phone drawer): every capture is
pixel-identical, and every computed style that was compared (size, position,
colour, font, border, transition, translate, filter, z-index) matches. The only
differences are in the markup:

- the dome, the arc under the centre seat and the Square's rail mark are drawn
  from the package's own files instead of `<img>` tags pointing at `/nav/*`;
- the active rail row now carries `aria-current="page"`, which only the tab bar
  had before;
- rail rows carry `type="button"`.

The perps screen's menu is the same drawer at every width. It used to get there
by re-pointing the rail's Tailwind classes from a wrapper; the package's
stylesheet cannot be restyled that way, so the rail now takes
`drawerAtEveryWidth`. Under reduced motion that drawer still does not slide.

Keyboard focus on a rail row, the Go Live row, the footer, the brand and the
dome's seats is now a 2px white outline inside the item, set by the package, in
place of the browser's default ring.

## What changed in the code

- `packages/ark-chrome`: `ArkSidebar`, `ArkTabBar`, `ArkRailAction`, `ArkLogo`,
  the rail and dome icons, `styles.css` (plain, unlayered, `.ark-chrome-*`
  classes only), the dome, arc and Square-mark art, and an opt-in `fonts.css`
  and `transitions.css`. The props contract is in its README.
- `components/layout/sidebar.tsx` and `curved-tab-bar.tsx` are adapters: they
  keep reading Privy, next-intl, the router and the Square switch, and hand the
  package plain data and callbacks.
- `components/ui/icons.tsx` re-exports the nine section icons from the package,
  and `components/ui/market-logo.tsx` re-exports its logo, so every other call
  site is unchanged.
- The Go Live row in the rail is the package's `ArkRailAction`; the broadcast
  flow behind it stays in `GoLiveControl`.
- `public/nav/dome-bg.svg`, `glow.svg` and `market-square.svg` moved into the
  package; nothing else referenced them.
- ESLint: `packages/**` joined the boundaries plugin, a package may not import
  app code, and `packages/ark-chrome` may not import `@/*`, `next`, `next-intl`,
  Privy, TanStack or `@vercel/*`.

## For the Square

Install string, once the coordinator tags `ark-chrome-v1.0.0` after merge:

```sh
pnpm add "github:Worldstreet-Web-Services/wsws-frontend#ark-chrome-v1.0.0&path:/packages/ark-chrome"
```

Then `transpilePackages: ["@ark/chrome"]` and `import "@ark/chrome/styles.css"`
in the root layout. The package README has a complete English example.

## How it was verified

- Test-first. The package's tests (render with no providers, each target kind,
  `aria-current`, the drawer, the person states, the pending crossing, unique
  SVG ids with both pieces mounted, the import and CSS isolation checks) and
  the WSWS adapter tests were written and seen failing before the code existed.
- The existing sidebar, curved tab bar, app chrome and perps drawer suites pass
  with their files unchanged.
- An install from a git ref into a throwaway Next 16.2.11 app outside the
  repository. The local checkout is a partial clone that `git clone` cannot
  copy from, so the committed tree was put in a one-commit repository in the
  scratch area, tagged `ark-chrome-v1.0.0` there only, and installed with
  `git+file://...#ark-chrome-v1.0.0&path:/packages/ark-chrome` (the form
  without the leading slash installs too). pnpm honoured `files`: no tests or
  tsconfig arrived. The app rendered both pieces with no providers and no
  Tailwind; `tsc --noEmit` passed, including the README's English example and
  the microfrontends `Link` passed as `DocumentLink`; `next build` passed and
  emitted the dome, arc, Square mark and Mona Sans under `.next/static/media`.
  The page using the microfrontends `Link` was left out of that build: it
  cannot prerender without `withMicrofrontends` configuration.
  That run found two faults, fixed before this note: the example's brand target
  type, and `children` needing to be required for the microfrontends `Link`.
- `./scripts/preflight.sh`: all five gates green, 5,148 tests. ESLint reports
  49 warnings and no errors, the same 49 as `origin/staging` at `611aecf1`;
  none is in a changed file.
- `pnpm bundle:check` passes. First load, gzipped: `/` 314 kB (budget 320),
  `/perps` 1645 (1650), `/spot` 1571 (1650), `/meme` 1608 (1660; its note on
  the base commit gives 1606), `/prediction` 1632 (1880), `/casino` 1819
  (1885), `/dashboard` 1474 (1700), `/auth` 1306 (1350). No budget was raised.

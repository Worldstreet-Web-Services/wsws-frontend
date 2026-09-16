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

The rail and the tab bar look exactly as they did. The rail at 1440x900 and the
tab bar at 390x844 were captured in headless Chrome before and after the move,
in ten states (three rail highlights, six dome positions including the Square's
own seat, the open phone drawer): every capture is pixel-identical, and every
computed style that was compared (size, position, colour, font, border,
transition, translate, filter, z-index, visibility) matches, except where a
change below says otherwise. The Go Live row while a person is live was
checked the same way, against the Tailwind markup it had before: the captures
are pixel-identical and the computed styles match (the ring's box-shadow is
serialised as one shadow instead of Tailwind's stack of four empty ones and the
ring).

What does change:

- **The closed phone drawer is out of reach until it is opened.** Below 768px
  a closed drawer used to be moved off-canvas only, so Tab walked through its
  brand, close button, Go Live row, every nav row and the footer, all
  invisible, and a screen reader could land on them. It is now
  `visibility: hidden` once its slide out has played. Opening it moves focus to
  its close button; closing it returns focus to what had it. The fixed rail
  from 768px up is unchanged. The perps drawer already did this through its own
  `inert` wrapper and still does.
- Keyboard focus on a rail row, the Go Live row, the footer, the brand and the
  dome's seats is a 2px white outline inside the item, set by the package, in
  place of the browser's default ring.
- The markup: the dome, the arc under the centre seat and the Square's rail
  mark are drawn from the package's own files instead of `<img>` tags pointing
  at `/nav/*`; the active rail row carries `aria-current="page"`, which only the
  tab bar had before; rail rows carry `type="button"`.

The perps screen's menu is the same drawer at every width. It used to get there
by re-pointing the rail's Tailwind classes from a wrapper; the package's
stylesheet cannot be restyled that way, so the rail now takes
`drawerAtEveryWidth`. Under reduced motion that drawer does not slide, opening
or closing.

For the Square only (WSWS has no cross-app items yet): a tap on another app's
item lights it while the old page waits. If that navigation never lands (the
reader pressed Stop, answered "Stay" on a leave prompt, or the response was a
download), the highlight goes back to the real item after 8 seconds instead of
staying on the wrong one and pulsing.

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
- The rail's older tests read Tailwind class names off it (`-translate-x-full`,
  `translate-x-0`, `bg-accent/14`, `fixed inset-0`, `min-h-0`,
  `overflow-y-auto`, `mt-auto`) that the package does not draw with. The adapter
  still passes them as markers, as fixed strings; the package applies the open,
  closed, lit and idle ones from the state it draws with, and
  `components/layout/sidebar-markers.test.tsx` loads the package stylesheet and
  checks each marker sits where the real state and computed style are, so those
  suites still fail if the drawer stops opening or a row stops lighting.

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
  Each fault found in review has a test that failed before its fix: the live Go
  Live row's run-together class name (`rail-action.test.tsx`), a crossing that
  never lands (`sidebar.test.tsx`, `tab-bar.test.tsx`), the closed drawer in the
  tab order and the opening drawer refusing focus (`drawer-a11y.test.tsx`), the
  markers (`sidebar-markers.test.tsx`), and the two contract faults the first
  install found, which `contract-types.test.ts` now reproduces by compiling
  `next/link`, the microfrontends 2.4.0 `Link` and the README's host example
  with the TypeScript compiler.
- The existing sidebar, curved tab bar, app chrome and perps drawer suites pass
  with their files unchanged.
- Parity: a temporary unguarded preview route rendered the real `Sidebar` and
  `CurvedTabBar` with fixture data (deleted before committing). Captures of the
  final tree against the pre-move captures: 0 differing pixels in all ten
  states; the only computed-style differences are the closed drawer's
  `visibility` and the `visibility` entry in its transition list. The live Go
  Live row was compared by giving the rendered row the old Tailwind classes and
  then the package's live classes: 0 differing pixels. In Chrome at 390x844,
  Tab from the top of the page skips the closed drawer; opening it puts focus on
  its close button; 120ms into closing it is still visible mid-slide; after it
  is hidden and focus is back on the opener. At 1440x900 the rail is visible and
  its items are Tab stops, and the perps drawer is hidden closed and visible
  open.
- Install: the committed package was put in a one-commit repository in the
  scratch area (the local checkout is a partial clone that `git clone` cannot
  copy from) and installed into a throwaway app outside the repository with
  `git+file:///...#<commit>&path:/packages/ark-chrome`, the form a GitHub path
  dependency resolves to; no tag was created. The app pinned what the Square
  pins: Next 16.3.5, React 19.2.4, `motion` ^12.42.2, Tailwind v4, with
  `--color-accent`, `--color-panel` and `--color-white` set to values that
  clash with WSWS's. pnpm honoured `files` (no tests, no tsconfig arrived).
  `tsc --noEmit` passed, including the README's English example compiled as
  written and the microfrontends `Link` passed as `DocumentLink`; `next build`
  passed and emitted the dome, arc, Square mark and Mona Sans under
  `.next/static/media`. Served with `next start` and no providers, it rendered
  the rail at 1440 (248px, the live row violet with its ring, the lit row in
  WSWS's colour despite the clashing tokens) and the dome at 390 with its art
  and font loaded. The app was deleted afterwards. An earlier run on Next
  16.2.11 found the two contract faults above.
- `./scripts/preflight.sh`: all five gates green, 5,168 tests passed (3
  skipped). ESLint reports 49 warnings and no errors, the same 49 as the base
  commit `611aecf1` linted on its own; none is in a file this change touches.
- `pnpm bundle:check` passes. First load, gzipped: `/` 314 kB (budget 320),
  `/perps` 1645 (1650), `/spot` 1572 (1650), `/meme` 1608 (1660), `/prediction`
  1632 (1880), `/casino` 1819 (1885), `/dashboard` 1474 (1700), `/auth` 1306
  (1350), `/square` 1531 (1900). No budget was raised.

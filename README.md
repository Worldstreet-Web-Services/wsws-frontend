# WSWS Frontend

The frontend for **Worldstreet**, a Web3 financial super app. Fiat on and off
ramps, spot markets, real-world assets, perpetuals, prediction markets, chess
wagering and yield, in one consumer-grade app that hides the chain from the
person using it.

This app moves real money. That fact sets the bar for everything in it.

## Requirements

- **Node 22 or 24.** CI runs 24. If `pnpm install` fails locally with
  `FATAL ERROR: invalid array length`, use Node 22.
- **pnpm**, pinned by `packageManager`. Do not use npm or yarn.

## Quick start

```bash
pnpm install
cp .env.example .env      # fill in the values you need
pnpm dev                  # http://localhost:3000
```

`.env` is never committed. Ask a maintainer for values, or pull them from
Vercel, where deployed secrets live.

### Local development with the Square

On Vercel, `www.tsionark.com` is a microfrontends group: this app is the
default application, and the Market Square (`market-square-frontend`, its own
repository and Vercel project) serves `/square` and everything under it.
`microfrontends.json` at the repository root is the routing table, and
`proxy.test.ts` and `microfrontends.test.ts` pin it.

`pnpm dev` still runs this app alone on port 3000. To see the two together:

```bash
pnpm dev:mf               # http://localhost:3024
```

That starts the microfrontends local proxy on port 3024 and this app's dev
server on the port `microfrontends port` derives for it (7448). Open the proxy
address: this app answers from your machine, and `/square` comes from the
development fallback, `https://www.tsionark.com`. Stopping the command stops
both. Set `MFE_DEBUG=1` to print each routing decision.

To route `/square` to a Square running on your machine instead, run it in its
own repository with `next dev --port $(microfrontends port)`, pointing it at
this repository's `microfrontends.json` (`VC_MICROFRONTENDS_CONFIG`, or
`vercel microfrontends pull` once the group exists), and add
`market-square-frontend` to `--local-apps` in `scripts/dev-mf.sh`.

## Scripts

| Command             | What it does                          |
| ------------------- | ------------------------------------- |
| `pnpm dev`          | Dev server                            |
| `pnpm dev:mf`       | Dev server behind the `/square` proxy |
| `pnpm build`        | Production build                      |
| `pnpm start`        | Serve the production build            |
| `pnpm format:check` | Prettier, check only                  |
| `pnpm lint`         | ESLint, including boundary rules      |
| `pnpm typecheck`    | `tsc --noEmit`                        |
| `pnpm test`         | Vitest, once                          |
| `pnpm test:watch`   | Vitest, watch mode                    |
| `pnpm format`       | Prettier, write                       |
| `npx knip`          | Unused files, exports, dependencies   |

The five gates from `format:check` to `build` are exactly what CI runs, in that
order. Run them before opening a pull request.

## Structure

```
app/          routes and BFF route handlers. Composes features, owns no logic.
features/     one folder per product area, each owning its whole vertical
components/   ui/ design system, layout/ the app shell
hooks/        cross-cutting React hooks
lib/          pure cross-cutting code: api client, money, format, brand
messages/     five locales: en, de, es, fr, pt
config/       chain registries
docs/         architecture and the restructure log
```

Nine feature slices: `activity`, `casino`, `earn`, `funds`, `portfolio`,
`prediction`, `remit`, `rwa`, `trade`.

Imports point downward: `app/` → `features/` → `components/ui/` and `hooks/` →
`lib/`. Features never import each other; the route composes them. This is
enforced by `eslint-plugin-boundaries`, so a violation fails `pnpm lint`.

## Documentation

- **[CONTRIBUTING.md](CONTRIBUTING.md)** — read before your first change. Setup,
  where code goes, how work gets merged.
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — the shape of the codebase
  and why it is that shape. Read it before adding a directory, a transport, or a
  shared component.
- **[docs/RESTRUCTURE-LOG.md](docs/RESTRUCTURE-LOG.md)** — how it got that shape,
  and what each move taught. Useful when a boundary looks arbitrary.
- **`.claude/skills/wsws-engineering-standards/SKILL.md`** — the coding bar:
  correctness, comments, naming, testing.

## A warning about Next.js

This repository runs a Next.js version with breaking changes against most
tutorials and against what a language model is likely to remember. `middleware.ts`
is deprecated here in favour of `proxy.ts`, to name one. Read the relevant guide
in `node_modules/next/dist/docs/` before writing framework code.

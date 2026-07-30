import type { NextConfig } from "next";
import path from "node:path";
import {
  EARN_API_EXACT_ROUTE_MAP,
  EARN_API_PREFIX_ROUTE_MAP,
} from "./apps/earn/src/lib/earn-backend";

const earnBackendUrl =
  process.env.EARN_BACKEND_URL ||
  process.env.NEXT_PUBLIC_EARN_BACKEND_URL ||
  "http://localhost:8083";

const earnBeforeFilesRewrites = [
  ...[...EARN_API_EXACT_ROUTE_MAP.entries()].map(([source, destination]) => ({
    source,
    destination: `${earnBackendUrl}${destination}`,
  })),
  ...EARN_API_PREFIX_ROUTE_MAP.flatMap(({ backend, frontend }) => [
    {
      source: frontend,
      destination: `${earnBackendUrl}${backend}`,
    },
    {
      source: `${frontend}/:path*`,
      destination: `${earnBackendUrl}${backend}/:path*`,
    },
  ]),
];

const nextConfig: NextConfig = {
  // Type-checking runs as its own gate (`pnpm typecheck`), not inside the
  // bundler. The merged earn app generates a ~118k-line Prisma client as .ts
  // source (Prisma 7's `prisma-client` generator), which makes Next's in-build
  // tsc pass pathologically slow and prone to OOM. Keeping it out of
  // `next build` lets builds finish; correctness is still enforced by
  // `pnpm typecheck` in CI and pre-push.
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    // Persist Turbopack's build graph between production builds.
    turbopackFileSystemCacheForBuild: true,
    optimizePackageImports: [
      "@privy-io/react-auth",
      "@radix-ui/react-*",
      "@solana/*",
      "@tanstack/react-query",
      "@tiptap/*",
      "ai",
      "cmdk",
      "dayjs",
      "embla-carousel-autoplay",
      "embla-carousel-react",
      "flag-icons",
      "jotai",
      "lowlight",
      "lucide-react",
      "nprogress",
      "posthog-js",
      "react-day-picker",
      "react-hook-form",
      "react-select",
      "sonner",
      "tailwind-merge",
      "typescript-cookie",
      "vaul",
      "zod",
    ],
  },
  turbopack: {
    root: path.resolve(__dirname),
    resolveAlias: {
      "@walletconnect/logger": "./apps/earn/src/shims/walletconnect-logger.ts",
      pino: "pino/browser",
    },
  },
  images: {
    minimumCacheTTL: 86400,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
        pathname: "**",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },
  // Heavy server-only packages. Externalizing them keeps Turbopack from
  // bundling each one into all 88 API-route functions; they load from
  // node_modules at runtime instead. This is the main lever on build time here,
  // since 60+ routes pull Prisma and the rest pull redis/queue/upload/mail SDKs.
  serverExternalPackages: [
    "isomorphic-dompurify",
    "jsdom",
    "parse5",
    "@prisma/client",
    "@prisma/adapter-mariadb",
    "@prisma/adapter-planetscale",
    "bullmq",
    "ioredis",
    "@upstash/redis",
    "cloudinary",
    "resend",
    "svix",
    "@googleapis/drive",
    "@googleapis/sheets",
    "google-auth-library",
    "sharp",
    "unfurl.js",
    "franc",
    "jsonwebtoken",
    "@privy-io/node",
  ],
  async redirects() {
    return [
      {
        source: "/earn/api/email/unsubscribe/:path*",
        destination: "/api/email/unsubscribe/:path*",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        ...earnBeforeFilesRewrites,
        {
          source: "/earn-api/:path*",
          destination: `${earnBackendUrl}/:path*`,
        },
      ],
      afterFiles: [
        {
          source: "/docs-keep/static/:path*",
          destination: "https://us-assets.i.posthog.com/static/:path*",
        },
        {
          source: "/docs-keep/:path*",
          destination: "https://us.i.posthog.com/:path*",
        },
        {
          source: "/api/geo/world.geojson",
          destination:
            "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson",
        },
        {
          source: "/cdn/coinmarketcap/:path*",
          destination: "https://s2.coinmarketcap.com/:path*",
        },
        {
          source: "/cdn/bnbstatic/:path*",
          destination: "https://bin.bnbstatic.com/:path*",
        },
        {
          source: "/cdn/coingecko/:path*",
          destination: "https://assets.coingecko.com/:path*",
        },
        {
          source: "/cdn/github/:path*",
          destination: "https://avatars.githubusercontent.com/:path*",
        },
        {
          source: "/cdn/arweave/:path*",
          destination: "https://arweave.net/:path*",
        },
        {
          source: "/cdn/ipfs-io/:path*",
          destination: "https://ipfs.io/:path*",
        },
        {
          source: "/cdn/imagedelivery/:path*",
          destination: "https://imagedelivery.net/:path*",
        },
      ],
      fallback: [],
    };
  },
};

export default nextConfig;

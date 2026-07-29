import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
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
  serverExternalPackages: ["isomorphic-dompurify", "jsdom", "parse5"],
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
    return [
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
    ];
  },
};

export default nextConfig;

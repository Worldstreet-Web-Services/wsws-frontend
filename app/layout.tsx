import type { Metadata } from "next";
import localFont from "next/font/local";
import Providers from "./providers";
import "./globals.css";

const geist = localFont({
  src: "../public/fonts/Satoshi-Variable.woff2",
  variable: "--font-body",
  display: "swap",
  weight: "300 900",
});

const spaceGrotesk = localFont({
  src: [
    {
      path: "../public/fonts/Archivo_SemiExpanded-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/Archivo_SemiExpanded-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/fonts/Archivo_SemiExpanded-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "World Street",
  description:
    "The onchain superapp for global markets. Own stocks, gold, crypto and real-world assets from one self-custody account, funded in Naira.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} ${spaceGrotesk.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

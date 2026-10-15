import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { siteConfig } from "@/lib/config/site";

const fraunces = localFont({
  src: [
    { path: "./fonts/fraunces-latin-wght-normal.woff2", style: "normal", weight: "100 900" },
    { path: "./fonts/fraunces-latin-wght-italic.woff2", style: "italic", weight: "100 900" },
  ],
  variable: "--font-fraunces",
  display: "swap",
});

const manrope = localFont({
  src: [{ path: "./fonts/manrope-latin-wght-normal.woff2", style: "normal", weight: "200 800" }],
  variable: "--font-manrope",
  display: "swap",
});

/** Handwriting accent for small notes ("Someone is thinking of you…"). Never for body text. */
const caveat = localFont({
  src: [{ path: "./fonts/caveat-latin-wght-normal.woff2", style: "normal", weight: "400 700" }],
  variable: "--font-caveat",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#fbf8f1",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className={`${fraunces.variable} ${manrope.variable} ${caveat.variable}`}>
      <body className="min-h-dvh flex flex-col">
        {children}
      </body>
    </html>
  );
}

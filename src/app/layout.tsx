import type { Metadata, Viewport } from "next";
import { Caveat, Fraunces, Fredoka, Nunito } from "next/font/google";
import "./globals.css";

const rounded = Nunito({ variable: "--nf-rounded", subsets: ["latin"] });
const hand = Caveat({ variable: "--nf-hand", subsets: ["latin"] });
const classic = Fraunces({ variable: "--nf-classic", subsets: ["latin"] });
const display = Fredoka({ variable: "--nf-display", subsets: ["latin"] });

// Absolute origin for OG metadata: explicit override, else the Vercel host
// (production domain on production, the unique deployment URL on previews).
const vercelHost =
  process.env.VERCEL_ENV === "production" ? process.env.VERCEL_PROJECT_PRODUCTION_URL : process.env.VERCEL_URL;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? (vercelHost ? `https://${vercelHost}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Oopsie | Say sorry, cutely", template: "%s | Oopsie" },
  description: "Oopsie helps you say sorry, cutely. Write a sweet apology, send a link, and pick a time to talk.",
  applicationName: "Oopsie",
  openGraph: {
    siteName: "Oopsie",
    title: "Oopsie | Say sorry, cutely",
    description: "Write a sweet apology, send a link, and pick a time to talk.",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#ffe3d3",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${rounded.variable} ${hand.variable} ${classic.variable} ${display.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

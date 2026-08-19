import type { Metadata } from "next";
import { Cormorant, Inter } from "next/font/google";
import "./globals.css";
import { getLocale } from "@/lib/i18n";
import { getTheme } from "@/lib/theme";

const cormorant = Cormorant({ variable: "--font-cormorant", subsets: ["latin"], weight: ["600"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], weight: ["400", "600", "700"] });

export const metadata: Metadata = {
  title: "TripGate OS",
  description: "TripGate Travel Orchestration OS",
};

// Deliberately bare — no sidebar, no topbar, no nav. The staff app shell lives in
// app/(staff)/layout.tsx instead, one level down, so the one route outside that group (the
// customer-facing quote view at app/quotes/[id]/view) never inherits internal chrome.
// See architecture/03_KNOWN_ARCHITECTURAL_LIMITATIONS.md #4 for why this split exists.
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const theme = await getTheme();

  return (
    <html lang={locale} data-theme={theme} className={`${cormorant.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}

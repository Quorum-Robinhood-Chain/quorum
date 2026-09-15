import type { Metadata } from "next";
import { Big_Shoulders_Display, Public_Sans } from "next/font/google";
import "../globals.css";
import TickerBar from "@/components/TickerBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

const bigShoulders = Big_Shoulders_Display({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  variable: "--font-big-shoulders",
  display: "swap",
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-public-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Quorum — News & market data for Robinhood Chain",
  description:
    "Quorum covers the Robinhood Chain ecosystem: DEX activity, Stock Tokens, TVL, and ecosystem news, refreshed automatically from live market data.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${bigShoulders.variable} ${publicSans.variable}`}>
      <body>
        <TickerBar />
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Big_Shoulders_Display, Public_Sans } from "next/font/google";
import "../../globals.css";

// Separate root layout — keeps /admin free of the public site's header/footer.
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
  title: "Quorum Admin",
  description: "Editorial review queue for Quorum's automated content pipeline.",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bigShoulders.variable} ${publicSans.variable}`}>
      <body className="min-h-screen bg-panel font-body text-ink antialiased">{children}</body>
    </html>
  );
}

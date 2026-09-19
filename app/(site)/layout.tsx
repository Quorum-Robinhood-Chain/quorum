import type { Metadata } from 'next';
import '../globals.css';
import { fontVariables } from '../fonts';
import TickerBar from '@/components/TickerBar';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { WalletProvider } from '@/lib/wallet/WalletProvider';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Quorum — News & market data for Robinhood Chain',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png', sizes: '192x192' },
    ],
    apple: '/apple-icon.png',
  },
  description:
    'Quorum covers the Robinhood Chain ecosystem: DEX activity, Stock Tokens, TVL, and ecosystem news, refreshed automatically from live market data.',
};

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={fontVariables}>
      <body>
        <WalletProvider>
          {/* Global market ticker */}
          <TickerBar />

          {/* Main site navigation */}
          <SiteHeader />

          {/* Page content */}
          {children}

          {/* Global site footer */}
          <SiteFooter />
        </WalletProvider>
      </body>
    </html>
  );
}

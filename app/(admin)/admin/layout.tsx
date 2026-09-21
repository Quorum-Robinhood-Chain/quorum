import type { Metadata } from 'next';
import '../../globals.css';
import { fontVariables } from '../../fonts';

// Separate root layout for admin pages without the public header and footer.
export const metadata: Metadata = {
  title: 'Quorum Admin',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png', sizes: '192x192' },
    ],
    apple: '/apple-icon.png',
  },
  description:
    "Editorial review queue for Quorum's automated content pipeline.",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Apply shared fonts and admin-specific page styling.
  return (
    <html lang="en" className={fontVariables}>
      <body className="min-h-screen bg-panel font-body text-ink antialiased">
        {children}
      </body>
    </html>
  );
}

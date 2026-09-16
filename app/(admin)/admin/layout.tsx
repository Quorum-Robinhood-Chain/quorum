import type { Metadata } from 'next';
import '../../globals.css';
import { fontVariables } from '../../fonts';

// Separate root layout — keeps /admin free of the public site's header/footer.
export const metadata: Metadata = {
  title: 'Quorum Admin',
  description: "Editorial review queue for Quorum's automated content pipeline.",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body className="min-h-screen bg-panel font-body text-ink antialiased">{children}</body>
    </html>
  );
}

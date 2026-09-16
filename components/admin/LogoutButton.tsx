'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Clear the admin session and redirect to the login page.
  async function handleLogout() {
    setLoading(true);
    await fetch('/api/admin/logout', { method: 'POST' });
    router.replace('/admin/login');
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-panel disabled:opacity-60"
    >
      {loading ? 'Signing out…' : 'Sign out'}
    </button>
  );
}

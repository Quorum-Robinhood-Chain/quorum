"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/admin";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Login failed.");
        return;
      }
      router.replace(next);
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-[7px] bg-lime">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
              <path
                d="M4 12L12 4L20 12L12 20L4 12Z"
                stroke="#0A0A0A"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="12" r="2.4" fill="#0A0A0A" />
            </svg>
          </span>
          <span className="font-display text-2xl font-extrabold leading-none">
            Quorum <span className="text-gray-600">Admin</span>
          </span>
        </div>

        <div className="rounded-card border border-line bg-white p-7">
          <h1 className="font-display text-xl font-extrabold">Editorial sign in</h1>
          <p className="mt-1 text-sm text-gray-600">
            Review queue access for approving automated drafts before they publish.
          </p>

          <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-ink">Username</span>
              <input
                className="rounded-lg border border-line px-3 py-2.5 text-sm outline-none focus-visible:border-olive"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-ink">Password</span>
              <input
                className="rounded-lg border border-line px-3 py-2.5 text-sm outline-none focus-visible:border-olive"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-bold text-lime transition-transform hover:-translate-y-px disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          Demo credentials: <code className="font-mono">admin</code> /{" "}
          <code className="font-mono">quorum2026</code> — set ADMIN_USERNAME / ADMIN_PASSWORD
          before a real launch.
        </p>
        <a href="/" className="mt-2 block text-center text-xs font-semibold text-olive hover:underline">
          ← Back to Quorum
        </a>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

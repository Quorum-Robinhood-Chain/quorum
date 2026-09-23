"use client";

import { useEffect, useState } from "react";

interface Stats {
  api_mode: string;
  usage: {
    mode: "demo" | "live";
    total_calls: number;
    unique_agents: number;
    calls_24h: number;
    usdg_spent: string;
    disclaimer?: string;
  };
  recent: Array<{
    agent: string;
    endpoint: string;
    amount: string;
    at: string;
    demo: boolean;
  }>;
}

export function AgentUsageCounter() {
  const [data, setData] = useState<Stats | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/v1/stats", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => alive && setData(d))
        .catch(() => {});
    load();
    const t = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const u = data?.usage;
  const isDemo = u?.mode !== "live";

  return (
    <section className="border border-white/10 bg-[#0A1A33] text-white">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-5 py-3">
        <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-white/70">
          Agent activity
        </h2>
        <span
          className={`rounded-sm px-2 py-0.5 text-[11px] font-bold uppercase tracking-widest ${
            isDemo
              ? "bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/40"
              : "bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/40"
          }`}
        >
          {isDemo ? "Demo data" : "Live"}
        </span>
      </header>

      <dl className="grid grid-cols-2 divide-x divide-y divide-white/10 sm:grid-cols-4 sm:divide-y-0">
        <Stat label="Calls settled" value={u ? u.total_calls : "—"} />
        <Stat label="Autonomous agents" value={u ? u.unique_agents : "—"} />
        <Stat label="Calls · 24h" value={u ? u.calls_24h : "—"} />
        <Stat
          label="USDG spent"
          value={u ? `$${u.usdg_spent}` : "—"}
          accent
        />
      </dl>

      {data?.recent?.length ? (
        <ul className="divide-y divide-white/5 border-t border-white/10 font-mono text-[12px]">
          {data.recent.slice(0, 5).map((c, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-3 px-5 py-2 text-white/60"
            >
              <span className="truncate">{c.agent}</span>
              <span className="text-white/40">/v1/{c.endpoint}</span>
              <span className="tabular-nums text-white/80">${c.amount}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {isDemo && u?.disclaimer ? (
        <p className="border-t border-white/10 px-5 py-3 text-[12px] leading-relaxed text-amber-200/80">
          {u.disclaimer}
        </p>
      ) : null}
    </section>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="px-5 py-4">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
        {label}
      </dt>
      <dd
        className={`mt-1 text-2xl font-bold tabular-nums ${
          accent ? "text-[#E4002B]" : "text-white"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

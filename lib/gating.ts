import { envNumber } from '@/lib/env';

export function gateWindowMinutes(): number {
  return envNumber('GATE_WINDOW_MINUTES', 60);
}

export function isGated(publishedAt: Date | null | undefined): boolean {
  if (!publishedAt) return true;

  const ageMs = Date.now() - publishedAt.getTime();
  return ageMs < gateWindowMinutes() * 60 * 1000;
}

// When a gated article becomes public, for display ("unlocks in 42 min").
export function gateUnlocksAt(publishedAt: Date): Date {
  return new Date(publishedAt.getTime() + gateWindowMinutes() * 60 * 1000);
}

// Minutes remaining until a gated article opens up, floored at 0.
export function minutesUntilUnlock(publishedAt: Date): number {
  const ms = gateUnlocksAt(publishedAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 60000));
}

'use client';

import { useEffect, useState } from 'react';
import { Lock, Clock } from 'lucide-react';
import { useWallet } from '@/lib/wallet/WalletProvider';
import { paragraphs } from '@/lib/format';
import ConnectWalletButton from '@/components/ConnectWalletButton';
import { RelatedTokens, ArticleSources } from '@/components/ArticleExtras';
import type { RelatedToken } from '@/lib/presenters/articles';

type GateState =
  | { phase: 'idle' }
  | { phase: 'checking' }
  | {
      phase: 'unlocked';
      body: string;
      sourceNames: string[];
      sourceUrls: string[];
      relatedTokens: RelatedToken[];
    }
  | {
      phase: 'denied';
      error:
        | 'no_address'
        | 'insufficient_balance'
        | 'gate_not_configured'
        | 'rpc_error'
        | 'not_found';
      required?: number;
    };

export default function GatedArticleBody({
  articleId,
  requiredBalance,
  minutesUntilUnlock,
}: {
  articleId: string;
  requiredBalance: number;
  minutesUntilUnlock: number;
}) {
  const { address } = useWallet();
  const [state, setState] = useState<GateState>({ phase: 'idle' });

  useEffect(() => {
    if (!address) {
      setState({ phase: 'idle' });
      return;
    }

    let cancelled = false;
    setState({ phase: 'checking' });

    fetch(`/api/articles/${articleId}?address=${encodeURIComponent(address)}`)
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;

        if (res.ok && data.article?.body) {
          setState({
            phase: 'unlocked',
            body: data.article.body,
            sourceNames: data.article.sourceNames ?? [],
            sourceUrls: data.article.sourceUrls ?? [],
            relatedTokens: data.article.relatedTokens ?? [],
          });
        } else {
          setState({
            phase: 'denied',
            error: data?.gate?.error ?? 'insufficient_balance',
            required: data?.gate?.required ?? requiredBalance,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ phase: 'denied', error: 'rpc_error' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [address, articleId, requiredBalance]);

  if (state.phase === 'unlocked') {
    return (
      <>
        {/* Holder-only extras: revealed only after the server verified the balance. */}
        <RelatedTokens tokens={state.relatedTokens} />
        {state.sourceNames.length > 0 && (
          <div className="mt-3 text-xs text-gray-400">
            <ArticleSources names={state.sourceNames} urls={state.sourceUrls} />
          </div>
        )}
        <div className="mt-6 space-y-7 text-[16px] leading-[1.75] text-ink">
          {paragraphs(state.body).map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </>
    );
  }

  return (
    <div className="mt-6 rounded-card border border-line bg-panel p-6 text-center">
      <Lock
        className="mx-auto h-5 w-5 text-gray-500"
        strokeWidth={2}
        aria-hidden="true"
      />

      <p className="mt-3 text-sm font-semibold text-ink">
        This story is holder-only for now
      </p>

      <p className="mt-1 text-sm text-gray-600">
        Connect a wallet holding at least{' '}
        <strong>{requiredBalance.toLocaleString()} $QUORUM</strong> to read it
        now, or wait — it opens to everyone in{' '}
        {minutesUntilUnlock <= 1
          ? 'under a minute'
          : `${minutesUntilUnlock} min`}
        .
      </p>

      {state.phase === 'denied' && state.error === 'insufficient_balance' && (
        <p className="mt-3 text-xs font-semibold text-danger">
          That wallet holds less than{' '}
          {(state.required ?? requiredBalance).toLocaleString()} $QUORUM.
        </p>
      )}

      {state.phase === 'denied' && state.error === 'gate_not_configured' && (
        <p className="mt-3 text-xs text-gray-500">
          Token gating isn&apos;t live yet — $QUORUM hasn&apos;t been deployed.
          Check back once it has.
        </p>
      )}

      {state.phase === 'denied' && state.error === 'rpc_error' && (
        <p className="mt-3 text-xs text-danger">
          Couldn&apos;t verify your balance right now — try again in a moment.
        </p>
      )}

      <div className="mt-4 flex items-center justify-center gap-3">
        {!address ? (
          <ConnectWalletButton variant="panel" />
        ) : state.phase === 'checking' ? (
          <span className="text-xs text-gray-500">Checking balance…</span>
        ) : (
          <span className="text-xs text-gray-500">
            Connected as a different balance? Switch wallets from the menu
            above.
          </span>
        )}
      </div>

      <p className="mt-4 flex items-center justify-center gap-1 text-[11px] text-gray-400">
        <Clock className="h-3 w-3" aria-hidden="true" />
        Free for everyone in{' '}
        {minutesUntilUnlock <= 1 ? '<1 min' : `${minutesUntilUnlock} min`}
      </p>
    </div>
  );
}

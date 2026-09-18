'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import type { EIP6963ProviderDetail } from '@/lib/wallet/eip6963';
import { KNOWN_WALLETS } from '@/lib/wallet/known-wallets';

const MORE_WALLETS_URL = 'https://ethereum.org/en/wallets/find-wallet/';

export default function WalletModal({
  wallets,
  connectingRdns,
  error,
  onConnect,
  onClose,
}: {
  wallets: EIP6963ProviderDetail[];
  connectingRdns: string | null;
  error: string | null;
  onConnect: (rdns: string) => void;
  onClose: () => void;
}) {
  // Escape to close, and lock page scroll while the modal is open.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const detectedByRdns = new Map(wallets.map((w) => [w.info.rdns, w]));

  // Curated wallets, each paired with its live detection (if any). Use the
  // detected provider's own icon when present (guaranteed current), falling
  // back to the bundled logo otherwise.
  const curatedRows = KNOWN_WALLETS.map((known) => {
    const detected = detectedByRdns.get(known.rdns) ?? null;
    return {
      key: known.rdns,
      name: known.name,
      url: known.url,
      icon: detected?.info.icon ?? known.icon,
      detected,
    };
  });

  // Any wallet the browser announced that isn't in the curated list above —
  // still shown, since it's a real, working connection option.
  const extraRows = wallets
    .filter((w) => !KNOWN_WALLETS.some((k) => k.rdns === w.info.rdns))
    .map((w) => ({
      key: w.info.rdns,
      name: w.info.name,
      url: null as string | null,
      icon: w.info.icon,
      detected: w,
    }));

  const rows = [...curatedRows, ...extraRows];

  return (
    <motion.div
      className="wallet-modal-overlay"
      onMouseDown={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <motion.div
        className="wallet-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
      >
        <button
          className="wallet-modal-close"
          aria-label="Close"
          onClick={onClose}
        >
          ×
        </button>

        <h2 id="wallet-modal-title" className="wallet-modal-title">
          Connect a Wallet
        </h2>
        <p className="wallet-modal-subtitle">Select your wallet</p>

        <ul className="wallet-modal-list">
          {rows.map((row) => {
            const isConnecting = connectingRdns === row.key;
            const isInstalled = row.detected !== null;

            return (
              <li key={row.key}>
                {isInstalled ? (
                  <button
                    type="button"
                    className="wallet-modal-row"
                    disabled={connectingRdns !== null}
                    onClick={() => onConnect(row.key)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={row.icon} alt="" className="wallet-modal-icon" />
                    <span className="wallet-modal-name">{row.name}</span>
                    <span
                      className={`wallet-modal-badge${isConnecting ? ' pending' : ''}`}
                    >
                      {isConnecting ? 'Connecting…' : 'Installed'}
                    </span>
                  </button>
                ) : (
                  <a
                    className="wallet-modal-row"
                    href={row.url ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={row.icon} alt="" className="wallet-modal-icon" />
                    <span className="wallet-modal-name">{row.name}</span>
                    <span className="wallet-modal-badge link">Connect →</span>
                  </a>
                )}
              </li>
            );
          })}
        </ul>

        {error && <p className="wallet-modal-error">{error}</p>}

        <a
          className="wallet-modal-more"
          href={MORE_WALLETS_URL}
          target="_blank"
          rel="noreferrer"
        >
          Don&apos;t see your wallet? More options →
        </a>
      </motion.div>
    </motion.div>
  );
}

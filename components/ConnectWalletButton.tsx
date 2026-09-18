'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useWallet } from '@/lib/wallet/WalletProvider';
import { truncateAddress } from '@/lib/format';
import WalletModal from '@/components/WalletModal';

type Variant = 'header' | 'ghost' | 'panel' | 'footer';

const VARIANT_CLASS: Record<Variant, string> = {
  header: 'btn-connect',
  ghost: 'btn-ghost',
  panel: 'btn-lime wallet-panel-btn',
  // Looks like the other footer menu links, but is a <button> that opens the modal.
  footer: 'footer-link-btn',
};

export default function ConnectWalletButton({
  variant = 'header',
}: {
  variant?: Variant;
}) {
  const { wallets, address, error, connect, disconnect } = useWallet();
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingRdns, setPendingRdns] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close the "connected" dropdown on an outside click.
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Once a connection succeeds (address gets set), the modal has nothing left to do.
  useEffect(() => {
    if (address) {
      setModalOpen(false);
      setPendingRdns(null);
    }
  }, [address]);

  const baseClass = VARIANT_CLASS[variant];

  async function handleConnect(rdns: string) {
    setPendingRdns(rdns);
    await connect(rdns);
    setPendingRdns(null);
  }

  // Already connected — show the address, with a small menu to disconnect.
  if (address) {
    return (
      <div className="wallet-menu-root" ref={rootRef}>
        <button
          type="button"
          className={baseClass}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span className="dot" />
          <span className="label">{truncateAddress(address)}</span>
        </button>
        {menuOpen && (
          <div className="wallet-dropdown">
            <button
              type="button"
              className="wallet-dropdown-item"
              onClick={() => {
                navigator.clipboard?.writeText(address);
                setMenuOpen(false);
              }}
            >
              Copy address
            </button>
            <button
              type="button"
              className="wallet-dropdown-item danger"
              onClick={() => {
                disconnect();
                setMenuOpen(false);
              }}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  // Not connected — one button opens the wallet-picker modal.
  return (
    <>
      <button
        type="button"
        className={baseClass}
        onClick={() => setModalOpen(true)}
      >
        <span className="label">Connect Wallet</span>
      </button>
      <AnimatePresence>
        {modalOpen && (
          <WalletModal
            wallets={wallets}
            connectingRdns={pendingRdns}
            error={error}
            onConnect={handleConnect}
            onClose={() => setModalOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

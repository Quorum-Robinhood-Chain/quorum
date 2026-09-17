'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { getAddress } from 'ethers';
import type { EIP6963ProviderDetail } from './eip6963';

const STORAGE_KEY = 'quorum_wallet_rdns';

type WalletContextValue = {
  /** Every wallet extension discovered so far via EIP-6963. */
  wallets: EIP6963ProviderDetail[];
  address: string | null;
  connecting: boolean;
  error: string | null;
  connect: (rdns: string) => Promise<void>;
  disconnect: () => void;
};

const WalletContext = createContext<WalletContextValue | null>(null);

// Best-effort checksum formatting; falls back to the raw value if malformed.
function normalizeAddress(raw: string): string {
  try {
    return getAddress(raw);
  } catch {
    return raw;
  }
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [wallets, setWallets] = useState<EIP6963ProviderDetail[]>([]);
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeRef = useRef<EIP6963ProviderDetail | null>(null);
  const unbindRef = useRef<(() => void) | null>(null);

  const disconnect = useCallback(() => {
    unbindRef.current?.();
    unbindRef.current = null;
    activeRef.current = null;
    setAddress(null);
    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Wire up live updates from whichever provider is currently active.
  const bind = useCallback(
    (detail: EIP6963ProviderDetail) => {
      const handleAccounts = (accounts: unknown) => {
        const list = accounts as string[];
        if (!list.length) {
          disconnect();
        } else {
          setAddress(normalizeAddress(list[0]));
        }
      };
      const handleChain = () => {
        // Re-read the account on network switches rather than reloading the page.
        detail.provider
          .request({ method: 'eth_accounts' })
          .then(handleAccounts)
          .catch(() => {});
      };

      detail.provider.on('accountsChanged', handleAccounts);
      detail.provider.on('chainChanged', handleChain);

      unbindRef.current = () => {
        detail.provider.removeListener('accountsChanged', handleAccounts);
        detail.provider.removeListener('chainChanged', handleChain);
      };
    },
    [disconnect],
  );

  const connect = useCallback(
    async (rdns: string) => {
      const detail = wallets.find((w) => w.info.rdns === rdns);
      if (!detail) {
        setError('Wallet not found — is the extension still installed?');
        return;
      }

      setConnecting(true);
      setError(null);
      try {
        const accounts = (await detail.provider.request({
          method: 'eth_requestAccounts',
        })) as string[];

        if (!accounts.length) throw new Error('No account was returned.');

        unbindRef.current?.();
        activeRef.current = detail;
        bind(detail);
        setAddress(normalizeAddress(accounts[0]));
        window.localStorage.setItem(STORAGE_KEY, rdns);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Could not connect wallet.',
        );
      } finally {
        setConnecting(false);
      }
    },
    [wallets, bind],
  );

  // Discover every injected wallet extension present in this browser.
  useEffect(() => {
    function onAnnounce(event: Event) {
      const detail = (event as CustomEvent<EIP6963ProviderDetail>).detail;
      setWallets((prev) =>
        prev.some((w) => w.info.uuid === detail.info.uuid)
          ? prev
          : [...prev, detail],
      );
    }

    window.addEventListener('eip6963:announceProvider', onAnnounce);
    window.dispatchEvent(new Event('eip6963:requestProvider'));

    return () =>
      window.removeEventListener('eip6963:announceProvider', onAnnounce);
  }, []);

  // Restore a previous session silently (no popup) once the same wallet re-announces.
  useEffect(() => {
    if (activeRef.current) return;

    const savedRdns = window.localStorage.getItem(STORAGE_KEY);
    if (!savedRdns) return;

    const detail = wallets.find((w) => w.info.rdns === savedRdns);
    if (!detail) return;

    detail.provider
      .request({ method: 'eth_accounts' })
      .then((accounts) => {
        const list = accounts as string[];
        if (!list.length) {
          window.localStorage.removeItem(STORAGE_KEY);
          return;
        }
        activeRef.current = detail;
        bind(detail);
        setAddress(normalizeAddress(list[0]));
      })
      .catch(() => {});
  }, [wallets, bind]);

  useEffect(() => () => unbindRef.current?.(), []);

  return (
    <WalletContext.Provider
      value={{ wallets, address, connecting, error, connect, disconnect }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within <WalletProvider>');
  return ctx;
}

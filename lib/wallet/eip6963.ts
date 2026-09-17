// Minimal EIP-6963 ("Multi Injected Provider Discovery") types.
// Lets the page discover every installed wallet extension (MetaMask, Coinbase
// Wallet, Rabby, Brave Wallet, …) instead of only whichever one wins the race
// to set `window.ethereum`.
// Spec: https://eips.ethereum.org/EIPS/eip-6963

export interface EIP1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on(event: string, listener: (...args: unknown[]) => void): void;
  removeListener(event: string, listener: (...args: unknown[]) => void): void;
}

export interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string; // data: URI
  rdns: string; // reverse-DNS id, e.g. "io.metamask" — stable across sessions
}

export interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: EIP1193Provider;
}

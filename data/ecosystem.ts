import { ProtocolRow } from '@/types';

// Ecosystem rows: protocol integrations + TVL — swap for a live fetch before launch.
export const protocols: ProtocolRow[] = [
  {
    id: 'arcus',
    name: 'Arcus',
    category: 'dex',
    description:
      'DEX from the dYdX team, running fee-rebate incentives to compete for early Robinhood Chain volume.',
    tvl: '$12.4M',
    change7d: '+9.1%',
    isUp: true,
    url: 'https://arcus.trade',
  },
  {
    id: 'uniswap',
    name: 'Uniswap',
    category: 'dex',
    description: 'The leading AMM, live on Robinhood Chain since launch.',
    tvl: '$9.8M',
    change7d: '+3.4%',
    isUp: true,
    url: 'https://uniswap.org',
  },
  {
    id: '1inch',
    name: '1inch',
    category: 'dex',
    description:
      'Aggregator routing swaps across Robinhood Chain DEX liquidity for best execution.',
    tvl: '$4.1M',
    change7d: '-1.2%',
    isUp: false,
    url: 'https://1inch.io',
  },
  {
    id: 'lighter',
    name: 'Lighter',
    category: 'dex',
    description:
      'Orderbook-style exchange, one of the first venues live on the chain.',
    tvl: '$3.6M',
    change7d: '+5.7%',
    isUp: true,
    url: 'https://lighter.xyz',
  },
  {
    id: 'morpho',
    name: 'Morpho',
    category: 'lending',
    description:
      'USDG lending market — the go-to venue for stablecoin yield on Robinhood Chain.',
    tvl: '$11.7M',
    change7d: '+12.0%',
    isUp: true,
    url: 'https://morpho.org',
  },
  {
    id: 'chainlink',
    name: 'Chainlink',
    category: 'oracle',
    description:
      'Price feeds powering Stock Token pricing and other on-chain reference data.',
    tvl: '—',
    url: 'https://chain.link',
  },
];

export const protocolCategoryLabels: Record<string, string> = {
  dex: 'DEXs',
  lending: 'Lending',
  oracle: 'Oracles & infra',
};

export const protocolCategoryOrder: Array<ProtocolRow['category']> = [
  'dex',
  'lending',
  'oracle',
];

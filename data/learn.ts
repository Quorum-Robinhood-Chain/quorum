import { LearnGuide } from '@/types';

// Learn guides — explainer content, low update frequency. `body` is shown on the
// /learn/[id] detail page, formatted the same way an article body is (one paragraph
// per line break).
export const learnGuides: LearnGuide[] = [
  {
    id: 'learn-1',
    title: 'What is Robinhood Chain? The basics, explained',
    dek: 'A permissionless, EVM-compatible Ethereum L2 (chain ID 4663) built on Arbitrum Orbit — what that actually means for users.',
    href: '/learn/learn-1',
    body: `Robinhood Chain is an Ethereum layer-2 network built using Arbitrum Orbit, which means it inherits Ethereum's security while settling transactions faster and cheaper than Ethereum's base layer. Its chain ID is 4663, and because it's EVM-compatible, any wallet or tool that works with Ethereum — MetaMask, Rabby, block explorers — works here too.

"Permissionless" is the key word. Anyone can deploy a smart contract, launch a token, or build an app on Robinhood Chain without asking for approval. Robinhood the company operates infrastructure around the chain — like Stock Tokens — but doesn't gatekeep who can build on it.

For everyday users, this mostly shows up as speed and cost: transactions confirm in seconds and gas fees are a fraction of what they'd cost on Ethereum mainnet. The trade-off is that, like most L2s, you're trusting the chain's sequencer and bridge contracts in addition to Ethereum itself — worth knowing before you move meaningful funds.

Where it gets used today is mostly around two things: Stock Tokens (tokenized exposure to US equities) and USDG lending markets. Both are covered in their own guides below.`,
  },
  {
    id: 'learn-2',
    title: 'Stock Tokens vs. owning the underlying stock',
    dek: 'Stock Tokens are ERC-20 instruments structured as debt securities that track US equities, settled in USDG — not direct equity ownership.',
    href: '/learn/learn-2',
    body: `A Stock Token is an ERC-20 token designed to track the price of a US-listed stock, priced by Chainlink oracle feeds and settled in USDG. What it is not is a share of the company — legally, it's structured as a debt security, meaning you hold a claim on the issuer that mirrors the stock's price, not equity in Apple, Tesla, or whichever company the token tracks.

That distinction matters for a few reasons. You don't get shareholder voting rights, you're not on the company's cap table, and your exposure depends on the issuer honoring the token's terms — not just on the stock's price moving. It's closer to a synthetic instrument than to a brokerage account holding.

On the upside, Stock Tokens trade 24/7 on-chain, settle near-instantly, and can be used inside DeFi — as collateral in lending markets, for example — in ways a normal brokerage share can't be.

If your goal is long-term ownership with shareholder rights, a traditional brokerage account is the more direct route. If you want on-chain, composable price exposure and you understand the debt-security structure, Stock Tokens are built for that use case specifically.`,
  },
  {
    id: 'learn-3',
    title: 'There\'s no "RHC" coin — here\'s how exposure actually works',
    dek: "Robinhood Chain has no native governance token. Economic exposure to the chain runs through HOOD, Robinhood's Nasdaq-listed equity.",
    href: '/learn/learn-3',
    body: `A common question from people new to Robinhood Chain: "what's the token, and where do I buy it?" The honest answer is that there isn't one. Unlike most L2s and app-chains, Robinhood Chain doesn't have a native governance or utility token that trades on exchanges.

Gas on the chain is paid in ETH (bridged from mainnet), and the main stable asset used across the ecosystem is USDG. Neither of those is a "Robinhood Chain coin" in the sense of something that captures the chain's growth the way, say, a governance token with fee-sharing might.

So how do you get exposure to the chain's success? Indirectly, through HOOD — Robinhood Markets' Nasdaq-listed stock. Robinhood Chain is a piece of Robinhood's broader product strategy, so its usage and adoption feed into the same company that HOOD represents. It's a very different exposure profile than holding a chain-native token: you're buying a diversified, regulated equity, not a crypto-native asset with its own market behavior.

Worth flagging: token listings claiming to be "the Robinhood Chain token" that aren't Stock Tokens or USDG are not affiliated with Robinhood Chain's actual infrastructure — treat them with the same skepticism you'd apply to any unverified token claiming a well-known name.`,
  },
  {
    id: 'learn-4',
    title: 'How USDG lending on Morpho works',
    dek: "A plain-language walkthrough of the lending pool that's become the go-to USDG market on Robinhood Chain.",
    href: '/learn/learn-4',
    body: `Morpho is a lending protocol, and on Robinhood Chain its USDG market has become the default place people go to earn yield on idle USDG or borrow against collateral. Mechanically, it works like most on-chain lending markets: depositors supply USDG into a pool, borrowers post collateral (often Stock Tokens or ETH) and draw USDG against it, and the interest borrowers pay flows to depositors as yield.

The APY isn't fixed — it moves with utilization. When more people want to borrow than there is USDG supplied, rates rise to attract more depositors and cool off borrowing demand; when the pool is under-utilized, rates drift down. That's why you'll see the rate quoted as a current snapshot rather than a guaranteed return.

The main risks are the ones common to any lending market: smart-contract risk in Morpho's contracts, and liquidation risk for borrowers if their collateral's value drops relative to what they've borrowed. Depositors don't face liquidation risk directly, but their yield is tied to how healthy borrowing demand stays.

If you're evaluating whether to supply USDG, the things worth checking before you do are the current utilization rate, what collateral types are backing the borrows, and whether the pool has been audited — the Markets page on this site tracks TVL and rate in real time.`,
  },
];

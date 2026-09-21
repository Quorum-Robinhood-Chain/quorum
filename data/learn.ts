import { LearnGuide } from '@/types';

// Learn guides — explainer content, low update frequency. `body` is shown on the
// /learn/[id] detail page, formatted the same way an article body is (one paragraph
// per line break).
export const learnGuides: LearnGuide[] = [
  {
    id: 'learn-1',
    title: 'What Are Stock Tokens?',
    shortTitle: 'What Are Stock Tokens?',
    dek: 'A plain-language look at how tokenized equities work on Robinhood Chain.',
    href: '/learn/learn-1',
    body: `Stock tokens are on-chain representations of shares in real companies. Each token is backed 1:1 by an underlying share held by a regulated custodian, so the token's price is designed to track the stock's price rather than move independently.
 
Holding a stock token is different from holding the share directly through a brokerage. You get exposure to the price and, in most designs, corporate actions like splits are reflected in the token, but you typically don't get direct voting rights at the shareholder level — those stay with the custodian who holds the underlying share.
 
The appeal is composability: once a stock is represented as a token, it can move between wallets, be posted as collateral, or be paired with other assets in a way a traditional brokerage account can't easily support.
 
The trade-off is counterparty and custody risk. You're trusting that the entity minting the token actually holds — and will keep holding — the real share behind it, and that redemption works as advertised if you ever want to convert back.`,
  },
  {
    id: 'learn-2',
    title: 'How Robinhood Chain Works',
    shortTitle: 'How Robinhood Chain Works',
    dek: 'The basics of the chain that stock tokens and USDG settle on.',
    href: '/learn/learn-2',
    body: `Robinhood Chain is the settlement layer that stock tokens, USDG, and related activity run on. Like other modern chains, it's built to process transactions cheaply and quickly rather than to compete on novelty — the interesting part is what's issued on top of it, not the chain itself.
 
Blocks are produced on a regular cadence, and every stock token transfer, mint, redemption, or lending action shows up as an on-chain transaction that anyone can look up. That's a meaningful shift from traditional finance, where settlement details aren't public by default.
 
Because the chain is purpose-built around these use cases, most activity clusters around a small set of contracts: token issuers, DEX pools, and lending markets. That makes it easier to track flows, but it also means the chain's health is closely tied to the health of those specific applications.
 
None of this makes the underlying assets safer — it just makes the mechanics of moving them more transparent and, in principle, easier to audit.`,
  },
  {
    id: 'learn-3',
    title: "Why There's No Native Governance Token",
    shortTitle: 'No Native Governance Token',
    dek: 'Robinhood Chain deliberately skips the typical "governance token" model.',
    href: '/learn/learn-3',
    body: `Many blockchain projects launch a native token that doubles as a governance instrument — holders vote on protocol parameters, treasury spending, or upgrades. Robinhood Chain doesn't follow that pattern.
 
Part of the reasoning is regulatory. A token that confers governance rights over a financial system, marketed to retail users, invites securities-law scrutiny in a way that a plain payment or utility rail may not. Skipping the governance token sidesteps that category of questions.
 
It also reflects who's actually making decisions. The chain and its core applications are run by identifiable, regulated entities rather than a decentralized token-holder collective, so there isn't really a governance process to attach a token to in the first place.
 
The practical effect for users: you're not going to find a native "chain token" to vote with here. Tokens like $QUORUM that exist in this ecosystem serve other purposes — such as gating access to a product — not on-chain governance.`,
  },
  {
    id: 'learn-4',
    title: 'How USDG lending on Morpho works',
    shortTitle: 'USDG Lending on Morpho',
    dek: "A plain-language walkthrough of the lending pool that's become the go-to USDG market on Robinhood Chain.",
    href: '/learn/learn-4',
    body: `Morpho is a lending protocol, and on Robinhood Chain its USDG market has become the default place people go to earn yield on idle USDG or borrow against collateral. Mechanically, it works like most on-chain lending markets: depositors supply USDG into a pool, borrowers post collateral (often Stock Tokens or ETH) and draw USDG against it, and the interest borrowers pay flows to depositors as yield.
 
Rates on Morpho aren't fixed — they move with utilization. When a large share of the pool's USDG is already lent out, borrowing costs rise to attract more depositors and cool off demand; when utilization is low, rates drift back down. That means the yield a depositor sees today isn't a promise about tomorrow.
 
Borrowing follows the same over-collateralized structure used across on-chain lending: you post more value in collateral than you draw out in USDG, and if that collateral's value falls too close to your loan, the position is liquidated to protect depositors. The exact loan-to-value ceiling depends on which asset you're posting — Stock Tokens and ETH aren't treated identically.
 
For most users the practical draw is simple: it's a way to put idle USDG to work, or to unlock liquidity against a Stock Token position without selling it outright. The trade-off is the same one every lending market carries — rate risk for depositors, and liquidation risk for borrowers if the market moves fast.`,
  },
  {
    id: 'learn-5',
    title: 'USDG, Explained',
    shortTitle: 'USDG, Explained',
    dek: "What USDG is and why it's the base currency for this ecosystem.",
    href: '/learn/learn-5',
    body: `USDG is a fiat-backed stablecoin used as the primary unit of account across Robinhood Chain — it's what stock tokens are typically priced and traded against, and what lending markets are denominated in.
 
Being fiat-backed means each USDG in circulation is meant to be matched by reserves — cash and cash-equivalents — held by the issuer. That backing is what lets USDG trade close to $1 under normal conditions, though it depends entirely on the issuer actually maintaining and disclosing those reserves.
 
Within this ecosystem, USDG plays the role that a brokerage's cash balance plays in traditional investing: it's the thing you hold between trades, the thing you receive when you sell a stock token, and the thing you can lend out or borrow against.
 
Because so much activity is denominated in USDG, its stability is a load-bearing assumption for the whole system — if USDG were to depeg, it would affect stock token pricing and lending markets simultaneously, not just USDG holders.`,
  },
  {
    id: 'learn-6',
    title: 'Custody and Redemption',
    shortTitle: 'Custody and Redemption',
    dek: 'What actually backs a stock token, and how you get the real thing back.',
    href: '/learn/learn-6',
    body: `Every stock token is a claim on a share held somewhere by a real custodian — a regulated entity that holds the actual equity and is responsible for keeping the token supply matched to real holdings.
 
Minting typically happens when the custodian receives a new share and issues a corresponding token. Redemption runs the process in reverse: you send the token back, and — assuming everything works as designed — the custodian releases or sells the underlying share on your behalf.
 
In practice, redemption is often less immediate and less accessible than trading the token itself. There may be minimum sizes, processing windows, or eligibility restrictions that make redemption more like a traditional brokerage request than an instant on-chain swap.
 
This is the piece worth understanding before treating a stock token as interchangeable with owning the stock directly: the token's value depends on that custody-and-redemption chain continuing to function exactly as described.`,
  },
  {
    id: 'learn-7',
    title: 'The Risks Worth Knowing',
    shortTitle: 'Risks Worth Knowing',
    dek: 'Tokenized stocks bring crypto-market risks along with traditional ones.',
    href: '/learn/learn-7',
    body: `Tokenized stocks inherit ordinary market risk — the price of the underlying company can go up or down for all the usual reasons. That part isn't new.
 
What is new is a layer of custody and issuer risk: your token's value depends on the custodian actually holding the underlying share and being solvent and willing to honor redemptions. If that link breaks, the token can trade at a discount to the real stock, or worse.
 
There's also market-structure risk specific to on-chain trading: thinner liquidity than the underlying stock's home exchange, wider spreads outside of that exchange's trading hours, and the possibility of smart-contract bugs in the token or the venues it trades on.
 
Finally, because much of this activity is denominated in and collateralized against USDG and other tokens, a shock to any one piece — a stablecoin wobble, a liquidity crunch in a lending market — can spill into prices elsewhere in the ecosystem faster than it would in traditional markets.`,
  },
  {
    id: 'learn-8',
    title: 'Trading Hours and Liquidity',
    shortTitle: 'Trading Hours and Liquidity',
    dek: 'Why a stock token can trade at 3am, and what that means for pricing.',
    href: '/learn/learn-8',
    body: `A regular stock only trades during its home exchange's official hours. A stock token backed by that stock, however, can trade on-chain around the clock, since the token itself just needs a willing buyer and seller — it doesn't need the exchange to be open.
 
That creates an obvious question: what sets the price outside normal market hours? Without the underlying exchange trading, the token's price is driven by whoever's actually buying and selling on-chain, informed by futures, overseas markets, and news — but without the depth of the real exchange behind it.
 
The practical effect is that spreads tend to widen and price swings can be larger during hours when the primary market is closed. A stock token's after-hours price move isn't necessarily wrong, but it's often based on thinner trading than you'd see during the stock's normal session.
 
Once the underlying exchange reopens, token prices generally converge back toward the official market price, but the gap in between is a real source of volatility for anyone trading around the clock.`,
  },
  {
    id: 'learn-9',
    title: 'Fees You Might Not Notice',
    shortTitle: 'Fees You Might Not Notice',
    dek: 'Where costs show up when trading and lending in this ecosystem.',
    href: '/learn/learn-9',
    body: `Trading a stock token usually involves more than one layer of cost. There's the spread between buy and sell prices on whichever venue you're using, a network fee to actually process the transaction on-chain, and — depending on the venue — a protocol trading fee taken from the trade itself.
 
Lending markets have their own fee structure, mostly expressed as interest rather than a flat fee. Borrowers pay a variable rate that changes with demand; suppliers earn a share of that rate, with the rest sometimes routed to the protocol itself.
 
Minting and redeeming tokens directly with the issuer can carry separate costs too — administrative fees or minimum sizes that don't apply when you're just trading the token on the open market.
 
None of these costs are usually hidden, but they are spread across several places, so it's easy to underestimate the total cost of a round trip — buying, holding, and eventually selling or redeeming — if you only look at the headline trading fee.`,
  },
  {
    id: 'learn-10',
    title: 'Where the Regulatory Line Sits',
    shortTitle: 'The Regulatory Line',
    dek: 'A grounded look at the legal status of stock tokens and USDG — not legal advice.',
    href: '/learn/learn-10',
    body: `Tokenized stocks and stablecoins sit at the intersection of securities law, banking regulation, and commodities rules, and the details vary a lot by jurisdiction. A stock token is generally treated as a claim tied to the underlying security, which means it can carry many of the same regulatory obligations as the security itself, even though it's wrapped in a token.
 
Stablecoins like USDG have increasingly moved toward being regulated more directly as payment instruments, with requirements around reserve backing, disclosure, and redemption rights — though the specifics differ by issuer and jurisdiction, and rules are still evolving.
 
For users, the practical questions worth asking are simple ones: who is the issuer, what jurisdiction are they regulated in, and what do they actually promise about redemption and reserves? Those answers matter more than whether something is labeled "crypto."
 
This is general background, not legal or financial advice — rules in this space are changing quickly, and what's true today may not hold in a year.`,
  },
];
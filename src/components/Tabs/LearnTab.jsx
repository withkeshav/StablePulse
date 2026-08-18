import { useEffect, useMemo, useState } from 'preact/hooks';
import { buildLearnObservations } from '../../lib/insights.js';

const GLOSSARY = [
  { term: 'Peg', def: 'The target price a stablecoin tries to hold, almost always $1.00.' },
  { term: 'Depeg', def: 'A move away from the peg, usually measured in basis points (bps). 50 bps is half a percent.' },
  { term: 'Collateral', def: 'The assets backing the stablecoin so each token stays redeemable at $1.' },
  { term: 'Mint', def: 'New stablecoin tokens created, adding supply.' },
  { term: 'Burn', def: 'Stablecoin tokens destroyed, removing supply.' },
  { term: 'Cross-chain flow', def: 'Supply moving between blockchains, often for yield or liquidity reasons.' },
  { term: 'Stress index', def: 'A 0-100 score combining peg drift, active alerts, and flow pressure.' },
  { term: 'Whale watch', def: 'Detection of unusual supply jumps on a chain using z-scores.' },
  { term: 'Basis point (bps)', def: 'One hundredth of a percentage point. 100 bps = 1%.' },
  { term: 'Redemption', def: 'Exchanging a stablecoin for its backing at face value. The mechanism that keeps the peg honest.' },
  { term: 'Reserve attestation', def: 'A third-party check on an issuer\'s backing assets, usually a snapshot rather than a full audit.' },
  { term: 'Over-collateralization', def: 'Backing each token with more than $1 of assets so the peg survives market drawdowns.' },
  { term: 'Delta-neutral', def: 'A position that cancels out price moves, used by synthetic issuers to hold value without cash reserves.' },
  { term: 'Bridge', def: 'A mechanism that moves tokens between blockchains, a common vector for liquidity migration.' },
  { term: 'TVL', def: 'Total value locked: assets deposited in DeFi protocols, often denominated in stablecoins.' },
  { term: 'Dominance', def: 'A coin\'s share of tracked stablecoin supply. Shifts in it trigger DOM_SHIFT alerts.' },
  { term: 'Z-score', def: 'How many standard deviations a supply move sits from its recent baseline. High z-scores drive whale-watch flags.' },
  { term: 'Severity', def: 'The alert triage: WARNING, HIGH, CRITICAL. Higher levels signal more real stress.' },
  { term: 'Algorithmic stablecoin', def: 'A model with no direct backing that relies on market incentives. Historically the highest depeg risk.' },
  { term: 'Arbitrage', def: 'Buying a coin below $1 and redeeming at face value (or minting and selling above $1). The force that pulls prices back to the peg.' },
  { term: 'Reference asset', def: 'The real-world value a stablecoin is designed to track. Usually the US dollar, but can be gold, another fiat currency, or a basket.' },
  { term: 'Tokenized fund', def: 'A regulated security that holds traditional assets like Treasuries on-chain. Unlike a payment stablecoin, it pays yield but requires KYC and restricts transfers.' },
  { term: 'Funding rate', def: 'The periodic fee longs pay shorts (or vice versa) in perpetual futures. Ethena\'s USDe earns its yield from this.' },
];

const MODULES = [
  {
    id: 'fundamentals',
    title: 'Fundamentals',
    lessons: [
      {
        id: 'what-is',
        title: 'What is a stablecoin?',
        body: 'A stablecoin is a cryptocurrency designed to hold a fixed value, usually $1.00. The value is held through a peg: each token is backed by reserves, collateral, or an algorithm that works to keep the price stable. This makes them useful for payments, trading pairs, and as a safe haven inside crypto markets.',
      },
      {
        id: 'peg-mechanics',
        title: 'How does a peg actually work?',
        body: 'Issuers keep the price near $1 through redemption: you can normally exchange the token for its backing. If the price drifts below $1, arbitrageurs buy the token cheap and redeem it at face value, which pushes the price back up. If it trades above $1, arbitrageurs mint new tokens and sell them, which pushes the price back down. The peg is only as strong as the backing behind it.',
      },
      {
        id: 'collateral-types',
        title: 'Types of collateral',
        observationId: 'collateral-mix',
        body: 'Fiat-backed coins (USDT, USDC, PYUSD) hold cash and equivalents in bank accounts. Crypto-backed coins (DAI) hold other digital assets in over-collateralized vaults. Synthetic or yield-backed coins (USDE) use delta-neutral positions to neutralize price moves. Algorithmic coins use market incentives with no direct backing, and they carry the highest depeg risk.',
      },
      {
        id: 'depeg-causes',
        title: 'What causes a depeg?',
        body: 'A depeg happens when redemption confidence drops. Common triggers: doubts about the issuer reserves, a bank run on the backing assets, a large redemption wave, or a panic move across the market. When the peg breaks, the stress index in this app rises, alerts fire, and the flow view shows where supply is moving.',
      },
      {
        id: 'read-dashboard',
        title: 'How to read this dashboard',
        observationId: 'peg-drift',
        body: 'The peg stress index gives a 0-100 health score. The supply and price charts show 90-day history. Cross-chain flows show which chains are gaining or losing supply. Whale watch flags unusual supply jumps. The AI narrative sums up the signal in plain language, and the alerts hub lists deterministic events with severity and magnitude.',
      },
    ],
  },
  {
    id: 'ecosystem',
    title: 'The ecosystem map',
    lessons: [
      {
        id: 'who-issues',
        title: 'Who issues stablecoins, and why it matters',
        observationId: 'dominance',
        body: 'Five issuers on this dashboard are five different models. Tether is the offshore giant: the deepest liquidity and the market\'s floor. Circle is the regulated institutional leader. Sky (formerly MakerDAO) runs a DAO with over-collateralized crypto vaults. Ethena runs a delta-neutral yield-bearing dollar. PayPal is the corporate payments entrant. The model matters because it decides where reserves sit, who audits them, and how fast you can redeem.',
      },
      {
        id: 'many-chains',
        title: 'Why stablecoins live on so many chains',
        observationId: 'chain-concentration',
        body: 'A stablecoin\'s supply lives on many chains at once. Bridges move liquidity to wherever yield is highest, exchanges keep local balances to settle trades, and apps need supply on their own network. Tron dominates USDT because transfers are nearly free there. Ethereum and Arbitrum hold most DeFi-facing supply. The Chains tab shows where that supply is flowing this week.',
      },
      {
        id: 'cbdc',
        title: 'Stablecoins vs. CBDCs vs. tokenized deposits',
        body: 'A stablecoin is privately issued, runs on public blockchains, and is usually redeemable for dollars. A CBDC would be issued by a central bank, is still experimental in most countries, and is not a product anyone can hold or trade. A tokenized deposit is a bank liability on a ledger: regulated like a deposit, backed by the issuing bank, and not meant to circulate like a currency. People conflate all three; only stablecoins form a global, 24/7 market.',
      },
      {
        id: 'volume-uses',
        title: 'Where stablecoin volume actually goes',
        body: 'Most stablecoin volume is trading. Pairs against BTC, ETH, and altcoins are denominated in stablecoins because they do not move with the market, so they are the default quote asset on exchanges. A smaller but growing slice goes to cross-border payments and remittances, which beat bank wires on cost and speed. DeFi uses them as collateral and liquidity. Treasury and payroll use is still early. The 24h Volume stat on Home is mostly that trading side.',
      },
    ],
  },
  {
    id: 'risk-history',
    title: 'Risk & history',
    lessons: [
      {
        id: 'depeg-cases',
        title: 'Anatomy of a real depeg',
        body: 'Two famous depegs show two different failure modes. UST (May 2022) was algorithmic: it relied on a sister token burning to absorb sell pressure, and when confidence cracked the spiral ran both tokens toward zero. USDC (March 2023) fell below the peg for roughly 60 hours when Circle\'s reserves sat with failed Silicon Valley Bank, then recovered once the money was covered. One was a structural death spiral; the other was a temporary bank-run scare that self-corrected.',
      },
      {
        id: 'regulated-risk',
        title: 'Why regulated issuers still carry risk',
        body: 'Regulation lowers risk; it does not remove it. Reserves sit in cash, Treasuries, and money-market funds, but attestations are snapshots, not full audits of the custody chain. Redemption gates can freeze withdrawals during a run, and some issuers keep that clause for exactly that moment. Counterparty risk lives in the banks and brokers that hold the backing. Read the reserve report before trusting the seal of approval.',
      },
      {
        id: 'z-scores',
        title: 'What z-scores and whale-watch actually detect',
        body: 'Whale watch compares a chain\'s latest 24h supply change with its own recent history. The z-score counts how many standard deviations the move sits from the typical daily churn. A z-score of 2.5 or a single move above $750M flags the event. That usually means a coordinated mint or burn: an exchange seeding liquidity, a treasury moving, or a migration. A spike is not automatically bad; it is a prompt to open the chain view and look.',
      },
      {
        id: 'reading-alerts',
        title: 'Reading alert severity',
        observationId: 'alert-count',
        body: 'Alerts are deterministic rules, not opinions. PEG_BREAK fires when a coin trades past its drift threshold from $1. CHAIN_FLOW flags a single unmatched chain move above threshold. MIGRATION pairs opposite chain flows of similar size when net supply is broadly unchanged. NET_MINT and NET_BURN catch coin-wide issuance. DOM_SHIFT tracks a coin gaining or losing supply share. Severity orders them WARNING, HIGH, CRITICAL. Event time is the source observation, not the moment this page loaded.',
      },
    ],
  },
  {
    id: 'regulation',
    title: 'Regulation & outlook',
    lessons: [
      {
        id: 'regulation-state',
        title: 'Stablecoin regulation, as of August 2026',
        body: 'As of August 2026: the EU\'s MiCA licensing for stablecoin issuers is the operational baseline across Europe. The US is still converging on a federal framework with reserve, audit, and redemption requirements, with state and federal paths overlapping. Japan and Singapore run their own bank-backed models. This field moves fast. Treat this card as a dated snapshot, not a forecast, and verify the current state before relying on it.',
      },
      {
        id: 'regulated-offshore',
        title: 'What "regulated" vs "offshore" means for a holder',
        body: 'A regulated issuer publishes reserve data, faces audits, and offers a defined redemption path, which usually means less tail risk and more disclosure. An offshore issuer can move faster and often dominates trading volume, but you depend on its word and its jurisdiction for the backing. Neither is immune to a run. For a holder the practical question is simple: if redemptions froze tomorrow, who would you call, and what would they legally owe you?',
      },
    ],
  },
  {
    id: 'beyond-dollar',
    title: 'Beyond the dollar',
    moduleLink: { href: '/research/#taxonomy', label: 'Explore the full taxonomy with charts and data' },
    lessons: [
      {
        id: 'stable-relative-to-what',
        title: 'Stable relative to what',
        body: 'A stablecoin is a token engineered to hold a steady value against some reference, and that reference is usually but not always the US dollar. On this dashboard all five tracked coins are dollar-pegged, which matches the common case. The wider category also includes tokens pegged to gold, to other fiat currencies like the euro, to baskets of assets, and to tokenized funds that hold Treasuries. The dollar dominates because it has the deepest short-term debt market and the strongest network effects, not because a stablecoin must be a dollar token by definition.',
      },
      {
        id: 'gold-commodity',
        title: 'Gold and other commodity-backed coins',
        body: 'Some tokens are stable relative to a physical commodity, not the dollar. PAXG and XAUT each represent one troy ounce of gold held in vaults in London and Switzerland, so their dollar price moves with gold rather than holding at $1. Together they cover about 96% of the tokenized-gold market, which reached roughly $6 billion in early 2026. There is no peg-break risk in the dollar sense, but you take on gold-price volatility, custodian risk, and redemption friction, since physical delivery needs large minimum lots. Silver and oil tokens exist but remain economically marginal.',
      },
      {
        id: 'crypto-collateralized',
        title: 'Crypto-collateralized and synthetic dollars',
        body: 'DAI (now Sky) and USDe (Ethena) hold their dollar peg without bank deposits. DAI is over-collateralized: users lock crypto in vaults and mint DAI against it, with liquidations if the collateral drops. USDe is synthetic: it holds spot staked ETH and an equal short futures position, so price moves cancel out and the funding rate pays the yield. Both keep the peg through code and market incentives, not a promise to redeem at a bank. The risk moves to smart-contract bugs, liquidation cascades, and, for USDe, funding rates flipping negative in bear markets.',
      },
      {
        id: 'no-reserve',
        title: 'When the model has no reserve at all',
        body: 'Algorithmic stablecoins try to hold $1 with no direct backing, only a sister token that absorbs sell pressure. TerraUSD (UST) was the largest, and in May 2022 it collapsed in roughly a week: as UST fell below $1, the mechanism minted ever more LUNA to defend it, hyperinflating LUNA and crashing both tokens toward zero. The combined loss was tens of billions of dollars. After UST, regulators everywhere effectively banned pure algorithmic models from regulated payment-stablecoin status, and the survivors re-collateralized. The category is now a cautionary tale, not a live design.',
      },
      {
        id: 'tokenized-funds',
        title: 'Tokenized funds vs. payment stablecoins',
        body: 'A tokenized fund like BlackRock\'s BUIDL or Franklin Templeton\'s BENJI holds short-term Treasuries, just like a dollar stablecoin\'s reserves, but it is legally a security, not a payment instrument. Under the US GENIUS Act, a payment stablecoin must stay flat at $1, move freely between wallets, and cannot pay yield to holders. A tokenized fund pays yield to holders but requires KYC, restricts transfers to whitelisted wallets, and redeems on a T+1 cycle. Institutions use them as a pair: stablecoin for instant settlement, tokenized fund as the yield-bearing sweep account for idle balances.',
      },
    ],
  },
  {
    id: 'bigger-picture',
    title: 'The bigger picture',
    moduleLink: { href: '/research/#treasury', label: 'Read the full economic-impact analysis' },
    lessons: [
      {
        id: 'treasury-buyer',
        title: 'A quiet buyer of government debt',
        lastUpdated: '2026-08-12',
        body: 'Stablecoin issuers now hold well over $150 billion in US Treasuries, mostly short-dated T-bills. Tether alone reports Treasury exposure comparable to the holdings of major sovereign nations, and combined issuers rank among the top-20 external holders of US debt. The GENIUS Act, signed July 2025 and taking effect in 2026, legally requires payment-stablecoin reserves to be cash, T-bills, or overnight repo, which locks this demand into the very short end of the curve. As stablecoins grow, their issuers become structural buyers of US government debt, tying crypto\'s health to Treasury market liquidity.',
      },
      {
        id: 'bank-disintermediation',
        title: 'Does this take money out of banks',
        lastUpdated: '2026-08-12',
        body: 'When a household moves a deposit into a stablecoin, the bank loses cheap funding that funds mortgages and business loans. The New York Fed\'s February 2026 research found banks exposed to stablecoin flows already lend less relative to peers. The ECB compares stablecoins to the money-market funds of the 1970s, which drained retail deposits into volatile wholesale funding. The White House argues the lending impact is minimal, and its model has been criticized by bank groups and reform advocates as built on favorable assumptions. The honest answer right now: early evidence, no consensus number.',
      },
      {
        id: 'cross-border',
        title: 'Cheaper, faster money across borders',
        lastUpdated: '2026-08-16',
        body: 'Cross-border cost is not one number. It is three hops: on-ramp (fiat to token), on-chain transfer, and off-ramp (token to local fiat). At worker-remittance size ($200), World Bank Remittance Prices Worldwide measures a global average near 6% all-in for banks, while stablecoin gas alone is cents; but a full cash-to-cash journey adds on-ramp and off-ramp FX, which a Bank Policy Institute study (Jul 2026) put at 0.3% to 9% across ten corridors. At commercial size ($1M), a retail remittance percentage no longer applies; the comparison is wholesale FX basis points versus ramp basis points, plus the value of time in transit. Real adoption is concentrated where it solves a real problem: Argentina and Brazil for dollar savings against currency depreciation, Nigeria for cross-border trade and remittances, and the UAE-to-India corridor for instant settlement. Even Visa now settles payments in USDC. The research hub has a teaching calculator with every lever visible and a sourced scenario table.',
      },
      {
        id: 'when-trust-breaks',
        title: 'When trust breaks',
        lastUpdated: '2026-08-12',
        body: 'In March 2023, Circle held about $3.3 billion of USDC reserves, roughly 8% of backing, at Silicon Valley Bank. When SVB failed, USDC dropped below the peg over the weekend until the government backstopped all SVB depositors and the money was recovered. Through DeFi\'s interconnected code, even stablecoins with no SVB exposure lost their pegs as liquidity pools drained. The IMF\'s 2026 research models how a major stablecoin run would force fire sales of Treasuries, and MIT warns dealer balance-sheet rules could prevent them from absorbing the dumped bonds, so even safe assets could gap.',
      },
      {
        id: 'rulebook',
        title: 'One rulebook, many flavors',
        lastUpdated: '2026-08-12',
        body: 'By August 2026, every major financial hub has a live stablecoin framework, and they converge on full reserve backing, licensed issuers, and the effective death of algorithmic designs. The US GENIUS Act requires 1:1 T-bill or cash backing and bans paying yield to holders. The EU\'s MiCA, fully effective July 2026, splits stablecoins into single-currency and basket-pegged classes and caps non-euro usage. The UK, Japan, Singapore, Hong Kong, and the UAE each run their own models. The real battleground is whether foreign dollar stablecoins are welcomed or contained to protect local currencies.',
      },
      {
        id: 'case-studies',
        title: 'Case studies: when the signal was real',
        lastUpdated: '2026-08-16',
        body: 'Real depegs and stress events are the best teachers. Two stand out. In May 2022, UST/Terra\'s algorithmic death spiral erased roughly $60B in combined value in about a week: the sister-token mechanism could not absorb sell pressure, and the "peg" was an incentive, not a reserve. In March 2026, Resolv\'s USR broke not because of market pressure but because of a compromised key that minted roughly 80M unbacked tokens; the Curve pool printed near $0.025 on March 22. That is an exploit and an insolvency, not a market-driven depeg. A peg-stress index can observe the price aftermath, but the cause was a security failure, not a stress signal the index "called" in advance. When the optional backend is running, this lesson also shows the same persisted alert events used by the Alerts tab (open and resolved), keyed by a stable event ID.',
      },
    ],
  },
];

const OBSERVATION_NOTE = 'Live, computed from this dashboard\'s data - not AI-generated.';

export default function LearnTab({ data, alerts, alertHistory = [], alertSource = 'local' }) {
  const [openModule, setOpenModule] = useState(MODULES[0]?.id || null);

  const observationsById = useMemo(() => {
    const map = {};
    for (const obs of buildLearnObservations(data, alerts)) map[obs.id] = obs;
    return map;
  }, [data, alerts]);

  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    if (!hash.startsWith('#lesson-')) return;
    const lessonId = hash.replace('#lesson-', '');
    const module = MODULES.find((m) => m.lessons.some((l) => l.id === lessonId));
    if (!module) return;
    setOpenModule(module.id);
    setTimeout(() => {
      document.getElementById(`lesson-${lessonId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }, []);

  return (
    <div class="tab-content active">
      <section class="card mb-4">
        <div class="card-header">
          <div class="card-title">Stablecoins, explained</div>
        </div>
        <div class="card-body">
          <p class="mb-0">
            Everything in StableSense is built on one idea: a stablecoin is a token engineered to hold
            steady value against some reference, usually the US dollar but not always. This dashboard
            tracks five dollar-pegged coins, which is the common case. These modules cover how pegs
            work, how they fail, the wider landscape beyond the dollar, and how the signals here help
            you see stress before it becomes a headline. Where the market is live, the lessons carry a
            small observation computed from this dashboard's data at this moment.
          </p>
          <p class="mt-3 mb-0">
            <a class="learn-link-btn" href="/research/#taxonomy" target="_blank" rel="noopener noreferrer">Read the full research: State of Stablecoins &rsaquo;</a>
          </p>
        </div>
      </section>

      {MODULES.map((mod) => (
        <section class={`card learn-module mb-4 ${openModule === mod.id ? 'open' : ''}`} key={mod.id}>
          <button
            type="button"
            class="learn-module-header"
            onClick={() => setOpenModule(openModule === mod.id ? null : mod.id)}
            aria-expanded={openModule === mod.id}
          >
            <span>{mod.title}</span>
            <span class="learn-module-expand">›</span>
          </button>
          <div class="learn-module-detail">
            {mod.lessons.map((lesson) => {
              const observation = lesson.observationId ? observationsById[lesson.observationId] : null;
              return (
                <div class="learn-lesson" id={`lesson-${lesson.id}`} key={lesson.id}>
                  <div class="learn-lesson-title">
                    {lesson.title}
                    {lesson.lastUpdated ? <span class="learn-lesson-date">Updated {lesson.lastUpdated}</span> : null}
                  </div>
                  <p class="text-muted small mb-0">{lesson.body}</p>
                  {observation ? (
                    <div class="learn-observation">
                      <div class="learn-observation-label">Live observation</div>
                      <p class="mb-0">{observation.text}</p>
                      <p class="learn-observation-note mb-0">{OBSERVATION_NOTE}</p>
                    </div>
                  ) : null}
                </div>
              );
            })}
            {mod.moduleLink ? (
              <p class="learn-lesson" style="padding-top:8px">
                <a class="learn-link-btn" href={mod.moduleLink.href} target="_blank" rel="noopener noreferrer">{mod.moduleLink.label} &rsaquo;</a>
              </p>
            ) : null}
          </div>
        </section>
      ))}

      <section class="card mb-4">
        <div class="card-header">
          <div class="card-title">Persisted alert history</div>
        </div>
        <div class="card-body">
          {alertSource !== 'canonical' || !alertHistory.length ? (
            <p class="mb-0 text-muted small">
              No stored alert events yet. The event table starts empty on a new backend and is not backfilled with invented history. Current Alerts may still show live derivation until the first stress job writes rows.
            </p>
          ) : (
            <div class="learn-alert-history">
              {alertHistory.slice(0, 12).map((event) => (
                <article key={event.id} class="learn-history-row">
                  <strong>{event.rule}</strong>
                  <span>{event.coin} · {event.state || 'open'} · {event.id}</span>
                  <p>{event.headline || event.rationale}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section class="card">
        <div class="card-header">
          <div class="card-title">Glossary</div>
        </div>
        <div class="card-body p0">
          <div class="coverage-list p-3">
            {GLOSSARY.map((item) => (
              <div class="learn-term" key={item.term}>
                <div class="learn-term-name">{item.term}</div>
                <div class="text-muted small">{item.def}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <p class="text-muted small mt-4 mb-0">
        Educational content for context only, not financial advice. Verify any claim against primary
        sources before acting on it.
      </p>
    </div>
  );
}

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
        body: 'Alerts are deterministic rules, not opinions. PEG_BREAK fires when a coin trades past its drift threshold from $1. CHAIN_SPIKE flags a single chain moving $500M or more (less for smaller coins) in 24 hours. MEGA_SUPPLY catches a coin-wide mint or burn. DOM_SHIFT tracks a coin gaining or losing supply share week over week. Severity orders them WARNING, HIGH, CRITICAL. Each card explains why it matters and what to watch next.',
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
];

const OBSERVATION_NOTE = 'Live, computed from this dashboard\'s data - not AI-generated.';

export default function LearnTab({ data, alerts }) {
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
            Everything in StableSense is built on one idea: a stablecoin should stay close to $1.00.
            These modules cover what that means, how it can fail, and how the signals on this dashboard
            help you see stress before it becomes a headline. Where the market is live, the lessons carry
            a small observation computed from this dashboard's data at this moment.
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
                  <div class="learn-lesson-title">{lesson.title}</div>
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
          </div>
        </section>
      ))}

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

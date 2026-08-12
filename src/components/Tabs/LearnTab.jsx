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
];

const LESSONS = [
  {
    title: 'What is a stablecoin?',
    body: 'A stablecoin is a cryptocurrency designed to hold a fixed value, usually $1.00. The value is held through a peg: each token is backed by reserves, collateral, or an algorithm that works to keep the price stable. This makes them useful for payments, trading pairs, and as a safe haven inside crypto markets.',
  },
  {
    title: 'How does a peg actually work?',
    body: 'Issuers keep the price near $1 through redemption: you can normally exchange the token for its backing. If the price drifts below $1, arbitrageurs buy the token cheap and redeem it at face value, which pushes the price back up. If it trades above $1, arbitrageurs mint new tokens and sell them, which pushes the price back down. The peg is only as strong as the backing behind it.',
  },
  {
    title: 'Types of collateral',
    body: 'Fiat-backed coins (USDT, USDC, PYUSD) hold cash and equivalents in bank accounts. Crypto-backed coins (DAI) hold other digital assets in over-collateralized vaults. Synthetic or yield-backed coins (USDe) use delta-neutral positions to neutralize price moves. Algorithmic coins use market incentives with no direct backing, and they carry the highest depeg risk.',
  },
  {
    title: 'What causes a depeg?',
    body: 'A depeg happens when redemption confidence drops. Common triggers: doubts about the issuer reserves, a bank run on the backing assets, a large redemption wave, or a panic move across the market. When the peg breaks, the stress index in this app rises, alerts fire, and the flow view shows where supply is moving.',
  },
  {
    title: 'How to read this dashboard',
    body: 'The peg stress index gives a 0-100 health score. The supply and price charts show 90-day history. Cross-chain flows show which chains are gaining or losing supply. Whale watch flags unusual supply jumps. The AI narrative sums up the signal in plain language, and the alerts hub lists deterministic events with severity and magnitude.',
  },
];

export default function LearnTab() {
  return (
    <div class="tab-content active">
      <section class="card mb-4">
        <div class="card-header">
          <div class="card-title">Stablecoins, explained</div>
        </div>
        <div class="card-body">
          <p class="mb-0">
            Everything in StableSense is built on one idea: a stablecoin should stay close to $1.00.
            These lessons cover what that means, how it can fail, and how the signals on this dashboard
            help you see stress before it becomes a headline.
          </p>
        </div>
      </section>

      {LESSONS.map((lesson) => (
        <section class="card mb-4" key={lesson.title}>
          <div class="card-header">
            <div class="card-title">{lesson.title}</div>
          </div>
          <div class="card-body">
            <p class="text-muted small mb-0">{lesson.body}</p>
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

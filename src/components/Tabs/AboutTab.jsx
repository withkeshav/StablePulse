import { ACTIVE_STABLECOINS, STABLECOIN_REGISTRY } from '../../utils/coin-config.js';

const COVERAGE_BLURBS = {
  USDT: {
    role: 'The market giant',
    why: '$180B+ supply, deepest liquidity on nearly every chain, and the dominant payments stablecoin (led by Tron). Sets the floor for the whole market.',
  },
  USDC: {
    role: 'The regulated institutional leader',
    why: '~$72B supply, the top stablecoin by adjusted transaction volume, and the DeFi default. Mastercard 24/7 settlement and heavy institutional adoption.',
  },
  DAI: {
    role: 'The decentralized benchmark',
    why: 'The largest fully decentralized stablecoin, deeply woven into DeFi lending. A critical counterweight to the centralized issuers.',
  },
  USDE: {
    role: 'The yield-synth leader',
    why: 'Ethena\'s USDe is the largest yield-bearing synthetic dollar, bringing a new risk profile: delta-neutral collateral instead of cash reserves.',
  },
  PYUSD: {
    role: 'The fastest-rising payments coin',
    why: 'PayPal\'s stablecoin, expanding across 70 markets with Venmo, Xoom and Mastercard settlement. The loudest momentum narrative in the sector.',
  },
};

export default function AboutTab() {
  const coins = ACTIVE_STABLECOINS.map((s) => ({ symbol: s, cfg: STABLECOIN_REGISTRY[s] }));
  return (
    <div class="tab-content active">
      <section class="card mb-4">
        <div class="card-header">
          <div class="card-title">Why these 5 stablecoins?</div>
        </div>
        <div class="card-body">
          <p>
            StableSense tracks the five stablecoins that matter most by <strong>market cap</strong>,{' '}
            <strong>transaction volume</strong>, <strong>adoption</strong>, and <strong>market momentum</strong>.
            Together they span every meaningful axis of the stablecoin market.
          </p>
        </div>
      </section>

      <section class="card mb-4">
        <div class="card-header">
          <div class="card-title">Coverage rationale</div>
        </div>
        <div class="card-body p0">
          {coins.map((c) => (
            <div class="coverage-row" key={c.symbol}>
              <div class="coverage-coin">
                <span class="coverage-dot" style={{ background: c.cfg.color }}></span>
                <span class="coverage-symbol">{c.symbol}</span>
                <span class="coverage-id">DefiLlama id {c.cfg.llamaStablecoinId}</span>
              </div>
              <div class="coverage-role">{COVERAGE_BLURBS[c.symbol]?.role}</div>
              <p class="coverage-why text-muted small mb-0">{COVERAGE_BLURBS[c.symbol]?.why}</p>
            </div>
          ))}
        </div>
      </section>

      <section class="card mb-4">
        <div class="card-header">
          <div class="card-title">What we measure</div>
        </div>
        <div class="card-body">
          <ul class="coverage-list">
            <li><strong>Peg stress index</strong> - a 0-100 score from peg drift, active alerts, and cross-chain flow pressure.</li>
            <li><strong>Cross-chain mint / burn flows</strong> - which chains are gaining or bleeding supply.</li>
            <li><strong>Whale-watch anomalies</strong> - z-score based detection of supply jumps.</li>
            <li><strong>AI narrative</strong> - a plain-language read of the signals, refreshed on a slow cadence.</li>
          </ul>
          <p class="text-muted small mb-0">
            Data sources: DefiLlama stablecoins API (on-chain circulating supply per chain and history) and
            CoinGecko (price, 24h volume, and market charts). Both are fetched directly from your browser.
          </p>
        </div>
      </section>

      <section class="card mb-4">
        <div class="card-header">
          <div class="card-title">State of Stablecoins research</div>
        </div>
        <div class="card-body">
          <p>
            Beyond the live dashboard, StableSense publishes a long-form, fully-cited research report:
            <strong> The State of Stablecoins</strong>. It covers the wider value-referenced-token
            taxonomy (gold-backed, crypto-collateralized, synthetic, algorithmic, tokenized funds),
            the macroeconomic impact (Treasury-market effects, bank disintermediation, cross-border
            payments, dollarization, systemic risk), depeg history, and the global regulatory
            landscape, with charts and a sourced citation list. Every figure is dated and ranges are
            shown where sources disagree.
          </p>
          <p class="mb-0">
            <a class="learn-link-btn" href="/research/" target="_blank" rel="noopener noreferrer">Read the State of Stablecoins report &rsaquo;</a>
          </p>
        </div>
      </section>

      <section class="card">
        <div class="card-header">
          <div class="card-title">Methodology note</div>
        </div>
        <div class="card-body">
          <p class="text-muted small mb-0">
            Rankings are directional, not investment advice. Selection weights market cap, adjusted transaction
            volume, adoption integrations, and relative momentum as of the current release. Coverage may evolve
            with the market; additions are config-only changes.
          </p>
        </div>
      </section>
    </div>
  );
}
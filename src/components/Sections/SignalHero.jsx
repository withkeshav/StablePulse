import { fmtPrice, bps } from '../../utils/formatters.js';

export default function SignalHero({ usdtPrice, usdcPrice, stress, aiHeadline }) {
  return (
    <section class="signal-hero card mb-4">
      <div class="card-body">
        <div class="signal-hero-top">
          <div>
            <div class="signal-kicker">Stablecoin Risk Radar</div>
            <h2 class="signal-title">Peg Stress Index {stress.score}/100</h2>
            {aiHeadline ? <p class="signal-ai-line">{aiHeadline}</p> : null}
            <p class="signal-subtitle">Level: {stress.level}. Driven by peg drift, active alerts, and cross-chain flow pressure.</p>
          </div>
          <div class="signal-prices">
            <div><span>USDT</span> <strong>{fmtPrice(usdtPrice)}</strong> ({bps(usdtPrice)} bps)</div>
            <div><span>USDC</span> <strong>{fmtPrice(usdcPrice)}</strong> ({bps(usdcPrice)} bps)</div>
          </div>
        </div>
      </div>
    </section>
  );
}

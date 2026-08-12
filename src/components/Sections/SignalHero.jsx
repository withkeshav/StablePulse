import { fmtPrice, bps } from '../../utils/formatters.js';
import AiTicker from '../ui/AiTicker.jsx';

export default function SignalHero({ coins, priceByCoin, stress, intelligence, onLearn, dataQuality }) {
  return (
    <section class="signal-hero card mb-4">
      <div class="card-body">
        <div class="signal-hero-top">
          <div>
            <div class="signal-kicker">Stablecoin Risk Radar</div>
            <h2 class="signal-title">Peg Stress Index <span class="signal-score-display">{stress.score}/100</span></h2>
            {intelligence?.headline ? <p class="signal-ai-line">{intelligence.headline}</p> : null}
            <AiTicker intelligence={intelligence} />
            <p class="signal-subtitle">Level: {stress.level}. Driven by peg drift, active alerts, and cross-chain flow pressure.</p>
            {dataQuality && dataQuality.length ? (
              <p class="signal-subtitle" style="color:var(--high)">Note: {dataQuality.map((d) => d.coin).join(', ')} supply data temporarily unavailable.</p>
            ) : null}
            {onLearn ? (
              <button type="button" class="learn-link-btn" onClick={onLearn}>
                What does this mean? Learn
              </button>
            ) : null}
          </div>
          <div class="signal-prices">
            {(coins || []).map((c) => (
              <div key={c.symbol}>
                <span>{c.symbol}</span> <strong>{fmtPrice(priceByCoin[c.symbol])}</strong> ({bps(priceByCoin[c.symbol])} bps)
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
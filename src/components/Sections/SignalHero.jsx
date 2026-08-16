import { fmtPrice, bps } from '../../utils/formatters.js';
import AiTicker from '../ui/AiTicker.jsx';

function StabilityGauge({ value = 0 }) {
  const score = Math.max(0, Math.min(100, Number(value) || 0));
  const offset = 358 - (358 * score / 100);
  return (
    <div class="gauge-wrap">
      <svg viewBox="0 0 150 150" class="gauge" aria-label={`Peg Stability Index: ${score} out of 100`}>
        <circle cx="75" cy="75" r="57" class="gauge-track" />
        <circle cx="75" cy="75" r="57" class="gauge-value" stroke-dasharray="358" stroke-dashoffset={offset} />
        <circle cx="75" cy="75" r="43" class="gauge-inner" />
      </svg>
      <div class="gauge-copy">
        <strong>{score}</strong>
        <span>of 100</span>
      </div>
    </div>
  );
}

function levelNote(level) {
  const l = String(level || '').toLowerCase();
  if (l.includes('crit') || l.includes('high') || l.includes('stress')) return 'Elevated stress conditions';
  if (l.includes('warn') || l.includes('watch')) return 'Watch conditions - observe, do not panic';
  return 'Normal market conditions';
}

export default function SignalHero({ coins, priceByCoin, stress, intelligence, onLearn, dataQuality, refreshIntervalSec }) {
  const cadence = refreshIntervalSec ? `${Math.round(refreshIntervalSec / 60)} MINUTE DATA` : 'LIVE DATA';
  const stressScore = Number(stress?.score) || 0;
  const stability = Math.max(0, Math.min(100, 100 - stressScore));
  const steadyWord = stressScore >= 70 ? 'stressed' : stressScore >= 40 ? 'watchful' : 'steady';
  const headline = intelligence?.headline
    || (stress?.level
      ? `Peg stress is ${String(stress.level).toLowerCase()} (${stressScore}/100 stress · ${stability}/100 stability).`
      : 'Reading live peg and supply signals.');

  return (
    <section class="market-hero glass signal-lens mb-4">
      <img class="hero-art" src="/stablesense-signal-lens.jpg" alt="" loading="lazy" width="1400" height="787" />
      <div class="hero-copy">
        <div class="eyebrow">
          <span class="live-dot" aria-hidden="true" />
          MARKET PULSE
          <span class="eyebrow-divider" />
          {cadence}
        </div>
        <h1>
          The stablecoin market is <em>{steadyWord}.</em>
        </h1>
        <p>
          {headline} Driven by peg drift, active alerts, and cross-chain flow pressure.
          This is an observation score, not advice.
        </p>
        <AiTicker intelligence={intelligence} />
        {dataQuality && dataQuality.length ? (
          <p class="signal-subtitle warn-note">
            Note: {dataQuality.map((d) => d.coin).join(', ')} supply data temporarily unavailable.
          </p>
        ) : null}
        {onLearn ? (
          <div class="hero-actions">
            <button type="button" class="primary-btn" onClick={onLearn}>
              How is this scored?
            </button>
          </div>
        ) : null}
      </div>
      <div class="hero-gauge">
        <StabilityGauge value={stability} />
        <div class="hero-gauge-copy">
          <p class="gauge-label">Peg stability index</p>
          <p class="gauge-note">{levelNote(stress?.level)} (100 minus stress score)</p>
        </div>
      </div>
      <div class="signal-prices inline-prices" aria-label="Tracked coin peg prices">
        {(coins || []).map((c) => (
          <span key={c.symbol}>
            {c.symbol} <strong>{fmtPrice(priceByCoin[c.symbol])}</strong>
            <small>({bps(priceByCoin[c.symbol])} bps)</small>
          </span>
        ))}
      </div>
    </section>
  );
}

export { StabilityGauge };

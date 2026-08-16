import { useMemo } from 'preact/hooks';
import AlertCard from '../Alerts/AlertCard.jsx';
import AlertPrimer from './AlertPrimer.jsx';
import { buildAlertSparkSeries } from '../../lib/derive.js';

export default function SignalSummary({ data, alerts, onViewAll, onLearn }) {
  const top = (alerts || []).slice(0, 3);
  const sparks = useMemo(() => {
    const m = {};
    for (const alert of top) m[alert.id] = buildAlertSparkSeries(alert, data);
    return m;
  }, [top, data]);

  return (
    <section class="content-grid lower-grid mb-4">
      <article class="panel glass signal-panel">
        <header class="panel-head">
          <div>
            <p class="panel-kicker">EXPLAINED ALERTS</p>
            <h2>Signal watch</h2>
          </div>
          <button type="button" class="quiet-link" onClick={onViewAll}>See all signals</button>
        </header>
        <div class="signal-list">
          {top.length ? (
            top.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                compact
                spark={sparks[alert.id]}
              />
            ))
          ) : (
            <AlertPrimer compact />
          )}
        </div>
      </article>

      <article class="learn-callout glass">
        <div class="learn-content">
          <p class="panel-kicker">LEARN WITH LIVE DATA</p>
          <h2>Why a 10 bps move may matter more than it looks.</h2>
          <p>Learn how price, liquidity, and redemptions become a stablecoin signal.</p>
          {onLearn ? (
            <button type="button" class="primary-btn small" onClick={onLearn}>
              Start the lesson
            </button>
          ) : null}
        </div>
        <img class="learn-orb" src="/stablesense-learn-orb.jpg" alt="" loading="lazy" width="150" height="150" />
      </article>
    </section>
  );
}

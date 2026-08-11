import { useMemo } from 'preact/hooks';
import AlertCard from '../Alerts/AlertCard.jsx';
import { buildAlertSparkSeries } from '../../lib/derive.js';

export default function SignalSummary({ data, alerts, onViewAll }) {
  const top = (alerts || []).slice(0, 3);
  const sparks = useMemo(() => {
    const m = {};
    for (const alert of top) m[alert.id] = buildAlertSparkSeries(alert, data);
    return m;
  }, [top, data]);
  return (
    <section class="card mb-4">
      <div class="card-header">
        <div class="card-title">Signal Summary</div>
        <button type="button" class="export-btn" onClick={onViewAll}>Open Alerts</button>
      </div>
      <div class="card-body p0">
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
          <div class="info-empty">No active alerts.</div>
        )}
      </div>
    </section>
  );
}

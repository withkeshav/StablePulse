import { useMemo, useState } from 'preact/hooks';
import { timeAgo } from '../../utils/formatters.js';
import Sparkline from '../ui/Sparkline.jsx';
import { alertExplanation } from '../../lib/derive.js';

export default function AlertCard({ alert, compact = false, spark = null }) {
  const [open, setOpen] = useState(false);
  const detail = useMemo(() => alertExplanation(alert), [alert]);

  const sevClass = alert?.severity === 'CRITICAL' ? 'crit' : alert?.severity === 'HIGH' ? 'high' : 'warn';
  const sparkH = compact ? 44 : 52;

  return (
    <article class={`alert-card ${sevClass} ${open ? 'open' : ''}`}>
      <button type="button" class="alert-header" onClick={() => setOpen((v) => !v)}>
        <div class={`alert-severity-bar ${sevClass}-bar`}></div>
        <div class="alert-body-text">
          <div class="alert-title">{alert?.rationale || 'Alert event'}</div>
          <div class="alert-meta">
            {alert?.rule || 'RULE'} · {alert?.coin || 'N/A'}
            {alert?.chain ? ` / ${alert.chain}` : ''} · {alert?.timestamp ? timeAgo(alert.timestamp) : 'now'}
          </div>
        </div>
        {spark?.values?.length ? (
          <div class="alert-spark">
            <Sparkline labels={spark.labels} values={spark.values} color={spark.color} height={sparkH} />
          </div>
        ) : null}
        <span class="alert-expand">›</span>
      </button>
      <div class="alert-detail">
        <div>
          <strong>Why it matters:</strong> {detail?.whyItMatters}
        </div>
        <div>
          <strong>What to watch:</strong> {detail?.whatToWatch}
        </div>
        {detail?.confidence != null && Number.isFinite(detail.confidence) ? (
          <div class="alert-confidence">
            <strong>Confidence:</strong> {(detail.confidence * 100).toFixed(0)}%
          </div>
        ) : null}
      </div>
    </article>
  );
}

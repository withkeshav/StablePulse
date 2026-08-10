import { useState } from 'preact/hooks';
import { timeAgo } from '../../utils/formatters.js';
import Sparkline from '../ui/Sparkline.jsx';

export default function AlertCard({ alert, apiBase, compact = false, spark = null }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  async function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (!next || detail || loading || !alert?.id || !apiBase) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/alert-explain?id=${encodeURIComponent(alert.id)}`);
      let payload = {};
      try {
        payload = await res.json();
      } catch {
        payload = {};
      }
      if (!res.ok) {
        const msg = typeof payload.error === 'string' ? payload.error : 'Explanation unavailable.';
        setDetail({
          whyItMatters: msg,
          whatToWatch: 'Retry after the next dashboard refresh.',
          confidence: null,
        });
        return;
      }
      setDetail(payload);
    } catch {
      setDetail({
        whyItMatters: 'AI explanation unavailable.',
        whatToWatch: 'Monitor the next refresh window.',
        confidence: null,
      });
    } finally {
      setLoading(false);
    }
  }

  const sevClass = alert?.severity === 'CRITICAL' ? 'crit' : alert?.severity === 'HIGH' ? 'high' : 'warn';
  const sparkH = compact ? 44 : 52;

  return (
    <article class={`alert-card ${sevClass} ${open ? 'open' : ''}`}>
      <button type="button" class="alert-header" onClick={toggleOpen}>
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
        {loading ? (
          <div>Loading AI context...</div>
        ) : (
          <>
            <div>
              <strong>Why it matters:</strong> {detail?.whyItMatters || 'Expand this alert to pull cached AI context.'}
            </div>
            <div>
              <strong>What to watch:</strong> {detail?.whatToWatch || 'Track the next cycle for continuation or mean reversion.'}
            </div>
            {detail?.confidence != null && Number.isFinite(detail.confidence) ? (
              <div class="alert-confidence">
                <strong>Confidence:</strong> {(detail.confidence * 100).toFixed(0)}%
              </div>
            ) : null}
          </>
        )}
      </div>
    </article>
  );
}

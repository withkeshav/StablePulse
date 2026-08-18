import { useMemo, useState } from 'preact/hooks';
import { fmtB, formatUtc, timeAgo } from '../../utils/formatters.js';
import Sparkline from '../ui/Sparkline.jsx';
import { alertExplanation } from '../../lib/derive.js';

const RULE_LESSONS = {
  PEG_BREAK: 'depeg-causes',
  CHAIN_SPIKE: 'many-chains',
  CHAIN_FLOW: 'many-chains',
  MIGRATION: 'many-chains',
  MEGA_SUPPLY: 'volume-uses',
  NET_MINT: 'volume-uses',
  NET_BURN: 'volume-uses',
  DOM_SHIFT: 'who-issues',
  DATA_QUALITY: 'reading-alerts',
};

function confidenceText(alert, detail) {
  if (alert?.confidenceNote) return alert.confidenceNote;
  if (detail?.confidence != null && Number.isFinite(detail.confidence)) {
    return `${Math.round(detail.confidence * 100)}%`;
  }
  return null;
}

export default function AlertCard({ alert, compact = false, spark = null, onLearn }) {
  const [open, setOpen] = useState(false);
  const detail = useMemo(() => alertExplanation(alert), [alert]);
  const lessonId = alert?.rule ? RULE_LESSONS[alert.rule] : null;

  const sevClass = alert?.severity === 'CRITICAL' ? 'crit' : alert?.severity === 'HIGH' ? 'high' : 'warn';
  const sparkH = compact ? 44 : 52;
  const observed = alert?.observedAt || alert?.timestamp;
  const title = alert?.headline || alert?.rationale || 'Alert event';
  const conf = confidenceText(alert, detail);

  return (
    <article class={`alert-card ${sevClass} ${open ? 'open' : ''} ${alert?.state === 'resolved' ? 'is-resolved' : ''}`}>
      <button type="button" class="alert-header" onClick={() => setOpen((v) => !v)}>
        <div class={`alert-severity-bar ${sevClass}-bar`}></div>
        <div class="alert-body-text">
          <div class="alert-title">{title}</div>
          <div class="alert-meta">
            {alert?.rule || 'RULE'} · {alert?.coin || 'N/A'}
            {alert?.chains?.length > 1 ? ` / ${alert.chains.join(' → ')}` : alert?.chain ? ` / ${alert.chain}` : ''}
            {observed ? ` · Observed ${timeAgo(observed)}` : ''}
            {alert?.state && alert.state !== 'open' ? ` · ${alert.state}` : ''}
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
        {alert?.grossFlow != null ? (
          <div><strong>Gross chain movement:</strong> {fmtB(alert.grossFlow, 0)}</div>
        ) : null}
        {alert?.netSupplyDelta != null ? (
          <div><strong>Net supply:</strong> {alert.netSupplyDelta >= 0 ? '+' : ''}{fmtB(alert.netSupplyDelta, 0)}</div>
        ) : null}
        {alert?.intervalLabel ? (
          <div><strong>Observation period:</strong> {alert.intervalLabel}</div>
        ) : null}
        <div>
          <strong>Time:</strong> Observed {formatUtc(observed)}
          {alert?.detectedAt ? ` · detected ${formatUtc(alert.detectedAt)}` : ''}
        </div>
        {conf ? (
          <div class="alert-confidence">
            <strong>Confidence:</strong> {conf}
          </div>
        ) : null}
        <div>
          <strong>Why it matters:</strong> {alert?.explanation || detail?.whyItMatters}
        </div>
        <div>
          <strong>What to watch:</strong> {detail?.whatToWatch}
        </div>
        {onLearn && lessonId ? (
          <button type="button" class="learn-link-btn" onClick={() => onLearn(lessonId)}>
            What does this alert mean? Learn
          </button>
        ) : null}
      </div>
    </article>
  );
}

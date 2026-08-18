import { useMemo, useState } from 'preact/hooks';
import AlertHero from '../Alerts/AlertHero.jsx';
import AlertCard from '../Alerts/AlertCard.jsx';
import AlertPrimer from '../Sections/AlertPrimer.jsx';
import { buildAlertSparkSeries } from '../../lib/derive.js';

function AlertsEmptyState() {
  return (
    <div class="alerts-empty">
      <svg class="alerts-empty-svg" viewBox="0 0 120 96" aria-hidden="true">
        <defs>
          <linearGradient id="ae-g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.35" />
            <stop offset="100%" stop-color="var(--usdt)" stop-opacity="0.12" />
          </linearGradient>
        </defs>
        <rect x="12" y="20" width="96" height="56" rx="10" fill="url(#ae-g)" stroke="var(--border)" stroke-width="1.5" />
        <path d="M28 52 L44 38 L58 48 L76 30 L92 44" fill="none" stroke="var(--text3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        <circle cx="76" cy="30" r="4" fill="var(--accent)" />
      </svg>
      <div class="alerts-empty-title">No alerts match this view</div>
      <p class="alerts-empty-copy">Try widening severity or coin filters, or check back after the next dashboard refresh.</p>
    </div>
  );
}

export default function AlertsTab({ alerts, intelligence, data, setActiveTab, alertSource = 'local', alertHistory = [] }) {
  const [severity, setSeverity] = useState('all');
  const [coin, setCoin] = useState('all');
  const [sortBy, setSortBy] = useState('latest');
  const [groupByRule, setGroupByRule] = useState(false);

  const handleLearn = (lessonId) => {
    try {
      window.location.hash = `lesson-${lessonId}`;
    } catch {
      // ignore hash errors; the tab switch still happens
    }
    setActiveTab('learn');
  };

  const coins = useMemo(() => {
    const s = new Set((alerts || []).map((a) => a.coin).filter(Boolean));
    return ['all', ...Array.from(s).sort()];
  }, [alerts]);

  const counts = useMemo(() => ({
    all: alerts?.length || 0,
    CRITICAL: (alerts || []).filter((a) => a.severity === 'CRITICAL').length,
    HIGH: (alerts || []).filter((a) => a.severity === 'HIGH').length,
    WARNING: (alerts || []).filter((a) => a.severity === 'WARNING').length,
  }), [alerts]);

  const filtered = useMemo(() => {
    let rows = [...(alerts || [])];
    if (severity !== 'all') rows = rows.filter((a) => a.severity === severity);
    if (coin !== 'all') rows = rows.filter((a) => a.coin === coin);
    if (sortBy === 'severity') {
      const rank = { CRITICAL: 0, HIGH: 1, WARNING: 2 };
      rows.sort((a, b) => (rank[a.severity] ?? 3) - (rank[b.severity] ?? 3));
    } else if (sortBy === 'magnitude') {
      rows.sort((a, b) => (b.magnitude || 0) - (a.magnitude || 0));
    } else {
      rows.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }
    return rows;
  }, [alerts, severity, sortBy, coin]);

  const grouped = useMemo(() => {
    if (!groupByRule) return null;
    const m = {};
    for (const a of filtered) {
      const k = a.rule || 'OTHER';
      if (!m[k]) m[k] = [];
      m[k].push(a);
    }
    return Object.entries(m).sort(([ra], [rb]) => ra.localeCompare(rb));
  }, [filtered, groupByRule]);

  const sparks = useMemo(() => {
    const m = {};
    for (const a of filtered) m[a.id] = buildAlertSparkSeries(a, data);
    return m;
  }, [filtered, data]);

  const renderCard = (a) => (
    <AlertCard
      key={a.id}
      alert={a}
      compact={false}
      spark={sparks[a.id]}
      onLearn={handleLearn}
    />
  );

  return (
    <div class="tab-content active">
      <AlertHero intelligence={intelligence} alertCount={counts.all} />

      {alertSource === 'provisional' ? (
        <p class="alert-source-note">The event log is empty until the first backend persistence run. Showing live derivation from the latest market snapshots, not stored history.</p>
      ) : null}
      {alertSource === 'canonical' ? (
        <p class="alert-source-note">Current alerts and Learn history share the same stored event IDs. Timestamps are source observation time, not this page load.</p>
      ) : null}
      {alertSource === 'local' ? (
        <p class="alert-source-note">Showing locally derived events from this browser's market snapshots. Persist them on the optional backend to keep a lifecycle history.</p>
      ) : null}

      {counts.all === 0 ? (
        <div class="card mb-4">
          <div class="card-body">
            <AlertPrimer onLearn={handleLearn} />
          </div>
        </div>
      ) : null}

      <div class={`card mb-4 ${counts.all === 0 ? 'is-muted-card' : ''}`}>
        <div class={`filter-bar ${counts.all === 0 ? 'is-muted' : ''}`} aria-hidden={counts.all === 0 ? 'true' : undefined}>
          {['all', 'CRITICAL', 'HIGH', 'WARNING'].map((sev) => (
            <button key={sev} type="button" class={`filter-chip ${severity === sev ? 'active' : ''}`} onClick={() => setSeverity(sev)} disabled={counts.all === 0}>
              {sev === 'all' ? `All ${counts.all}` : `${sev} ${counts[sev]}`}
            </button>
          ))}
          <span class="sep"></span>
          <select class="settings-select filter-select" value={coin} onChange={(e) => setCoin(e.currentTarget.value)} disabled={counts.all === 0}>
            {coins.map((c) => (
              <option key={c} value={c}>{c === 'all' ? 'All coins' : c}</option>
            ))}
          </select>
          <span class="sep"></span>
          <select class="settings-select filter-select" value={sortBy} onChange={(e) => setSortBy(e.currentTarget.value)} disabled={counts.all === 0}>
            <option value="latest">Latest</option>
            <option value="severity">Severity</option>
            <option value="magnitude">Magnitude</option>
          </select>
          <span class="sep"></span>
          <button
            type="button"
            class={`filter-chip ${groupByRule ? 'active' : ''}`}
            onClick={() => setGroupByRule((v) => !v)}
            disabled={counts.all === 0}
          >
            Group by rule
          </button>
        </div>
        <div class="card-body p0">
          {!filtered.length ? (
            counts.all === 0 ? null : <AlertsEmptyState />
          ) : grouped ? (
            grouped.map(([rule, items]) => (
              <div key={rule} class="alerts-rule-group">
                <div class="alerts-rule-heading">{rule}</div>
                {items.map(renderCard)}
              </div>
            ))
          ) : (
            filtered.map(renderCard)
          )}
        </div>
      </div>
      {alertSource === 'canonical' && (alertHistory || []).some((a) => a.state === 'resolved') ? (
        <div class="card mb-4">
          <div class="card-header"><div class="card-title">Recently resolved</div></div>
          <div class="card-body p0">
            {alertHistory.filter((a) => a.state === 'resolved').slice(0, 8).map(renderCard)}
          </div>
        </div>
      ) : null}
    </div>
  );
}

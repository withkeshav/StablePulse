import { useEffect, useState } from 'preact/hooks';
import { timeAgo } from '../../utils/formatters.js';
import { FRESHNESS_STATES } from '../../lib/freshness.js';

function checkedLabel(ts, nowTs) {
  if (!ts) return 'Checked: unavailable';
  const age = Math.max(0, nowTs - ts);
  if (age < 15_000) return 'Checked just now';
  return `Checked ${timeAgo(ts)}`;
}

function marketLabel(ts) {
  if (!ts) return 'Market observed: unavailable';
  return `Market data observed ${timeAgo(ts)}`;
}

function snapshotLabel(ts, connected) {
  if (!connected) return 'Historical snapshot: optional backend not connected';
  if (!ts) return 'Historical snapshot: optional backend not connected';
  return `Historical snapshot updated ${timeAgo(ts)}`;
}

/**
 * Three independent clocks: browser check, upstream observation, persisted snapshot.
 */
export default function RefreshCountdown({
  lastUpdated,
  refreshIntervalSec,
  refreshing = false,
  freshness = null,
  dataState = FRESHNESS_STATES.CURRENT,
}) {
  const [nowTs, setNowTs] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const intervalSec = Number(refreshIntervalSec) > 0 ? Number(refreshIntervalSec) : 900;
  const elapsed = Math.max(0, Math.floor((nowTs - (lastUpdated || nowTs)) / 1000));
  const next = Math.max(0, intervalSec - elapsed);
  const nextLabel =
    next >= 3600
      ? `${Math.floor(next / 3600)}h ${Math.floor((next % 3600) / 60)}m`
      : next >= 60
        ? `${Math.floor(next / 60)}m ${next % 60}s`
        : `${next}s`;

  const checkedAt = freshness?.checkedAt ?? lastUpdated;
  const marketObservedAt = freshness?.marketObservedAt ?? null;
  const snapshotAt = freshness?.snapshotAt ?? null;
  const state = freshness?.overallState || dataState;
  const stale = state === FRESHNESS_STATES.STALE || state === FRESHNESS_STATES.UNAVAILABLE;

  return (
    <div class={`freshness-bar ${stale ? 'is-stale' : ''} ${state === FRESHNESS_STATES.DELAYED ? 'is-delayed' : ''}`} data-state={state}>
      <div class="freshness-clocks">
        <span>{checkedLabel(checkedAt, nowTs)}</span>
        <span>{marketLabel(marketObservedAt)}</span>
        <span>{snapshotLabel(snapshotAt, freshness?.snapshotConnected)}</span>
      </div>
      <div class="freshness-meta">
        <span class={`freshness-badge state-${String(state).toLowerCase()}`}>{state}</span>
        <span>Next check in {nextLabel}</span>
        {refreshing ? <span class="freshness-refreshing">Refreshing…</span> : null}
      </div>
      {freshness?.provenanceWarning ? (
        <p class="freshness-warning">{freshness.provenanceWarning}</p>
      ) : null}
    </div>
  );
}

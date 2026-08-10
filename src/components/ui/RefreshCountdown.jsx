import { useEffect, useState } from 'preact/hooks';
import { timeAgo } from '../../utils/formatters.js';

/**
 * Renders the "Last updated / Data age / Next refresh" strip.
 * Keeps its own 1-second ticker so the rest of the app does not re-render every second.
 */
export default function RefreshCountdown({ lastUpdated, refreshIntervalSec, refreshing = false }) {
  const [nowTs, setNowTs] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const elapsed = Math.max(0, Math.floor((nowTs - lastUpdated) / 1000));
  const next = Math.max(0, refreshIntervalSec - elapsed);
  const nextLabel =
    next >= 3600
      ? `${Math.floor(next / 3600)}h ${Math.floor((next % 3600) / 60)}m`
      : next >= 60
        ? `${Math.floor(next / 60)}m ${next % 60}s`
        : `${next}s`;

  return (
    <div class="card" style="margin: 12px 16px 0; padding: 8px 12px; font-size: 12px;">
      Last updated: {new Date(lastUpdated).toLocaleString()} · Data age: {timeAgo(lastUpdated)} · Next refresh in: {nextLabel}
      {refreshing ? <span style="color: var(--accent); margin-left: 8px;">· Refreshing…</span> : null}
    </div>
  );
}

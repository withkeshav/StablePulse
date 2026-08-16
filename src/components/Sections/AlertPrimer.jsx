/**
 * A one-paragraph "what an alert is" primer shown when there are no active
 * alerts. Replaces the bare "No active alerts." empty state so the space
 * teaches instead of wasting it. Not AI, not fake history (alerts are
 * ephemeral, computed each fetch and thrown away). Explains the four
 * deterministic rules the dashboard actually uses.
 */
export default function AlertPrimer({ compact = false }) {
  return (
    <div class="alert-primer">
      <div class="alert-primer-title">No active alerts right now</div>
      <p class="alert-primer-body">
        {compact ? null : <span>StableSense watches four kinds of stress across the tracked coins. An alert fires when a threshold is cleared on the latest refresh. The rules: </span>}
        <strong>PEG_BREAK</strong> when a coin drifts too far from its $1 peg in basis points,
        <strong> CHAIN_SPIKE</strong> when a single chain sees a large 24h supply move,
        <strong> MEGA_SUPPLY</strong> when a coin mints or burns across all chains at once,
        <strong> DOM_SHIFT</strong> when a coin's share of tracked supply changes by a point or more in a week.
        {compact ? null : ' Alerts are recomputed on each refresh and not stored, so this view shows only what is live now.'}
      </p>
    </div>
  );
}
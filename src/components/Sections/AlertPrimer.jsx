/**
 * Empty-state primer for zero active alerts.
 * Positive framing + four short rule cards with Learn links.
 */
export default function AlertPrimer({ compact = false, onLearn }) {
  const go = (lessonId) => {
    if (typeof onLearn === 'function') onLearn(lessonId);
  };

  return (
    <div class="alert-primer">
      <div class="alert-primer-title">No material stress detected in this refresh.</div>
      <p class="alert-primer-body">
        StableSense checked peg drift, chain supply moves, multi-chain mint/burn, and dominance shifts across the tracked coins. Nothing cleared a threshold on the latest data pull.
        {compact ? null : ' Alerts are recomputed each refresh and are not stored as history.'}
      </p>
      {compact ? (
        <p class="alert-primer-body">
          <strong>PEG_BREAK</strong>, <strong>CHAIN_SPIKE</strong>, <strong>MEGA_SUPPLY</strong>, and <strong>DOM_SHIFT</strong> stay armed for the next refresh.
        </p>
      ) : (
      <div class="alert-rule-cards" aria-label="Alert rules checked">
        <article class="alert-rule-card">
          <b>PEG_BREAK</b>
          <p>Fires when a coin drifts beyond its bps threshold from $1 (example: critical around 50 bps).</p>
          <a href="#lesson-pegs" onClick={(e) => { e.preventDefault(); go('pegs'); }}>Learn pegs</a>
        </article>
        <article class="alert-rule-card">
          <b>CHAIN_SPIKE</b>
          <p>Fires when one chain shows a large 24h supply move for a tracked coin.</p>
          <a href="#lesson-signals" onClick={(e) => { e.preventDefault(); go('signals'); }}>Learn signals</a>
        </article>
        <article class="alert-rule-card">
          <b>MEGA_SUPPLY</b>
          <p>Fires when a coin mints or burns a very large amount across chains at once.</p>
          <a href="#lesson-supply" onClick={(e) => { e.preventDefault(); go('supply'); }}>Learn supply</a>
        </article>
        <article class="alert-rule-card">
          <b>DOM_SHIFT</b>
          <p>Fires when a coin's share of tracked supply moves by about a point or more in a week.</p>
          <a href="#lesson-signals" onClick={(e) => { e.preventDefault(); go('signals'); }}>Learn signals</a>
        </article>
      </div>
      )}
    </div>
  );
}

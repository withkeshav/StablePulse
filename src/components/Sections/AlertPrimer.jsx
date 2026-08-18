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
        StableSense checked peg drift, chain supply moves, matched migrations, net mint/burn, and dominance shifts across the tracked coins. Nothing cleared a threshold on the latest observation window.
        {compact ? null : ' When the backend event log is empty, this feed is live derivation only and is not stored history.'}
      </p>
      {compact ? (
        <p class="alert-primer-body">
          <strong>PEG_BREAK</strong>, <strong>CHAIN_FLOW</strong>, <strong>MIGRATION</strong>, <strong>NET_MINT</strong>/<strong>NET_BURN</strong>, and <strong>DOM_SHIFT</strong> stay armed for the next observation.
        </p>
      ) : (
      <div class="alert-rule-cards" aria-label="Alert rules checked">
        <article class="alert-rule-card">
          <b>PEG_BREAK</b>
          <p>Fires when a coin drifts beyond its bps threshold from $1 (example: critical around 50 bps).</p>
          <a href="#lesson-pegs" onClick={(e) => { e.preventDefault(); go('pegs'); }}>Learn pegs</a>
        </article>
        <article class="alert-rule-card">
          <b>CHAIN_FLOW</b>
          <p>Fires when one chain shows a large circulating-supply move that is not paired as a migration.</p>
          <a href="#lesson-signals" onClick={(e) => { e.preventDefault(); go('signals'); }}>Learn signals</a>
        </article>
        <article class="alert-rule-card">
          <b>MIGRATION</b>
          <p>Fires when two chains move similar amounts in opposite directions, with net supply broadly unchanged.</p>
          <a href="#lesson-signals" onClick={(e) => { e.preventDefault(); go('signals'); }}>Learn signals</a>
        </article>
        <article class="alert-rule-card">
          <b>NET_MINT / NET_BURN</b>
          <p>Fires when a coin's net circulating USD across chains clears the issuance threshold.</p>
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

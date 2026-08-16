import { useState } from 'preact/hooks';
import { DEPEG_CASES, DEPEG_CASE_ORDER, DEPEG_TAKEAWAYS } from '../../utils/depeg-cases.js';

/**
 * Learner-first depeg mechanism flow.
 * Figures come from research/data.js via depeg-cases.js.
 */
export default function DepegCaseStudy({ showIntro = true }) {
  const [selected, setSelected] = useState('ust');
  const c = DEPEG_CASES[selected];

  return (
    <div class="depeg-study">
      {showIntro ? (
        <section class="section-intro">
          <p class="panel-kicker">RESEARCH NOTE · DEPEGS</p>
          <h2>Three depegs. Three questions before you read the chart.</h2>
          <p>
            The comparison starts with <strong>what was supposed to hold the peg, what made it fail, and what - if anything - brought it back.</strong>
            {' '}Figures match the State of Stablecoins hub.
          </p>
        </section>
      ) : null}

      <section class="case-selector" aria-label="Choose a depeg case study" role="tablist">
        {DEPEG_CASE_ORDER.map((id, index) => {
          const item = DEPEG_CASES[id];
          const active = selected === id;
          return (
            <button
              type="button"
              key={id}
              role="tab"
              id={`depeg-tab-${id}`}
              aria-selected={active}
              aria-controls={`depeg-panel-${id}`}
              class={`case-tab ${active ? `active ${item.color}` : ''}`}
              onClick={() => setSelected(id)}
            >
              <span class="case-number">0{index + 1}</span>
              <span>
                <b>{item.short}</b>
                <small>{item.kind} failure</small>
              </span>
              <span class="case-tab-arrow" aria-hidden="true">→</span>
            </button>
          );
        })}
      </section>

      <section
        class="case-study glass signal-lens"
        role="tabpanel"
        id={`depeg-panel-${selected}`}
        aria-labelledby={`depeg-tab-${selected}`}
      >
        <div class="case-story">
          <div class={`case-pill ${c.color}`}>{c.label}</div>
          <p class="case-date">{c.date}</p>
          <h2>{c.title}</h2>
          <p class="case-question">“{c.question}”</p>
          <div class="case-details">
            <div>
              <span>Lowest quoted price</span>
              <strong>{c.low}</strong>
            </div>
            <div>
              <span>What happened after</span>
              <strong>{c.recovery}</strong>
            </div>
          </div>
          <p class="case-source-mech text-muted small">{c.mech}</p>
          <div class="research-art" aria-hidden="true">
            <img src="/stablesense-case-study.jpg" alt="" loading="lazy" width="202" height="152" />
          </div>
        </div>
        <div class="failure-mechanism">
          <header>
            <p class="panel-kicker">THE FAILURE MECHANISM</p>
            <h3>Follow the feedback loop</h3>
            <p>{c.trigger}</p>
          </header>
          <div class="mechanism-flow">
            {c.mechanism.map((step, index) => (
              <div class="flow-step" key={step}>
                <span>{index + 1}</span>
                <strong>{step}</strong>
                {index < c.mechanism.length - 1 ? <i aria-hidden="true" /> : null}
              </div>
            ))}
          </div>
          <div class="lesson-box">
            <div>
              <span>The lesson</span>
              <p>{c.conclusion}</p>
            </div>
          </div>
        </div>
      </section>

      <section class="matrix-section">
        <header>
          <div>
            <p class="panel-kicker">COMPARE THE MECHANISMS</p>
            <h2>Failure pattern matrix</h2>
          </div>
          <span class="matrix-note">A mechanism map, not a price-performance chart.</span>
        </header>
        <div class="failure-matrix glass tbl-wrap">
          <div class="matrix-head">
            <span>Case</span>
            <span>What held the peg</span>
            <span>What broke first</span>
            <span>Could it recover?</span>
          </div>
          {DEPEG_CASE_ORDER.map((id) => {
            const row = DEPEG_CASES[id];
            return (
              <div class="matrix-row" key={id}>
                <span class={`case-id ${row.color}`}>
                  <b>{row.short.split(' · ')[0]}</b>
                  <small>{row.kind}</small>
                </span>
                <span>{row.heldPeg}</span>
                <span>{row.brokeFirst}</span>
                <span>
                  <i class={row.couldRecover ? 'yes-dot' : 'no-dot'} aria-hidden="true" />
                  {row.recoverText}
                </span>
              </div>
            );
          })}
        </div>
        <p class="matrix-caption">
          A stablecoin price alone cannot tell you which risk you are seeing. StableSense shows the mechanism beside the move.
        </p>
      </section>

      <section class="takeaway-grid" aria-label="Learner takeaways">
        {DEPEG_TAKEAWAYS.map((t) => (
          <article class="takeaway-card" key={t.n}>
            <span>{t.n}</span>
            <h3>{t.title}</h3>
            <p>{t.body}</p>
          </article>
        ))}
      </section>
    </div>
  );
}

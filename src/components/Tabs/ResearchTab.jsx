import DepegCaseStudy from '../Sections/DepegCaseStudy.jsx';
import { RESEARCH_SHELF, AS_OF } from '../../utils/depeg-cases.js';

export default function ResearchTab() {
  const feature = RESEARCH_SHELF.find((t) => t.kind === 'feature');
  const topics = RESEARCH_SHELF.filter((t) => t.kind !== 'feature');

  return (
    <div class="tab-content active research-page">
      <section class="research-library-head">
        <div>
          <p class="eyebrow">STABLESENSE RESEARCH LIBRARY</p>
          <h1>
            Learn the mechanism <em>behind the move.</em>
          </h1>
          <p>
            Short, sourced explainers that make live stablecoin signals easier to interpret.
            The full report lives in the State of Stablecoins hub - this tab opens the same figures, not a second copy.
          </p>
        </div>
        <div class="research-library-stats">
          <div>
            <b>09</b>
            <span>hub sections</span>
          </div>
          <div>
            <b>03</b>
            <span>case studies</span>
          </div>
          <div>
            <b>{AS_OF}</b>
            <span>figures as of</span>
          </div>
        </div>
      </section>

      <section class="research-shelf">
        {feature ? (
          <a class="research-feature glass signal-lens" href={feature.href} target="_blank" rel="noopener noreferrer">
            <span>{feature.kicker}</span>
            <h2>{feature.title}</h2>
            <p>{feature.body}</p>
            <span class="text-btn">Open in research hub →</span>
          </a>
        ) : null}
        {topics.map((t) => (
          <a class="research-topic" key={t.id} href={t.href} target="_blank" rel="noopener noreferrer">
            <div>
              <b>{t.title}</b>
              <span>{t.subtitle}</span>
            </div>
            <span aria-hidden="true">→</span>
          </a>
        ))}
      </section>

      <p class="sync-cadence-hint">
        Canonical full report:{' '}
        <a href="/research/" target="_blank" rel="noopener noreferrer">stablesense.withkeshav.com/research/</a>
        . Case figures below are imported from the same research data module.
      </p>

      <DepegCaseStudy />
    </div>
  );
}

import AiTicker from '../ui/AiTicker.jsx';

export default function AlertHero({ intelligence, alertCount }) {
  return (
    <div class="alert-hero card mb-4">
      <div class="card-body">
        <div class="alert-hero-kicker">AI Signal</div>
        <h2 class="alert-hero-title">{intelligence?.headline || 'Monitoring stablecoin stress in real time.'}</h2>
        <p class="alert-hero-copy">{intelligence?.narrative || 'No AI narrative available in this cycle.'}</p>
        <p class="alert-hero-copy muted">{intelligence?.implications || 'Watch chain-level shifts and peg movements for follow-through.'}</p>
        <AiTicker intelligence={intelligence} />
        <div class="alert-hero-meta">Active alerts: {alertCount}</div>
      </div>
    </div>
  );
}

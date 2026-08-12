import { useEffect, useState } from 'preact/hooks';

const TOUR_KEY = 'stablesense:tourSeen';
const STEPS = [
  {
    title: 'Peg Stress Index',
    body: 'The 0-100 score at the top shows overall stablecoin health from peg drift, active alerts, and cross-chain flow pressure.',
    target: 'signal-title',
  },
  {
    title: 'Whale Watch',
    body: 'Unusual supply movements across chains are flagged here using z-score detection. A spike means a coordinated mint, burn, or migration.',
    target: 'whale-watch-head',
  },
  {
    title: 'Alerts',
    body: 'Deterministic alerts (PEG_BREAK, CHAIN_SPIKE, MEGA_SUPPLY, DOM_SHIFT) fire automatically when thresholds are crossed. Check the Alerts tab for details.',
    target: 'alerts',
  },
];

export default function FirstRunTour() {
  const [step, setStep] = useState(-1);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(TOUR_KEY)) { setClosed(true); return; }
    } catch { setClosed(true); return; }
    setStep(0);
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(TOUR_KEY, '1'); } catch { /* private mode */ }
    setClosed(true);
  };

  if (closed || step < 0 || step >= STEPS.length) return null;
  const s = STEPS[step];
  return (
    <div class="tour-overlay" role="dialog" aria-label="Quick tour" aria-live="polite">
      <div class="tour-card">
        <div class="tour-step-num">Step {step + 1} of {STEPS.length}</div>
        <h3 class="tour-title">{s.title}</h3>
        <p class="tour-body">{s.body}</p>
        <div class="tour-actions">
          <button type="button" class="tour-skip" onClick={dismiss}>Skip</button>
          {step < STEPS.length - 1 ? (
            <button type="button" class="tour-next" onClick={() => setStep(step + 1)}>Next</button>
          ) : (
            <button type="button" class="tour-next" onClick={dismiss}>Done</button>
          )}
        </div>
      </div>
    </div>
  );
}
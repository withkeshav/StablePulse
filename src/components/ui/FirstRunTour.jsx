import { useEffect, useState } from 'preact/hooks';

const TOUR_KEY = 'stablesense:tourSeen';
const STEPS = [
  {
    title: 'Peg Stress Index',
    body: 'The 0-100 score at the top shows overall stablecoin health from peg drift, active alerts, and cross-chain flow pressure.',
  },
  {
    title: 'Whale Watch',
    body: 'Unusual supply movements across chains are flagged here using z-score detection. A spike means a coordinated mint, burn, or migration.',
  },
  {
    title: 'Alerts',
    body: 'Deterministic alerts (PEG_BREAK, CHAIN_SPIKE, MEGA_SUPPLY, DOM_SHIFT) fire automatically when thresholds are crossed. Check the Alerts tab for details.',
  },
];

/**
 * Compact first-run banner under Market Pulse (not a full-screen blocker).
 */
export default function FirstRunTour() {
  const [mode, setMode] = useState('hidden'); // hidden | invite | steps
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (localStorage.getItem(TOUR_KEY)) return;
    } catch {
      return;
    }
    setMode('invite');
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(TOUR_KEY, '1'); } catch { /* private mode */ }
    setMode('hidden');
  };

  if (mode === 'hidden') return null;

  if (mode === 'invite') {
    return (
      <aside class="tour-banner" aria-label="First-run tour invitation">
        <p>New here? Take a 3-step tour</p>
        <div class="tour-banner-actions">
          <button type="button" class="tour-skip" onClick={dismiss}>Skip</button>
          <button type="button" class="tour-next" onClick={() => { setStep(0); setMode('steps'); }}>Start</button>
        </div>
      </aside>
    );
  }

  const s = STEPS[step];
  return (
    <aside class="tour-banner" aria-label="Quick tour" aria-live="polite">
      <p>{s.title} · Step {step + 1} of {STEPS.length}</p>
      <p class="tour-banner-step">{s.body}</p>
      <div class="tour-banner-actions">
        <button type="button" class="tour-skip" onClick={dismiss}>Skip</button>
        {step < STEPS.length - 1 ? (
          <button type="button" class="tour-next" onClick={() => setStep(step + 1)}>Next</button>
        ) : (
          <button type="button" class="tour-next" onClick={dismiss}>Done</button>
        )}
      </div>
    </aside>
  );
}

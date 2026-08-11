import { useEffect, useState } from 'preact/hooks';

/**
 * Small live ticker for the AI narrative: when it was generated and when the
 * next update is expected. Timestamps render in the browser's local time.
 */
export default function AiTicker({ intelligence }) {
  const [nowTs, setNowTs] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const ts = intelligence?.ts;
  const next = intelligence?.nextUpdateAt;
  if (!ts) return null;

  const nextIn = next ? Math.max(0, Math.floor((next - nowTs) / 1000)) : null;
  const nextLabel =
    nextIn == null
      ? ''
      : nextIn >= 3600
        ? `${Math.floor(nextIn / 3600)}h ${Math.floor((nextIn % 3600) / 60)}m`
        : nextIn >= 60
          ? `${Math.floor(nextIn / 60)}m ${nextIn % 60}s`
          : `${nextIn}s`;

  return (
    <p class="ai-ticker">
      AI narrative · last updated {new Date(ts).toLocaleString()}
      {nextLabel ? ` · next update in ${nextLabel}` : ''}
    </p>
  );
}

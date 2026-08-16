import { useEffect, useState } from 'preact/hooks';
import { BrandWordmark } from '../BrandMark.jsx';
import { SHARE_FORMATS, shareSignalCard } from '../../utils/shareChart.js';

const FORMAT_LIST = Object.entries(SHARE_FORMATS).map(([id, f]) => ({
  id,
  title: f.label,
  ratio: f.ratio,
}));

export default function ShareSheet({
  open,
  onClose,
  chartInstance,
  title = 'StableSense chart',
  rangeLabel = 'Live',
  interpretation = '',
  definition = 'Market observation from live StableSense data.',
  highlight = '',
  sourceUrl = 'stablesense.withkeshav.com',
}) {
  const [format, setFormat] = useState('square');

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const current = FORMAT_LIST.find((item) => item.id === format) || FORMAT_LIST[1];
  const stamp = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
  const read = interpretation || 'Live market observation. This is a price and market picture, not a reserve-quality or investment conclusion.';

  const download = () => {
    if (!chartInstance) return;
    shareSignalCard(chartInstance, {
      title,
      rangeLabel,
      interpretation: read,
      definition,
      highlight,
      timestamp: stamp,
      sourceUrl,
    }, format);
  };

  return (
    <div
      class="share-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Share as Signal Card"
      onMouseDown={onClose}
    >
      <section class="share-sheet" onMouseDown={(e) => e.stopPropagation()}>
        <header>
          <div>
            <p class="panel-kicker">SHARE AS SIGNAL CARD</p>
            <h2>Make the chart make sense.</h2>
            <p>A ready-to-share chart with the context a reader needs.</p>
          </div>
          <button type="button" class="close-share" onClick={onClose} aria-label="Close share card">
            ×
          </button>
        </header>
        <div class="share-content">
          <div class={`signal-card ${format}`} style={{ aspectRatio: current.ratio.replace(' / ', '/') }}>
            <div class="signal-card-top">
              <BrandWordmark size={22} />
              <span>{String(rangeLabel).toUpperCase()}</span>
            </div>
            <div class="signal-card-copy">
              <p>{String(title).toUpperCase()}</p>
              <h3>{read}</h3>
              {highlight ? <strong>{highlight}</strong> : null}
            </div>
            <div class="signal-card-chart signal-card-chart-note">
              <p>Export captures the live Chart.js rendering, including the visible $1.00 peg reference when present.</p>
            </div>
            <div class="signal-card-meta">
              <span>
                <b>What this measures</b>
                {definition}
              </span>
              <span>
                <b>As of</b>
                {stamp}
              </span>
            </div>
            <footer>
              <span>{sourceUrl}</span>
              <span>StableSense · Research, not advice</span>
            </footer>
          </div>
          <aside class="share-controls">
            <div>
              <p class="panel-kicker">FORMAT</p>
              <div class="format-list">
                {FORMAT_LIST.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    class={format === item.id ? 'active' : ''}
                    onClick={() => setFormat(item.id)}
                  >
                    <span class={`format-icon ${item.id}`} />
                    <span>
                      <b>{item.title}</b>
                      <small>Optimized for sharing</small>
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div class="share-read">
              <p class="panel-kicker">SIGNAL READ</p>
              <p>{read}</p>
            </div>
            <button type="button" class="primary-btn download-btn" onClick={download} disabled={!chartInstance}>
              Download PNG
            </button>
            <p class="share-note">Includes date, source context, and StableSense branding.</p>
          </aside>
        </div>
      </section>
    </div>
  );
}

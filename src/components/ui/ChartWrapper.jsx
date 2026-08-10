import { useEffect, useRef, useState } from 'preact/hooks';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

function readCssVar(name, fallback) {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function tintScales(base = {}, grid, tick) {
  const out = {};
  for (const axis of ['x', 'y']) {
    const cur = base[axis];
    if (cur?.display === false) {
      out[axis] = cur;
      continue;
    }
    out[axis] = {
      ...(cur || {}),
      grid: { color: grid, ...(cur?.grid || {}) },
      ticks: { color: tick, ...(cur?.ticks || {}) },
      border: { color: grid, ...(cur?.border || {}) },
    };
  }
  return out;
}

export default function ChartWrapper({ type, data, options = {}, height = 220, aspectRatio = null }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const keyRef = useRef(null);
  const [themeEpoch, setThemeEpoch] = useState(0);

  useEffect(() => {
    const el = document.documentElement;
    const obs = new MutationObserver(() => setThemeEpoch((n) => n + 1));
    obs.observe(el, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !data) return;

    const grid = readCssVar('--border', '#e5e7eb');
    const tick = readCssVar('--text2', '#6b7280');
    const surface = readCssVar('--surface', '#ffffff');
    const text = readCssVar('--text', '#111827');

    const themedScales = tintScales(options?.scales, grid, tick);

    const mergedOptions = {
      animation: false,
      responsive: true,
      ...options,
      maintainAspectRatio: aspectRatio ? false : (options.maintainAspectRatio ?? true),
      plugins: {
        ...options.plugins,
        tooltip: {
          backgroundColor: surface,
          titleColor: tick,
          bodyColor: text,
          borderColor: grid,
          borderWidth: 1,
          ...options.plugins?.tooltip,
        },
      },
      scales: themedScales,
    };

    const key = JSON.stringify({ type, data, themeEpoch, aspectRatio, height });
    if (keyRef.current === key && chartRef.current) return;
    keyRef.current = key;

    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type,
      data,
      options: mergedOptions,
    });
  });

  useEffect(() => () => {
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }
  }, []);

  const wrapStyle = aspectRatio
    ? `position:relative;width:100%;aspect-ratio:${aspectRatio};min-height:${Math.min(height, 280)}px`
    : `height:${height}px`;

  return (
    <div class="chart-wrap" style={wrapStyle}>
      <canvas ref={canvasRef}></canvas>
    </div>
  );
}

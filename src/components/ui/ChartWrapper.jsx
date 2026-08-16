import { useEffect, useRef, useState } from 'preact/hooks';
import { createSharePopover } from '../../utils/shareChart.js';

let chartPromise;
function getChart() {
  if (!chartPromise) {
    chartPromise = import('chart.js').then((m) => {
      const Chart = m.Chart;
      Chart.register(
        m.LineController, m.BarController,
        m.LineElement, m.PointElement, m.BarElement,
        m.CategoryScale, m.LinearScale, m.LogarithmicScale,
        m.Tooltip, m.Legend
      );
      return Chart;
    });
  }
  return chartPromise;
}

let themeEpochCounter = 0;
const themeSubscribers = new Set();

if (typeof document !== 'undefined') {
  const themeObserver = new MutationObserver(() => {
    themeEpochCounter += 1;
    themeSubscribers.forEach((fn) => fn());
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
}

function subscribeTheme(fn) {
  if (typeof document === 'undefined') return () => {};
  themeSubscribers.add(fn);
  return () => themeSubscribers.delete(fn);
}

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

function areOptionsEqual(a, b) {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    const valA = a[key];
    const valB = b[key];
    if (valA === valB) continue;
    if (typeof valA === 'object' && typeof valB === 'object' && valA !== null && valB !== null) {
      if (!areOptionsEqual(valA, valB)) return false;
    } else {
      return false;
    }
  }
  return true;
}

const EMPTY_OPTIONS = {};

export default function ChartWrapper({ type, data, options = {}, height = 220, aspectRatio = null }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const lastRef = useRef({ type: null, data: null, options: null, aspectRatio: null, height: null, themeEpoch: -1 });
  const [themeEpoch, setThemeEpoch] = useState(0);

  const resolvedOptions = Object.keys(options).length === 0 ? EMPTY_OPTIONS : options;

  useEffect(() => subscribeTheme(() => setThemeEpoch((n) => n + 1)), []);

  useEffect(() => {
    if (!canvasRef.current || !data) return;

    const prev = lastRef.current;
    const changed =
      prev.type !== type ||
      prev.data !== data ||
      !areOptionsEqual(prev.options, resolvedOptions) ||
      prev.aspectRatio !== aspectRatio ||
      prev.height !== height ||
      prev.themeEpoch !== themeEpoch;

    if (!changed && chartRef.current) return;

    let cancelled = false;

    getChart().then((Chart) => {
      if (cancelled || !canvasRef.current) return;

      const prevNow = lastRef.current;
      if (
        chartRef.current &&
        prevNow.type === type &&
        prevNow.data === data &&
        areOptionsEqual(prevNow.options, resolvedOptions) &&
        prevNow.aspectRatio === aspectRatio &&
        prevNow.height === height &&
        prevNow.themeEpoch === themeEpoch
      ) return;

      const grid = readCssVar('--border', '#e5e7eb');
      const tick = readCssVar('--text2', '#6b7280');
      const surface = readCssVar('--surface', '#ffffff');
      const text = readCssVar('--text', '#111827');

      const themedScales = tintScales(options?.scales, grid, tick);
      const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

      if (chartRef.current) chartRef.current.destroy();
      chartRef.current = new Chart(canvasRef.current, {
        type,
        data,
        options: mergedOptions,
      });

      lastRef.current = { type, data, options: resolvedOptions, aspectRatio, height, themeEpoch };
    });

    return () => {
      cancelled = true;
    };
  }, [type, data, resolvedOptions, aspectRatio, height, themeEpoch]);

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
    <div class="chart-wrap" style={wrapStyle} aria-label={`${type} chart`} role="img">
      <canvas ref={canvasRef}></canvas>
      <button class="share-btn" type="button" title="Share as screenshot" aria-label="Share chart as screenshot" onClick={(e) => { e.stopPropagation(); if (chartRef.current) createSharePopover(chartRef.current, 'StableSense chart', new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }), e.currentTarget); }}>⎘</button>
    </div>
  );
}

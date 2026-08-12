// Progressive-enhancement layer for the State of Stablecoins hub.
// All content renders as real HTML without this script. This adds:
// the live hero counter, IntersectionObserver scroll reveals, Chart.js
// instances, chip-filter behavior, the remittance calculator, and the
// accordion expand/collapse. No new dependencies beyond Chart.js (already
// a project dep). Respects prefers-reduced-motion throughout.
import * as data from './data.js';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// --- theme bridge: respect the dashboard's saved theme if present ----------
try {
  const saved = localStorage.getItem('stablesense:theme');
  const legacy = localStorage.getItem('stablepulse:theme');
  const mode = saved || legacy || 'light';
  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const effective = mode === 'system' ? (dark ? 'dark' : 'light') : mode;
  document.documentElement.setAttribute('data-theme', effective);
} catch { /* private mode */ }

// --- category color helper -------------------------------------------------
const catColor = (id) => {
  const map = {
    'fiat-usd': '--hub-cat-fiat-usd',
    'fiat-non-usd': '--hub-cat-fiat-non-usd',
    commodity: '--hub-cat-commodity',
    'crypto-synth': '--hub-cat-crypto-synth',
    algorithmic: '--hub-cat-algorithmic',
    rwa: '--hub-cat-rwa',
  };
  return getComputedStyle(document.documentElement).getPropertyValue(map[id] || '--hub-cat-fiat-usd').trim();
};

const catLabel = (id) => {
  const t = data.taxonomy.find((x) => x.id === id);
  return t ? t.label : id;
};

// --- hero counter ----------------------------------------------------------
async function heroCounter() {
  const el = document.getElementById('hero-counter');
  const label = document.getElementById('hero-counter-label');
  if (!el) return;
  let total = 0;
  let fetched = false;
  try {
    const { fetchDashboardData } = await import('../src/lib/api.js');
    const d = await fetchDashboardData({});
    const supplies = {};
    for (const a of d?.allStables?.peggedAssets || []) {
      const v = a?.circulating?.peggedUSD;
      if (typeof v === 'number' && Number.isFinite(v)) supplies[a.symbol] = v;
    }
    for (const sym of ['USDT', 'USDC', 'DAI', 'USDE', 'PYUSD']) {
      if (typeof supplies[sym] === 'number') total += supplies[sym];
    }
    total = total / 1e9; // peggedUSD is raw dollars; fmt() below expects billions
    if (total > 0) fetched = true;
  } catch { /* keep static fallback */ }

  if (!fetched) {
    // static fallback: cite the broader research-file range as the figure,
    // labeled honestly as the global snapshot, not the live-tracked sum
    total = 308; // midpoint of the $299-316B research-file range
    label.textContent = 'Total global stablecoin market cap across all issuers, mid-2026 snapshot (live fetch unavailable; see Section 2 for the sourced range)';
  }

  const target = total;
  const duration = prefersReducedMotion ? 0 : 1400;
  const start = performance.now();
  const fmt = (v) => '$' + Math.round(v).toLocaleString('en-US') + 'B';
  if (duration === 0) { el.textContent = fmt(target); return; }
  const step = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = fmt(target * eased);
    if (t < 1) requestAnimationFrame(step);
    else el.textContent = fmt(target);
  };
  requestAnimationFrame(step);
}

// --- scroll reveal ---------------------------------------------------------
function reveals() {
  const els = document.querySelectorAll('.reveal');
  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    els.forEach((e) => e.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.15 });
  els.forEach((e) => io.observe(e));
}

// --- accordion builder -----------------------------------------------------
function buildAccordion(containerId, items, renderItem) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.className = 'hub-accordion';
  container.innerHTML = items.map((item, i) => {
    const body = renderItem(item);
    return `<div class="hub-accordion-item${i === 0 ? ' open' : ''}">
      <button class="hub-accordion-trigger" aria-expanded="${i === 0 ? 'true' : 'false'}">${item.label || item.title || item.name}<span class="hub-accordion-mark">&rsaquo;</span></button>
      <div class="hub-accordion-panel">${body}</div>
    </div>`;
  }).join('');
  container.querySelectorAll('.hub-accordion-trigger').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = btn.parentElement;
      const open = item.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });
}

// --- taxonomy accordion + token table + chips -----------------------------
function buildTaxonomy() {
  buildAccordion('taxonomy-accordion', data.taxonomy, (t) => {
    return `<p><strong>Scale:</strong> <span class="num">${t.scale}</span> <span class="as-of">(${t.asOf})</span></p>
      <p><strong>Examples:</strong> ${t.examples}</p>
      <p>${t.mechanism}</p>
      <p class="why">${t.why}</p>`;
  });

  const tbody = document.querySelector('#token-table tbody');
  if (!tbody) return;
  const renderRows = (filter) => {
    const rows = data.tokens
      .filter((t) => filter === 'all' || t.category === filter)
      .sort((a, b) => {
        const pa = parseFloat((a.mcap || '').replace(/[^0-9.]/g, '')) || 0;
        const pb = parseFloat((b.mcap || '').replace(/[^0-9.]/g, '')) || 0;
        return pb - pa;
      });
    tbody.innerHTML = rows.map((t) => {
      const color = catColor(t.category);
      return `<tr>
        <td><strong>${t.token}</strong></td>
        <td class="cat-cell"><span class="cat-dot" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:0.4rem;vertical-align:middle"></span>${catLabel(t.category)}</td>
        <td>${t.peg}</td>
        <td>${t.issuer}</td>
        <td class="num">${t.mcap}</td>
        <td>${t.chain}</td>
        <td class="as-of">${t.asOf}</td>
      </tr>`;
    }).join('');
  };
  renderRows('all');

  document.querySelectorAll('#token-chips .hub-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#token-chips .hub-chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      renderRows(chip.dataset.cat);
    });
  });
}

// --- Chart.js (lazy) ------------------------------------------------------
let chartJsPromise;
async function loadChartJs() {
  if (!chartJsPromise) {
    chartJsPromise = import('chart.js').then((m) => {
      const Chart = m.Chart;
      // Tree-shakeable build: every controller/element/scale/plugin used below
      // must be registered explicitly, or Chart.js throws "X is not a
      // registered scale/controller" at render time. bar + line charts,
      // fill:true areas (Filler), and Section 9's log-scale comparison
      // (LogarithmicScale) are all used across this hub's charts.
      Chart.register(
        m.LineController, m.BarController,
        m.LineElement, m.PointElement, m.BarElement,
        m.CategoryScale, m.LinearScale, m.LogarithmicScale,
        m.Filler, m.Tooltip, m.Legend
      );
      return Chart;
    });
  }
  return chartJsPromise;
}

const chartDefaults = () => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { labels: { color: getComputedStyle(document.documentElement).getPropertyValue('--hub-ink2').trim() } } },
  color: getComputedStyle(document.documentElement).getPropertyValue('--hub-ink2').trim(),
  font: { family: getComputedStyle(document.documentElement).getPropertyValue('--hub-mono').trim() },
});

function gridColor() { return getComputedStyle(document.documentElement).getPropertyValue('--hub-line').trim(); }
function inkColor() { return getComputedStyle(document.documentElement).getPropertyValue('--hub-ink').trim(); }

// --- Section 1: taxonomy stacked bar -------------------------------------
async function taxonomyChart() {
  const canvas = document.getElementById('taxonomy-chart');
  if (!canvas) return;
  const Chart = await loadChartJs();
  const labels = data.taxonomy.map((t) => t.label);
  const colors = data.taxonomy.map((t) => catColor(t.id));
  // represent each as a single stacked bar (one segment per category)
  const vals = data.taxonomy.map((t) => {
    const m = t.scale.match(/\$?([\d.]+)\s*-*\s*\$?([\d.]+)?/);
    return m ? parseFloat(m[2] || m[1]) : 0;
  });
  new Chart(canvas, {
    type: 'bar',
    data: {
      labels: ['Total stablecoin market'],
      datasets: data.taxonomy.map((t, i) => ({
        label: `${t.label} (${t.scale})`,
        data: [vals[i]],
        backgroundColor: colors[i],
        borderWidth: 0,
        barThickness: 60,
      })),
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: inkColor(), font: { size: 11 }, boxWidth: 12 } },
        tooltip: { callbacks: { label: (ctx) => `${data.taxonomy[ctx.datasetIndex].label}: ${data.taxonomy[ctx.datasetIndex].scale}` } },
      },
      scales: { x: { stacked: true, grid: { color: gridColor() }, ticks: { color: inkColor() } }, y: { stacked: true, display: false } },
      animation: prefersReducedMotion ? false : { duration: 1200 },
    },
  });
}

// --- Section 2: scale line + forecast ------------------------------------
async function scaleChart() {
  const canvas = document.getElementById('scale-chart');
  if (!canvas) return;
  const Chart = await loadChartJs();
  const ink = inkColor();
  const grid = gridColor();
  new Chart(canvas, {
    type: 'line',
    data: {
      labels: data.marketCapHistory.map((d) => d.year),
      datasets: [{
        label: 'Total stablecoin market cap ($B)',
        data: data.marketCapHistory.map((d) => d.cap),
        borderColor: catColor('fiat-usd'),
        backgroundColor: catColor('fiat-usd') + '22',
        borderWidth: 2,
        fill: true,
        tension: 0.25,
        pointRadius: 3,
        pointBackgroundColor: catColor('fiat-usd'),
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `$${ctx.parsed.y}B` } } },
      scales: {
        x: { grid: { color: grid }, ticks: { color: ink } },
        y: { grid: { color: grid }, ticks: { color: ink, callback: (v) => '$' + v + 'B' } },
      },
      animation: prefersReducedMotion ? false : { duration: 1400 },
    },
  });
}

async function forecastChart() {
  const canvas = document.getElementById('forecast-chart');
  if (!canvas) return;
  const Chart = await loadChartJs();
  const ink = inkColor();
  const grid = gridColor();
  // bar-style ranges per forecaster
  const labels = data.projections.map((p) => p.name);
  const lows = data.projections.map((p) => parseFloat(p.range.replace(/[^0-9.]/g, '')) || 0);
  new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Projected market cap by 2030 ($B)',
        data: lows,
        backgroundColor: data.projections.map(() => catColor('fiat-usd') + '99'),
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => `${data.projections[ctx.dataIndex].name}: ${data.projections[ctx.dataIndex].range} by ${data.projections[ctx.dataIndex].by} - ${data.projections[ctx.dataIndex].note}` } },
      },
      scales: { x: { grid: { color: grid }, ticks: { color: ink } }, y: { grid: { color: grid }, ticks: { color: ink, callback: (v) => '$' + v + 'B' } } },
      animation: prefersReducedMotion ? false : { duration: 1200 },
    },
  });
  // chip filter (re-render by hiding datasets is overkill for one dataset; instead just visually emphasizes)
  document.querySelectorAll('#forecast-chips .hub-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#forecast-chips .hub-chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
    });
  });
}

// --- Section 3: treasury bars --------------------------------------------
async function treasuryChart() {
  const canvas = document.getElementById('treasury-chart');
  if (!canvas) return;
  const Chart = await loadChartJs();
  const ink = inkColor();
  const grid = gridColor();
  const gold = getComputedStyle(document.documentElement).getPropertyValue('--hub-gold').trim();
  const sorted = [...data.treasuryHolders].sort((a, b) => b.value - a.value);
  new Chart(canvas, {
    type: 'bar',
    data: {
      labels: sorted.map((h) => h.name),
      datasets: [{
        label: 'US Treasury holdings ($B)',
        data: sorted.map((h) => h.value),
        backgroundColor: sorted.map((h) => (h.type === 'issuer' ? gold : catColor('fiat-usd'))),
        borderWidth: 0,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => `$${ctx.parsed.x}B${sorted[ctx.dataIndex].note ? ' (' + sorted[ctx.dataIndex].note + ')' : ''}` } },
      },
      scales: { x: { grid: { color: grid }, ticks: { color: ink, callback: (v) => '$' + v + 'B' } }, y: { grid: { display: false }, ticks: { color: ink } } },
      animation: prefersReducedMotion ? false : { duration: 1400 },
    },
  });
}

// --- Section 6: dollarization --------------------------------------------
async function dollarizationChart() {
  const canvas = document.getElementById('dollarization-chart');
  if (!canvas) return;
  const Chart = await loadChartJs();
  const ink = inkColor();
  const grid = gridColor();
  const gold = getComputedStyle(document.documentElement).getPropertyValue('--hub-gold').trim();
  const rows = data.dollarizationCountries.map((c, i) => ({
    ...c,
    rankVal: c.gdpPct !== null ? c.gdpPct : (4 - i * 0.5),
  })).sort((a, b) => b.rankVal - a.rankVal);
  new Chart(canvas, {
    type: 'bar',
    data: {
      labels: rows.map((c) => c.country),
      datasets: [{
        label: 'Stablecoin purchases as % of GDP (Turkey measured; others ranked qualitatively)',
        data: rows.map((c) => c.rankVal),
        backgroundColor: rows.map((c) => (c.gdpPct !== null ? gold : catColor('fiat-usd') + 'aa')),
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => rows[ctx.dataIndex].detail } },
      },
      scales: { x: { grid: { display: false }, ticks: { color: ink } }, y: { grid: { color: grid }, ticks: { color: ink, callback: (v) => v + '%' } } },
      animation: prefersReducedMotion ? false : { duration: 1200 },
    },
  });
  buildAccordion('dollarization-accordion', data.dollarizationCountries, (c) => {
    return `<p>${c.detail}</p>${c.gdpPct !== null ? `<p class="as-of">Stablecoin purchases ~${c.gdpPct}% of GDP (Chainalysis).</p>` : ''}`;
  });
}

// --- Section 7: depeg sparklines (hand-rolled SVG) ------------------------
function buildDepegs() {
  const container = document.getElementById('depeg-cards');
  if (!container) return;
  container.innerHTML = data.depegs.map((d) => {
    const vals = d.spark;
    const min = Math.min(...vals), max = Math.max(...vals);
    const w = 100, h = 50;
    const range = max - min || 1;
    const pts = vals.map((v, i) => {
      const x = (i / (vals.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    return `<div class="depeg-card">
      <h3>${d.name} - ${d.date}</h3>
      <p class="as-of">Low: <span class="num">${d.low}</span></p>
      <svg class="depeg-spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Price sparkline for ${d.name} during the event">
        <line class="spark-baseline" x1="0" y1="${h - 3}" x2="${w}" y2="${h - 3}"/>
        <polyline class="spark-line" points="${pts}"/>
      </svg>
      <p class="mech">${d.mech}</p>
    </div>`;
  }).join('');
}

// --- Section 8: regulation table + chips ---------------------------------
function buildRegulation() {
  const tbody = document.querySelector('#reg-table tbody');
  if (!tbody) return;
  const render = (filter) => {
    const rows = data.regulation.filter((r) => filter === 'all' || r.jurisdiction === filter);
    tbody.innerHTML = rows.map((r) => `<tr>
      <td><strong>${r.jurisdiction}</strong></td>
      <td>${r.framework}</td>
      <td>${r.status}</td>
      <td>${r.pegs}</td>
      <td>${r.algorithmic}</td>
      <td>${r.rules}</td>
    </tr>`).join('');
  };
  render('all');
  document.querySelectorAll('#reg-chips .hub-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#reg-chips .hub-chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      render(chip.dataset.jurisdiction);
    });
  });
}

// --- Section 9: reality check log-scale ----------------------------------
async function realityChart() {
  const canvas = document.getElementById('reality-chart');
  if (!canvas) return;
  const Chart = await loadChartJs();
  const ink = inkColor();
  const grid = gridColor();
  const gold = getComputedStyle(document.documentElement).getPropertyValue('--hub-gold').trim();
  new Chart(canvas, {
    type: 'bar',
    data: {
      labels: data.realityCheck.map((r) => r.label),
      datasets: [{
        label: 'Market size ($B, log scale)',
        data: data.realityCheck.map((r) => r.value),
        backgroundColor: data.realityCheck.map((r, i) => (r.label.includes('stablecoins') ? gold : catColor('fiat-usd') + 'cc')),
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => `$${ctx.parsed.y}B - ${data.realityCheck[ctx.dataIndex].note}` } },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: ink } },
        y: { type: 'logarithmic', grid: { color: grid }, ticks: { color: ink, callback: (v) => '$' + v + 'B' } },
      },
      animation: prefersReducedMotion ? false : { duration: 1200 },
    },
  });
}

// --- Section 5: remittance calculator + race bars ------------------------
function remittanceCalc() {
  const amountEl = document.getElementById('calc-amount');
  const railEl = document.getElementById('calc-rail');
  const costEl = document.getElementById('calc-cost');
  const detailEl = document.getElementById('calc-detail');
  if (!amountEl || !railEl || !costEl) return;
  const compute = () => {
    const amt = parseFloat(amountEl.value) || 0;
    const rail = railEl.value;
    const cfg = data.remittanceCost[rail];
    const pct = amt * (cfg.feePct / 100);
    const total = pct + cfg.fixedUsd;
    costEl.textContent = '$' + total.toLocaleString('en-US', { maximumFractionDigits: 0 });
    detailEl.textContent = `Estimated cost (${cfg.label}): ~${cfg.feePct}% + $${cfg.fixedUsd} fixed. Settles in ${cfg.days}.`;
  };
  amountEl.addEventListener('input', compute);
  railEl.addEventListener('change', compute);
  compute();
}

function raceBars() {
  const bars = document.querySelectorAll('.race-bar');
  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    bars.forEach((b) => { b.style.width = b.dataset.fill + '%'; });
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        const b = e.target;
        setTimeout(() => { b.style.width = b.dataset.fill + '%'; }, 200);
        io.unobserve(b);
      }
    });
  }, { threshold: 0.4 });
  bars.forEach((b) => io.observe(b));
}

// --- corridor accordion ---------------------------------------------------
function buildCorridors() {
  buildAccordion('corridor-accordion', data.corridors.map((c) => ({ label: c.region, ...c })), (c) => {
    return `<p>${c.detail}</p><p class="as-of">Countries: ${c.country}</p>`;
  });
}

// --- footer: verified claims + sources list -------------------------------
function buildFooterLists() {
  const vc = document.getElementById('verified-claims-list');
  if (vc) {
    vc.innerHTML = '<ol>' + data.verifiedClaims.map((c) => `<li><strong>${c.claim}.</strong> ${c.resolution}<br><span class="as-of">Sources: ${c.sources.map((s) => `<a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.label}</a>`).join('; ')}.</span></li>`).join('') + '</ol>';
  }
  const sl = document.getElementById('sources-list');
  if (sl) {
    sl.innerHTML = data.sources.map((s) => `<li><a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.label}</a></li>`).join('');
  }
}

// --- init -----------------------------------------------------------------
async function init() {
  reveals();
  heroCounter();
  buildTaxonomy();
  buildCorridors();
  buildDepegs();
  buildRegulation();
  remittanceCalc();
  raceBars();
  buildFooterLists();
  try {
    await Promise.all([taxonomyChart(), scaleChart(), forecastChart(), treasuryChart(), dollarizationChart(), realityChart()]);
    // Constructing 6 charts back-to-back via Promise.all appears to race
    // Chart.js's own ResizeObserver-driven initial sizing: each canvas's
    // width can get stuck at its pre-layout 0px reading and never receive
    // the automatic correction pass. Forcing one resize() per instance once
    // everything is settled reliably fixes it. Deliberately not wrapped in
    // requestAnimationFrame: rAF is throttled or fully suspended on
    // backgrounded/non-composited tabs in most browsers, which would make
    // this fix silently no-op in exactly the situations it needs to run.
    // setTimeout is not subject to the same throttling.
    const Chart = await loadChartJs();
    setTimeout(() => {
      Object.values(Chart.instances || {}).forEach((inst) => inst.resize());
    }, 0);
  } catch (e) { console.error('chart init error', e); }
}

let resizeDebounce;
window.addEventListener('resize', () => {
  clearTimeout(resizeDebounce);
  resizeDebounce = setTimeout(() => {
    loadChartJs().then((Chart) => {
      Object.values(Chart.instances || {}).forEach((inst) => inst.resize());
    });
  }, 150);
});

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
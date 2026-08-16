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

// hub theme toggle
const hubToggle = document.getElementById('hub-theme-toggle');
if (hubToggle) {
  hubToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('stablesense:theme', next); } catch { /* private mode */ }
    // resize all charts to pick up new grid/tick colors
    loadChartJs().then((Chart) => {
      setTimeout(() => Object.values(Chart.instances || {}).forEach((inst) => inst.resize()), 50);
    });
  });
}

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
  // Show loading state immediately, never $0
  el.textContent = 'Loading...';
  const trackedSyms = ['USDT', 'USDC', 'DAI', 'USDE', 'PYUSD'];
  let total = 0;
  let fetched = false;
  let missing = [];
  try {
    const { fetchDashboardData } = await import('../src/lib/api.js');
    const d = await fetchDashboardData({});
    const supplies = {};
    for (const a of d?.allStables?.peggedAssets || []) {
      const v = a?.circulating?.peggedUSD;
      if (typeof v === 'number' && Number.isFinite(v)) supplies[(a.symbol || '').toUpperCase()] = v;
    }
    for (const sym of trackedSyms) {
      if (typeof supplies[sym] === 'number' && supplies[sym] > 0) {
        total += supplies[sym];
      } else {
        missing.push(sym);
      }
    }
    total = total / 1e9; // peggedUSD is raw dollars; fmt() below expects billions
    if (total > 0) fetched = true;
  } catch { /* keep static fallback */ }

  if (!fetched) {
    // static fallback: cite the broader research-file range as the figure,
    // labeled honestly as the global snapshot, not the live-tracked sum
    total = 308; // midpoint of the $299-316B research-file range
    label.textContent = 'Total global stablecoin market cap across all issuers, mid-2026 snapshot (live fetch unavailable; see Section 2 for the sourced range)';
  } else if (missing.length > 0) {
    label.textContent = `Combined market cap of the 5 stablecoins tracked here, updated live - partial, waiting on ${missing.length} coin${missing.length > 1 ? 's' : ''} (${missing.join(', ')})`;
  } else {
    label.textContent = 'Combined market cap of the 5 stablecoins tracked here, updated live';
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
  const gold = getComputedStyle(document.documentElement).getPropertyValue('--hub-gold').trim();
  const currentAnchor = 316; // mid-2026 snapshot

  // Build a floating-bar dataset: each bar spans [low, high] on a shared axis.
  // Chart.js floating bars use [min, max] data points with type:'bar'.
  const allNames = data.projections.map((p) => p.name);
  let activeFilter = 'all';

  const buildData = (filter) => {
    const items = data.projections.filter((p) => filter === 'all' || p.name === filter);
    // For floating bars, minBarLength does NOT reliably enforce minimum thickness.
    // Compute visual padding: for single-point forecasters (low === high), expand
    // to +/-10% visual extent; for narrow bands, add minimum padding so the bar
    // is visible. The tooltip still shows the real range.
    const visualData = items.map((p) => {
      if (p.low === p.high) {
        // single-point: render as a thick bar with +/-10% visual extent
        const pad = p.low * 0.10;
        return [Math.max(0, p.low - pad), p.high + pad];
      }
      // range: if the range is very narrow, add visual padding
      const range = p.high - p.low;
      const minVisualRange = 100; // $100B minimum visual range
      if (range < minVisualRange) {
        const pad = (minVisualRange - range) / 2;
        return [Math.max(0, p.low - pad), p.high + pad];
      }
      return [p.low, p.high];
    });
    return {
      labels: items.map((p) => p.name),
      datasets: [{
        label: 'Projected range by 2030 ($B)',
        data: visualData,
        backgroundColor: items.map((p) => {
          return p.name === 'IMF' ? gold + 'cc' : catColor('fiat-usd') + '99';
        }),
        borderColor: items.map(() => gold),
        borderWidth: 1,
        barThickness: 'flex',
        maxBarThickness: 40,
        minBarLength: 12, // belt: keep as fallback, but the visual padding above is the real fix
      }, {
        label: 'Current (mid-2026)',
        data: items.map(() => [currentAnchor, currentAnchor]),
        backgroundColor: items.map(() => gold),
        barThickness: 2,
        barPercentage: 1,
        categoryPercentage: 1,
      }],
    };
  };

  const chart = new Chart(canvas, {
    type: 'bar',
    data: buildData('all'),
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => {
          if (ctx.datasetIndex === 1) return `Current: ~$${currentAnchor}B (mid-2026)`;
          const p = data.projections.find((x) => x.name === ctx.label);
          return p ? `${p.name}: ${p.range} by ${p.by} - ${p.note}` : '';
        } } },
      },
      scales: {
        x: { grid: { color: grid }, ticks: { color: ink, callback: (v) => '$' + (v >= 1000 ? (v/1000).toFixed(1) + 'T' : v + 'B') } },
        y: { grid: { display: false }, ticks: { color: ink } },
      },
      animation: prefersReducedMotion ? false : { duration: 1200 },
    },
  });

  document.querySelectorAll('#forecast-chips .hub-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#forecast-chips .hub-chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      activeFilter = chip.dataset.forecaster;
      chart.data = buildData(activeFilter);
      chart.update();
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
  buildAccordion('dollarization-accordion', data.dollarizationCountries.map((c) => ({ label: c.country, ...c })), (c) => {
    return `<p>${c.detail}</p>${c.gdpPct !== null ? `<p class="as-of">Stablecoin purchases ~${c.gdpPct}% of GDP (Chainalysis).</p>` : ''}`;
  });
}

// --- Section 7: learner-first depeg mechanism flow -----------------------
function buildDepegs() {
  const container = document.getElementById('depeg-study');
  if (!container) return;

  const cases = (data.depegs || []).map((d) => ({ ...d, ...(d.learner || {}) }));
  const takeaways = data.depegTakeaways || [];
  let selected = 0;

  const render = () => {
    const c = cases[selected];
    if (!c) return;
    container.innerHTML = `
      <div class="hub-case-selector" role="tablist" aria-label="Choose a depeg case study">
        ${cases.map((item, index) => `
          <button type="button" class="hub-case-tab ${index === selected ? `active ${item.color || ''}` : ''}"
            role="tab" aria-selected="${index === selected}" data-idx="${index}">
            <span class="hub-case-num">0${index + 1}</span>
            <span><b>${item.short || item.name}</b><small>${item.kind || ''} failure</small></span>
          </button>
        `).join('')}
      </div>
      <div class="hub-case-study" role="tabpanel">
        <div class="hub-case-story">
          <div class="hub-case-pill ${c.color || ''}">${c.label || c.failureMode || ''}</div>
          <p class="hub-case-date">${c.date || ''}</p>
          <h3>${c.title || c.name}</h3>
          <p class="hub-case-question">"${c.question || ''}"</p>
          <div class="hub-case-details">
            <div><span>Lowest quoted price</span><strong>${c.low || '-'}</strong></div>
            <div><span>What happened after</span><strong>${c.recovery || '-'}</strong></div>
          </div>
          <p class="mech">${c.mech || ''}</p>
        </div>
        <div class="hub-failure-mechanism">
          <header>
            <div class="kicker">The failure mechanism</div>
            <h3>Follow the feedback loop</h3>
            <p>${c.trigger || ''}</p>
          </header>
          <div class="hub-mechanism-flow">
            ${(c.mechanism || []).map((step, index) => `
              <div class="hub-flow-step"><span>${index + 1}</span><strong>${step}</strong></div>
            `).join('')}
          </div>
          <div class="hub-lesson-box"><span>The lesson</span><p>${c.conclusion || c.failureMode || ''}</p></div>
        </div>
      </div>
      <div class="hub-matrix-wrap">
        <h3>Failure pattern matrix</h3>
        <p class="as-of">A mechanism map, not a price-performance chart.</p>
        <div class="hub-failure-matrix" role="table">
          <div class="hub-matrix-head" role="row">
            <span>Case</span><span>What held the peg</span><span>What broke first</span><span>Could it recover?</span>
          </div>
          ${cases.map((row) => `
            <div class="hub-matrix-row" role="row">
              <span class="hub-case-id ${row.color || ''}"><b>${(row.short || row.name || '').split(' · ')[0]}</b><small>${row.kind || ''}</small></span>
              <span>${row.heldPeg || '-'}</span>
              <span>${row.brokeFirst || '-'}</span>
              <span>${row.recoverText || '-'}</span>
            </div>
          `).join('')}
        </div>
        <p class="section-thesis" style="margin-top:1rem">A stablecoin price alone cannot tell you which risk you are seeing. StableSense shows the mechanism beside the move.</p>
      </div>
      <div class="hub-takeaway-grid">
        ${takeaways.map((t) => `
          <article class="hub-takeaway-card"><span>${t.n}</span><h3>${t.title}</h3><p>${t.body}</p></article>
        `).join('')}
      </div>
    `;
    container.querySelectorAll('.hub-case-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        selected = Number(btn.dataset.idx);
        render();
      });
    });
  };

  render();
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
// Author's teaching model, not a qualified research estimate. Stacked rows for
// every lever (wire fee, FX markup, float, on-ramp, gas, off-ramp) so no single
// black-box dollar figure can miseducate. The scenario table underneath is the
// defensible product; the calculator lets the reader replay it.
function remittanceCalc() {
  const amountEl = document.getElementById('calc-amount');
  const scheduleEl = document.getElementById('calc-schedule');
  const daysEl = document.getElementById('calc-days');
  const rateEl = document.getElementById('calc-rate');
  const onrampEl = document.getElementById('calc-onramp');
  const offrampEl = document.getElementById('calc-offramp');
  const presetFullEl = document.getElementById('calc-preset-full');
  const presetHoldEl = document.getElementById('calc-preset-hold');
  const tradOutEl = document.getElementById('calc-trad-out');
  const stableOutEl = document.getElementById('calc-stable-out');
  const warnEl = document.getElementById('calc-warn');
  if (!amountEl || !tradOutEl || !stableOutEl) return;

  const cfg = data.remittanceCost;
  const fmtUsd = (n) => '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: n >= 1000 ? 0 : 2 });
  const fmtPctRow = (n, amt) => `${(n / amt * 100).toFixed(2)}% of ${fmtUsd(amt)}`;

  const compute = () => {
    const amt = parseFloat(amountEl.value) || 0;
    const schedule = cfg.traditionalSchedules.find((s) => s.id === (scheduleEl ? scheduleEl.value : cfg.defaultTraditional)) || cfg.traditionalSchedules[0];
    const days = parseFloat(daysEl ? daysEl.value : cfg.defaultDaysInTransit) || 0;
    const rate = parseFloat(rateEl ? rateEl.value : cfg.defaultOpportunityRate) || 0;
    const includeOnramp = onrampEl && onrampEl.checked;
    const includeOfframp = offrampEl && offrampEl.checked;
    const stable = cfg.stablecoin;

    // Traditional: stated fee + FX markup + float, never one hero number.
    const tradFee = schedule.fixedUsd;
    const tradFx = amt * (schedule.feePct / 100);
    const tradFloat = amt * (rate / 100) * days / 365;
    const tradAllIn = tradFee + tradFx + tradFloat;

    // Stablecoin: on-ramp + gas + off-ramp + float, each hop its own row.
    const onrampCost = includeOnramp ? amt * (stable.onrampPct / 100) : 0;
    const gas = stable.networkFeeUsd;
    const offrampCost = includeOfframp ? amt * (stable.offrampPct / 100) : 0;
    const stableFloat = amt * (rate / 100) * (includeOnramp || includeOfframp ? 1 : 0) / 365; // ~0 on-chain, ~1d if a ramp settles to a bank
    const stableAllIn = onrampCost + gas + offrampCost + stableFloat;

    const hopOrSkip = (included, cost) => included ? fmtUsd(cost) : 'not in this path';

    tradOutEl.innerHTML =
      `<div class="calc-stack">` +
        `<div class="calc-row"><span>Stated wire / MTO fee</span><span class="calc-val">${fmtUsd(tradFee)}</span></div>` +
        `<div class="calc-row"><span>FX markup (${schedule.feePct}%)</span><span class="calc-val">${fmtUsd(tradFx)}</span></div>` +
        `<div class="calc-row"><span>Float / interest (${rate}%, ${days}d)</span><span class="calc-val">${fmtUsd(tradFloat)}</span></div>` +
        `<div class="calc-row calc-total"><span>All-in</span><span class="calc-val">${fmtUsd(tradAllIn)} (${fmtPctRow(tradAllIn, amt)})</span></div>` +
      `</div>`;

    stableOutEl.innerHTML =
      `<div class="calc-stack">` +
        `<div class="calc-row"><span>On-ramp</span><span class="calc-val">${hopOrSkip(includeOnramp, onrampCost)}</span></div>` +
        `<div class="calc-row"><span>Network fee</span><span class="calc-val">${fmtUsd(gas)}</span></div>` +
        `<div class="calc-row"><span>Off-ramp</span><span class="calc-val">${hopOrSkip(includeOfframp, offrampCost)}</span></div>` +
        `<div class="calc-row"><span>Float / interest</span><span class="calc-val">${fmtUsd(stableFloat)}</span></div>` +
        `<div class="calc-row calc-total"><span>All-in</span><span class="calc-val">${fmtUsd(stableAllIn)} (${fmtPctRow(stableAllIn, amt)})</span></div>` +
      `</div>`;

    // Warn when the RPW-like percentage is extrapolated beyond its survey size.
    if (warnEl) {
      if (schedule.warnAbove != null && amt > schedule.warnAbove) {
        warnEl.textContent = schedule.warn || '';
        warnEl.style.display = 'block';
      } else {
        warnEl.textContent = '';
        warnEl.style.display = 'none';
      }
    }
  };

  amountEl.addEventListener('input', compute);
  if (scheduleEl) scheduleEl.addEventListener('change', compute);
  if (daysEl) daysEl.addEventListener('input', compute);
  if (rateEl) rateEl.addEventListener('input', compute);
  if (onrampEl) onrampEl.addEventListener('change', compute);
  if (offrampEl) offrampEl.addEventListener('change', compute);
  if (presetFullEl) presetFullEl.addEventListener('click', () => {
    if (onrampEl) onrampEl.checked = true;
    if (offrampEl) offrampEl.checked = true;
    compute();
  });
  if (presetHoldEl) presetHoldEl.addEventListener('click', () => {
    if (onrampEl) onrampEl.checked = false;
    if (offrampEl) offrampEl.checked = false;
    compute();
  });
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

// --- sticky TOC + reading progress ----------------------------------------
function stickyToc() {
  const sections = document.querySelectorAll('.section[id]');
  const progress = document.getElementById('toc-progress');
  const tocLinks = document.querySelectorAll('.hub-nav a[href^="#"]');
  if (!sections.length || !tocLinks.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        const id = e.target.id;
        tocLinks.forEach((l) => {
          l.classList.toggle('active', l.getAttribute('href') === '#' + id);
        });
      }
    });
  }, { rootMargin: '-20% 0px -70% 0px' });
  sections.forEach((s) => io.observe(s));

  // reading progress bar
  if (progress) {
    const onScroll = () => {
      const scrolled = window.scrollY;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (total > 0 ? (scrolled / total) * 100 : 0) + '%';
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
}

// --- CSV export helper ----------------------------------------------------
function exportTableCsv(tableId, filename) {
  const table = document.getElementById(tableId);
  if (!table) return;
  const rows = table.querySelectorAll('tr');
  const csv = [];
  rows.forEach((row) => {
    const cells = row.querySelectorAll('th, td');
    csv.push(Array.from(cells).map((c) => '"' + c.textContent.trim().replace(/"/g, '""') + '"').join(','));
  });
  const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// --- remittance scenario table -------------------------------------------
function buildRemittanceScenarios() {
  const wrap = document.getElementById('remittance-scenarios');
  if (!wrap) return;
  const rows = data.remittanceScenarios || [];
  wrap.innerHTML = rows.map((s) => {
    const allowedTag = s.allowed.startsWith('Author') ? `<span class="scen-tag author">Author model</span>` : `<span class="scen-tag sourced">Sourced</span>`;
    return `<div class="scen-row">
      <div class="scen-head"><span class="scen-id">${s.id}</span> <span class="scen-title">${s.scenario}</span> ${allowedTag}</div>
      <div class="scen-grid">
        <div><div class="scen-label">Traditional</div><div class="scen-val">${s.traditional}</div></div>
        <div><div class="scen-label">Stablecoin</div><div class="scen-val">${s.stablecoin}</div></div>
      </div>
      <div class="scen-why">${s.why}</div>
      <div class="scen-source">${s.source}</div>
    </div>`;
  }).join('');
}

// --- Pass 3 editorial builders ------------------------------------------

// Yield-bearing stablecoin debate callouts (extends Section 4).
function buildYieldDebate() {
  const wrap = document.getElementById('yield-callouts');
  if (!wrap) return;
  wrap.innerHTML = (data.yieldDebate || []).map((c) => `
    <div class="callout">
      <div class="callout-label">${c.label}</div>
      <p class="stat md">${c.stat}</p>
      <p>${c.detail}</p>
    </div>
  `).join('');
}

// T-bill maturity-band visual (extends Section 3).
function buildMaturityBands() {
  const wrap = document.getElementById('maturity-bands-wrap');
  if (!wrap) return;
  wrap.innerHTML = (data.tBillMaturities || []).map((issuer) => {
    const bars = issuer.buckets.map((b) => `
      <div class="mb-row">
        <div class="mb-label">${b.label}</div>
        <div class="mb-track"><div class="mb-fill" style="width:${b.pct}%"></div></div>
        <div class="mb-val">${b.pct}%</div>
      </div>
    `).join('');
    return `<div class="mb-issuer"><div class="mb-issuer-name">${issuer.issuer}</div>${bars}</div>`;
  }).join('');
}

// BPI full-journey callout (next to the remittance calculator).
function buildBpiCallout() {
  const f = data.bpiFinding;
  if (!f) return;
  const findingEl = document.getElementById('bpi-finding');
  const sourceEl = document.getElementById('bpi-source');
  const detailEl = document.getElementById('bpi-detail');
  if (findingEl) findingEl.textContent = f.finding;
  if (sourceEl) sourceEl.textContent = f.label;
  if (detailEl) detailEl.textContent = f.detail;
}

// GENIUS Act rulemaking status (dated paragraph, not a live tracker).
function buildGeniusStatus() {
  const block = document.getElementById('genius-status-block');
  const sourceEl = document.getElementById('genius-source');
  const g = data.geniusStatus;
  if (!g || !block) return;
  block.innerHTML = `
    <p>Enacted <strong>${g.enacted}</strong>. Full implementation takes effect <strong>${g.fullImplementation}</strong>. As of ${g.asOf}: <strong>${g.totalRulemakings}</strong> total rulemakings across <strong>${g.agencies}</strong> agencies; <strong>${g.nprmsIssued}</strong> Notices of Proposed Rulemaking issued; <strong>${g.finalRules}</strong> final rules completed.</p>
    <p>${g.note}</p>
  `;
  if (sourceEl) sourceEl.innerHTML = `Source: <a href="${g.url}" target="_blank" rel="noopener noreferrer">${g.source}</a>. This is a dated snapshot, not a live tracker.`;
}

// --- init -----------------------------------------------------------------
async function init() {
  reveals();
  heroCounter();
  stickyToc();
  buildTaxonomy();
  buildCorridors();
  buildDepegs();
  buildRegulation();
  buildRemittanceScenarios();
  buildYieldDebate();
  buildMaturityBands();
  buildBpiCallout();
  buildGeniusStatus();
  remittanceCalc();
  raceBars();
  buildFooterLists();
  // CSV export buttons
  const csvBtn = document.getElementById('export-tokens-csv');
  if (csvBtn) csvBtn.addEventListener('click', () => exportTableCsv('token-table', 'stablesense-tokens.csv'));
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
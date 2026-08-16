import { getActiveCoins } from '../../src/utils/coin-config.js';
import { loadEnv } from '../lib/env.js';
import db from '../lib/db.js';
import { computePegStress, generateAlerts } from '../../src/lib/derive.js';

loadEnv();

// Materialize the latest snapshot rows into the {coin}Detail shape that
// derive.js expects (chainBalances -> tokens[] -> circulating.peggedUSD).
function buildDetailsByCoin(coins) {
  const detailsByCoin = {};
  for (const coin of coins) {
    const rows = db
      .prepare(
        `SELECT chain, ts, circulating_usd, delta_24h_usd
         FROM snapshots WHERE coin = ?
         ORDER BY ts ASC`
      )
      .all(coin.symbol);
    const chainBalances = {};
    for (const r of rows) {
      if (!chainBalances[r.chain]) chainBalances[r.chain] = { tokens: [] };
      chainBalances[r.chain].tokens.push({
        date: Math.floor(r.ts / 1000),
        circulating: { peggedUSD: r.circulating_usd },
      });
    }
    detailsByCoin[coin.symbol] = { chainBalances };
  }
  return detailsByCoin;
}

function buildPricesByCoin(coins) {
  const out = {};
  for (const coin of coins) {
    const row = db
      .prepare('SELECT price FROM prices WHERE coin = ? ORDER BY ts DESC LIMIT 1')
      .get(coin.symbol);
    out[coin.symbol] = row?.price ?? 1;
  }
  return out;
}

function buildData(coins, detailsByCoin, pricesByCoin) {
  const data = { cgSimple: {} };
  for (const coin of coins) {
    data.cgSimple[coin.coingeckoId] = { usd: pricesByCoin[coin.symbol] };
    data[`${coin.symbol.toLowerCase()}Detail`] = detailsByCoin[coin.symbol];
  }
  return data;
}

const coins = getActiveCoins();
const now = Date.now();

const detailsByCoin = buildDetailsByCoin(coins);
const pricesByCoin = buildPricesByCoin(coins);
const data = buildData(coins, detailsByCoin, pricesByCoin);

const alerts = generateAlerts(data);

// Chain-flow top delta (same input computePegStress expects).
let topChainFlow = 0;
for (const coin of coins) {
  const detail = detailsByCoin[coin.symbol];
  for (const chainData of Object.values(detail?.chainBalances || {})) {
    const tokens = chainData?.tokens || [];
    if (tokens.length < 2) continue;
    const cur = tokens[tokens.length - 1]?.circulating?.peggedUSD || 0;
    const prev = tokens[tokens.length - 2]?.circulating?.peggedUSD || cur;
    const delta = Math.abs(cur - prev);
    if (delta > topChainFlow) topChainFlow = delta;
  }
}

const stress = computePegStress({
  pricesByCoin,
  alerts,
  topChainFlow,
});

// z-score per coin: reuse the same 30-point baseline logic as the frontend
// buildWhaleWatchRows, but aggregate across chains for a coin-level score.
function coinZScore(detail) {
  const series = [];
  for (const chainData of Object.values(detail?.chainBalances || {})) {
    const tokens = (chainData?.tokens || []).slice(-30);
    for (const t of tokens) series.push(t?.circulating?.peggedUSD || 0);
  }
  if (series.length < 8) return { z: 0, delta: 0, normalized: 0 };
  const deltas = [];
  for (let i = 1; i < series.length; i += 1) deltas.push(series[i] - series[i - 1]);
  const currentDelta = deltas[deltas.length - 1] || 0;
  const baseline = deltas.slice(0, -1);
  const avg = baseline.reduce((a, b) => a + b, 0) / (baseline.length || 1);
  const variance = baseline.reduce((acc, v) => acc + (v - avg) ** 2, 0) / (baseline.length || 1);
  const sd = Math.sqrt(variance);
  const z = sd > 0 ? (Math.abs(currentDelta) - avg) / sd : 0;
  const total = series.reduce((a, b) => a + b, 0) || 1;
  const normalized = (currentDelta / total) * 100;
  return { z: Math.min(z, 10), delta: currentDelta, normalized };
}

const insertStress = db.prepare(
  `INSERT OR REPLACE INTO stress_series (ts, symbol, peg_stress_index, z_score, raw_delta, normalized_delta)
   VALUES (@ts, @symbol, @stress, @z, @delta, @normalized)`
);

const insertLabel = db.prepare(
  `INSERT OR REPLACE INTO labels (ts, symbol, alert_type, severity, explanation, magnitude)
   VALUES (@ts, @symbol, @type, @severity, @explanation, @magnitude)`
);

const insertStressBatch = db.transaction((rows) => {
  for (const r of rows) insertStress.run(r);
});

const insertLabelBatch = db.transaction((rows) => {
  for (const r of rows) insertLabel.run(r);
});

const stressRows = [];
for (const coin of coins) {
  const detail = detailsByCoin[coin.symbol];
  const { z, delta, normalized } = coinZScore(detail);
  // Per-coin peg stress: same formula but scoped to this coin's price drift.
  const coinAlerts = alerts.filter((a) => a.coin === coin.symbol);
  const coinTopFlow = (() => {
    let mx = 0;
    for (const chainData of Object.values(detail?.chainBalances || {})) {
      const tokens = chainData?.tokens || [];
      if (tokens.length < 2) continue;
      const cur = tokens[tokens.length - 1]?.circulating?.peggedUSD || 0;
      const prev = tokens[tokens.length - 2]?.circulating?.peggedUSD || cur;
      mx = Math.max(mx, Math.abs(cur - prev));
    }
    return mx;
  })();
  const coinStress = computePegStress({
    pricesByCoin: { [coin.symbol]: pricesByCoin[coin.symbol] },
    alerts: coinAlerts,
    topChainFlow: coinTopFlow,
  });
  stressRows.push({
    ts: now,
    symbol: coin.symbol,
    stress: coinStress.score,
    z,
    delta,
    normalized,
  });
}
insertStressBatch(stressRows);
console.log(`[stress] stress_series: ${stressRows.length} rows`);

const labelRows = [];
for (const alert of alerts) {
  labelRows.push({
    ts: now,
    symbol: alert.coin,
    type: alert.rule,
    severity: alert.severity,
    explanation: alert.rationale,
    magnitude: alert.magnitude ?? null,
  });
}
if (labelRows.length) {
  insertLabelBatch(labelRows);
  console.log(`[labels] labels: ${labelRows.length} rows`);
} else {
  console.log('[labels] no active alerts this cycle');
}

console.log('[stress] done');
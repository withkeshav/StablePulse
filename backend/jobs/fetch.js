import { getActiveCoins } from '../../src/utils/coin-config.js';
import { loadEnv } from '../lib/env.js';
import db from '../lib/db.js';

loadEnv();

const LLAMA_BASE = 'https://stablecoins.llama.fi';
const CG_BASE = 'https://api.coingecko.com/api/v3';

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.json();
}

const coins = getActiveCoins();
const now = Date.now();

const insertSnapshot = db.prepare(`
  INSERT OR IGNORE INTO snapshots (coin, chain, ts, circulating_usd, delta_24h_usd)
  VALUES (@coin, @chain, @ts, @circulating, @delta)
`);
const insertSnapshots = db.transaction((rows) => {
  for (const row of rows) insertSnapshot.run(row);
});

// 1) Per-coin chain history. DefiLlama returns full daily token history, so the
// first run backfills the dataset and later runs only append the newest day.
for (const coin of coins) {
  const detail = await getJson(`${LLAMA_BASE}/stablecoin/${coin.llamaStablecoinId}?includeTotals=true`);
  const rows = [];
  for (const [chain, chainData] of Object.entries(detail.chainBalances || {})) {
    const tokens = (chainData.tokens || []).filter(
      (t) => typeof t?.date === 'number' && typeof t?.circulating?.peggedUSD === 'number'
    );
    for (let i = 0; i < tokens.length; i += 1) {
      const prev = tokens[i - 1]?.circulating?.peggedUSD;
      rows.push({
        coin: coin.symbol,
        chain,
        ts: tokens[i].date * 1000,
        circulating: tokens[i].circulating.peggedUSD,
        delta: typeof prev === 'number' ? tokens[i].circulating.peggedUSD - prev : null,
      });
    }
  }
  insertSnapshots(rows);
  console.log(`[fetch] ${coin.symbol}: ${rows.length} snapshot rows`);
}

// 2) Spot prices with 24h change + volume.
const ids = coins.map((c) => c.coingeckoId).join(',');
const cg = await getJson(
  `${CG_BASE}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`
);
const insertPrice = db.prepare(
  'INSERT INTO prices (coin, ts, price, change_24h, volume_24h_usd) VALUES (@coin, @ts, @price, @change, @volume)'
);
const insertPrices = db.transaction((rows) => {
  for (const row of rows) insertPrice.run(row);
});
insertPrices(
  coins.map((c) => ({
    coin: c.symbol,
    ts: now,
    price: cg[c.coingeckoId]?.usd ?? null,
    change: cg[c.coingeckoId]?.usd_24h_change ?? null,
    volume: cg[c.coingeckoId]?.usd_24h_vol ?? null,
  }))
);
console.log(`[fetch] prices: ${coins.length} rows`);

// 3) Aggregate market snapshot (all stablecoins, not just the tracked five).
const market = await getJson(`${LLAMA_BASE}/stablecoins`);
const total = (market?.peggedAssets || []).reduce((sum, a) => sum + (a?.circulating?.peggedUSD || 0), 0);
const prevDay = (market?.peggedAssets || []).reduce((sum, a) => sum + (a?.circulatingPrevDay?.peggedUSD || 0), 0);
if (typeof total === 'number' && total > 0) {
  db.prepare('INSERT INTO market_snapshots (ts, total_circulating_usd, delta_24h_usd) VALUES (?, ?, ?)').run(
    now,
    total,
    prevDay > 0 ? total - prevDay : null
  );
  console.log(`[fetch] market total: $${(total / 1e9).toFixed(2)}B`);
}

console.log('[fetch] done');

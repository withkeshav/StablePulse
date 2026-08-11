import { getActiveCoins, STABLECOIN_REGISTRY } from '../utils/coin-config.js';

const LLAMA_BASE = 'https://stablecoins.llama.fi';
const CG_BASE = 'https://api.coingecko.com/api/v3';

const TTL = {
  fast: 60_000,
  history: 3_600_000,
  chart: 300_000,
};
const FETCH_TIMEOUT_MS = 20000;
const CACHE_PREFIX = 'stablepulse:v2:';

const memoryCache = new Map();
const inflight = new Map();

function readMemory(key) {
  const hit = memoryCache.get(key);
  return hit ? { ts: hit.ts, data: hit.data, revalidating: hit.revalidating || false } : null;
}

function writeMemory(key, data) {
  memoryCache.set(key, { ts: Date.now(), data, revalidating: false });
}

function readLocal(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeLocal(key, value) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(value));
  } catch {
    // private mode or quota exceeded: fall back to the in-memory cache only
  }
}

async function fetchWithTimeout(url, signal) {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  let onSignal;
  if (signal) {
    onSignal = () => ctrl.abort();
    signal.addEventListener('abort', onSignal);
  }
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(timeout);
    if (signal) signal.removeEventListener('abort', onSignal);
  }
}

async function doFetch(url, signal) {
  const res = await fetchWithTimeout(url, signal);
  if (!res.ok) throw new Error(`Request failed (${res.status}) for ${url}`);
  return res.json();
}

async function revalidate(key, url) {
  const mem = readMemory(key);
  if (mem?.revalidating) return;
  memoryCache.set(key, { ts: mem?.ts || 0, data: mem?.data ?? null, revalidating: true });
  try {
    const data = await doFetch(url);
    writeMemory(key, data);
    writeLocal(key, { ts: Date.now(), data });
  } catch {
    // keep the stale cache intact
    memoryCache.set(key, { ts: mem?.ts || 0, data: mem?.data ?? null, revalidating: false });
  }
}

async function fetchAndStore(key, url, signal) {
  if (inflight.has(key)) return inflight.get(key);
  const promise = (async () => {
    try {
      const data = await doFetch(url, signal);
      writeMemory(key, data);
      writeLocal(key, { ts: Date.now(), data });
      return data;
    } catch (err) {
      const stale = readLocal(key);
      if (stale && stale.data != null) return stale.data;
      throw err;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, promise);
  return promise;
}

/**
 * Cache-aware fetch with two policies:
 * - `ttl`: how fresh the cached copy must be to avoid the network.
 * - `swr`: when true, a stale-but-present cached copy is returned immediately
 *   while a background refresh refreshes the cache (stale-while-revalidate).
 * On a network error, the last known cached copy is returned instead of
 * throwing, so the dashboard never blanks after it has loaded once.
 */
export async function cachedRequest(key, url, { ttl = TTL.fast, swr = true, signal } = {}) {
  const mem = readMemory(key);
  if (mem && Date.now() - mem.ts < ttl && !mem.revalidating) return mem.data;

  const local = readLocal(key);
  if (local && Date.now() - local.ts < ttl) {
    if (!mem) writeMemory(key, local.data);
    return local.data;
  }
  if (local && swr && local.data != null) {
    void revalidate(key, url);
    return local.data;
  }
  return fetchAndStore(key, url, signal);
}

function llamaStablecoinsUrl() {
  return `${LLAMA_BASE}/stablecoins?includePrices=false`;
}

function llamaStablecoinUrl(id) {
  return `${LLAMA_BASE}/stablecoin/${id}?includeTotals=true`;
}

function cgSimpleUrl(coins) {
  const ids = coins.map((c) => c.coingeckoId).join(',');
  return `${CG_BASE}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`;
}

function cgChartUrl(id) {
  return `${CG_BASE}/coins/${id}/market_chart?vs_currency=usd&days=90&interval=daily`;
}

function cgTickersUrl(id) {
  return `${CG_BASE}/coins/${id}/tickers?limit=8`;
}

/**
 * Normalize DefiLlama's native chainCirculating shape
 * `{ chain: { circulating, circulatingPrevDay } }` into the
 * `{ chain: { current, circulatingPrevDay } }` shape the UI expects.
 */
function normalizeChainCirculating(asset) {
  const out = {};
  for (const [chain, info] of Object.entries(asset?.chainCirculating || {})) {
    out[chain] = {
      current: info?.circulating || info?.current || null,
      circulatingPrevDay: info?.circulatingPrevDay || null,
    };
  }
  return out;
}

function sumPeggedUSD(assets, key) {
  return (assets || []).reduce((sum, asset) => sum + (asset?.[key]?.peggedUSD || 0), 0);
}

function assembleLlama(data, llama, coins) {
  const activeSymbols = new Set(coins.map((c) => c.symbol));
  const peggedAssets = (llama?.peggedAssets || [])
    .filter((a) => a && activeSymbols.has(a.symbol))
    .map((a) => ({ ...a, chainCirculating: normalizeChainCirculating(a) }));
  data.allStables = {
    totalMarketCap: {
      peggedUSD: sumPeggedUSD(llama?.peggedAssets, 'circulating'),
      prevDay: { peggedUSD: sumPeggedUSD(llama?.peggedAssets, 'circulatingPrevDay') },
    },
    peggedAssets,
    chains: llama?.chains || [],
  };
  data.chainData = data.allStables.chains;
}

/**
 * Assemble the browser-direct dashboard payload. Light endpoints
 * (stablecoin snapshot + spot prices) drive the home screen; per-coin
 * daily history is served cache-first so repeat loads are instant.
 * Each upstream failure degrades independently and never blanks the UI.
 */
export async function fetchDashboardData({ signal } = {}) {
  const coins = getActiveCoins();
  const results = await Promise.allSettled([
    cachedRequest('llamaStablecoins', llamaStablecoinsUrl(), { ttl: TTL.fast, swr: true, signal }),
    cachedRequest('cgSimple', cgSimpleUrl(coins), { ttl: TTL.fast, swr: true, signal }),
  ]);
  const llama = results[0].status === 'fulfilled' ? results[0].value : null;
  const cg = results[1].status === 'fulfilled' ? results[1].value : null;
  if (!llama && !cg) {
    throw new Error('All market data sources are unavailable.');
  }

  const data = {};
  data.cgSimple = cg || {};
  assembleLlama(data, llama, coins);

  await Promise.all(
    coins.map(async (coin) => {
      const detail = await cachedRequest(
        `llamaDetail:${coin.symbol}`,
        llamaStablecoinUrl(coin.llamaStablecoinId),
        { ttl: TTL.history, swr: true, signal }
      ).catch(() => null);
      data[`${coin.symbol.toLowerCase()}Detail`] = detail || {};
    })
  );

  data.fetchedAt = Date.now();
  return data;
}

/**
 * Lazily add a coin's price history and top exchange tickers to `data`.
 * Called when a coin tab opens; results are cached for a short window.
 */
export async function loadCoinChart(symbol, data, { signal } = {}) {
  const cfg = STABLECOIN_REGISTRY[symbol];
  if (!cfg || !data) return;

  const chart = await cachedRequest(`cgChart:${symbol}`, cgChartUrl(cfg.coingeckoId), {
    ttl: TTL.chart,
    swr: true,
    signal,
  }).catch(() => null);
  if (chart && Array.isArray(chart?.prices)) data[`cg${symbol}Chart`] = chart;

  const tickers = await cachedRequest(`cgTickers:${symbol}`, cgTickersUrl(cfg.coingeckoId), {
    ttl: TTL.chart,
    swr: true,
    signal,
  }).catch(() => null);
  if (tickers && Array.isArray(tickers?.tickers)) {
    data[`cg${symbol}`] = { tickers: tickers.tickers.slice(0, 8) };
  }
}

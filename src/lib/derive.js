import { bps } from '../utils/formatters.js';
import { getActiveCoins } from '../utils/coin-config.js';

/**
 * Compute a shared peg band around $1 so peg drift is visible and Home and
 * the coin tab cannot drift apart. Widen automatically when a real depeg
 * exceeds the default band, but never go below $0.90 or above $1.10.
 * @param {Array<number>} prices Flat list of peg prices from the chart's data.
 * @returns {{min:number, max:number}} Band bounds; `{0.9,1.1}` if no prices.
 */
export function pegBand(prices) {
  const valid = (prices || []).filter((v) => typeof v === 'number' && v > 0);
  if (!valid.length) return { min: 0.9, max: 1.1 };
  const seriesMin = Math.min(...valid);
  const seriesMax = Math.max(...valid);
  return {
    min: Math.max(0.9, seriesMin - 0.005),
    max: Math.min(1.1, seriesMax + 0.005),
  };
}

/**
 * Build the dashed $1 reference-line dataset shared by Home Peg Monitor and
 * the coin-tab price chart. Drawn as a flat line at y=1 with a dashed stroke
 * so no chartjs-plugin-annotation dependency is required.
 * @param {Array<*>} labels The chart's label array (length sets the line).
 * @param {string} [color] Stroke color (resolve a theme token before calling).
 * @returns {{label:string, data:number[], borderColor:string, borderDash:number[], borderWidth:number, pointRadius:number, tension:number}}
 */
export function pegRefLine(labels, color = '#9CA3AF') {
  return {
    label: '$1 peg',
    data: (labels || []).map(() => 1),
    borderColor: color,
    borderDash: [4, 4],
    borderWidth: 1,
    pointRadius: 0,
    tension: 0,
  };
}

/**
 * Build the shared peg-chart options (band + $1 tick formatting) used by both
 * Home and the coin tab so the two charts cannot drift apart.
 * @param {Array<number>} prices Flat list of peg prices from the chart's data.
 * @returns {object} Chart.js options object (empty if no prices).
 */
export function pegChartOptions(prices) {
  const valid = (prices || []).filter((v) => typeof v === 'number' && v > 0);
  if (!valid.length) return {};
  const { min, max } = pegBand(valid);
  return {
    scales: {
      y: {
        min,
        max,
        ticks: { callback: (v) => '$' + Number(v).toFixed(4) },
      },
    },
    plugins: {
      tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: $${Number(ctx.parsed.y).toFixed(4)}` } },
    },
  };
}

/**
 * Normalize a supply series to "percent change from the first point" so coins
 * of very different magnitudes (USDT ~$183B vs PYUSD ~$1B) can be read on one
 * axis. The first point becomes 0; subsequent points are `(v / first - 1) * 100`.
 * @param {Array<{date:number, value:number}>} series Supply series.
 * @returns {Array<{date:number, value:number}>} Normalized series (empty if no first point).
 */
export function toPercentFromFirst(series) {
  const arr = series || [];
  if (!arr.length) return [];
  const first = arr[0].value;
  if (!first) return arr.map((p) => ({ date: p.date, value: 0 }));
  return arr.map((p) => ({ date: p.date, value: (p.value / first - 1) * 100 }));
}

export function buildSupplySeries(detail) {
  const chainBalances = detail?.chainBalances || {};
  const byDate = {};
  Object.values(chainBalances).forEach((chain) => {
    (chain?.tokens || []).forEach((t) => {
      const ts = Number(t?.date || 0) * 1000;
      if (!ts) return;
      byDate[ts] = (byDate[ts] || 0) + (t?.circulating?.peggedUSD || 0);
    });
  });
  return Object.entries(byDate).map(([date, value]) => ({ date: Number(date), value })).sort((a, b) => a.date - b.date).slice(-90);
}

/**
 * Rank chains by combined 24h mint/burn deltas across all tracked stablecoins.
 * @param {Object<string, object>} detailsByCoin Map of coin symbol -> chain detail payload.
 * @returns {Array<object>} Chains sorted by absolute total delta, with per-coin `deltas`.
 */
export function rankChainFlows(detailsByCoin) {
  const map = {};
  for (const [coin, detail] of Object.entries(detailsByCoin || {})) {
    for (const [chain, chainData] of Object.entries(detail?.chainBalances || {})) {
      const tokens = chainData?.tokens || [];
      const cur = tokens[tokens.length - 1]?.circulating?.peggedUSD || 0;
      const pd = tokens[tokens.length - 2]?.circulating?.peggedUSD ?? cur;
      const delta = cur - pd;
      if (!map[chain]) map[chain] = { chain, deltas: {}, totalDelta: 0 };
      map[chain].deltas[coin] = (map[chain].deltas[coin] || 0) + delta;
      map[chain].totalDelta += delta;
    }
  }
  return Object.values(map).sort((a, b) => Math.abs(b.totalDelta) - Math.abs(a.totalDelta));
}

export function buildMigrationPairs(flows) {
  const inflows = flows.filter((f) => f.totalDelta > 0).sort((a, b) => b.totalDelta - a.totalDelta);
  const outflows = flows.filter((f) => f.totalDelta < 0).sort((a, b) => a.totalDelta - b.totalDelta);
  return outflows.slice(0, 3).map((out, i) => ({
    from: out.chain,
    to: inflows[i]?.chain || 'N/A',
    amount: Math.min(Math.abs(out.totalDelta), inflows[i]?.totalDelta || 0),
  }));
}

export function computePegStress({ pricesByCoin, alerts, topChainFlow }) {
  const critical = (alerts || []).filter((a) => a.severity === 'CRITICAL').length;
  const high = (alerts || []).filter((a) => a.severity === 'HIGH').length;
  const warning = (alerts || []).filter((a) => a.severity === 'WARNING').length;
  const pegDriftBps = Math.max(0, ...Object.values(pricesByCoin || {}).map((p) => Math.abs(bps(p))));
  const score = Math.min(100, Math.round(pegDriftBps * 0.7 + critical * 25 + high * 10 + warning * 4 + Math.min(35, Math.round((Math.abs(topChainFlow) / 1e9) * 2))));
  const level = score >= 70 ? 'HIGH' : score >= 40 ? 'WATCH' : 'LOW';
  return { score, level, pegDriftBps, critical, high, warning };
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stddev(values, avg) {
  if (values.length < 2) return 0;
  const variance = values.reduce((acc, v) => acc + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function buildWhaleWatchRows(detailsByCoin, limit = 8) {
  const rows = [];
  for (const [coin, detail] of Object.entries(detailsByCoin || {})) {
    for (const [chain, chainData] of Object.entries(detail?.chainBalances || {})) {
      const tokens = chainData?.tokens || [];
      if (tokens.length < 8) continue;
      const series = tokens.slice(-30).map((t) => t?.circulating?.peggedUSD || 0);
      const deltas = [];
      for (let i = 1; i < series.length; i += 1) deltas.push(series[i] - series[i - 1]);
      const currentDelta = deltas[deltas.length - 1] || 0;
      const baseline = deltas.slice(0, -1).map((d) => Math.abs(d));
      const avg = mean(baseline);
      const sd = stddev(baseline, avg);
      const z = sd > 0 ? (Math.abs(currentDelta) - avg) / sd : 0;
      if (z >= 2.5 || Math.abs(currentDelta) > 7.5e8) {
        rows.push({
          coin,
          chain,
          delta: currentDelta,
          z,
          displayZ: Math.min(z, 10),
        });
      }
    }
  }
  const ranked = rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, limit);
  // Share of the total absolute delta across the surfaced rows, so a tiny-chain
  // spike is contextualized against the whole tracked flow, not shown in isolation.
  const totalAbs = ranked.reduce((sum, r) => sum + Math.abs(r.delta), 0) || 1;
  return ranked.map((r) => ({ ...r, shareOfTracked: (Math.abs(r.delta) / totalAbs) * 100 }));
}

/**
 * Build a share-of-total percentage series for a target coin over time.
 * @param {Object<string, Array<{date:number,value:number}>>} supplyByCoin Per-coin supply series.
 * @param {string} targetCoin Symbol whose share percentage is returned.
 * @returns {Array<{date:number, share:number}>} Share series (0..100).
 */
export function buildShareSeries(supplyByCoin, targetCoin) {
  const byDate = {};
  for (const [coin, series] of Object.entries(supplyByCoin || {})) {
    (series || []).forEach((p) => {
      if (!byDate[p.date]) byDate[p.date] = { date: p.date };
      byDate[p.date][coin] = p.value;
    });
  }
  return Object.values(byDate)
    .sort((a, b) => a.date - b.date)
    .map((p) => {
      const total = Object.entries(p).reduce((sum, [k, v]) => (k === 'date' ? sum : sum + (Number(v) || 0)), 0);
      return { date: p.date, share: total ? ((Number(p[targetCoin]) || 0) / total) * 100 : 0 };
    });
}

/**
 * Deduplicate exchange tickers so the same venue is not shown twice (e.g. the
 * live CoinGecko tether feed lists BTCC twice). Dedupe key is `market.identifier`
 * (the stable exchange id), falling back to `name + base` when absent. When two
 * distinct tickers resolve to the same display name, suffix the pair so each
 * bar stays distinguishable: first becomes "BTCC", second "BTCC (2)".
 * @param {Array<object>} tickers Raw CoinGecko tickers array.
 * @param {number} [limit=8] Max rows to return.
 * @returns {Array<{name:string, volume:number}>} Deduped, capped rows.
 */
export function dedupeTickers(tickers, limit = 8) {
  const seen = new Set();
  const nameCount = {};
  const out = [];
  for (const t of tickers || []) {
    const id = t?.market?.identifier || `${t?.market?.name || ''}-${t?.base || ''}`;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const name = t?.market?.name || 'Unknown';
    nameCount[name] = (nameCount[name] || 0) + 1;
    out.push({ name, volume: t?.converted_volume?.usd || 0 });
    if (out.length >= limit) break;
  }
  // Second pass: suffix duplicate display names so bars stay distinguishable.
  const nameSeen = {};
  return out.map((row) => {
    if (nameCount[row.name] > 1) {
      nameSeen[row.name] = (nameSeen[row.name] || 0) + 1;
      if (nameSeen[row.name] > 1) row.name = `${row.name} (${nameSeen[row.name]})`;
    }
    return row;
  });
}

export function buildAlertSparkSeries(alert, data) {
  if (!alert || !data) return null;
  const rule = alert.rule;
  const coin = alert.coin;
  const coins = getActiveCoins();
  const activeCoin = coins.find((c) => c.symbol === coin);
  const color = activeCoin ? activeCoin.color : '#3b82f6';

  if (rule === 'PEG_BREAK') {
    const chart = data?.[`cg${coin}Chart`];
    const prices = (chart?.prices || []).slice(-14);
    if (!prices.length) return null;
    return {
      labels: prices.map((_, i) => String(i)),
      values: prices.map((p) => p[1]),
      color,
    };
  }
  if (rule === 'MEGA_SUPPLY' || rule === 'CHAIN_SPIKE') {
    const detail = data?.[`${coin?.toLowerCase()}Detail`];
    const chainData = detail?.chainBalances?.[alert.chain];
    const tokens = (chainData?.tokens || []).slice(-14);
    if (!tokens.length) return null;
    return {
      labels: tokens.map((_, i) => String(i)),
      values: tokens.map((t) => t?.circulating?.peggedUSD || 0),
      color,
    };
  }
  if (rule === 'DOM_SHIFT') {
    const supplyByCoin = {};
    for (const key of Object.keys(data || {})) {
      if (key.endsWith('Detail')) {
        const symbol = key.replace('Detail', '').toUpperCase();
        supplyByCoin[symbol] = buildSupplySeries(data[key]);
      }
    }
    const dom = buildShareSeries(supplyByCoin, coin).slice(-14);
    if (!dom.length) return null;
    return {
      labels: dom.map((_, i) => String(i)),
      values: dom.map((p) => p.share),
      color: '#3b82f6',
    };
  }
  return null;
}

const SEVERITY_RANK = { CRITICAL: 0, HIGH: 1, WARNING: 2 };

function dayBucket(ts = Date.now()) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function alertId(rule, coin, chain) {
  const base = `${rule}:${coin}${chain ? `:${chain}` : ''}:${dayBucket()}`;
  let hash = 0;
  for (let i = 0; i < base.length; i += 1) {
    hash = (hash * 31 + base.charCodeAt(i)) >>> 0;
  }
  return `${rule.toLowerCase()}-${coin.toLowerCase()}${chain ? `-${chain.toLowerCase()}` : ''}-${hash.toString(36)}`;
}

function chainDelta(detail, chain) {
  const tokens = detail?.chainBalances?.[chain]?.tokens || [];
  const cur = tokens[tokens.length - 1]?.circulating?.peggedUSD;
  const prev = tokens[tokens.length - 2]?.circulating?.peggedUSD;
  if (typeof cur !== 'number' || typeof prev !== 'number') return 0;
  return cur - prev;
}

function coinTotalDelta(detail) {
  const chains = Object.keys(detail?.chainBalances || {});
  return chains.reduce((sum, chain) => sum + chainDelta(detail, chain), 0);
}

function fmtUsd(n) {
  return Math.abs(n) >= 1e9 ? `${(Math.abs(n) / 1e9).toFixed(2)}B` : `${(Math.abs(n) / 1e6).toFixed(0)}M`;
}

/**
 * Derive alert events from the dashboard payload using the per-coin
 * thresholds in the stablecoin registry. Deterministic and local: no AI,
 * no network, no server round-trip. Rules:
 *   PEG_BREAK   per-coin spot price drift from $1
 *   CHAIN_SPIKE per-chain 24h supply delta on a single chain
 *   MEGA_SUPPLY coin-wide 24h mint/burn total
 *   DOM_SHIFT   weekly change in a coin's share of tracked supply
 */
export function generateAlerts(data) {
  if (!data) return [];
  const alerts = [];
  const now = Date.now();
  const coins = getActiveCoins();

  for (const cfg of coins) {
    const price = data?.cgSimple?.[cfg.coingeckoId]?.usd;
    const detail = data?.[`${cfg.symbol.toLowerCase()}Detail`];

    if (typeof price === 'number') {
      const devBps = bps(price);
      const absDev = Math.abs(devBps);
      let severity = null;
      if (absDev >= cfg.thresholds.pegCriticalBps) severity = 'CRITICAL';
      else if (absDev >= cfg.thresholds.pegWarnBps) severity = 'HIGH';
      if (severity) {
        alerts.push({
          id: alertId('PEG_BREAK', cfg.symbol),
          rule: 'PEG_BREAK',
          coin: cfg.symbol,
          severity,
          magnitude: absDev,
          timestamp: now,
          rationale: `${cfg.symbol} is ${devBps} bps ${devBps < 0 ? 'below' : 'above'} the $1 peg (price ${price.toFixed(4)}).`,
        });
      }
    }

    const spikes = [];
    for (const chain of Object.keys(detail?.chainBalances || {})) {
      const delta = chainDelta(detail, chain);
      if (Math.abs(delta) >= cfg.thresholds.chainSpikeUsd) spikes.push({ chain, delta });
    }
    for (const spike of spikes) {
      const severity = Math.abs(spike.delta) >= 2 * cfg.thresholds.chainSpikeUsd ? 'HIGH' : 'WARNING';
      alerts.push({
        id: alertId('CHAIN_SPIKE', cfg.symbol, spike.chain),
        rule: 'CHAIN_SPIKE',
        coin: cfg.symbol,
        chain: spike.chain,
        severity,
        magnitude: Math.abs(spike.delta),
        timestamp: now,
        rationale: `${cfg.symbol} supply ${spike.delta > 0 ? 'surged' : 'dropped'} by ${fmtUsd(spike.delta)} on ${spike.chain} in the last 24h.`,
      });
    }

    if (detail && Object.keys(detail.chainBalances || {}).length) {
      const total = coinTotalDelta(detail);
      if (Math.abs(total) >= cfg.thresholds.megaSupplyUsd) {
        const severity = Math.abs(total) >= 3 * cfg.thresholds.megaSupplyUsd ? 'CRITICAL' : 'HIGH';
        alerts.push({
          id: alertId('MEGA_SUPPLY', cfg.symbol),
          rule: 'MEGA_SUPPLY',
          coin: cfg.symbol,
          severity,
          magnitude: Math.abs(total),
          timestamp: now,
          rationale: `${cfg.symbol} minted or burned ${fmtUsd(total)} across all chains in the last 24h.`,
        });
      }
    }
  }

  const supplyByCoin = {};
  for (const cfg of coins) {
    const detail = data?.[`${cfg.symbol.toLowerCase()}Detail`];
    const series = buildSupplySeries(detail);
    if (series.length >= 8) supplyByCoin[cfg.symbol] = series;
  }
  if (Object.keys(supplyByCoin).length >= 2) {
    for (const cfg of coins) {
      if (!supplyByCoin[cfg.symbol]) continue;
      const share = buildShareSeries(supplyByCoin, cfg.symbol);
      if (share.length < 8) continue;
      const latest = share[share.length - 1].share;
      const ref = share[share.length - 8].share;
      const drift = latest - ref;
      if (Math.abs(drift) >= 1) {
        const severity = Math.abs(drift) >= 3 ? 'HIGH' : 'WARNING';
        alerts.push({
          id: alertId('DOM_SHIFT', cfg.symbol),
          rule: 'DOM_SHIFT',
          coin: cfg.symbol,
          severity,
          magnitude: Math.abs(drift),
          timestamp: now,
          rationale: `${cfg.symbol} dominance ${drift > 0 ? 'gained' : 'lost'} ${Math.abs(drift).toFixed(1)} pts of tracked stablecoin supply over the past week.`,
        });
      }
    }
  }

  return alerts.sort(
    (a, b) =>
      (SEVERITY_RANK[a.severity] ?? 3) - (SEVERITY_RANK[b.severity] ?? 3) ||
      (b.magnitude || 0) - (a.magnitude || 0)
  );
}

/**
 * Deterministic, rule-based "why it matters" guidance for an alert.
 * Replaces the on-demand AI explanation endpoint: no network call.
 */
export function alertExplanation(alert) {
  if (!alert) {
    return { whyItMatters: 'Alert context unavailable.', whatToWatch: 'Monitor the next refresh window.', confidence: null };
  }
  switch (alert.rule) {
    case 'PEG_BREAK':
      return {
        whyItMatters: `${alert.coin} is trading ${Math.abs(alert.magnitude)} bps from its $1 target. A move past the critical threshold typically reflects redemption pressure or market dislocations.`,
        whatToWatch: `Watch whether ${alert.coin} mean-reverts within 24h; sustained drift toward the critical band is the escalation trigger.`,
        confidence: Math.min(0.9, 0.4 + Math.abs(alert.magnitude) / 100),
      };
    case 'CHAIN_SPIKE':
      return {
        whyItMatters: `A single-chain 24h supply move this large is usually a coordinated mint or burn, often tied to one venue such as an exchange, treasury, or protocol.`,
        whatToWatch: 'Check the next daily snapshot: does the chain hold the level or reverse?',
        confidence: 0.7,
      };
    case 'MEGA_SUPPLY':
      return {
        whyItMatters: 'A coin-wide mint or burn on this scale shifts total stablecoin liquidity and can precede broader market moves.',
        whatToWatch: 'Cross-check the affected chains in the chain rankings and watch for follow-on issuance.',
        confidence: 0.75,
      };
    case 'DOM_SHIFT':
      return {
        whyItMatters: `${alert.coin} is gaining or losing tracked supply share quickly, which changes the composition of on-chain stablecoin liquidity.`,
        whatToWatch: 'Confirm whether the shift is driven by new issuance or by migration to another chain.',
        confidence: 0.6,
      };
    default:
      return {
        whyItMatters: 'Rule-specific guidance is not available for this alert.',
        whatToWatch: 'Monitor the next refresh window.',
        confidence: null,
      };
  }
}

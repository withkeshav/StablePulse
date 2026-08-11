import { bps } from '../utils/formatters.js';
import { getActiveCoins } from '../utils/coin-config.js';

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
        });
      }
    }
  }
  return rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, limit);
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

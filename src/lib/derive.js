import { bps } from '../utils/formatters.js';

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

export function rankChainFlows(usdtDetail, usdcDetail) {
  const map = {};
  const add = (detail, coin) => {
    for (const [chain, chainData] of Object.entries(detail?.chainBalances || {})) {
      const tokens = chainData?.tokens || [];
      const cur = tokens[tokens.length - 1]?.circulating?.peggedUSD || 0;
      const pd = tokens[tokens.length - 2]?.circulating?.peggedUSD || cur;
      const delta = cur - pd;
      if (!map[chain]) map[chain] = { chain, usdtDelta: 0, usdcDelta: 0, totalDelta: 0 };
      if (coin === 'USDT') map[chain].usdtDelta += delta;
      else map[chain].usdcDelta += delta;
      map[chain].totalDelta += delta;
    }
  };
  add(usdtDetail, 'USDT');
  add(usdcDetail, 'USDC');
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

export function computePegStress({ usdtPrice, usdcPrice, alerts, topChainFlow }) {
  const critical = (alerts || []).filter((a) => a.severity === 'CRITICAL').length;
  const high = (alerts || []).filter((a) => a.severity === 'HIGH').length;
  const warning = (alerts || []).filter((a) => a.severity === 'WARNING').length;
  const pegDriftBps = Math.max(Math.abs(bps(usdtPrice)), Math.abs(bps(usdcPrice)));
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

export function buildWhaleWatchRows(usdtDetail, usdcDetail, limit = 8) {
  const rows = [];
  const scan = (detail, coin) => {
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
  };
  scan(usdtDetail, 'USDT');
  scan(usdcDetail, 'USDC');
  return rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, limit);
}

function dominancePercentSeries(usdtSupplySeries, usdcSupplySeries) {
  const byDate = {};
  usdtSupplySeries.forEach((p) => {
    byDate[p.date] = byDate[p.date] || { date: p.date, usdt: 0, usdc: 0 };
    byDate[p.date].usdt = p.value;
  });
  usdcSupplySeries.forEach((p) => {
    byDate[p.date] = byDate[p.date] || { date: p.date, usdt: 0, usdc: 0 };
    byDate[p.date].usdc = p.value;
  });
  return Object.values(byDate)
    .sort((a, b) => a.date - b.date)
    .map((p) => {
      const total = p.usdt + p.usdc;
      return { date: p.date, usdtDom: total ? (p.usdt / total) * 100 : 0 };
    })
    .slice(-60);
}

export function buildAlertSparkSeries(alert, data) {
  if (!alert || !data) return null;
  const rule = alert.rule;
  if (rule === 'PEG_BREAK') {
    const chart = alert.coin === 'USDC' ? data?.cgUSDCChart : data?.cgUSDTChart;
    const prices = (chart?.prices || []).slice(-14);
    if (!prices.length) return null;
    return {
      labels: prices.map((_, i) => String(i)),
      values: prices.map((p) => p[1]),
      color: alert.coin === 'USDC' ? '#2775CA' : '#26A17B',
    };
  }
  if (rule === 'MEGA_SUPPLY' || rule === 'CHAIN_SPIKE') {
    const detail = alert.coin === 'USDC' ? data?.usdcDetail : data?.usdtDetail;
    const chainData = detail?.chainBalances?.[alert.chain];
    const tokens = (chainData?.tokens || []).slice(-14);
    if (!tokens.length) return null;
    return {
      labels: tokens.map((_, i) => String(i)),
      values: tokens.map((t) => t?.circulating?.peggedUSD || 0),
      color: alert.coin === 'USDC' ? '#2775CA' : '#26A17B',
    };
  }
  if (rule === 'DOM_SHIFT') {
    const usdtS = buildSupplySeries(data?.usdtDetail);
    const usdcS = buildSupplySeries(data?.usdcDetail);
    const dom = dominancePercentSeries(usdtS, usdcS).slice(-14);
    if (!dom.length) return null;
    return {
      labels: dom.map((_, i) => String(i)),
      values: dom.map((p) => p.usdtDom),
      color: '#3b82f6',
    };
  }
  return null;
}
